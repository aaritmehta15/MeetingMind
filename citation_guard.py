"""
citation_guard.py — Verbatim-citation hallucination checker.

For every extracted action item and decision, verifies that the
evidence_quote field is a literal substring of the source transcript.
Items that pass are accepted; items that fail are flagged with a reason.

This is the core hallucination-checking mechanism, adapted from
MeetMind's citation guard in references/meetmind-main/src/meetmind/analyze/actions.py.

Usage:
    from citation_guard import validate_citations
    report = validate_citations(extraction, transcript_text)
    print(report.rejection_rate)
"""

from __future__ import annotations

from dataclasses import dataclass, field

from schemas import ActionItem, Decision, MeetingExtraction


@dataclass
class CitationReport:
    """Results of running the citation guard on a MeetingExtraction."""

    accepted_actions: list[ActionItem] = field(default_factory=list)
    rejected_actions: list[tuple[ActionItem, str]] = field(default_factory=list)
    accepted_decisions: list[Decision] = field(default_factory=list)
    rejected_decisions: list[tuple[Decision, str]] = field(default_factory=list)

    @property
    def total_items(self) -> int:
        return (
            len(self.accepted_actions)
            + len(self.rejected_actions)
            + len(self.accepted_decisions)
            + len(self.rejected_decisions)
        )

    @property
    def total_rejected(self) -> int:
        return len(self.rejected_actions) + len(self.rejected_decisions)

    @property
    def rejection_rate(self) -> float:
        """Fraction of extracted items that failed the citation check. 0.0 = perfect."""
        if self.total_items == 0:
            return 0.0
        return self.total_rejected / self.total_items

    @property
    def all_accepted_actions(self) -> list[ActionItem]:
        return self.accepted_actions

    @property
    def all_actions(self) -> list[tuple[ActionItem, bool, str]]:
        """Returns (item, accepted, reason) for all action items."""
        result = [(a, True, "") for a in self.accepted_actions]
        result += [(a, False, reason) for a, reason in self.rejected_actions]
        return result

    @property
    def all_decisions(self) -> list[tuple[Decision, bool, str]]:
        """Returns (item, accepted, reason) for all decisions."""
        result = [(d, True, "") for d in self.accepted_decisions]
        result += [(d, False, reason) for d, reason in self.rejected_decisions]
        return result


def _check_quote(evidence_quote: str, transcript_text: str) -> tuple[bool, str]:
    """Check if evidence_quote is a verbatim substring of the transcript.

    Returns:
        (True, "") if the quote is found.
        (False, reason) if the quote is not found.
    """
    if not evidence_quote or not evidence_quote.strip():
        return False, "evidence_quote is empty"

    cleaned_quote = evidence_quote.strip()
    # Strip leading/trailing quotation marks if LLM wrapped the quote in quotes
    if (cleaned_quote.startswith('"') and cleaned_quote.endswith('"')) or \
       (cleaned_quote.startswith("'") and cleaned_quote.endswith("'")) or \
       (cleaned_quote.startswith("“") and cleaned_quote.endswith("”")) or \
       (cleaned_quote.startswith("‘") and cleaned_quote.endswith("’")):
        cleaned_quote = cleaned_quote[1:-1].strip()

    # 1. Direct substring check (verbatim)
    if cleaned_quote in transcript_text:
        return True, ""

    # 2. Normalise whitespace
    normalised_quote = " ".join(cleaned_quote.split())
    normalised_transcript = " ".join(transcript_text.split())
    if normalised_quote in normalised_transcript:
        return True, ""

    # 3. Normalise smart quotes, em-dashes, and unicode punctuation
    smart_punct_map = str.maketrans({
        "“": '"', "”": '"', "‘": "'", "’": "'", "—": "--", "–": "-", "…": "..."
    })
    q_mapped = normalised_quote.translate(smart_punct_map)
    t_mapped = normalised_transcript.translate(smart_punct_map)
    if q_mapped in t_mapped:
        return True, ""

    # 4. Case-insensitive substring check
    if q_mapped.lower() in t_mapped.lower():
        return True, ""

    # Failed — provide a helpful diagnostic snippet
    snippet = evidence_quote[:60].replace("\n", "\\n")
    return False, f"evidence_quote not found in transcript: '{snippet}...'"


def validate_citations(
    extraction: MeetingExtraction,
    transcript_text: str,
) -> CitationReport:
    """Run the verbatim-citation guard on a MeetingExtraction.

    For each action item and decision, checks that evidence_quote is a
    literal substring of transcript_text. Items that fail are moved to
    the rejected lists with an explanatory reason.

    Args:
        extraction: The MeetingExtraction to validate.
        transcript_text: The full source transcript text.

    Returns:
        A CitationReport with accepted and rejected items separated.
    """
    report = CitationReport()

    for item in extraction.action_items:
        ok, reason = _check_quote(item.evidence_quote, transcript_text)
        if ok:
            report.accepted_actions.append(item)
        else:
            report.rejected_actions.append((item, reason))

    for decision in extraction.decisions:
        ok, reason = _check_quote(decision.evidence_quote, transcript_text)
        if ok:
            report.accepted_decisions.append(decision)
        else:
            report.rejected_decisions.append((decision, reason))

    return report
