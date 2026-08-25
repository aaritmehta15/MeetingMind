"""
schemas.py — Pydantic v2 models for structured meeting extraction.

These are the single source of truth for:
  - What the LLM is asked to produce (referenced by prompts.py)
  - What the citation guard validates (citation_guard.py)
  - What the evaluator scores (eval.py)
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class ActionItem(BaseModel):
    """A concrete task assigned to a person, extracted from a meeting transcript."""

    description: str = Field(
        description="What needs to be done, in one sentence."
    )
    owner: Optional[str] = Field(
        default=None,
        description="Name of the person responsible. Null if not explicitly stated.",
    )
    deadline: Optional[str] = Field(
        default=None,
        description="When it must be done. Null if not explicitly stated. "
                    "Do NOT infer or guess deadlines.",
    )
    evidence_quote: str = Field(
        description="Verbatim text from the transcript that supports this action item. "
                    "Must be an exact substring of the transcript — copy-paste, do not paraphrase.",
    )


class Decision(BaseModel):
    """A decision or agreement reached during the meeting."""

    description: str = Field(
        description="What was decided, in one sentence."
    )
    evidence_quote: str = Field(
        description="Verbatim text from the transcript that confirms this decision. "
                    "Must be an exact substring of the transcript — copy-paste, do not paraphrase.",
    )


class MeetingExtraction(BaseModel):
    """Complete structured extraction from a single meeting transcript."""

    summary: str = Field(
        description="A 2-3 sentence TL;DR of the meeting. "
                    "Cover the main topic, key outcomes, and any critical blockers."
    )
    action_items: list[ActionItem] = Field(
        default_factory=list,
        description="All concrete tasks with an owner or due date mentioned in the meeting.",
    )
    decisions: list[Decision] = Field(
        default_factory=list,
        description="All agreements, conclusions, or choices made during the meeting.",
    )
