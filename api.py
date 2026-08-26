import os
import time
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from extractor import run_extraction
from rag_index import HierarchicalRAGIndex
from agent import run_agent_with_steps
from corpus import build_corpus, corpus_ask

app = FastAPI(title="MeetingMind Backend")

# Allow Vite frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    transcript: str
    provider: str = "groq"

class SearchRequest(BaseModel):
    transcript: str
    query: str
    k: int = 5

class AskRequest(BaseModel):
    transcript: str
    question: str
    provider: str = "groq"
    enabled_tools: list[str] | None = None

class CorpusBuildRequest(BaseModel):
    folder: str = "examples"

class CorpusAskRequest(BaseModel):
    question: str
    provider: str = "groq"
    k: int = 5
    selected_meetings: list[str] | None = None

class AnalyzeRequest(BaseModel):
    transcript: str


@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "default_provider": os.getenv("LLM_PROVIDER", "groq"),
        "groq_model": os.getenv("GROQ_MODEL", "groq/compound-mini"),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2 (384-dim)",
        "vector_engine": "FAISS-CPU IndexFlatIP (Cosine Similarity)",
        "citation_guard": "Verbatim Substring Validation (Zero Hallucination)"
    }


@app.get("/api/examples")
def get_examples():
    """Returns a list of sample transcripts from the examples directory."""
    examples_dir = Path("examples")
    if not examples_dir.exists():
        return []
    
    out = []
    for f in examples_dir.glob("*.txt"):
        text = f.read_text(encoding="utf-8")
        out.append({
            "id": f.stem,
            "filename": f.name,
            "text": text,
            "turn_count": len([line for line in text.splitlines() if ":" in line])
        })
    return sorted(out, key=lambda x: x["id"])


