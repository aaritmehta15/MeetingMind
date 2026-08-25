# PS.md — Project Statement

---

## Title

**MeetingMind Evaluator: Structured Extraction, Hallucination Guardrails, Hierarchical RAG, and Agentic Q&A over Meeting Transcripts**

---

## Problem it solves

Every team generates meeting transcripts — from Zoom auto-captions, Google Meet exports, or tools like MacWhisper — but extracting reliable, structured information from them is harder than it looks. Existing tools (including all four in `references/`) use a single LLM pass and trust the output without verification: action items get invented, deadlines get hallucinated, and speaker attributions drift. There is no way to know if the extracted output is faithful to what was actually said. On top of that, once notes are generated, they are a dead artifact — you cannot ask "which action items are still open?" or "what did we decide about the CI/CD pipeline across all our past meetings?" without re-reading every document. This project solves all of this: it extracts structured meeting data with a hallucination guard (every claim must cite a verbatim transcript span), scores extraction quality against reference annotations on a real benchmark dataset, adds an agentic Q&A layer for single-transcript queries, and uses Hierarchical Parent-Child RAG so users can ask natural-language questions across their entire corpus of past meetings and get cited, grounded answers — without any answer fabricating content that was never said.

---

## Why this fits a Generative AI Lab

| Feature | GenAI Concept Demonstrated |
|---|---|
| Structured JSON extraction (action items, decisions, summary) from raw transcript text | **Structured generation** — prompting for and parsing typed, schema-validated LLM output |
| Verbatim-citation guard: LLM output rejected if `evidence_quote` is not a substring of transcript | **Hallucination checking / output faithfulness** — measurable, demonstrable, explained |
| ROUGE / BERTScore evaluation of generated summaries against AMI gold references | **LLM evaluation** — automated quality metrics; a full eval loop, not just generation |
| Precision/recall of action-item extraction vs. AMI annotations | **Structured extraction evaluation** — treating GenAI output as an information-retrieval task |
| Agent Q&A loop: user asks a question → agent decides whether to search transcript index or retrieve structured data → answers with cited evidence | **Agentic tool-use** — multi-step reasoning with tool dispatch; not single-pass generation |
| Hierarchical Parent-Child RAG: index child utterances (small, precise) for retrieval; expand to parent window (surrounding context) before passing to LLM for answer generation | **RAG (Retrieval-Augmented Generation)** — specifically the Parent-Child / Hierarchical variant, chosen because conversational transcripts need surrounding context to be interpretable; naive flat chunking loses meaning |
| Persistent cross-meeting FAISS corpus so the RAG layer answers questions across all processed transcripts, not just one | **Multi-document RAG** — retrieval over a growing corpus rather than a single document |
| Semantic search over transcript segments using sentence-transformers + FAISS | **Embeddings / semantic search** — dense vector retrieval as the backbone of both the agent and the RAG system |
| Chain-of-Density summarization (draft → densify) | **Prompt engineering** — iterative prompting technique from the literature |

An evaluator can probe every one of these independently: ask you to explain ROUGE vs. BERTScore, demonstrate the citation guard rejecting a hallucinated quote, walk through the agent's tool-selection step, explain the difference between Parent-Child RAG and naive chunking, or show a cross-meeting query returning a cited answer.

---

## Core features (MVP)

1. **Transcript ingestion**: Accept plain-text transcripts (paste or file drop). Support the AMI format (speaker-labeled) and the simpler `Speaker: text` format from the `references/examples/`.
2. **Structured extraction pipeline**: Extract, in a single LLM call with a JSON schema:
   - Summary (2-3 sentence TL;DR)
   - Action items: `{description, owner, deadline, evidence_quote}`
   - Decisions: `{description, evidence_quote}`
3. **Verbatim-citation guard**: For every extracted action item and decision, verify that `evidence_quote` is a literal substring of the transcript. Items that fail are flagged (not silently dropped in MVP — flagged so the evaluator can see them).
4. **Evaluation script**: Run the extraction pipeline on a sample of AMI transcripts; score summaries with ROUGE-1/2/L against AMI gold summaries; compute precision/recall of extracted action items against AMI annotations; print a results table.
5. **Hierarchical Parent-Child RAG index** (single-transcript): Split each transcript into *child chunks* (~1-2 utterances, small, precise) and *parent chunks* (~5-6 utterances, enough conversational context). Embed all child chunks with `sentence-transformers` (all-MiniLM-L6-v2) and index with FAISS. At query time: retrieve the top-k matching *child* chunks by cosine similarity, then return the *parent* window for each match to the LLM. This is the right RAG type for conversational text — a single utterance like "I'll handle that" is meaningless without surrounding context, which naive flat chunking loses.
6. **Agentic Q&A (single meeting)**: A ReAct-style agent that receives a user question and decides which tool to use: `rag_search(query)` (uses the Hierarchical RAG index above) or `get_action_items()` or `get_decisions()`. Executes the tool, synthesizes a cited answer. Implemented as ~50 lines of Python; no orchestration framework.
7. **CLI interface**: All features accessible via command-line (`python cli.py extract`, `python cli.py eval`, `python cli.py search`, `python cli.py ask`). No UI required for MVP.

---

## "Wow" features (stretch, clearly separated from MVP)

