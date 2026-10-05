import os
import time
import json
import warnings
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore", category=UserWarning)

from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import engine, Base, get_db
from models import User, Meeting, Task
from auth import get_password_hash, verify_password, create_access_token, get_current_user

from extractor import run_extraction
from rag_index import HierarchicalRAGIndex
from agent import run_agent_with_steps
from corpus import build_corpus, corpus_ask

def seed_db():
    db = next(get_db())
    try:
        # Create demo user if not exists
        demo_user = db.query(User).filter(User.username == "demo").first()
        if not demo_user:
            demo_user = User(username="demo", hashed_password=get_password_hash("password"))
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            # Load demo transcripts
            for folder in ["demo_data", "examples"]:
                folder_path = Path(folder)
                if folder_path.exists():
                    for f in folder_path.glob("*.txt"):
                        if not db.query(Meeting).filter(Meeting.user_id == demo_user.id, Meeting.title == f.stem).first():
                            text = f.read_text(encoding="utf-8")
                            meeting = Meeting(user_id=demo_user.id, title=f.stem, transcript_text=text)
                            db.add(meeting)
            db.commit()
        else:
            # If demo user exists, seed any missing demo_data meetings
            for folder in ["demo_data", "examples"]:
                folder_path = Path(folder)
                if folder_path.exists():
                    for f in folder_path.glob("*.txt"):
                        if not db.query(Meeting).filter(Meeting.user_id == demo_user.id, Meeting.title == f.stem).first():
                            text = f.read_text(encoding="utf-8")
                            meeting = Meeting(user_id=demo_user.id, title=f.stem, transcript_text=text)
                            db.add(meeting)
            db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed DB
    seed_db()
    # Pre-warm sentence-transformer embedding model in background so first query is instantaneous
    import threading
    def _warmup():
        try:
            from rag_index import _get_embedding_model
            _get_embedding_model()
        except Exception:
            pass
    threading.Thread(target=_warmup, daemon=True).start()
    yield

app = FastAPI(title="MeetingMind Backend", lifespan=lifespan)

# Allow Vite frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class MeetingCreate(BaseModel):
    title: str
    transcript_text: str

class TaskCreate(BaseModel):
    description: str
    deadline: str | None = None

class TaskUpdate(BaseModel):
    description: str | None = None
    deadline: str | None = None
    done: int | None = None

class MeetingRename(BaseModel):
    title: str

class ExtractRequest(BaseModel):
    transcript: str | None = None
    meeting_id: int | None = None
    provider: str = "groq"

class SearchRequest(BaseModel):
    transcript: str | None = None
    meeting_id: int | None = None
    query: str
    k: int = 5

class AskRequest(BaseModel):
    transcript: str | None = None
    meeting_id: int | None = None
    question: str
    provider: str = "groq"
    enabled_tools: list[str] | None = None

class CorpusBuildRequest(BaseModel):
    folder: str = "examples"

class CorpusAskRequest(BaseModel):
    question: str
    provider: str = "groq"
    k: int = 5
    selected_meetings: list[Any] | None = None

class AnalyzeRequest(BaseModel):
    transcript: str | None = None
    meeting_id: int | None = None



@app.get("/health")
@app.get("/v2/health")
@app.get("/")
def health_check():
    return {"status": "ok", "app": "MeetingMind"}

@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "default_provider": os.getenv("LLM_PROVIDER", "groq"),
        "groq_model": os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2 (384-dim)",
        "vector_engine": "FAISS-CPU IndexFlatIP (Cosine Similarity)",
        "citation_guard": "Verbatim Substring Validation (Citation-Verified)"
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


# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- MEETING ENDPOINTS ---

@app.get("/api/meetings")
def get_user_meetings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meetings = db.query(Meeting).filter(Meeting.user_id == current_user.id).order_by(Meeting.created_at.desc()).all()
    if not meetings:
        for folder in ["demo_data", "examples"]:
            folder_path = Path(folder)
            if folder_path.exists():
                for f in sorted(folder_path.glob("*.txt")):
                    if not db.query(Meeting).filter(Meeting.user_id == current_user.id, Meeting.title == f.stem).first():
                        m = Meeting(user_id=current_user.id, title=f.stem, transcript_text=f.read_text(encoding="utf-8"))
                        db.add(m)
        db.commit()
        meetings = db.query(Meeting).filter(Meeting.user_id == current_user.id).order_by(Meeting.created_at.desc()).all()

    return [{"id": m.id, "title": m.title, "created_at": m.created_at, "turn_count": len([l for l in m.transcript_text.splitlines() if ":" in l]), "text": m.transcript_text} for m in meetings]

