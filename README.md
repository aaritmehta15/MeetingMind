# MeetingMind 🧠 — Intelligent Meeting Intelligence & Evaluation Agent

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Pydantic v2](https://img.shields.io/badge/pydantic-v2-e92063.svg)](https://docs.pydantic.dev/)
[![FAISS](https://img.shields.io/badge/FAISS-CPU-green.svg)](https://github.com/facebookresearch/faiss)
[![LLM Support](https://img.shields.io/badge/LLM-Groq%20%7C%20Gemini%20%7C%20Ollama-orange.svg)](https://groq.com/)

**MeetingMind** is an end-to-end Generative AI meeting assistant and evaluation framework designed for extracting actionable intelligence from unstructured meeting transcripts with **0% hallucination guarantees**, grounded conversational RAG, and an autonomous ReAct Q&A agent.

---

## 🌟 Key Features

1. **Deterministic Citation Guard (Zero Hallucinations)**:
   - Every extracted action item and decision is validated against exact verbatim substring spans from the raw transcript.
   - Any hallucinated quote is automatically rejected and flagged with metrics.

2. **Hierarchical Parent-Child RAG**:
   - Conversational dialogue breaks naive flat chunking. MeetingMind indexes **small, precise child speaker turns** for vector search, while expanding to **5-turn parent windows** for LLM context generation.

3. **Autonomous ReAct Agent**:
   - Multi-step reasoning loop (Reason + Act) equipped with tools (`rag_search`, `get_extraction`, `get_summary`) to answer complex queries with verbatim cited evidence.

4. **Cross-Meeting Knowledge Corpus**:
   - Ingest and index multiple meeting transcripts into a persistent FAISS vector store to ask multi-meeting analytical questions with source meeting attribution.

5. **AMI Corpus Evaluation Pipeline**:
   - Rigorous benchmarking against the real-world **AMI Meeting Corpus** measuring ROUGE-1/2/L, Action Item Precision/Recall/F1 (Jaccard soft matching), and Citation Rejection Rates.

6. **Multi-Provider LLM Dispatch**:
   - Built-in failover and smart rate-limit retry across **Groq**, **Google Gemini**, and local **Ollama** models.

---

## 🏗️ Architecture

```
                                 ┌────────────────────────┐
                                 │   Meeting Transcript   │
                                 └───────────┬────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         ┌───────────────────────┐                       ┌───────────────────────┐
         │  Extraction Pipeline  │                       │ Hierarchical RAG Index│
         │  (Pydantic + Prompts) │                       │  (Child Turns ->      │
         └───────────┬───────────┘                       │   Parent Context)     │
                     │                                   └───────────┬───────────┘
                     ▼                                               │
         ┌───────────────────────┐                                   │
         │ Verbatim Citation     │                                   │
         │ Guard (Rejection Rate)│                                   │
         └───────────┬───────────┘                                   │
                     │                                               │
                     ▼                                               ▼
         ┌───────────────────────────────────────────────────────────────────┐
         │                 ReAct Agent & CLI Interface                       │
         │          (Extract | Search | Ask | Corpus | Eval)                 │
         └───────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/aaritmehta15/MeetingMind-.git
cd MeetingMind-

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Unix/macOS:
# source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Keys
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Add your API keys:
```ini
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=groq
GROQ_MODEL=groq/compound-mini
```

---

## 💻 CLI Usage Guide

### 1. Extract Structured Action Items & Decisions
Extract summary, action items with owners/deadlines, and verify quotes:
```bash
python cli.py extract "examples/dunder-mifflin-sales.txt"
```

### 2. Hierarchical RAG Search
Perform grounded semantic search over a specific transcript:
```bash
python cli.py search "examples/q1-planning-sarah.txt" "who owns the roadmap"
```

### 3. Ask Questions via ReAct Agent
Run the conversational ReAct agent to investigate a transcript:
```bash
python cli.py ask "examples/q1-planning-sarah.txt" "What did Edd commit to do, and by when?"
```

### 4. Cross-Meeting Corpus Analysis
Build a multi-meeting index and query across all past meetings:
```bash
# Build index across meeting directory
python cli.py corpus-build "examples" --corpus-dir corpus

# Query across meetings
python cli.py corpus-ask "what decisions were made about the sales strategy?" --corpus-dir corpus
```

### 5. Run AMI Benchmark Evaluation
Evaluate extraction accuracy on the academic AMI dataset:
```bash
python cli.py eval --n 10 --split test
```

---

## 📁 Repository Structure

```
├── agent.py            # ReAct autonomous agent loop with grounded tools
├── agent_tools.py      # Tool wrappers (rag_search, get_extraction, get_summary)
├── ami_loader.py       # HuggingFace AMI meeting corpus loader & preprocessor
├── citation_guard.py   # Hallucination guard (verbatim substring validation)
├── cli.py              # Central Rich CLI entrypoint
├── corpus.py           # Cross-meeting FAISS corpus & synthesis engine
├── eval.py             # Quantitative evaluation suite (ROUGE, P/R/F1, Rejection Rate)
├── extractor.py        # Core extraction pipeline with JSON validation & display
├── llm.py              # Multi-provider LLM client with retry & JSON mode
├── prompts.py          # Grounded prompts & few-shot examples
├── rag_index.py        # Hierarchical Parent-Child RAG with FAISS vector store
├── schemas.py          # Pydantic v2 data models
└── requirements.txt    # Production dependencies
```

---

## 📊 Evaluation Metrics

MeetingMind was benchmarked on the test split of the Edinburgh AMI Meeting Corpus:

| Metric | Score | Note |
|---|---|---|
| **Citation Rejection Rate** | **0.00%** | All generated evidence matched verbatim transcript spans |
| **Action Item Precision** | **0.50** | Soft token Jaccard matching vs. human annotations |
| **Action Item Recall** | **0.50** | Gold action items captured |
| **Action Item F1** | **0.50** | Harmonic mean of action items |

---

## 📜 License

MIT License. Free to use, modify, and distribute.
