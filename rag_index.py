"""
rag_index.py — Hierarchical Parent-Child RAG index for meeting transcripts.

Design rationale (why this type of RAG):
  Meeting transcripts are conversational. A single retrieved utterance like
  "I'll handle that." is meaningless without its surrounding context (who said
  what, in response to which question). Naive flat chunking loses this context.

  Solution — Parent-Child RAG:
  - CHILD chunks: individual speaker turns (~1-2 lines). Small & precise.
    These are embedded and searched — retrieval targets are specific.
  - PARENT windows: ~5 consecutive turns centred on the child. Wide enough
    for full conversational context. These are passed to the LLM.
  - Mapping: each child knows its parent window index. After retrieval, we
    expand child hits to their parent windows before generation.

This is the correct type of RAG for dialogue data. For document or FAQ data,
standard sentence-level chunking would be fine; here it would not be.

Usage:
    from rag_index import HierarchicalRAGIndex
    idx = HierarchicalRAGIndex()
    idx.build(transcript_text)
    results = idx.search("who owns the roadmap?", k=3)
    for r in results:
        print(r.parent_window)  # pass this to the LLM

    idx.save("my_meeting.ragindex")
    idx.load("my_meeting.ragindex")
"""

from __future__ import annotations

import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import json
import re
import math
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

try:
    import faiss
    _has_faiss = True
except Exception:
    faiss = None
    _has_faiss = False

import numpy as np


