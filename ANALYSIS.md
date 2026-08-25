# ANALYSIS.md — Phase 1: Reference Project Survey

---

## Reference Project 1 — Video2Notes-AI

**What it does:**
- Takes a video file (lecture, recording) through a 7-step pipeline: audio extraction (FFmpeg) → speech-to-text (faster-whisper) → scene detection (PySceneDetect) → segment building → keyframe extraction (OpenCV) → LLM analysis (Ollama + Llama 3.1) → Markdown export (Jinja2).
- Output is a structured Markdown document with auto-detected chapters, one screenshot per chapter, and LLM-generated title/summary/key-points per chapter.
- Served via Flask REST API; optional Vue 3 frontend for browser upload.
- Fully offline — Ollama runs the LLM locally, no API keys required.

**Tech stack:** Python 3.11, faster-whisper, PySceneDetect, OpenCV, FFmpeg, Ollama + Llama 3.1 8B, Jinja2, Flask, Vue 3, Pydantic, Rich.

**Dataset(s):** No external dataset — input is user-supplied video files. No benchmark or evaluation dataset referenced.

**Most reusable / impressive idea:** The `Segment` dataclass pattern — each pipeline step enriches a shared, typed data object that accumulates transcript, frame path, title, summary, and key points. Clean, testable, easy to extend. Also: the CLI entry point calls the same pipeline as the REST API — one core, two surfaces.

---

## Reference Project 2 — meeting-notes-processor

**What it does:**
- Takes plain-text meeting transcripts (MacWhisper, Zoom, Teams, Google Meet, or plain text) and converts them into structured notes via an LLM.
- Outputs: TL;DR, action items (with owners), open questions, full summary in Emacs org-mode format with smart filenames.
- Four modes: manual script, push-based GitHub Actions, daemon with webhook receiver (standalone), and relay mode that offloads to GitHub Actions.
- Calendar integration: cross-references a local `calendar.org` to correct speaker misidentification and add meeting metadata to notes.
- Pre-processing: filters short/junk recordings; splits back-to-back meetings using a lightweight LLM call.

**Tech stack:** Python 3.11+, uv, Node.js (GitHub Copilot CLI / Gemini CLI), GitHub Actions. No vector DB, no embeddings.

**Dataset(s):** 3 sample transcripts in `examples/`: `q1-planning-sarah.txt`, `dunder-mifflin-sales.txt`, `mad-men-heinz.txt`. Realistic fictional meeting transcripts — directly reusable as test data.

**Most reusable / impressive idea:** The **calendar-context-injection trick**: passing structured calendar data (participants, time, meeting link) into the LLM prompt to correct speaker misidentification and add metadata. Shows that grounding LLM output in structured external context dramatically improves extraction accuracy — a practical form of context augmentation without full RAG.

---

## Reference Project 3 — MeetMind

**What it does:**
- Local-first meeting assistant (macOS primary): records system audio + mic, transcribes with Whisper (Swift sidecars), diarizes speakers (pyannote), generates summaries/action items/decisions, indexes transcripts for semantic search, exports to Obsidian/GitHub Issues/Slack/signed bundles.
- The `analyze` module is the most sophisticated: uses **Chain-of-Density summarization** (draft → densify with missed entities), **structured JSON extraction** with a verbatim-citation guard (action items must quote exact transcript text), and **closure detection** (asks LLM whether a later transcript closes a previous action item).
- Local vector search via LanceDB + nomic-embed-text (Ollama).
- Compliance module: DPIA generation, retention sweeps, redaction profiles (raw/team_internal/public_share).

**Tech stack:** Python 3.12+, Pydantic v2, FastAPI, SQLite/SQLCipher, LanceDB, actants, pyannote.audio, ONNX Runtime, Click/Rich.

**Dataset(s):** No external dataset. Test suite uses mock transcripts and `MockLLM`. No benchmark referenced.

