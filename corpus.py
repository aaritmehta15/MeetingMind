"""
corpus.py — Cross-meeting RAG corpus for multi-meeting Q&A.

Builds a persistent FAISS index across multiple transcript files.
Each chunk is labelled with its source meeting file so answers can
cite which meeting they came from.

Usage:
    from corpus import build_corpus, corpus_ask
    from pathlib import Path

    build_corpus(list(Path("examples/").glob("*.txt")), corpus_dir=Path("corpus"))
    answer = corpus_ask("what was decided about CI/CD?", corpus_dir=Path("corpus"))

    python cli.py corpus-build examples/
    python cli.py corpus-ask "what was decided about CI/CD?"
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

load_dotenv()

_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") \
    if hasattr(sys.stdout, "buffer") else sys.stdout
console = Console(file=_stdout, highlight=False)


# ── Corpus index ──────────────────────────────────────────────────────────────

class CorpusIndex:
    """A FAISS index over chunks from multiple transcript files.

    Each chunk is a parent window (5-turn context), tagged with its source file.
    All chunks from all meetings are indexed together for cross-meeting search.
    """

    EMBEDDING_DIM = 384

    def __init__(self):
        self._chunks: list[dict] = []   # {"text": ..., "source": ..., "meeting": ...}
        self._index = None

    def add_transcript(self, path: Path, window_size: int = 5) -> int:
        """Add all chunks from a transcript file to the corpus.

        Returns:
            Number of chunks added.
        """
        from rag_index import HierarchicalRAGIndex

        text = path.read_text(encoding="utf-8").strip()
        if not text:
            return 0

        idx = HierarchicalRAGIndex(window_size=window_size)
        idx.build(text)

        for i in range(idx.num_chunks):
            self._chunks.append({
                "text": idx._parents[i],
                "child": idx._children[i],
                "source": path.name,
                "meeting": path.stem,
            })

        return idx.num_chunks

    def build_index(self) -> None:
        """Build the FAISS index over all added chunks."""
        import faiss
        import numpy as np
        from rag_index import _embed

        if not self._chunks:
            raise ValueError("No chunks added. Call add_transcript() first.")

        texts = [c["text"] for c in self._chunks]
        vecs = _embed(texts)

        self._index = faiss.IndexFlatIP(self.EMBEDDING_DIM)
        self._index.add(vecs)

    def search(self, query: str, k: int = 5, selected_meetings: list[str] | None = None) -> list[dict]:
        """Search across meetings for relevant context windows.

        Args:
            query: Natural language search query.
            k: Maximum number of results to return.
            selected_meetings: Optional list of meeting filenames/stems to filter by.

        Returns:
            List of dicts with keys: text, source, meeting, score.
        """
        import faiss
        import numpy as np
        from rag_index import _embed

        if self._index is None:
            raise RuntimeError("Index not built. Call build_index() first.")

        # If filtering, search a larger candidate pool to ensure we find enough matching chunks
        fetch_k = len(self._chunks) if selected_meetings else min(k * 3, len(self._chunks))
        if fetch_k == 0:
            return []

        q_vec = _embed([query])
        scores, indices = self._index.search(q_vec, fetch_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = self._chunks[idx].copy()
            chunk["score"] = float(score)
            
            # Apply meeting filter if specified
            if selected_meetings is not None:
                meeting_match = (
                    chunk["meeting"] in selected_meetings or
                    chunk["source"] in selected_meetings or
                    any(m.replace('.txt', '') == chunk["meeting"] for m in selected_meetings)
                )
                if not meeting_match:
                    continue

            results.append(chunk)
            if len(results) >= k:
                break
        return results

    def save(self, corpus_dir: Path) -> None:
        """Save corpus index to disk."""
        import faiss

        corpus_dir.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(corpus_dir / "corpus.faiss"))
        (corpus_dir / "corpus.meta.json").write_text(
            json.dumps(self._chunks, ensure_ascii=False), encoding="utf-8"
        )

    def load(self, corpus_dir: Path) -> None:
        """Load a saved corpus index."""
        import faiss

        self._index = faiss.read_index(str(corpus_dir / "corpus.faiss"))
        self._chunks = json.loads((corpus_dir / "corpus.meta.json").read_text(encoding="utf-8"))


# ── Public API ────────────────────────────────────────────────────────────────

def build_corpus(transcript_paths: list[Path], corpus_dir: Path = Path("corpus")) -> CorpusIndex:
    """Build and save a cross-meeting corpus from a list of transcript files.

    Args:
        transcript_paths: List of .txt transcript file paths.
        corpus_dir: Directory where the corpus index will be saved.

    Returns:
        The built CorpusIndex.
    """
    corp = CorpusIndex()
    total = 0
    for path in transcript_paths:
        n = corp.add_transcript(path)
        console.print(f"  [dim]{path.name}: {n} chunks added[/dim]")
        total += n

    console.print(f"[blue]Total chunks: {total}. Building FAISS index...[/blue]")
    corp.build_index()
    corp.save(corpus_dir)
    console.print(f"[green]Corpus saved to {corpus_dir}/ ({total} chunks from {len(transcript_paths)} meetings)[/green]")
    return corp


def corpus_ask(
    question: str,
    corpus_dir: Path = Path("corpus"),
    provider: str = "groq",
    k: int = 5,
    selected_meetings: list[str] | None = None,
) -> str:
    """Ask a question across indexed meetings.

    Retrieves the top-k context windows, then calls the LLM with a
    synthesis prompt to generate a grounded, cross-meeting answer.

    Args:
        question: Natural-language question.
        corpus_dir: Directory of the saved corpus.
        provider: LLM provider.
        k: Number of chunks to retrieve.
        selected_meetings: Optional list of meeting filenames to restrict search to.

    Returns:
        Answer string with meeting citations.
    """
    from llm import call_llm

    corp = CorpusIndex()
    corp.load(corpus_dir)

    results = corp.search(question, k=k, selected_meetings=selected_meetings)
    if not results:
        return "No relevant context found in the selected meetings."

    # Build context block with source labels
    context_parts = []
    for i, r in enumerate(results, 1):
        context_parts.append(
            f"[Source: {r['meeting']} | relevance={r['score']:.3f}]\n{r['text']}"
        )
    context_block = "\n\n---\n\n".join(context_parts)

    system_prompt = (
        "You are a cross-meeting analyst. You answer questions by synthesising "
        "evidence from multiple meeting transcripts. Always cite which meeting "
        "(by filename) each piece of evidence comes from. Be concise and factual."
    )
    user_msg = (
        f"Question: {question}\n\n"
        f"Relevant excerpts from the meeting corpus:\n\n{context_block}"
    )

    return call_llm(provider, system_prompt, user_msg)
