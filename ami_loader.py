"""
ami_loader.py — AMI Meeting Corpus loader and sampler.

Loads meetings from the AMI corpus (edinburghcstr/ami, "ihm" subset) via
HuggingFace Datasets. Assembles speaker-labelled transcripts and extracts
gold summaries and action-item annotations for evaluation.

Dataset: https://huggingface.co/datasets/edinburghcstr/ami
License: CC BY 4.0

Usage:
    python ami_loader.py --n 3        # inspect 3 meetings
    python ami_loader.py --probe      # print raw field names for debugging

    from ami_loader import load_ami_samples, AMISample
    samples = load_ami_samples(n=20)
"""

from __future__ import annotations

import argparse
import textwrap
from dataclasses import dataclass, field
from typing import Any

# ── Data model ───────────────────────────────────────────────────────────────

@dataclass
class AMISample:
    """A single AMI meeting prepared for extraction and evaluation."""
    meeting_id: str
    transcript_text: str          # Full transcript as "Speaker: utterance\n" lines
    gold_summary: str             # Abstractive summary from AMI annotations (may be empty)
    gold_action_items: list[str]  # Action items from AMI annotations (may be empty)
    participants: list[str]       # Unique speaker IDs in this meeting


# ── Internal helpers ─────────────────────────────────────────────────────────

def _build_transcript_from_words(meeting_rows: list[dict]) -> tuple[str, list[str]]:
    """Aggregate word/segment-level rows into a readable speaker-turn transcript.

    AMI's HuggingFace format stores one segment per row. We group consecutive
    segments by the same speaker into turns, then format as "SpeakerID: utterance".

    Real field names (confirmed from probe):
      meeting_id, text, begin_time, end_time, microphone_id, speaker_id

    Returns:
        (transcript_text, participants_list)
    """
    if not meeting_rows:
        return "", []

    turns: list[tuple[str, list[str]]] = []  # (speaker_id, [texts])
    current_speaker = None
    current_words: list[str] = []

    for row in meeting_rows:
        # Real field: speaker_id (confirmed)
        spk = str(row.get("speaker_id") or row.get("speakerID") or "UNK")
        word = str(row.get("text") or row.get("words") or "").strip()
        if not word:
            continue

        if spk != current_speaker:
            if current_speaker is not None and current_words:
                turns.append((current_speaker, current_words))
            current_speaker = spk
            current_words = [word]
        else:
            current_words.append(word)

    if current_speaker and current_words:
        turns.append((current_speaker, current_words))

    lines = [f"{spk}: {' '.join(words)}" for spk, words in turns]
    participants = sorted(set(spk for spk, _ in turns))
    return "\n".join(lines), participants


def _build_transcript_from_text(meeting_rows: list[dict]) -> tuple[str, list[str]]:
    """Build transcript from rows that already have a text field (segment-level).
    
    Real AMI fields: speaker_id, text (confirmed from probe).
    """
    lines = []
    speakers = set()
    for row in meeting_rows:
        spk = str(row.get("speaker_id") or row.get("speakerID") or "UNK")
        text = str(row.get("text") or row.get("words") or "").strip()
        if text:
            lines.append(f"{spk}: {text}")
            speakers.add(spk)
    return "\n".join(lines), sorted(speakers)


def _extract_summary(summary_rows: Any) -> str:
    """Extract a gold summary string from whatever structure the dataset provides."""
    if summary_rows is None:
        return ""
    if isinstance(summary_rows, str):
        return summary_rows.strip()
    if isinstance(summary_rows, list):
        texts = []
        for item in summary_rows:
            if isinstance(item, str):
                texts.append(item.strip())
            elif isinstance(item, dict):
                for key in ("summary", "text", "abstractive", "value"):
                    if key in item and item[key]:
                        texts.append(str(item[key]).strip())
                        break
        return " ".join(texts)
    if isinstance(summary_rows, dict):
        for key in ("summary", "text", "abstractive", "value"):
            if key in summary_rows:
                return str(summary_rows[key]).strip()
    return ""


# ── Public API ────────────────────────────────────────────────────────────────

