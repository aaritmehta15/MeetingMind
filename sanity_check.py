"""
sanity_check.py — Step 1 verification script.

Verifies that every required import resolves and the two free-tier LLM
providers can be reached (if keys are present). Missing keys produce a
warning, not a crash — add them to .env before Step 2.

Run:
    python sanity_check.py
"""

import os
import sys

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()  # load .env if present

console = Console()
table = Table(title="Sanity Check — MeetingMind Evaluator", show_lines=True)
table.add_column("Check", style="bold")
table.add_column("Status")
table.add_column("Notes")

results: list[tuple[str, str, str]] = []


def check(name: str, fn):
    try:
        note = fn()
        results.append((name, "[green]OK[/green]", note or ""))
    except Exception as e:
        results.append((name, "[red]FAIL[/red]", str(e)[:80]))


# ── Core imports ────────────────────────────────────────────────────────────

check("pydantic v2", lambda: __import__("pydantic") and f"v{__import__('pydantic').VERSION}")
check("python-dotenv", lambda: __import__("dotenv") and "loaded")
check("rich", lambda: "already using it")

# ── LLM SDKs ────────────────────────────────────────────────────────────────

check("groq SDK", lambda: __import__("groq") and "importable")
check("google-genai SDK", lambda: __import__("google.genai") and "importable")

# ── Embeddings + vector store ────────────────────────────────────────────────

def _check_st():
    from sentence_transformers import SentenceTransformer
    # Load the small model — downloads ~80 MB on first run
    model = SentenceTransformer("all-MiniLM-L6-v2")
    vec = model.encode("hello world")
    return f"all-MiniLM-L6-v2 OK, dim={len(vec)}"

check("sentence-transformers", _check_st)

def _check_faiss():
    import faiss
    import numpy as np
    idx = faiss.IndexFlatIP(384)
    vec = np.random.rand(1, 384).astype("float32")
    idx.add(vec)
    return f"IndexFlatIP OK, ntotal={idx.ntotal}"

check("faiss-cpu", _check_faiss)

# ── Evaluation libs ──────────────────────────────────────────────────────────

check("rouge-score", lambda: __import__("rouge_score") and "importable")
check("bert-score", lambda: __import__("bert_score") and "importable")

# ── Dataset loading ──────────────────────────────────────────────────────────

check("HuggingFace datasets", lambda: __import__("datasets") and "importable")

# ── LLM connectivity (if keys present) ──────────────────────────────────────

def _check_groq():
    key = os.getenv("GROQ_API_KEY", "")
    if not key or key == "your_groq_key_here":
        return "[yellow]SKIP — GROQ_API_KEY not set[/yellow]"
    from groq import Groq
    client = Groq(api_key=key)
    resp = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=[{"role": "user", "content": "Reply with the single word: hello"}],
        max_tokens=5,
    )
    return f"response: {resp.choices[0].message.content.strip()!r}"

def _check_gemini():
    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_gemini_key_here":
        return "[yellow]SKIP — GEMINI_API_KEY not set[/yellow]"
    from google import genai
    client = genai.Client(api_key=key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    resp = client.models.generate_content(
        model=model,
        contents="Reply with the single word: hello",
    )
    return f"response: {resp.text.strip()!r}"

check("Groq API call", _check_groq)
check("Gemini API call", _check_gemini)

# ── Print results ────────────────────────────────────────────────────────────

for name, status, note in results:
    table.add_row(name, status, note)

console.print()
console.print(table)

failures = [r for r in results if "FAIL" in r[1]]
skips = [r for r in results if "SKIP" in r[2]]

console.print()
if failures:
    console.print(f"[red bold]{len(failures)} check(s) FAILED — fix before proceeding.[/red bold]")
    sys.exit(1)
elif skips:
    console.print(
        "[yellow]All imports OK. API key check(s) skipped.[/yellow]\n"
        "Copy [bold].env.example[/bold] -> [bold].env[/bold] and fill in at least one key before Step 2."
    )
else:
    console.print("[green bold]All checks passed — environment is ready.[/green bold]")
