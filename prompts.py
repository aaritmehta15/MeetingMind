"""
prompts.py — System prompts and user prompt builders for extraction.

The EXTRACTION_SYSTEM_PROMPT tells the LLM exactly what JSON to produce,
including the schema inline, the verbatim-citation rule, and a one-shot
example to calibrate output quality.

The build_extraction_user_prompt() function wraps the raw transcript text
with optional speaker context (for the speaker-adaptive wow feature).
"""

from __future__ import annotations

# ── Extraction system prompt ─────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """You are an expert meeting analyst. Your job is to extract structured information from meeting transcripts.

You must output a single valid JSON object — no markdown, no explanation, just JSON.

## Output schema

```json
{
  "summary": "<string: 2-3 sentence TL;DR of the meeting>",
  "action_items": [
    {
      "description": "<string: what needs to be done, one sentence>",
      "owner": "<string or null: person responsible — null if not explicitly stated>",
      "deadline": "<string or null: due date — null if not explicitly stated, do NOT infer>",
      "evidence_quote": "<string: verbatim copy-paste from transcript, exact substring>"
    }
  ],
  "decisions": [
    {
      "description": "<string: what was decided, one sentence>",
      "evidence_quote": "<string: verbatim copy-paste from transcript, exact substring>"
    }
  ]
}
```

## Critical rules

1. **evidence_quote must be verbatim**: Copy-paste exact text from the transcript. Do not paraphrase, summarise, or alter it. If you cannot find an exact quote, do not include the item.
2. **owner and deadline must be explicit**: If a name or date was not actually said, set the field to null. Never infer or guess.
3. **action_items only for concrete tasks**: A vague "we should look into that" is not an action item. Only include things with a clear responsible person or a clear deliverable.
4. **decisions are agreements, not discussions**: Include only things the group explicitly agreed to, not things that were debated.

## Example

Transcript:
```
Sarah: OK so we need to wrap up the roadmap doc this week. Edd, can you own that?
Edd: Yeah, I'll have it done by Thursday.
Sarah: Great. And the CI/CD pipeline — we've decided to use GitHub Actions, right?
Edd: Correct, that's confirmed.
```

Correct output:
```json
{
  "summary": "The team agreed on the roadmap timeline and confirmed the CI/CD tooling choice. Edd will deliver the roadmap by Thursday.",
  "action_items": [
    {
      "description": "Complete the roadmap document",
      "owner": "Edd",
      "deadline": "Thursday",
      "evidence_quote": "I'll have it done by Thursday."
    }
  ],
  "decisions": [
    {
      "description": "The team will use GitHub Actions for CI/CD",
      "evidence_quote": "we've decided to use GitHub Actions, right?\\nEdd: Correct, that's confirmed."
    }
  ]
}
```

Now extract from the transcript provided by the user."""


# ── User prompt builder ──────────────────────────────────────────────────────

def build_extraction_user_prompt(
    transcript_text: str,
    participants: list[str] | None = None,
) -> str:
    """Build the user-turn prompt for extraction.

    Args:
        transcript_text: The full transcript text.
        participants: Optional list of participant names (speaker-adaptive mode).
                      When provided, injects a participants list to help the LLM
                      attribute action-item owners more accurately.

    Returns:
        The user-turn string to pass to call_llm_json().
    """
    parts: list[str] = []

    if participants:
        names = ", ".join(participants)
        parts.append(f"Participants in this meeting: {names}\n")

    parts.append("Extract structured information from the following meeting transcript:\n")
    parts.append("---\n")
    parts.append(transcript_text.strip())
    parts.append("\n---")

    return "\n".join(parts)


# ── Agent system prompt ───────────────────────────────────────────────────────

AGENT_SYSTEM_PROMPT = """You are a meeting assistant agent that answers questions about meeting transcripts using tools.

CRITICAL: Your entire response must be a single valid JSON object. No text before or after the JSON. No markdown fences.

To call a tool, output:
{"thought": "your reasoning", "tool": "tool_name", "tool_input": {"arg": "value"}}

To give a final answer, output:
{"thought": "your reasoning", "final_answer": "your complete answer with evidence quoted from the transcript"}

Available tools:
{tool_schemas}

Rules:
1. Always call rag_search first before answering factual questions.
2. Include verbatim evidence from the transcript in your final_answer.
3. If a tool returns insufficient information, try a different query.
4. Do not guess — only state what the transcript explicitly says."""


def build_agent_system_prompt(tool_schemas: list[dict]) -> str:
    """Inject tool schemas into the agent system prompt."""
    import json
    schemas_str = json.dumps(tool_schemas, indent=2)
    return AGENT_SYSTEM_PROMPT.replace("{tool_schemas}", schemas_str)