def load_ami_samples(
    n: int = 20,
    split: str = "test",
    config: str = "ihm",
) -> list[AMISample]:
    """Load N meetings from the AMI corpus and return AMISample objects.

    Downloads the dataset on first run (~1.5 GB for ihm audio, but only the
    transcript/annotation columns are loaded — no audio is downloaded unless
    you use the audio_path field).

    Args:
        n: Maximum number of meetings to load. Default 20.
        split: HuggingFace split to use ('train', 'validation', 'test').
        config: AMI configuration. 'ihm' = Individual Headset Mic (best quality).

    Returns:
        List of AMISample objects, one per meeting.
    """
    from datasets import load_dataset, Audio

    ds = load_dataset(
        "edinburghcstr/ami",
        config,
        split=split,
    )
    if "audio" in ds.column_names:
        ds = ds.cast_column("audio", Audio(decode=False))

    # Drop audio column — it requires torchcodec to decode and we only need text
    audio_cols = [c for c in ds.column_names if "audio" in c.lower()]
    if audio_cols:
        ds = ds.remove_columns(audio_cols)

    # Group rows by meeting_id
    meetings: dict[str, list[dict]] = {}
    for row in ds:
        mid = str(row.get("meeting_id", "unknown"))
        meetings.setdefault(mid, []).append(dict(row))

    # Detect transcript format: AMI has a 'text' field (confirmed from probe)
    first_row = next(iter(meetings.values()))[0] if meetings else {}
    has_text_field = "text" in first_row

    samples: list[AMISample] = []

    for meeting_id, rows in list(meetings.items())[:n]:
        if has_text_field:
            transcript, participants = _build_transcript_from_text(rows)
        else:
            transcript, participants = _build_transcript_from_words(rows)

        if not transcript.strip():
            continue

        # Try to extract gold summary from first row (dataset may embed it)
        first = rows[0]
        gold_summary = _extract_summary(
            first.get("summary") or first.get("abstractive_summary") or ""
        )

        # Try to extract gold action items
        raw_actions = first.get("action_items") or first.get("actions") or []
        if isinstance(raw_actions, list):
            gold_actions = [str(a).strip() for a in raw_actions if a]
        else:
            gold_actions = []

        samples.append(AMISample(
            meeting_id=meeting_id,
            transcript_text=transcript,
            gold_summary=gold_summary,
            gold_action_items=gold_actions,
            participants=participants,
        ))

    return samples


def probe_ami_fields(split: str = "test", config: str = "ihm") -> dict:
    """Return field names and a sample row from the AMI dataset for debugging."""
    from datasets import load_dataset

    ds = load_dataset(
        "edinburghcstr/ami",
        config,
        split=split,
    )
    # Drop audio before decoding any row
    audio_cols = [c for c in ds.column_names if "audio" in c.lower()]
    if audio_cols:
        ds = ds.remove_columns(audio_cols)

    row = dict(ds[0])
    return {
        "field_names": list(row.keys()),
        "sample_row": {k: str(v)[:80] for k, v in row.items()},
        "num_rows_in_split": len(ds),
    }


# ── Script entrypoint ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AMI corpus loader / inspector")
    parser.add_argument("--n", type=int, default=3, help="Number of meetings to load")
    parser.add_argument("--probe", action="store_true", help="Print raw field names and exit")
    parser.add_argument("--split", default="test")
    args = parser.parse_args()

    if args.probe:
        print("Probing AMI dataset field structure...")
        info = probe_ami_fields(split=args.split)
        print(f"Fields: {info['field_names']}")
        print(f"Rows in split: {info['num_rows_in_split']}")
        print("Sample row:")
        for k, v in info["sample_row"].items():
            print(f"  {k}: {v!r}")
    else:
        print(f"Loading {args.n} AMI meetings from '{args.split}' split...")
        samples = load_ami_samples(n=args.n, split=args.split)
        print(f"Loaded {len(samples)} meetings.\n")
        for s in samples:
            print(f"Meeting: {s.meeting_id}")
            print(f"Participants: {', '.join(s.participants)}")
            print(f"Transcript (first 200 chars): {s.transcript_text[:200]!r}")
            print(f"Gold summary: {s.gold_summary[:100]!r}" if s.gold_summary else "Gold summary: (none)")
            print(f"Gold action items: {len(s.gold_action_items)}")
            print()
