"""
eval.py — Evaluation script: ROUGE + action-item precision/recall + citation-guard rejection rate.

Runs the extraction pipeline on N AMI meetings and scores output quality:
  - ROUGE-1/2/L (summary quality vs. AMI gold summaries)
  - Precision/recall/F1 for extracted action items vs. AMI gold annotations
  - Citation-guard rejection rate (fraction of hallucinated evidence quotes)

Usage:
    python eval.py --n 20
    python eval.py --n 5 --provider gemini
    python eval.py --n 20 --speaker-context   # speaker-adaptive prompting A/B
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

from ami_loader import load_ami_samples, AMISample
from extractor import run_extraction
from schemas import MeetingExtraction

load_dotenv()

_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") \
    if hasattr(sys.stdout, "buffer") else sys.stdout
console = Console(file=_stdout, highlight=False)


# ── Soft matching for action items ────────────────────────────────────────────

def _token_jaccard(a: str, b: str) -> float:
    """Jaccard similarity between the token sets of two strings."""
    ta = set(a.lower().split())
    tb = set(b.lower().split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _match_action_items(
    predicted: list[str],
    gold: list[str],
    threshold: float = 0.35,
) -> tuple[float, float, float]:
    """Compute precision, recall, F1 for action items using Jaccard soft matching.

    An extracted item is a true positive if it has Jaccard >= threshold
    with at least one gold item.

    Args:
        predicted: Extracted action item descriptions.
        gold: Gold-standard action item descriptions.
        threshold: Minimum Jaccard for a match.

    Returns:
        (precision, recall, f1) — all in [0, 1].
    """
    if not predicted and not gold:
        return 1.0, 1.0, 1.0
    if not predicted:
        return 0.0, 0.0, 0.0
    if not gold:
        return 0.0, 0.0, 0.0

    tp = 0
    matched_gold = set()

    for pred in predicted:
        for gi, g in enumerate(gold):
            if gi not in matched_gold and _token_jaccard(pred, g) >= threshold:
                tp += 1
                matched_gold.add(gi)
                break

    precision = tp / len(predicted)
    recall = tp / len(gold)
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return precision, recall, f1


# ── ROUGE scoring ─────────────────────────────────────────────────────────────

def _rouge_score(hypothesis: str, reference: str) -> dict[str, float]:
    """Score a hypothesis summary against a reference using ROUGE-1/2/L.

    Returns:
        dict with keys 'rouge_1', 'rouge_2', 'rouge_l' — all F-measures.
        Returns zeros if either string is empty.
    """
    from rouge_score import rouge_scorer

    if not hypothesis.strip() or not reference.strip():
        return {"rouge_1": 0.0, "rouge_2": 0.0, "rouge_l": 0.0}

    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    scores = scorer.score(reference, hypothesis)
    return {
        "rouge_1": scores["rouge1"].fmeasure,
        "rouge_2": scores["rouge2"].fmeasure,
        "rouge_l": scores["rougeL"].fmeasure,
    }


# ── Per-meeting eval ──────────────────────────────────────────────────────────

def eval_meeting(
    sample: AMISample,
    provider: str,
    speaker_context: bool,
) -> dict:
    """Run extraction on one AMI meeting and return its evaluation metrics."""
    participants = sample.participants if speaker_context else None

    extraction, report = run_extraction(
        sample.transcript_text,
        provider=provider,
        participants=participants,
    )

    # ROUGE (only useful if AMI provides a gold summary)
    rouge = _rouge_score(extraction.summary, sample.gold_summary)

    # Action-item P/R/F1
    predicted_actions = [a.description for a in extraction.action_items]
    precision, recall, f1 = _match_action_items(predicted_actions, sample.gold_action_items)

    return {
        "meeting_id": sample.meeting_id,
        "rouge_1": rouge["rouge_1"],
        "rouge_2": rouge["rouge_2"],
        "rouge_l": rouge["rouge_l"],
        "action_precision": precision,
        "action_recall": recall,
        "action_f1": f1,
        "rejection_rate": report.rejection_rate,
        "n_extracted_actions": len(extraction.action_items),
        "n_gold_actions": len(sample.gold_action_items),
        "n_extracted_decisions": len(extraction.decisions),
        "has_gold_summary": bool(sample.gold_summary),
    }


# ── Main eval loop ────────────────────────────────────────────────────────────

def run_eval(
    n: int = 20,
    provider: str = "groq",
    split: str = "test",
    speaker_context: bool = False,
    rate_limit_sleep: float = 5.0,
    out_path: str = "eval_results.json",
) -> list[dict]:
    """Run evaluation on N AMI meetings.

    Args:
        n: Number of meetings to evaluate.
        provider: LLM provider.
        split: AMI split ('train', 'validation', 'test').
        speaker_context: Whether to inject participant names into prompt.
        rate_limit_sleep: Seconds to sleep between LLM calls (Groq free tier: 30 req/min).
        out_path: Where to save the JSON results.

    Returns:
        List of per-meeting result dicts.
    """
    console.print(f"\n[bold blue]Loading {n} AMI meetings from '{split}' split...[/bold blue]")
    samples = load_ami_samples(n=n, split=split)
    console.print(f"Loaded {len(samples)} meetings. Starting evaluation...\n")

    results = []
    for i, sample in enumerate(samples):
        console.print(f"[dim]({i+1}/{len(samples)}) {sample.meeting_id}[/dim]", end=" ")
        try:
            metrics = eval_meeting(sample, provider=provider, speaker_context=speaker_context)
            results.append(metrics)
            console.print(
                f"[green]OK[/green] "
                f"R1={metrics['rouge_1']:.3f} "
                f"F1={metrics['action_f1']:.3f} "
                f"rej={metrics['rejection_rate']:.0%}"
            )
        except Exception as e:
            console.print(f"[red]ERROR: {e}[/red]")
            results.append({"meeting_id": sample.meeting_id, "error": str(e)})

        if i < len(samples) - 1:
            time.sleep(rate_limit_sleep)

    # Aggregate
    valid = [r for r in results if "error" not in r]
    if valid:
        agg = {
            "n_meetings": len(valid),
            "rouge_1": sum(r["rouge_1"] for r in valid) / len(valid),
            "rouge_2": sum(r["rouge_2"] for r in valid) / len(valid),
            "rouge_l": sum(r["rouge_l"] for r in valid) / len(valid),
            "action_precision": sum(r["action_precision"] for r in valid) / len(valid),
            "action_recall": sum(r["action_recall"] for r in valid) / len(valid),
            "action_f1": sum(r["action_f1"] for r in valid) / len(valid),
            "rejection_rate": sum(r["rejection_rate"] for r in valid) / len(valid),
        }
    else:
        agg = {}

    output = {"aggregate": agg, "per_meeting": results}
    Path(out_path).write_text(json.dumps(output, indent=2), encoding="utf-8")

    _print_results_table(agg, valid)
    console.print(f"\n[dim]Saved full results to {out_path}[/dim]")
    return results


def _print_results_table(agg: dict, results: list[dict]) -> None:
    """Print the aggregate results in a Rich table."""
    if not agg:
        console.print("[red]No valid results to display.[/red]")
        return

    console.print()
    table = Table(
        title=f"Evaluation Results ({agg['n_meetings']} meetings)",
        show_lines=True,
        border_style="blue",
    )
    table.add_column("Metric", style="bold")
    table.add_column("Score")
    table.add_column("Interpretation")

    def fmt(v: float) -> str:
        return f"{v:.4f}"

    table.add_row("ROUGE-1", fmt(agg["rouge_1"]), "Unigram overlap (summary quality)")
    table.add_row("ROUGE-2", fmt(agg["rouge_2"]), "Bigram overlap")
    table.add_row("ROUGE-L", fmt(agg["rouge_l"]), "Longest common subsequence")
    table.add_row("Action Precision", fmt(agg["action_precision"]), "Extracted items that match gold")
    table.add_row("Action Recall", fmt(agg["action_recall"]), "Gold items captured by extraction")
    table.add_row("Action F1", fmt(agg["action_f1"]), "Harmonic mean of P+R")
    rej = agg["rejection_rate"]
    rej_style = "green" if rej < 0.1 else "yellow" if rej < 0.3 else "red"
    table.add_row(
        "Citation Rejection Rate",
        f"[{rej_style}]{fmt(rej)}[/{rej_style}]",
        "Fraction of items with unverifiable quotes (lower is better)",
    )
    console.print(table)


# ── Script entrypoint ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate extraction quality on AMI corpus")
    parser.add_argument("--n", type=int, default=20, help="Number of meetings to evaluate")
    parser.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])
    parser.add_argument("--split", default="test", help="AMI split: train/validation/test")
    parser.add_argument("--speaker-context", action="store_true", help="Inject participant names")
    parser.add_argument("--out", default="eval_results.json", help="Output JSON path")
    args = parser.parse_args()

    run_eval(
        n=args.n,
        provider=args.provider,
        split=args.split,
        speaker_context=args.speaker_context,
        out_path=args.out,
    )
