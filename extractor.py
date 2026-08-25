"""
extractor.py — End-to-end extraction pipeline.

Ties together: LLM call → Pydantic validation → citation guard.
Includes retry logic and a Rich-formatted CLI output for quick inspection.

Usage (as a module):
    from extractor import run_extraction, load_transcript
    extraction, report = run_extraction(transcript_text, provider="groq")

Usage (as a script):
    python extractor.py path/to/transcript.txt
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from citation_guard import CitationReport, validate_citations
from llm import call_llm_json
from prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_user_prompt
from schemas import MeetingExtraction

load_dotenv()

# Force UTF-8 output on Windows to avoid cp1252 UnicodeEncodeError with LLM output
_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") \
    if hasattr(sys.stdout, "buffer") else sys.stdout
console = Console(file=_stdout, highlight=False)


# ── Transcript loader ────────────────────────────────────────────────────────

def load_transcript(path: str | Path) -> str:
    """Load a plain-text transcript file.

    Args:
        path: Path to the transcript .txt file.

    Returns:
        The transcript text as a string.

    Raises:
        FileNotFoundError: if the file does not exist.
        ValueError: if the file is empty.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Transcript not found: {p}")
    text = p.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"Transcript is empty: {p}")
    return text


# ── Extraction pipeline ──────────────────────────────────────────────────────

def run_extraction(
    transcript_text: str,
    provider: str = "groq",
    participants: list[str] | None = None,
) -> tuple[MeetingExtraction, CitationReport]:
    """Run the full extraction + citation-guard pipeline on a transcript.

    Steps:
        1. Build the extraction prompt (with optional speaker context).
        2. Call the LLM with JSON mode — parse into MeetingExtraction via Pydantic.
        3. Run the verbatim-citation guard on every extracted item.

    Args:
        transcript_text: The raw transcript text.
        provider: LLM provider — 'groq', 'gemini', or 'ollama'.
        participants: Optional list of participant names for speaker-adaptive prompting.

    Returns:
        A (MeetingExtraction, CitationReport) tuple.
        MeetingExtraction contains the raw LLM output (including flagged items).
        CitationReport separates accepted vs. rejected items.
    """
    # Truncate long transcripts to avoid TPM rate limits on free Groq tier.
    # groq/compound-mini: 6000 chars ≈ ~1500 tokens, safe within 30k TPM/minute.
    MAX_TRANSCRIPT_CHARS = 6_000
    if len(transcript_text) > MAX_TRANSCRIPT_CHARS:
        # Cut at a speaker-turn boundary (newline) for clean context
        cut_point = transcript_text.rfind("\n", 0, MAX_TRANSCRIPT_CHARS)
        if cut_point == -1:
            cut_point = MAX_TRANSCRIPT_CHARS
        transcript_text = transcript_text[:cut_point]

    user_prompt = build_extraction_user_prompt(transcript_text, participants=participants)

    extraction: MeetingExtraction = call_llm_json(
        provider=provider,
        system_prompt=EXTRACTION_SYSTEM_PROMPT,
        user_message=user_prompt,
        schema=MeetingExtraction,
    )

    # Citation guard validates against what was actually sent to the LLM (truncated text)
    report = validate_citations(extraction, transcript_text)
    return extraction, report


# ── Rich display ─────────────────────────────────────────────────────────────

def display_extraction(
    extraction: MeetingExtraction,
    report: CitationReport,
    source_name: str = "transcript",
) -> None:
    """Print a formatted extraction result to the console using Rich."""

    console.rule(f"[bold blue]MeetingMind Extraction — {source_name}[/bold blue]")

    # Summary
    console.print()
    console.print(Panel(extraction.summary, title="Summary", border_style="blue"))

    # Action items
    console.print()
    if not extraction.action_items:
        console.print("[dim]No action items extracted.[/dim]")
    else:
        action_table = Table(
            "Status", "Description", "Owner", "Deadline", "Evidence Quote",
            title="Action Items",
            show_lines=True,
            border_style="blue",
        )
        for action, accepted, reason in report.all_actions:
            status = Text("ACCEPTED", style="green bold") if accepted else Text("FLAGGED", style="red bold")
            quote = action.evidence_quote[:60] + "..." if len(action.evidence_quote) > 60 else action.evidence_quote
            if not accepted:
                quote = f"{quote}\n[dim red]{reason}[/dim red]"
            action_table.add_row(
                status,
                action.description,
                action.owner or "[dim]—[/dim]",
                action.deadline or "[dim]—[/dim]",
                quote,
            )
        console.print(action_table)

    # Decisions
    console.print()
    if not extraction.decisions:
        console.print("[dim]No decisions extracted.[/dim]")
    else:
        decision_table = Table(
            "Status", "Description", "Evidence Quote",
            title="Decisions",
            show_lines=True,
            border_style="cyan",
        )
        for decision, accepted, reason in report.all_decisions:
            status = Text("ACCEPTED", style="green bold") if accepted else Text("FLAGGED", style="red bold")
            quote = decision.evidence_quote[:70] + "..." if len(decision.evidence_quote) > 70 else decision.evidence_quote
            decision_table.add_row(status, decision.description, quote)
        console.print(decision_table)

    # Stats
    console.print()
    total = report.total_items
    rejected = report.total_rejected
    rate = report.rejection_rate
    colour = "green" if rate == 0 else "yellow" if rate < 0.3 else "red"
    console.print(
        f"[{colour}]Citation guard: {total - rejected}/{total} items accepted "
        f"(rejection rate: {rate:.0%})[/{colour}]"
    )


# ── Script entrypoint ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import json
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Extract structured info from a meeting transcript.")
    parser.add_argument("transcript", help="Path to transcript .txt file")
    parser.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])
    args = parser.parse_args()

    transcript_path = Path(args.transcript)
    text = load_transcript(transcript_path)
    extraction, report = run_extraction(text, provider=args.provider)
    display_extraction(extraction, report, source_name=transcript_path.name)

    # Save JSON output alongside the transcript
    out_path = transcript_path.with_suffix(".extraction.json")
    out_data = {
        "summary": extraction.summary,
        "action_items": [a.model_dump() for a in extraction.action_items],
        "decisions": [d.model_dump() for d in extraction.decisions],
        "citation_report": {
            "accepted_actions": len(report.accepted_actions),
            "rejected_actions": len(report.rejected_actions),
            "accepted_decisions": len(report.accepted_decisions),
            "rejected_decisions": len(report.rejected_decisions),
            "rejection_rate": report.rejection_rate,
        },
    }
    out_path.write_text(json.dumps(out_data, indent=2), encoding="utf-8")
    console.print(f"\n[dim]Saved to {out_path}[/dim]")