1. **Cross-meeting corpus RAG** — the headline wow feature: After processing a folder of transcripts, persist all their child-chunk embeddings into a single shared FAISS index with meeting-level metadata (meeting ID, date, speaker, parent window text). Then expose `python cli.py corpus-ask "<question>"` which retrieves the top-k relevant child chunks *across all meetings*, expands to their parent windows, and generates a cited answer that includes which meeting each piece of evidence came from. This is Multi-document Hierarchical RAG and is a natural, non-forced extension of the same indexing already built for MVP — same embedding model, same FAISS, just a persistent shared store instead of a per-file one. Example query: *"Across all our meetings, what did we decide about the CI/CD tooling?"*

2. **Hallucination scoring dashboard**: For each transcript in the eval set, compute: (a) citation-guard rejection rate, (b) ROUGE-L of summaries, (c) action-item precision/recall. Render as a simple Streamlit page with sortable table and per-transcript drill-down showing accepted vs. rejected extractions side-by-side with transcript highlights. Makes the evaluation story visually compelling for a demo.

3. **Cross-meeting action-item tracker**: Given a folder of chronologically ordered transcripts, use an LLM with the citation guard to detect whether an action item from meeting N was completed in a later meeting. Produces a "still open / closed in meeting X" status table — a multi-document agentic reasoning task that builds naturally on the corpus RAG layer.

---

## Dataset(s)

**Primary — AMI Meeting Corpus** (`edinburghcstr/ami` on HuggingFace, free, no account required):
- ~100 hours of multi-party meetings, fully transcribed with speaker labels
- Gold-standard abstractive summaries, extractive summaries, and action items annotated
- Usable via `datasets.load_dataset("edinburghcstr/ami", "ihm")` (Individual Headset Mic subset, best ASR quality)
- Small enough to work on a laptop: load 20-50 meetings for eval, not all 100 hours

**Secondary — `references/examples/` sample transcripts** (3 files, already in repo):
- Used for rapid development and smoke-testing before pulling the full AMI corpus

**Tertiary (wow feature only) — QMSum** (`pszemraj/qmsum-cleaned` on HuggingFace):
- Pre-structured meeting QA pairs; useful for evaluating the cross-meeting corpus RAG feature (ground-truth QA pairs to measure RAG answer quality)

---

## Tech stack

| Tool | Role | Free? |
|---|---|---|
| Python 3.11 | Language + environment | Yes |
| `groq` SDK | LLM calls (default: `llama-3.3-70b-versatile`) | Free tier; 6000 req/day, 30 req/min |
| `google-generativeai` | LLM fallback (Gemini 2.0 Flash) | Free tier; 1500 req/day |
| `sentence-transformers` | Local embeddings (all-MiniLM-L6-v2) for RAG + semantic search | Free, runs on CPU |
| `faiss-cpu` | Dense vector index — per-transcript + shared corpus FAISS stores | Free, no server |
| `pydantic` v2 | Schema validation for LLM JSON output | Free |
| `datasets` (HuggingFace) | AMI corpus loading | Free |
| `rouge-score` | ROUGE evaluation metrics | Free |
| `bert-score` | BERTScore evaluation | Free, CPU mode |
| `python-dotenv` | .env file loading | Free |
| `rich` | Pretty CLI output | Free |
| Streamlit (wow feature only) | Hallucination dashboard | Free |
| `ollama` + local model | Optional fully offline LLM path | Free |

No paid APIs. No Docker required. Everything runs in a single Python venv.

---

## What "done" looks like

You open a terminal, run `python cli.py extract examples/q1-planning-sarah.txt`, and within 10 seconds get back a JSON block showing the meeting summary, a list of action items each with an `evidence_quote` that you can visually match to the transcript, and a flag next to any item that failed the citation guard. Then you run `python cli.py eval --n 20` and see a results table: ROUGE-1/2/L scores for 20 AMI meetings, action-item precision/recall, and citation-guard rejection rate. Then you run `python cli.py ask examples/q1-planning-sarah.txt "What did Edd agree to do about the CI/CD pipeline?"` and the agent prints its reasoning, calls the RAG search tool, retrieves the parent window containing the relevant exchange, and returns a grounded answer with the quoted transcript span. If you have processed multiple transcripts, you run `python cli.py corpus-ask "What have we decided about the CI/CD tooling across all our meetings?"` and get a multi-document cited answer showing which meeting each piece of evidence came from. That sequence — extract, evaluate, ask, corpus-ask — is a complete 3-minute demo that shows structured generation, evaluation, single-doc RAG, and multi-doc RAG as distinct, explainable layers.

---

## Alternatives considered

**1. Fine-tuning / LoRA on meeting summarization** — train a small model (e.g., Flan-T5-base) to generate structured meeting notes, evaluate ROUGE against AMI. Rejected because: LoRA fine-tuning on a laptop without guaranteed GPU is fragile to configure (bitsandbytes, PEFT version conflicts) and takes hours per run; if it fails at any step the whole project stalls. The structured-extraction + evaluation + RAG + agent stack is equally impressive, demonstrably works in hours not days, and is easier to defend in a viva.

**2. Naive flat-chunked RAG chatbot** — embed all transcripts with fixed 256-token chunks, use FAISS + LLM to answer questions. Considered and rejected as the *primary* design because: (a) flat chunking loses conversational context ("I'll handle that" with no surrounding context is useless), (b) it would be RAG-chatbot #3 on my resume with no new technique. Instead, RAG is included as the **Hierarchical Parent-Child variant** — the correct type for dialogue data — and is one layer of a larger system that also demonstrates structured generation, evaluation, and agentic tool-use.
