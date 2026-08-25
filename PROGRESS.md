# PROGRESS.md — MeetingMind Evaluator

Running checklist — updated after each step's test passes.

---

## MVP Steps

- [x] **Step 1** — Environment setup *(Python 3.14, all 11 sanity checks OK, exit 0)*
- [x] **Step 2** — LLM dispatch module (`llm.py`) *(Groq text+JSON OK, Pydantic validates)*
- [x] **Step 3** — Pydantic schemas (`schemas.py`) *(ValidationError on missing fields OK)*
- [x] **Step 4** — Extraction prompt (`prompts.py`) *(user prompt builder + speaker-ctx OK)*
- [x] **Step 5** — Citation guard (`citation_guard.py`) *(1 accepted, 1 rejected, rate=0.5 OK)*
- [x] **Step 6** — Extraction pipeline end-to-end (`extractor.py`) *(3/3 items accepted, 0% rejection on q1-planning-sarah.txt)*
- [x] **Step 7** — AMI dataset loader (`ami_loader.py`) *(probe: 6 fields confirmed, audio drop fix applied)*
- [x] **Step 8** — Evaluation script ROUGE + P/R (`eval.py`) *(written, tested via integration)*
- [x] **Step 9** — CLI: `extract` command (`cli.py`) *(11/11 items, 0% rejection, exit 0)*
- [x] **Step 10** — Hierarchical Parent-Child RAG index (`rag_index.py`) *(7 chunks, parent windows expand correctly)*
- [x] **Step 11** — CLI: `search` command *(RAG search working, index cached to disk)*
- [x] **Step 12** — Agentic Q&A: tool definitions (`agent_tools.py`) *(rag_search, get_extraction, get_summary)*
- [x] **Step 13** — Agentic Q&A: ReAct loop (`agent.py`) *(correct answer with verbatim evidence, exit 0)*
- [x] **Step 14** — CLI: `ask` command *(wires to agent.py)*
- [x] **Step 15** — CLI: `eval` command + final integration test *(all commands wired, exit 0)*

---

## Wow Feature Steps

- [x] **Step W1** — Cross-meeting corpus RAG (`corpus.py` + `corpus-build`/`corpus-ask` CLI) *(66 chunks from 3 meetings, grounded answer with source citations)*
- [ ] **Step W2** — Hallucination dashboard (Streamlit, `dashboard.py`)
- [ ] **Step W3** — Cross-meeting action-item tracker (`tracker.py`)

---

## Notes & Future Ideas

*(Log new ideas here instead of expanding scope mid-build)*

- Step 1: Using Python 3.14 instead of 3.11 — only version installed; fully compatible with all libraries.
