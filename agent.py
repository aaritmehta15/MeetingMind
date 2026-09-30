"""
agent.py — ReAct Agent logic for autonomous meeting analysis.
"""

import json
import re
import time
from typing import Any
from agent_tools import build_tools
from rag_index import HierarchicalRAGIndex
from llm import call_llm

REACT_SYSTEM_PROMPT = """You are a brilliant ReAct (Reasoning and Acting) AI meeting assistant.
You must answer the user's question by using the tools provided to you.
You must ALWAYS follow this exact format:

Thought: [your internal reasoning about what to do next]
Action: [the name of the tool to use, if any]
Action Input: [a valid JSON object containing the arguments for the tool]

You will then receive a response from the system like this:
Observation: [result of the tool]

You can use multiple steps. When you have enough information to answer the question, you must format your final response EXACTLY like this:

Thought: I now know the final answer.
Final Answer: [your comprehensive, grounded answer to the user's question]

CRITICAL GUIDELINES:
1. Focus strictly on actual human meeting participants (e.g., engineers, managers, speakers).
2. NEVER treat transcript metadata headers (such as "Date:", "Participants:", "Duration:", "Location:") as human speakers.
3. Present your Final Answer cleanly with bullet points, emotional tone context, and constructive summaries.

Here are the tools you have access to:
{tool_descriptions}

Begin!"""

_agent_rag_cache: dict[int, HierarchicalRAGIndex] = {}

def get_or_build_rag_index(transcript_text: str) -> HierarchicalRAGIndex:
    cache_key = hash(transcript_text)
    if cache_key in _agent_rag_cache:
        return _agent_rag_cache[cache_key]
    idx = HierarchicalRAGIndex(window_size=5)
    idx.build(transcript_text)
    if len(_agent_rag_cache) > 25:
        _agent_rag_cache.clear()
    _agent_rag_cache[cache_key] = idx
    return idx

