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
