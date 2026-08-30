"""
cli.py — Command-line interface for MeetingMind Evaluator.

Commands:
    extract     Extract structured info from a single transcript
    search      RAG-search a single transcript with a natural-language query
    ask         Ask a question about a transcript via the ReAct agent
    eval        Run evaluation on AMI corpus meetings
    corpus-build  Build a persistent cross-meeting RAG corpus
    corpus-ask    Ask a question across all indexed meetings

Usage:
    python cli.py extract transcript.txt
    python cli.py search  transcript.txt "who owns the roadmap?"
    python cli.py ask     transcript.txt "what did Edd agree to do?"
    python cli.py eval    --n 20
    python cli.py corpus-build examples/
    python cli.py corpus-ask   "what was decided about CI/CD?"
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import warnings
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore", category=UserWarning)

from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

load_dotenv()

_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") \
    if hasattr(sys.stdout, "buffer") else sys.stdout
console = Console(file=_stdout, highlight=False)


# ── extract ───────────────────────────────────────────────────────────────────

def cmd_extract(args: argparse.Namespace) -> None:
    from extractor import display_extraction, load_transcript, run_extraction

    transcript_path = Path(args.transcript)
    text = load_transcript(transcript_path)
    extraction, report = run_extraction(text, provider=args.provider)
    display_extraction(extraction, report, source_name=transcript_path.name)

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


# ── search ────────────────────────────────────────────────────────────────────

def cmd_search(args: argparse.Namespace) -> None:
    from extractor import load_transcript
    from rag_index import HierarchicalRAGIndex

    transcript_path = Path(args.transcript)
    index_path = transcript_path.with_suffix(".ragindex")

    text = load_transcript(transcript_path)
    idx = HierarchicalRAGIndex()

    if index_path.exists():
        console.print(f"[dim]Loading cached RAG index from {index_path}...[/dim]")
        idx.load(str(index_path))
    else:
        console.print(f"[dim]Building RAG index for {transcript_path.name}...[/dim]")
        idx.build(text)
        idx.save(str(index_path))
        console.print(f"[dim]Index saved to {index_path}[/dim]")

    results = idx.search(args.query, k=args.k)
    console.print()
    console.rule(f"[bold blue]RAG Search — top {len(results)} results[/bold blue]")

    for i, r in enumerate(results, 1):
        console.print(f"\n[bold]Result {i}[/bold] (score: {r.score:.4f})")
        console.print(f"[cyan]Child match:[/cyan] {r.child_text}")
        console.print(f"[green]Parent window (context passed to LLM):[/green]")
        console.print(r.parent_window)
        console.print("[dim]" + "─" * 60 + "[/dim]")


# ── ask ───────────────────────────────────────────────────────────────────────

def cmd_ask(args: argparse.Namespace) -> None:
    from agent import run_agent

    answer = run_agent(
        question=args.question,
        transcript_path=args.transcript,
        provider=args.provider,
    )
    console.print()
    console.rule("[bold blue]Agent Answer[/bold blue]")
    console.print(answer)


# ── eval ──────────────────────────────────────────────────────────────────────

def cmd_eval(args: argparse.Namespace) -> None:
    from eval import run_eval

    run_eval(
        n=args.n,
        provider=args.provider,
        split=args.split,
        speaker_context=args.speaker_context,
        out_path=args.out,
    )


# ── corpus-build ──────────────────────────────────────────────────────────────

def cmd_corpus_build(args: argparse.Namespace) -> None:
    from corpus import build_corpus

    folder = Path(args.folder)
    txt_files = list(folder.glob("*.txt"))
    if not txt_files:
        console.print(f"[red]No .txt files found in {folder}[/red]")
        sys.exit(1)

    console.print(f"[blue]Building corpus from {len(txt_files)} transcripts in {folder}...[/blue]")
    build_corpus(txt_files, corpus_dir=Path(args.corpus_dir))
    console.print(f"[green]Corpus built at {args.corpus_dir}[/green]")


# ── corpus-ask ────────────────────────────────────────────────────────────────

def cmd_corpus_ask(args: argparse.Namespace) -> None:
    from corpus import corpus_ask

    answer = corpus_ask(
        question=args.question,
        corpus_dir=Path(args.corpus_dir),
        provider=args.provider,
        k=args.k,
    )
    console.print()
    console.rule("[bold blue]Corpus Answer[/bold blue]")
    console.print(answer)


# ── Argument parser ───────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="MeetingMind Evaluator — structured extraction, RAG Q&A, and evaluation",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # extract
    p_extract = sub.add_parser("extract", help="Extract action items and decisions from a transcript")
    p_extract.add_argument("transcript", help="Path to transcript .txt file")
    p_extract.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])

    # search
    p_search = sub.add_parser("search", help="Hierarchical RAG search over a transcript")
    p_search.add_argument("transcript", help="Path to transcript .txt file")
    p_search.add_argument("query", help="Natural-language query")
    p_search.add_argument("--k", type=int, default=3, help="Number of results")

    # ask
    p_ask = sub.add_parser("ask", help="Ask a question about a transcript via the ReAct agent")
    p_ask.add_argument("transcript", help="Path to transcript .txt file")
    p_ask.add_argument("question", help="Natural-language question")
    p_ask.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])

    # eval
    p_eval = sub.add_parser("eval", help="Run evaluation on AMI corpus")
    p_eval.add_argument("--n", type=int, default=20, help="Number of meetings to evaluate")
    p_eval.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])
    p_eval.add_argument("--split", default="test", choices=["train", "validation", "test"])
    p_eval.add_argument("--speaker-context", action="store_true")
    p_eval.add_argument("--out", default="eval_results.json")

    # corpus-build
    p_cb = sub.add_parser("corpus-build", help="Build a cross-meeting RAG corpus from a folder of transcripts")
    p_cb.add_argument("folder", help="Folder containing .txt transcript files")
    p_cb.add_argument("--corpus-dir", default="corpus", help="Where to store the corpus index")

    # corpus-ask
    p_ca = sub.add_parser("corpus-ask", help="Ask a question across all indexed meetings")
    p_ca.add_argument("question", help="Natural-language question")
    p_ca.add_argument("--corpus-dir", default="corpus")
    p_ca.add_argument("--provider", default="groq", choices=["groq", "gemini", "ollama"])
    p_ca.add_argument("--k", type=int, default=5, help="Number of chunks to retrieve")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "extract": cmd_extract,
        "search": cmd_search,
        "ask": cmd_ask,
        "eval": cmd_eval,
        "corpus-build": cmd_corpus_build,
        "corpus-ask": cmd_corpus_ask,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