def run_agent_with_steps(
    transcript_text: str,
    question: str,
    provider: str | None = None,
    enabled_tools: list[str] | None = None,
) -> dict[str, Any]:
    start_t = time.perf_counter()

    t_clean = (transcript_text or "").strip()
    if not t_clean:
        return {
            "answer": "No transcript text was provided. Please load or paste a meeting transcript first.",
            "steps": [],
            "latency_ms": 0.0
        }

    # Intercept accidental prompt inversion or short text without dialogue
    words = t_clean.split()
    has_speaker = any(":" in line for line in t_clean.splitlines() if line.strip())
    if len(words) < 12 and not has_speaker:
        return {
            "answer": (
                f"The provided text appears to be a prompt or question rather than a meeting transcript:\n\n"
                f"> *\"{t_clean}\"*\n\n"
                "Please select one of the loaded meeting transcripts from the top chips or paste a transcript with speaker dialogue turns (e.g., `Alice: ...` and `Bob: ...`)."
            ),
            "steps": [],
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2)
        }

    # Build or retrieve cached RAG index
    try:
        idx = get_or_build_rag_index(t_clean)
    except Exception as e:
        return {
            "answer": f"Unable to parse transcript dialogue: {e}",
            "steps": [],
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2)
        }

    all_tools = build_tools(t_clean, idx, provider)
    
    # Filter tools if the caller specified a whitelist
    if enabled_tools is not None:
        tools = [t for t in all_tools if t.name in enabled_tools]
    else:
        tools = all_tools
    
    # Format tool descriptions
    tool_desc = ""
    for t in tools:
        tool_desc += f"- {t.name}: {t.description}\n  Parameters: {json.dumps(t.parameters)}\n\n"
    
    sys_prompt = REACT_SYSTEM_PROMPT.format(tool_descriptions=tool_desc)
    
    # History tracks the ReAct flow
    history = f"Question: {question}\n"
    
    steps = []
    final_answer = "I could not determine the answer."
    
    # Run loop (max 5 iterations for fast responsiveness)
    for _ in range(5):
        # Call LLM
        response = call_llm(provider, sys_prompt, history)
        
        # Append LLM output to history
        history += f"{response}\n"
        
        # Robust Regex Parsing
        final_match = re.search(r'(?:^|\n)\s*(?:\*\*|#+\s*)?Final Answer(?:\*\*|:)?:\s*(.*)', response, re.DOTALL | re.IGNORECASE)
        if final_match:
            final_answer = final_match.group(1).strip()
            # Capture preceding thought if present
            thought_match = re.search(r'(?:^|\n)\s*(?:\*\*|#+\s*)?Thought(?:\*\*|:)?:\s*(.*?)(?=(?:^|\n)\s*(?:\*\*|#+\s*)?Final Answer(?:\*\*|:)?:|\Z)', response, re.DOTALL | re.IGNORECASE)
            t_text = ""
            if thought_match:
                t_text = thought_match.group(1).strip().split('\n')[0].strip()
            if not t_text or t_text.lower().startswith("i now know the") or len(t_text) < 16:
                t_text = "I now know the final answer."
            steps.append({
                "thought": t_text,
                "tool_name": None,
                "tool_args": None,
                "tool_result": None
            })
            break

        # Extract Thought
        thought_match = re.search(r'(?:^|\n)\s*(?:\*\*|#+\s*)?Thought(?:\*\*|:)?:\s*(.*?)(?=(?:^|\n)\s*(?:\*\*|#+\s*)?(?:Action|Final Answer)(?:\*\*|:)?:|\Z)', response, re.DOTALL | re.IGNORECASE)
        thought = thought_match.group(1).strip().split('\n')[0].strip() if thought_match else ""

        # Extract Action
        action_match = re.search(r'(?:^|\n)\s*(?:\*\*|#+\s*)?Action(?:\*\*|:)?:\s*([a-zA-Z0-9_]+)', response, re.IGNORECASE)
        action = action_match.group(1).strip() if action_match else ""

        # Extract Action Input
        input_match = re.search(r'(?:^|\n)\s*(?:\*\*|#+\s*)?Action Input(?:\*\*|:)?:\s*(.*?)(?=(?:^|\n)\s*(?:\*\*|#+\s*)?Observation|\Z)', response, re.DOTALL | re.IGNORECASE)
        action_input_str = input_match.group(1).strip() if input_match else ""

        if not action:
            # Fallback if the agent messes up formatting
            history += "Observation: You must provide an 'Action' or a 'Final Answer'.\n"
            continue

        # Parse action input JSON cleanly
        clean_input = action_input_str
        if "```" in clean_input:
            clean_input = re.sub(r'```(?:json)?\s*', '', clean_input).replace('```', '').strip()
        try:
            action_args = json.loads(clean_input) if clean_input else {}
        except Exception:
            m_json = re.search(r'\{.*\}', clean_input, re.DOTALL)
            if m_json:
                try:
                    action_args = json.loads(m_json.group(0))
                except Exception:
                    action_args = {}
            else:
                action_args = {}

        # Execute tool
        tool_result = f"Error: Tool '{action}' not found."
        for t in tools:
            if t.name == action:
                try:
                    tool_result = t(action_args)
                except Exception as e:
                    tool_result = f"Error executing tool: {e}"
                break

        # Append observation
        history += f"Observation: {tool_result}\n"

        # Record step for UI
        steps.append({
            "thought": thought,
            "tool_name": action,
            "tool_args": action_args,
            "tool_result": tool_result
        })

    # If loop ended without explicit Final Answer, synthesize directly from history
    if final_answer == "I could not determine the answer." and steps:
        try:
            synth = call_llm(provider, sys_prompt, f"{history}\nThought: I will now state the final answer.\nFinal Answer:")
            final_match2 = re.search(r'(?:\*\*|#+\s*)?Final Answer(?:\*\*|:)?:\s*(.*)', synth, re.DOTALL | re.IGNORECASE)
            final_answer = final_match2.group(1).strip() if final_match2 else synth.strip()
        except Exception:
            pass
        steps.append({
            "thought": "I will now state the final answer based on accumulated evidence.",
            "tool_name": None,
            "tool_args": None,
            "tool_result": None
        })
        
    latency = (time.perf_counter() - start_t) * 1000
    
    return {
        "answer": final_answer,
        "steps": steps,
        "latency_ms": round(latency, 2)
    }


def run_agent(
    question: str,
    transcript_path: str,
    provider: str = "groq",
    enabled_tools: list[str] | None = None,
) -> str:
    """Convenience wrapper for CLI to load transcript and run the agent."""
    from pathlib import Path
    p = Path(transcript_path)
    if not p.exists():
        raise FileNotFoundError(f"Transcript file not found: {p}")
    transcript_text = p.read_text(encoding="utf-8").strip()
    
    res = run_agent_with_steps(
        transcript_text=transcript_text,
        question=question,
        provider=provider,
        enabled_tools=enabled_tools,
    )
    return res["answer"]

