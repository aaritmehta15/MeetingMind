"""
agent_tools.py — Tool definitions for the MeetingMind ReAct agent.

Each tool is a callable that takes a dict of arguments and returns a string result.
The TOOLS list is what gets injected into the agent's system prompt.

Available tools:
  - rag_search    : Search the transcript index for relevant excerpts
  - get_extraction: Run the full extraction pipeline and return JSON
  - get_summary   : Return just the meeting summary
"""

from __future__ import annotations

from typing import Any, Callable


# ── Tool type ─────────────────────────────────────────────────────────────────

class Tool:
    """A single agent tool with schema and callable implementation."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        fn: Callable[[dict], str],
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self._fn = fn

    def __call__(self, args: dict) -> str:
        return self._fn(args)

    def schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


# ── Tool factories ────────────────────────────────────────────────────────────

def make_rag_search_tool(idx) -> Tool:
    """Create a rag_search tool bound to a HierarchicalRAGIndex instance."""

    def _rag_search(args: dict) -> str:
        query = str(args.get("query", ""))
        k = int(args.get("k", 3))
        results = idx.search(query, k=k)
        if not results:
            return "No relevant excerpts found for this query."

        parts = []
        for i, r in enumerate(results, 1):
            parts.append(
                f"[Result {i} | score={r.score:.3f}]\n"
                f"Matched: {r.child_text}\n"
                f"Context:\n{r.parent_window}"
            )
        return "\n\n---\n\n".join(parts)

    return Tool(
        name="rag_search",
        description=(
            "Search the meeting transcript for passages relevant to a query. "
            "Returns up to k context windows (5-turn excerpts) from the transcript. "
            "Always use this before answering factual questions about the meeting."
        ),
        parameters={
            "query": {
                "type": "string",
                "description": "Natural language search query",
                "required": True,
            },
            "k": {
                "type": "integer",
                "description": "Number of results to return (default 3)",
                "required": False,
            },
        },
        fn=_rag_search,
    )


def make_get_extraction_tool(transcript_text: str, provider: str) -> Tool:
    """Create a get_extraction tool that runs the full pipeline on demand."""

    _cache: dict[str, Any] = {}  # simple cache so we only call the LLM once

    def _get_extraction(args: dict) -> str:
        import json
        from extractor import run_extraction

        if "result" not in _cache:
            extraction, report = run_extraction(transcript_text, provider=provider)
            _cache["result"] = (extraction, report)
        else:
            extraction, report = _cache["result"]

        out = {
            "summary": extraction.summary,
            "action_items": [
                {**a.model_dump(), "accepted": idx < len(report.accepted_actions)}
                for idx, a in enumerate(extraction.action_items)
            ],
            "decisions": [d.model_dump() for d in extraction.decisions],
            "citation_rejection_rate": report.rejection_rate,
        }
        return json.dumps(out, indent=2)

    return Tool(
        name="get_extraction",
        description=(
            "Run the full extraction pipeline and return a JSON object with "
            "the meeting summary, all action items (with owners and deadlines), "
            "all decisions, and the citation rejection rate. "
            "Use this when the question requires structured data like action items."
        ),
        parameters={},
        fn=_get_extraction,
    )


def make_get_summary_tool(transcript_text: str, provider: str) -> Tool:
    """Create a get_summary tool for quick summary-only questions."""

    _cache: dict[str, str] = {}

    def _get_summary(args: dict) -> str:
        from extractor import run_extraction

        if "summary" not in _cache:
            extraction, _ = run_extraction(transcript_text, provider=provider)
            _cache["summary"] = extraction.summary
        return _cache["summary"]

    return Tool(
        name="get_summary",
        description=(
            "Get a 2-3 sentence TL;DR summary of the meeting. "
            "Use this for high-level overview questions."
        ),
        parameters={},
        fn=_get_summary,
    )


def build_tools(
    transcript_text: str,
    idx,
    provider: str,
) -> list[Tool]:
    """Build the full set of agent tools for a given transcript and RAG index.

    Args:
        transcript_text: The raw transcript.
        idx: A built HierarchicalRAGIndex instance.
        provider: LLM provider for extraction tools.

    Returns:
        List of Tool objects ready to be registered with the agent.
    """
    return [
        make_rag_search_tool(idx),
        make_get_extraction_tool(transcript_text, provider),
        make_get_summary_tool(transcript_text, provider),
    ]
