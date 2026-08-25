"""
agent.py — ReAct (Reason + Act) agent for meeting Q&A.

Architecture:
  The agent runs a simple synchronous loop: at each step it calls the LLM
  with the conversation history (including previous tool results), parses the
  LLM's JSON response to decide whether to call a tool or give a final answer,
  executes the tool if needed, and appends the result before the next step.

  Max steps: 5 (configurable). No orchestration framework — ~60 lines of loop logic.

  The agent uses the Hierarchical RAG index for grounded retrieval before
  answering: by default it searches the transcript first so answers are
  evidence-backed, not hallucinated.

Usage:
    from agent import run_agent
    answer = run_agent(
        question="What did Edd agree to do?",
        transcript_path="path/to/transcript.txt",
        provider="groq",
    )
    print(answer)

    python agent.py transcript.txt "What did Edd agree to do?"
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

from agent_tools import build_tools
from extractor import load_transcript
from llm import _call_groq_json, call_llm
from prompts import build_agent_system_prompt
from rag_index import HierarchicalRAGIndex

load_dotenv()

_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") \
    if hasattr(sys.stdout, "buffer") else sys.stdout
console = Console(file=_stdout, highlight=False)

MAX_STEPS = 5


# ── ReAct loop ────────────────────────────────────────────────────────────────

def _parse_agent_response(raw: str) -> dict:
    """Parse the LLM's JSON response. Handles markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Strip opening ``` or ```json and closing ```
        start = 1 if lines[0].startswith("```") else 0
        end = -1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end])
    return json.loads(text)


def run_agent(
    question: str,
    transcript_path: str,
    provider: str = "groq",
    max_steps: int = MAX_STEPS,
    verbose: bool = True,
) -> str:
    """Run the ReAct agent to answer a question about a meeting transcript.

    Args:
        question: The user's question.
        transcript_path: Path to the transcript .txt file.
        provider: LLM provider.
        max_steps: Maximum reasoning steps before forced termination.
        verbose: Print step-by-step reasoning to console.

    Returns:
        The agent's final answer string.
    """
    transcript_text = load_transcript(transcript_path)
    index_path = str(Path(transcript_path).with_suffix(".ragindex"))

    # Build or load RAG index
    idx = HierarchicalRAGIndex()
    if Path(index_path + ".faiss").exists():
        if verbose:
            console.print(f"[dim]Loading cached RAG index...[/dim]")
        idx.load(index_path)
    else:
        if verbose:
            console.print(f"[dim]Building RAG index...[/dim]")
        idx.build(transcript_text)
        idx.save(index_path)

    # Build tools
    tools = build_tools(transcript_text, idx, provider)
    tool_map = {t.name: t for t in tools}
    tool_schemas = [t.schema() for t in tools]

    system_prompt = build_agent_system_prompt(tool_schemas)

    # Conversation history
    history: list[dict] = []

    if verbose:
        console.rule("[bold blue]Agent — ReAct Loop[/bold blue]")
        console.print(f"[bold]Question:[/bold] {question}")
        console.print()

    # Auto-run rag_search first so the model always has grounded context
    rag_tool = tool_map.get("rag_search")
    if rag_tool:
        initial_results = rag_tool({"query": question, "k": 3})
        # Inject transcript context + RAG results into first user message
        history.append({
            "role": "user",
            "content": (
                f"Question: {question}\n\n"
                f"Relevant excerpts from the transcript (retrieved by rag_search):\n\n{initial_results}\n\n"
                "Now answer the question using ONLY evidence from the transcript above. "
                "If the answer is directly available, give a final_answer. "
                "If you need more context, call rag_search with a different query."
            ),
        })
    else:
        history.append({
            "role": "user",
            "content": f"Question: {question}",
        })

    for step in range(1, max_steps + 1):
        # Build user message from history
        user_msg = "\n\n".join(
            f"[{m['role'].upper()}]\n{m['content']}" for m in history
        )

        # Use JSON mode for reliable structured output from the agent
        if provider == "groq":
            raw = _call_groq_json(system_prompt, user_msg)
        else:
            raw = call_llm(provider, system_prompt, user_msg)

        try:
            response = _parse_agent_response(raw)
        except (json.JSONDecodeError, ValueError):
            # LLM didn't output valid JSON — treat raw as final answer
            if verbose:
                console.print(f"[yellow]Step {step}: Non-JSON response, treating as final answer.[/yellow]")
            return raw.strip()

        thought = response.get("thought", "")
        final_answer = response.get("final_answer")
        tool_name = response.get("tool")
        tool_input = response.get("tool_input", {})

        if verbose:
            console.print(f"[bold cyan]Step {step}[/bold cyan] — [dim]{thought[:120]}[/dim]")

        if final_answer is not None:
            if verbose:
                console.print(f"\n[green bold]Final Answer:[/green bold] {final_answer}")
            return str(final_answer)

        if tool_name:
            if tool_name not in tool_map:
                tool_result = f"ERROR: Unknown tool '{tool_name}'. Available: {list(tool_map)}"
            else:
                if verbose:
                    console.print(f"  [yellow]Calling tool:[/yellow] {tool_name}({tool_input})")
                try:
                    tool_result = tool_map[tool_name](tool_input)
                except Exception as e:
                    tool_result = f"ERROR calling {tool_name}: {e}"

            if verbose:
                preview = tool_result[:200].replace("\n", " ")
                console.print(f"  [dim]Tool result: {preview}...[/dim]")

            history.append({"role": "assistant", "content": raw})
            history.append({"role": "tool", "content": f"Tool '{tool_name}' returned:\n{tool_result}"})
        else:
            # No tool and no final_answer — extract any text and stop
            fallback = response.get("answer") or response.get("text") or raw
            if verbose:
                console.print(f"[yellow]No tool or final_answer in response — using fallback.[/yellow]")
            return str(fallback)

    # Exhausted steps — ask for a direct answer
    if verbose:
        console.print(f"[yellow]Max steps reached. Requesting direct answer...[/yellow]")

    forced_msg = user_msg + "\n\n[SYSTEM] Max reasoning steps reached. Provide your final_answer now."
    raw_final = call_llm(provider, system_prompt, forced_msg)
    try:
        parsed = _parse_agent_response(raw_final)
        return str(parsed.get("final_answer") or parsed.get("answer") or raw_final)
    except Exception:
        return raw_final.strip()


# ── Script entrypoint ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ask a question about a meeting transcript")
    parser.add_argument("transcript", help="Path to transcript .txt file")
    parser.add_argument("question", help="Question to answer")
    parser.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])
    parser.add_argument("--max-steps", type=int, default=MAX_STEPS)
    args = parser.parse_args()

    answer = run_agent(
        question=args.question,
        transcript_path=args.transcript,
        provider=args.provider,
        max_steps=args.max_steps,
    )
    console.print()
    console.rule("[bold blue]Final Answer[/bold blue]")
    console.print(answer)