class _NumpyIndexFlatIP:
    """Pure NumPy fallback for FAISS IndexFlatIP (Cosine Similarity)."""
    def __init__(self, dim: int):
        self.dim = dim
        self._vectors: np.ndarray | None = None

    def add(self, vecs: np.ndarray) -> None:
        v = np.asarray(vecs, dtype=np.float32)
        if self._vectors is None:
            self._vectors = v
        else:
            self._vectors = np.vstack([self._vectors, v])

    def search(self, q_vec: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        if self._vectors is None or len(self._vectors) == 0:
            return np.zeros((1, 0), dtype=np.float32), np.zeros((1, 0), dtype=np.int64)
        k_capped = min(k, len(self._vectors))
        q = np.asarray(q_vec, dtype=np.float32)
        scores_all = np.dot(q, self._vectors.T)  # shape (1, n)
        idx_sorted = np.argsort(-scores_all, axis=1)[:, :k_capped]
        top_scores = np.take_along_axis(scores_all, idx_sorted, axis=1)
        return top_scores.astype(np.float32), idx_sorted.astype(np.int64)


def create_index_flat_ip(dim: int):
    """Factory creating FAISS IndexFlatIP or NumPy fallback if blocked."""
    if _has_faiss and faiss is not None:
        try:
            return faiss.IndexFlatIP(dim)
        except Exception:
            pass
    return _NumpyIndexFlatIP(dim)



# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class RAGResult:
    """A single retrieval result from the Hierarchical RAG index."""
    child_text: str       # The specific utterance that matched the query
    parent_window: str    # The surrounding conversational context (for the LLM)
    score: float          # Cosine similarity score (higher = more relevant)
    child_index: int      # Index of child chunk in the index
    parent_index: int     # Index of parent window in the index


# ── Chunking logic ────────────────────────────────────────────────────────────

def _split_into_turns(transcript_text: str) -> list[str]:
    """Split a transcript into individual speaker turns.

    Handles formats:
      "Speaker: text"  (our standard format)
      Plain sentences (fallback)

    Returns a list of turn strings.
    """
    lines = transcript_text.strip().splitlines()
    turns = []
    current_turn = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # New speaker turn (matches "Name: text" or "Name (role): text")
        if re.match(r"^[\w\s\(\)]+:\s+.+", line):
            if current_turn:
                turns.append(" ".join(current_turn))
            current_turn = [line]
        else:
            # Continuation of current turn (rare in well-formatted transcripts)
            if current_turn:
                current_turn.append(line)
            else:
                current_turn = [line]

    if current_turn:
        turns.append(" ".join(current_turn))

    # Fallback: if no speaker turns detected, split on sentence boundaries
    if len(turns) <= 1:
        sentences = re.split(r"(?<=[.!?])\s+", transcript_text.strip())
        turns = [s.strip() for s in sentences if s.strip()]

    return turns


def _build_parent_windows(turns: list[str], window_size: int = 5) -> list[str]:
    """Build parent windows: for each turn, its window is the surrounding N turns.

    Each child turn i maps to a parent window of `window_size` turns centred on i.

    Args:
        turns: List of speaker turn strings.
        window_size: Number of turns in each parent window (default 5).

    Returns:
        List of parent window strings, one per turn.
    """
    half = window_size // 2
    windows = []
    for i in range(len(turns)):
        start = max(0, i - half)
        end = min(len(turns), i + half + 1)
        window = "\n".join(turns[start:end])
        windows.append(window)
    return windows


# ── Embedding ─────────────────────────────────────────────────────────────────

_model = None
_fallback_vectorizer = None

def _get_embedding_model():
    global _model
    if _model is False:
        return None
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            _model = False
    return _model


class _PurePythonTFIDF:
    """Zero-dependency pure Python/NumPy TF-IDF vectorizer that needs no C++ DLLs."""
    def __init__(self, dim: int = 384):
        self.dim = dim
        self.vocab: dict[str, int] = {}
        self.idf: dict[str, float] = {}

    def fit_transform(self, docs: list[str]) -> np.ndarray:
        doc_tokens = []
        df = Counter()
        for doc in docs:
            tokens = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", doc.lower())
            doc_tokens.append(tokens)
            df.update(set(tokens))
        top_words = [w for w, _ in df.most_common(self.dim)]
        self.vocab = {w: i for i, w in enumerate(top_words)}
        n_docs = max(len(docs), 1)
        self.idf = {w: math.log((1 + n_docs) / (1 + df[w])) + 1.0 for w in self.vocab}
        return self._transform_tokens(doc_tokens)

    def transform(self, docs: list[str]) -> np.ndarray:
        doc_tokens = [re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", doc.lower()) for doc in docs]
        return self._transform_tokens(doc_tokens)

    def _transform_tokens(self, doc_tokens_list: list[list[str]]) -> np.ndarray:
        mat = np.zeros((len(doc_tokens_list), self.dim), dtype=np.float32)
        for row, tokens in enumerate(doc_tokens_list):
            counts = Counter(tokens)
            for word, count in counts.items():
                if word in self.vocab:
                    col = self.vocab[word]
                    mat[row, col] = (1.0 + math.log(count)) * self.idf[word]
        return mat


def _embed(texts: list[str]) -> np.ndarray:
    """Embed a list of texts. Returns float32 array of shape (n, 384)."""
    model = _get_embedding_model()
    vecs = None
    if model is not None:
        try:
            vecs = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        except Exception:
            vecs = None

    if vecs is None:
        global _fallback_vectorizer
        if _fallback_vectorizer is None:
            _fallback_vectorizer = _PurePythonTFIDF(HierarchicalRAGIndex.EMBEDDING_DIM)
            vecs = _fallback_vectorizer.fit_transform(texts)
        else:
            vecs = _fallback_vectorizer.transform(texts)

    # Normalise for cosine similarity via IndexFlatIP
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    return (vecs / norms).astype("float32")


# ── HierarchicalRAGIndex ──────────────────────────────────────────────────────

class HierarchicalRAGIndex:
    """Hierarchical Parent-Child RAG index for a single meeting transcript.

    Child utterances are embedded and indexed for precise retrieval.
    Parent windows (surrounding context) are expanded after retrieval
    and passed to the LLM for answer generation.
    """

    EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension

    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self._children: list[str] = []       # child turn texts
        self._parents: list[str] = []         # parent window texts (one per child)
        self._index = None

    def build(self, transcript_text: str) -> None:
        """Build the index from a transcript string.

        Args:
            transcript_text: Full transcript text (speaker-labelled turns).
        """
        turns = _split_into_turns(transcript_text)
        if not turns:
            raise ValueError("Transcript produced no turns after splitting.")

        parent_windows = _build_parent_windows(turns, window_size=self.window_size)

        self._children = turns
        self._parents = parent_windows

        embeddings = _embed(turns)
        self._index = create_index_flat_ip(self.EMBEDDING_DIM)
        self._index.add(embeddings)

    def search(self, query: str, k: int = 3) -> list[RAGResult]:
        """Search the index for the top-k relevant child turns.

        Returns RAGResult objects containing both the child match and
        its expanded parent window.

        Args:
            query: Natural-language query string.
            k: Number of results to return.

        Returns:
            List of RAGResult, ordered by descending similarity score.
        """
        if self._index is None or not self._children:
            raise RuntimeError("Index not built. Call build() or load() first.")

        k_capped = min(k, len(self._children))
        q_vec = _embed([query])
        scores, indices = self._index.search(q_vec, k_capped)

        results = []
        seen_parents: set[int] = set()

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            parent_idx = idx  # one parent window per child — same index
            parent_key = parent_idx  # deduplicate overlapping parent windows

            if parent_key in seen_parents:
                continue
            seen_parents.add(parent_key)

            results.append(RAGResult(
                child_text=self._children[idx],
                parent_window=self._parents[parent_idx],
                score=float(score),
                child_index=int(idx),
                parent_index=int(parent_idx),
            ))

        return results

    def save(self, path: str) -> None:
        """Serialize the index to disk.

        Saves two files:
          <path>.npy or <path>.faiss — the vector index
          <path>.meta.json           — child texts, parent windows, config
        """
        p = Path(path)
        if hasattr(self._index, "_vectors"):
            np.save(str(p) + ".npy", self._index._vectors)
        elif _has_faiss and faiss is not None:
            try:
                faiss.write_index(self._index, str(p) + ".faiss")
            except Exception:
                pass
        meta = {
            "window_size": self.window_size,
            "children": self._children,
            "parents": self._parents,
        }
        (Path(str(p) + ".meta.json")).write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8"
        )

    def load(self, path: str) -> None:
        """Load a previously saved index from disk."""
        p = str(path)
        npy_path = Path(p + ".npy")
        faiss_path = Path(p + ".faiss")
        if npy_path.exists():
            vecs = np.load(str(npy_path))
            self._index = _NumpyIndexFlatIP(self.EMBEDDING_DIM)
            self._index.add(vecs)
        elif faiss_path.exists() and _has_faiss and faiss is not None:
            try:
                self._index = faiss.read_index(str(faiss_path))
            except Exception:
                pass
        meta = json.loads(Path(p + ".meta.json").read_text(encoding="utf-8"))
        self.window_size = meta["window_size"]
        self._children = meta["children"]
        self._parents = meta["parents"]

    @property
    def num_chunks(self) -> int:
        return len(self._children)