**Most reusable / impressive idea:** The **verbatim-citation guard on extracted action items** — the LLM must output an `evidence_quote` that is a literal substring of the transcript. Items that fail the check are rejected with a logged reason. This is a clean, implementable hallucination-checking pattern for structured extraction: demonstrable, explainable, and impressive to a lab evaluator.

---

## Reference Project 4 — Murmur

**What it does:**
- Privacy-first, local meeting note-taker: record audio (sounddevice) → transcribe (Whisper / faster-whisper / MLX) → summarize via any LLM (Ollama, Groq, Gemini, Anthropic, OpenAI) → save Markdown notes.
- Speaker diarization (pyannote), live transcription, auto-meeting detection (psutil), TUI dashboard (Textual), export to PDF/DOCX (pypandoc).
- Multi-provider LLM dispatch via a clean `call_llm(provider, system_prompt, user_message)` function with lazy imports.
- Smart filename generation: uses a second LLM call to produce a kebab-case slug, then renames all three files (wav + txt + md) atomically.

**Tech stack:** Python 3.10+, sounddevice, faster-whisper, pyannote.audio, Textual (TUI), Click, Groq SDK, google-generativeai, anthropic, openai, ollama, pypandoc.

**Dataset(s):** No external dataset. Sample transcripts of the same style as meeting-notes-processor.

**Most reusable / impressive idea:** The **multi-provider LLM dispatch pattern** (`llm.py`) — a single dict maps provider names to `(callable, env_var, pip_package)` tuples. Callers pass a provider name; the function handles lazy import, env-var checks, and error messages. Swap Groq for Gemini with one env var change. The right abstraction for vibe-coded projects where providers may need to change mid-build.

---

## Candidate Datasets

| Dataset | Source | Size / Format | Reusable for |
|---|---|---|---|
| `q1-planning-sarah.txt` | meeting-notes-processor `examples/` | ~1 KB, plain-text dialogue | Any meeting-transcript processing project |
| `dunder-mifflin-sales.txt` | meeting-notes-processor `examples/` | ~2.5 KB, plain-text dialogue | Same, longer meeting with multiple speakers |
| `mad-men-heinz.txt` | meeting-notes-processor `examples/` | ~3 KB, plain-text dialogue | Same, creative/pitch meeting style |
| AMI Meeting Corpus | HuggingFace `edinburghcstr/ami` (free) | ~100 hours, multi-speaker, annotated transcripts + summaries | Evaluation benchmarking; gold summaries, action items, decisions |
| QMSum | HuggingFace `pszemraj/qmsum-cleaned` (free) | ~1.8K meeting QA pairs, structured transcripts | Query-driven summarization evaluation |
| MeetingBank | HuggingFace `huuuyeah/meetingbank` (free) | City council meetings, transcripts + reference summaries | Summarization eval with reference outputs |
| MediaSum | HuggingFace `ccdv/mediasum` (free) | ~463K interview transcripts + summaries | Large-scale summarization / eval |

**Recommended primary dataset:** AMI Meeting Corpus — gold-standard action items, summaries, and speaker-labeled transcripts; directly usable for evaluating extraction quality.

---

## Cross-Cutting Patterns Observed

1. **Pipeline = enriched data object**: Video2Notes' `Segment`, MeetMind's per-meeting model, Murmur's file-based pipeline all share this pattern — a typed object each stage enriches in place.
2. **Structured JSON extraction with guardrails**: MeetMind's verbatim-citation guard is the only project that validates LLM output against the source material — a standout pattern worth replicating.
3. **Multi-provider LLM dispatch**: Murmur's `llm.py` is the cleanest abstraction. All four projects support at least Groq + Gemini + Ollama.
4. **Missing — evaluation/quality scoring**: None of the four projects include systematic evaluation of extraction quality (precision/recall on action items, hallucination rate, summary factuality). This gap is the clearest opportunity for a differentiated project.
5. **Missing — agentic tool-use**: All four projects use LLMs in single-pass generation mode. None implement multi-step reasoning, tool calls, or a ReAct-style agent loop.
