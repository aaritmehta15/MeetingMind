# MeetingMind 2.0 🧠 — Intelligent Meeting Intelligence Engine

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![FAISS](https://img.shields.io/badge/FAISS-CPU-green.svg)](https://github.com/facebookresearch/faiss)
[![LLM Support](https://img.shields.io/badge/LLM-Groq%20%7C%20Gemini%20%7C%20Ollama-orange.svg)](https://groq.com/)

**MeetingMind 2.0** is an enterprise-grade, full-stack Generative AI meeting assistant and intelligence framework. Designed to extract actionable insights from unstructured meeting transcripts, it features a **0% hallucination guarantee** via verbatim citation grounding, cross-meeting Hierarchical RAG, and an immersive glassmorphism React UI.

---

## 🌟 Key Features

### 1. 🔍 Meeting Analytics & NLP
- Extracts detailed speaker diarization, keyword frequency mapping, and dialogue turn analysis directly from raw text transcripts.
- Interactive visualizations tracking who spoke, for how long, and their core topics.

### 2. ⚡ Extraction Studio & Citation Guard
- Autonomously generates **Executive Summaries, Decisions, and Action Items**.
- **Deterministic Citation Guard**: Every action item and decision is validated against exact verbatim substring spans from the raw transcript. Hallucinations are actively detected, flagged, and rejected.

### 3. 📤 Instant Productivity Integrations
Instantly format and export grounded intelligence to the tools you already use:
- **Automated Emails**: Internal Executive Summaries, Action-Oriented Follow-ups, and Formal Client Emails.
- **Ticketing**: Ready-to-paste Jira and Linear Markdown Tickets with Assignees and Deadlines.
- **Team Comms**: Slack and Microsoft Teams formatted stand-up broadcasts.

### 4. 📚 Corpus Studio & Cross-Meeting RAG
- Save and archive unlimited transcripts into your personalized **Corpus Studio**.
- **Hierarchical Parent-Child RAG**: Indexes small, precise child speaker turns for FAISS vector search, while expanding to 5-turn parent windows for LLM context generation.
- Execute deep cross-transcript semantic searches to synthesize answers across multiple historical meetings simultaneously.

---

## 🏗️ Architecture Stack

**Backend**:
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM (Multi-tenant ready)
- **Vector Search**: FAISS CPU & SentenceTransformers (`all-MiniLM-L6-v2`)
- **LLM Engine**: Groq (Llama-3/Mistral/Gemma)
- **Validation**: Pydantic v2

**Frontend**:
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with modern Glassmorphism aesthetics
- **Icons**: Lucide React
- **Routing & State**: Context API

---

## 🚀 Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/aaritmehta15/MeetingMind.git
cd MeetingMind
```

### 2. Setup the Backend (FastAPI)
```bash
# Create a virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```
*Add your `GROQ_API_KEY` to the `.env` file.*

```bash
# Start the Uvicorn server
python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Setup the Frontend (Vite + React)
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### 4. Launch
Navigate to `http://localhost:5173/` in your browser to experience the MeetingMind Engine.

---

## 📊 Security & Compliance

MeetingMind is built with data integrity in mind:
- **No Data Retention by LLMs**: Leverages stateless API calls to Groq.
- **Local FAISS Architecture**: All vector embeddings and semantic search indices are computed and stored locally in memory or on-disk, never sent to external vector DB providers.
- **Verbatim Grounding**: The strict Pydantic Extraction layer guarantees that if the AI hallucinates an action item not spoken in the transcript, it is visually highlighted as `Rejected` on the UI.

---

## 📜 License

MIT License. Free to use, modify, and distribute.