@app.post("/api/meetings")
def create_meeting(meeting: MeetingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_meeting = Meeting(user_id=current_user.id, title=meeting.title, transcript_text=meeting.transcript_text)
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    return {"id": new_meeting.id, "title": new_meeting.title, "message": "Meeting saved successfully"}

@app.patch("/api/meetings/{meeting_id}")
def rename_meeting(meeting_id: int, req: MeetingRename, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m.title = req.title
    db.commit()
    return {"id": m.id, "title": m.title, "message": "Meeting renamed successfully"}

@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"status": "deleted"}

# ── TASKS ─────────────────────────────────────────────────────────────────────

@app.get("/api/tasks")
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.user_id == current_user.id).order_by(Task.created_at.asc()).all()

@app.post("/api/tasks")
def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = Task(
        user_id=current_user.id,
        description=task_data.description,
        deadline=task_data.deadline,
        done=0
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, task_data: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.deadline is not None:
        task.deadline = task_data.deadline
    if task_data.done is not None:
        task.done = task_data.done
        
    db.commit()
    db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted"}

def _get_transcript_text(req, db: Session, current_user: User):
    if req.transcript:
        return req.transcript
    if req.meeting_id:
        m = db.query(Meeting).filter(Meeting.id == req.meeting_id, Meeting.user_id == current_user.id).first()
        if m:
            return m.transcript_text
        raise HTTPException(status_code=404, detail="Meeting not found or access denied")
    raise HTTPException(status_code=400, detail="Must provide transcript or meeting_id")


_rag_cache: dict[int, HierarchicalRAGIndex] = {}

@app.post("/api/extract")
def extract_endpoint(req: ExtractRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_t = time.perf_counter()
    try:
        t_text = _get_transcript_text(req, db, current_user)
        extraction, report = run_extraction(t_text, provider=req.provider)
        
        rejected_action_quotes = {item.evidence_quote for item, _ in report.rejected_actions}
        rejected_decision_quotes = {item.evidence_quote for item, _ in report.rejected_decisions}

        out = {
            "latency_ms": round((time.perf_counter() - start_t) * 1000, 2),
            "summary": extraction.summary,
            "action_items": [
                {**a.model_dump(), "accepted": a.evidence_quote not in rejected_action_quotes}
                for a in extraction.action_items
            ],
            "decisions": [
                {**d.model_dump(), "accepted": d.evidence_quote not in rejected_decision_quotes}
                for d in extraction.decisions
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
def search_endpoint(req: SearchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_t = time.perf_counter()
    try:
        t_text = _get_transcript_text(req, db, current_user)
        cache_key = hash(t_text)
        if cache_key in _rag_cache:
            idx = _rag_cache[cache_key]
        else:
            idx = HierarchicalRAGIndex(window_size=5)
            idx.build(t_text)
            _rag_cache[cache_key] = idx

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
def ask_endpoint(req: AskRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        t_text = _get_transcript_text(req, db, current_user)
        res = run_agent_with_steps(
            t_text,
            req.question,
            provider=req.provider,
            enabled_tools=req.enabled_tools,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
def analyze_endpoint(req: AnalyzeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Run all 5 local NLP tools on a transcript and return unified analytics.
    Zero LLM calls — all computation is local. Typically < 500ms."""
    import re
    from collections import Counter

    t = _get_transcript_text(req, db, current_user)
    start_t = time.perf_counter()

    # ── 1. Speaker Parsing ────────────────────────────────────────────────────
    speaker_data = {}
    ignore_list = {
        "date", "duration", "participants", "time", "location", "attendees", "subject",
        "decision", "decision 1", "decision 2", "decision 3", "decision 4",
        "action", "action item", "tier 1", "tier 2", "tier 3", "tier 4",
        "note", "notes", "summary", "agenda", "project", "topic", "status", "version"
    }
    for line in t.split("\n"):
        line = line.strip()
        m = re.match(r"^([A-Za-z0-9_\-\s]{1,40})\s*:\s*(.+)$", line)
        if not m:
            continue
        speaker = m.group(1).strip()
        norm_speaker = re.sub(r"^[-*•\s]+", "", speaker).lower()
        if norm_speaker in ignore_list or norm_speaker.startswith("decision") or norm_speaker.startswith("tier"):
            continue
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

    # ── 4. Timeline Extraction (Sentence-level, Speaker-aware) ─────────────────
    full_date_time = re.compile(
        r'\b(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?'
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?'
        r'(?:,?\s*20\d{2})?'
        r'(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))?\b',
        re.IGNORECASE
    )
    relative_time = re.compile(
        r'\b(?:by\s+EOD|ASAP|next\s+week|this\s+week|this\s+Friday|next\s+Friday|'
        r'end\s+of\s+(?:the\s+)?(?:week|month|quarter|year)|'
        r'in\s+(?:\d+|one|two|three|four|five|a\s+few)\s*(?:days?|weeks?|months?))\b',
        re.IGNORECASE
    )
    weekday_time = re.compile(
        r'\b(?:(?:next|this|by)\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)'
        r'(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))?\b',
        re.IGNORECASE
    )

    timeline = []
    seen_timeline = set()
    raw_lines = [l.strip() for l in t.split("\n") if l.strip()]

    for line in raw_lines:
        # Filter out transcript header / setup metadata
        if re.search(r'^(?:Date:|Duration:|Participants:|Note:|Final Year Project -|Sprint \d+)', line, re.IGNORECASE):
            continue
        if '|' in line and ('Duration:' in line or 'Participants:' in line):
            continue

        speaker = None
        turn_text = line
        m_spk = re.match(r'^([A-Za-z0-9_\-\s]{1,30}):\s*(.+)$', line)
        if m_spk:
            speaker = m_spk.group(1).strip()
            turn_text = m_spk.group(2).strip()

        # Split into sentences safely without lookbehinds (compatible with Python 3.14)
        raw_sents = [s.strip() for s in re.findall(r'[^.!?]+(?:[.!?]|$)', turn_text) if s.strip()]
        sentences = []
        abbrevs = {"prof.", "dr.", "mr.", "ms.", "mrs.", "vs.", "fig.", "dept.", "e.g.", "i.e."}
        for s in raw_sents:
            if sentences and any(sentences[-1].lower().endswith(ab) for ab in abbrevs):
                sentences[-1] = sentences[-1] + " " + s
            else:
                sentences.append(s)
        for sent in sentences:
            sent_clean = re.sub(r'^[“"\'\s\-•]+', '', sent).strip()
            if not sent_clean or len(sent_clean) < 5:
                continue

            matches = list(full_date_time.finditer(sent_clean))
            if not matches:
                matches = list(relative_time.finditer(sent_clean))
            if not matches:
                matches = list(weekday_time.finditer(sent_clean))

            for m in matches:
                mention = m.group(0).strip()
                dedup_key = (mention.lower(), sent_clean[:35].lower())
                if dedup_key in seen_timeline:
                    continue
                seen_timeline.add(dedup_key)

                ctx = f"{speaker}: {sent_clean}" if speaker else sent_clean
                timeline.append({
                    "mention": mention,
                    "speaker": speaker,
                    "context": ctx
                })
                if len(timeline) >= 15:
                    break
        if len(timeline) >= 15:
            break

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
def api_corpus_build(req: CorpusBuildRequest, current_user: User = Depends(get_current_user)):
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


_corpus_cache: dict[str, Any] = {}

@app.post("/api/corpus/ask")
def api_corpus_ask(req: CorpusAskRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_t = time.perf_counter()
    try:
        from corpus import CorpusIndex, corpus_ask
        
        # Fetch the selected meetings from DB (or all meetings if not filtered)
        query = db.query(Meeting).filter(Meeting.user_id == current_user.id)
        if req.selected_meetings:
            int_ids = []
            for item in req.selected_meetings:
                try:
                    int_ids.append(int(item))
                except (ValueError, TypeError):
                    pass
            if int_ids:
                query = query.filter(Meeting.id.in_(int_ids))
        meetings = query.all()
        
        if not meetings:
            raise ValueError("No matching meetings found for corpus search.")

        # Cache key based on meeting IDs and lengths to avoid re-embedding
        cache_key = f"{current_user.id}:" + ",".join(f"{m.id}_{len(m.transcript_text)}" for m in sorted(meetings, key=lambda x: x.id))
        if cache_key in _corpus_cache:
            corp = _corpus_cache[cache_key]
        else:
            corp = CorpusIndex()
            for m in meetings:
                corp.add_transcript_text(m.transcript_text, source_name=f"{m.title}.txt", meeting_id=str(m.id))
            if not corp._chunks:
                raise ValueError("No transcript data available to build corpus.")
            corp.build_index()
            if len(_corpus_cache) > 10:
                _corpus_cache.clear()
            _corpus_cache[cache_key] = corp

        meeting_map = {str(m.id): m.title for m in meetings}
        selected_mids = [str(m.id) for m in meetings]
        num_selected = len(selected_mids)
        effective_k = max(req.k, min(num_selected * 3, 16)) if num_selected > 1 else req.k

        answer = corpus_ask(
            req.question,
            provider=req.provider,
            k=effective_k,
            selected_meetings=selected_mids,
            corp=corp,
            meeting_titles=meeting_map
        )
        
        sources = corp.search(req.question, k=effective_k, selected_meetings=selected_mids, stratified=True)
        
        source_out = []
        for s in sources:
            mid = str(s.get("meeting", ""))
            title = meeting_map.get(mid, s.get("source", "").replace(".txt", ""))
            source_out.append({
                "source": title,
                "meeting_id": mid,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, log_level="info")