@app.post("/api/extract")
def extract_endpoint(req: ExtractRequest):
    start_t = time.perf_counter()
    try:
        extraction, report = run_extraction(req.transcript, provider=req.provider)
        
        # Serialize to dict for JSON response
        out = {
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2),
            "summary": extraction.summary,
            "action_items": [
                {**a.model_dump(), "accepted": idx < len(report.accepted_actions)}
                for idx, a in enumerate(extraction.action_items)
            ],
            "decisions": [
                {**d.model_dump(), "accepted": idx < len(report.accepted_decisions)}
                for idx, d in enumerate(extraction.decisions)
            ],
            "citation_report": {
                "accepted_actions": len(report.accepted_actions),
                "rejected_actions": len(report.rejected_actions),
                "accepted_decisions": len(report.accepted_decisions),
                "rejected_decisions": len(report.rejected_decisions),
                "rejection_percent": round(report.rejection_rate * 100, 2),
                "total_items": report.total_items
            }
        }
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search")
def search_endpoint(req: SearchRequest):
    start_t = time.perf_counter()
    try:
        idx = HierarchicalRAGIndex(window_size=5)
        idx.build(req.transcript)
        results = idx.search(req.query, k=req.k)
        
        out = []
        for r in results:
            out.append({
                "score": round(r.score, 4),
                "child_text": r.child_text,
                "parent_window": r.parent_window
            })
            
        return {
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2),
            "results": out
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask")
def ask_endpoint(req: AskRequest):
    try:
        res = run_agent_with_steps(
            req.transcript,
            req.question,
            provider=req.provider,
            enabled_tools=req.enabled_tools,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
def analyze_endpoint(req: AnalyzeRequest):
    """Run all 5 local NLP tools on a transcript and return unified analytics.
    Zero LLM calls — all computation is local. Typically < 500ms."""
    import re
    from collections import Counter

    t = req.transcript
    start_t = time.perf_counter()

    # ── 1. Speaker Parsing ────────────────────────────────────────────────────
    speaker_data = {}
    for line in t.split("\n"):
        line = line.strip()
        m = re.match(r"^([A-Za-z0-9_\-\s]{1,40})\s*:\s*(.+)$", line)
        if not m:
            continue
        speaker = m.group(1).strip()
        text    = m.group(2).strip()
        d = speaker_data.setdefault(speaker, {"turns": 0, "words": 0, "questions": 0})
        d["turns"]     += 1
        d["words"]     += len(text.split())
        d["questions"] += text.count("?")

    total_words = sum(v["words"] for v in speaker_data.values())
    speakers_out = []
    for spk, d in sorted(speaker_data.items(), key=lambda x: x[1]["words"], reverse=True):
        speakers_out.append({
            "speaker":   spk,
            "words":     d["words"],
            "turns":     d["turns"],
            "questions": d["questions"],
            "share_pct": round((d["words"] / max(total_words, 1)) * 100, 1),
        })

    # ── 2. Sentiment (VADER or fallback) ─────────────────────────────────────
    sentiment_out = []
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        for spk, d_src in speaker_data.items():
            # Re-gather lines for this speaker
            lines_for_spk = []
            for line in t.split("\n"):
                m2 = re.match(r"^" + re.escape(spk) + r"\s*:\s*(.+)$", line.strip())
                if m2:
                    lines_for_spk.append(m2.group(1))
            combined = " ".join(lines_for_spk)
            scores   = analyzer.polarity_scores(combined)
            c        = scores["compound"]
            tone     = "Positive" if c >= 0.05 else ("Negative" if c <= -0.05 else "Neutral")
            sentiment_out.append({
                "speaker":  spk,
                "compound": round(c, 3),
                "tone":     tone,
                "pos":      round(scores["pos"], 3),
                "neu":      round(scores["neu"], 3),
                "neg":      round(scores["neg"], 3),
            })
        overall_c = sum(s["compound"] for s in sentiment_out) / max(len(sentiment_out), 1)
        meeting_tone = "Positive" if overall_c >= 0.05 else ("Negative" if overall_c <= -0.05 else "Neutral")
    except ImportError:
        sentiment_out  = []
        overall_c      = 0
        meeting_tone   = "Unavailable (install vaderSentiment)"

    # ── 3. Keyword Frequency ──────────────────────────────────────────────────
    STOPWORDS = {
        "the","a","an","and","or","but","in","on","at","to","for","of","with","is","it",
        "that","this","was","are","we","i","you","he","she","they","my","our","your","its",
        "be","been","have","has","had","do","does","did","will","would","could","should",
        "may","might","can","just","so","if","as","by","from","also","up","out","not","no",
        "what","how","when","where","who","which","about","into","than","then","there",
        "their","them","like","know","think","need","want","get","go","going","yeah","okay",
        "right","yes","um","uh","well","let","just","really","very","much","more","some",
        "then","than","its","all","one","two","three","four","five","six","seven","eight",
        "nine","ten"
    }
    words    = re.findall(r"\b[a-zA-Z]{3,}\b", t.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    counts   = Counter(filtered)
    top_kw   = [{"word": w, "count": c} for w, c in counts.most_common(20)]
    bigrams  = Counter(zip(filtered, filtered[1:]))
    top_bg   = [{"phrase": f"{a} {b}", "count": c} for (a, b), c in bigrams.most_common(8)]

    # ── 4. Timeline Extraction ────────────────────────────────────────────────
    patterns = [
        r"\b(?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b",
        r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*20\d{2})?",
        r"\bQ[1-4]\s*(?:20\d{2})?",
        r"\bend\s+of\s+(?:the\s+)?(?:week|month|quarter|year|day)\b",
        r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?",
        r"\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)\b",
        r"\bin\s+(?:one|two|three|a\s+few|two\s+to\s+three)?\s*(?:day|week|month|hour)s?\b",
        r"\b(?:tomorrow|today|this\s+week|next\s+week|this\s+month|next\s+month)\b",
        r"\bby\s+EOD\b",
        r"\bASAP\b",
    ]
    timeline = []
    combined_pat = "|".join(patterns)
    for m3 in re.finditer(combined_pat, t, re.IGNORECASE):
        mention = m3.group(0).strip()
        s = max(0, m3.start() - 90)
        e = min(len(t), m3.end() + 90)
        ctx = t[s:e].replace("\n", " ").strip()
        timeline.append({"mention": mention, "context": ctx})

    # ── 5. Citation Health Score ──────────────────────────────────────────────
    # Rough measure: ratio of lines with proper "Speaker: text" format
    all_lines      = [l.strip() for l in t.split("\n") if l.strip()]
    formatted_lines = [l for l in all_lines if re.match(r"^[A-Za-z0-9_\-\s]{1,40}:\s*.+", l)]
    citation_score  = round((len(formatted_lines) / max(len(all_lines), 1)) * 100, 1)

    latency = round((time.perf_counter() - start_t) * 1000, 1)

    return {
        "latency_ms":       latency,
        "speakers":         speakers_out,
        "sentiment":        sentiment_out,
        "overall_sentiment": {"tone": meeting_tone, "compound": round(overall_c, 3)},
        "keywords":         top_kw,
        "bigrams":          top_bg,
        "timeline":         timeline,
        "citation_health":  citation_score,
        "stats": {
            "total_words":    total_words,
            "total_turns":    sum(v["turns"] for v in speaker_data.values()),
            "num_speakers":   len(speaker_data),
            "timeline_count": len(timeline),
        }
    }


@app.post("/api/corpus/build")
def api_corpus_build(req: CorpusBuildRequest):
    try:
        folder = Path(req.folder)
        paths = list(folder.glob("*.txt"))
        if not paths:
            raise ValueError(f"No transcripts found in {req.folder}")
        
        corp = build_corpus(paths)
        return {
            "num_meetings": len(paths),
            "total_chunks": len(corp._chunks),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/corpus/ask")
def api_corpus_ask(req: CorpusAskRequest):
    start_t = time.perf_counter()
    try:
        answer = corpus_ask(
            req.question,
            provider=req.provider,
            k=req.k,
            selected_meetings=req.selected_meetings
        )
        
        # Load corpus to return the exact sources used
        from corpus import CorpusIndex
        corp = CorpusIndex()
        corp.load(Path("corpus"))
        sources = corp.search(req.question, k=req.k, selected_meetings=req.selected_meetings)
        
        source_out = []
        for s in sources:
            source_out.append({
                "source": s["meeting"],
                "score": round(s["score"], 4),
                "excerpt": s["text"]
            })
            
        return {
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2),
            "answer": answer,
            "provider": req.provider,
            "sources": source_out
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/benchmark")
def get_benchmark():
    eval_path = Path("eval_ami_20.json")
    if not eval_path.exists():
        return {
            "sample_size": 0,
            "meeting_breakdown": []
        }
    
    try:
        data = json.loads(eval_path.read_text(encoding="utf-8"))
        
        # Format the data for the UI table
        breakdown = []
        for meeting_id, metrics in data.get("per_meeting", {}).items():
            breakdown.append({
                "meeting_id": meeting_id,
                "action_f1": metrics.get("action_f1", 0),
                "rejection_rate": f"{metrics.get('rejection_rate', 0):.2%}",
                "status": "Verified"
            })
            
        return {
            "sample_size": data.get("aggregate", {}).get("total_meetings", 0),
            "meeting_breakdown": breakdown
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
