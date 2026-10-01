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

    def add_transcript_text(self, text: str, source_name: str, meeting_id: str, window_size: int = 5) -> int:
        from rag_index import _split_into_turns, _build_parent_windows

        if not text.strip():
            return 0

        turns = _split_into_turns(text)
        if not turns:
            return 0
        parents = _build_parent_windows(turns, window_size=window_size)

        for i in range(len(turns)):
            self._chunks.append({
                "text": parents[i],
                "child": turns[i],
                "source": source_name,
                "meeting": meeting_id,
            })

        return len(turns)

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

    def search(
        self,
        query: str,
        k: int = 5,
        selected_meetings: list[str] | None = None,
        stratified: bool = True,
    ) -> list[dict]:
        """Search across meetings for relevant context windows.

        Args:
            query: Natural language search query.
            k: Maximum number of results to return.
            selected_meetings: Optional list of meeting filenames/stems/IDs to filter by.
            stratified: If True and multiple meetings are selected, ensures fair-share
                        representation from each selected meeting instead of letting
                        one meeting starve all others.

        Returns:
            List of dicts with keys: text, source, meeting, score.
        """
        import faiss
        import numpy as np
        from rag_index import _embed

        if self._index is None:
            raise RuntimeError("Index not built. Call build_index() first.")

        fetch_k = len(self._chunks) if selected_meetings else min(k * 3, len(self._chunks))
        if fetch_k == 0:
            return []

        q_vec = _embed([query])
        scores, indices = self._index.search(q_vec, fetch_k)

        # Normalize selected_meetings set for fast lookup
        selected_set = None
        if selected_meetings is not None:
            selected_set = {str(m).replace('.txt', '').lower() for m in selected_meetings}
            selected_set.update(str(m).lower() for m in selected_meetings)

        def matches_filter(chunk: dict) -> bool:
            if selected_set is None:
                return True
            cm = str(chunk.get("meeting", "")).lower()
            cs = str(chunk.get("source", "")).replace(".txt", "").lower()
            cs_raw = str(chunk.get("source", "")).lower()
            return cm in selected_set or cs in selected_set or cs_raw in selected_set

        num_selected = len(selected_meetings) if selected_meetings is not None else 0
        if not stratified or num_selected <= 1:
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                chunk = self._chunks[idx].copy()
                chunk["score"] = float(score)
                if not matches_filter(chunk):
                    continue
                results.append(chunk)
                if len(results) >= k:
                    break
            return results

        # ── Stratified / Balanced Multi-Meeting Retrieval ─────────────────────
        by_meeting: dict[str, list[dict]] = {str(sm): [] for sm in selected_meetings}

        def get_chunk_meeting_key(chunk: dict) -> str | None:
            cm = str(chunk.get("meeting", ""))
            cs = str(chunk.get("source", "")).replace(".txt", "")
            for sm in selected_meetings:
                sm_str = str(sm)
                sm_clean = sm_str.replace(".txt", "").lower()
                if (cm.lower() == sm_clean or cs.lower() == sm_clean or 
                    cm.lower() == sm_str.lower() or cs.lower() == sm_str.lower()):
                    return sm_str
            return None

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = self._chunks[idx].copy()
            chunk["score"] = float(score)
            m_key = get_chunk_meeting_key(chunk)
            if m_key is not None and m_key in by_meeting:
                by_meeting[m_key].append(chunk)

        # Target total results: at least k, expanding with number of meetings so each has representation
        target_total = max(k, min(num_selected * 3, 16))
        
        # Fair-share round-robin across all selected meetings
        selected_results = []
        max_depth = max((len(chunks) for chunks in by_meeting.values()), default=0)
        
        for depth in range(max_depth):
            for sm in selected_meetings:
                meeting_chunks = by_meeting.get(str(sm), [])
                if depth < len(meeting_chunks):
                    selected_results.append(meeting_chunks[depth])
                    if len(selected_results) >= target_total:
                        break
            if len(selected_results) >= target_total:
                break

        # Sort the final stratified results by similarity score descending
        selected_results.sort(key=lambda x: x["score"], reverse=True)
        return selected_results

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
    corp: CorpusIndex | None = None,
    meeting_titles: dict[str, str] | None = None,
) -> str:
    """Ask a question across indexed meetings.

    Retrieves balanced context windows across selected meetings, then calls
    the LLM with an explicit cross-meeting synthesis prompt to generate a
    grounded, comprehensive multi-meeting answer.

    Args:
        question: Natural-language question.
        corpus_dir: Directory of the saved corpus.
        provider: LLM provider.
        k: Number of chunks to retrieve.
        selected_meetings: Optional list of meeting filenames/IDs to restrict search to.
        corp: Optional preloaded or in-memory CorpusIndex.
        meeting_titles: Optional mapping of meeting_id -> readable meeting title.

    Returns:
        Answer string synthesizing all selected meetings with citations.
    """
    from llm import call_llm

    if corp is None:
        corp = CorpusIndex()
        corp.load(corpus_dir)

    num_selected = len(selected_meetings) if selected_meetings else 0
    effective_k = max(k, min(num_selected * 3, 16)) if num_selected > 1 else k

    results = corp.search(question, k=effective_k, selected_meetings=selected_meetings, stratified=True)
    if not results:
        return "No relevant context found in the selected meetings."

    # Build context block with human-readable meeting titles
    context_parts = []
    meetings_in_context = set()
    for i, r in enumerate(results, 1):
        mid = str(r.get("meeting", ""))
        raw_source = str(r.get("source", "")).replace(".txt", "")
        title = (meeting_titles or {}).get(mid, raw_source or f"Meeting {mid}")
        meetings_in_context.add(title)
        context_parts.append(
            f"[Meeting: \"{title}\" (ID: {mid}) | Relevance: {r['score']:.3f}]\n{r['text']}"
        )
    context_block = "\n\n---\n\n".join(context_parts)

    active_titles = []
    if selected_meetings and meeting_titles:
        for sm in selected_meetings:
            t = meeting_titles.get(str(sm))
            if t and t not in active_titles:
                active_titles.append(f'"{t}"')

    target_meetings_str = ", ".join(active_titles) if active_titles else ", ".join(f'"{m}"' for m in meetings_in_context)

    system_prompt = (
        "You are an expert cross-meeting intelligence analyst for MeetingMind. "
        "Your task is to synthesize findings, decisions, and discussions across multiple meeting transcripts.\n\n"
        "Critical Requirements:\n"
        "1. BALANCED MULTI-MEETING COVERAGE: You MUST address each of the selected meetings represented in the excerpts. Do NOT focus on only one meeting.\n"
        "2. STRUCTURED CITATIONS: Organize your response with clear sections or bullet points by meeting name (e.g., '### Meeting: <Title>') or by thematic topics comparing each meeting.\n"
        "3. EXPLICIT EVIDENCE: Cite specific speakers, metrics, engineering decisions, and commitments mentioned in the excerpts.\n"
        "4. CROSS-MEETING COMPARISON: If the question asks about progress, status, or decisions across meetings, explicitly contrast differences between them.\n"
        "5. FACTUAL: Rely strictly on the provided excerpts. Do not hallucinate."
    )
    user_msg = (
        f"Question: {question}\n\n"
        f"Target Meetings: {target_meetings_str}\n\n"
        f"Relevant excerpts from the selected meetings:\n\n{context_block}\n\n"
        f"Provide a comprehensive, cross-meeting synthesis answering the question."
    )

    return call_llm(provider, system_prompt, user_msg)
