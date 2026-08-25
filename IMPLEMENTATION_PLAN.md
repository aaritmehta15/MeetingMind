# IMPLEMENTATION_PLAN.md

---

## Project: MeetingMind Evaluator

Structured extraction from meeting transcripts with hallucination guardrails, automated evaluation on the AMI corpus, and an agentic Q&A layer.

---

# MVP STEPS

---

**Step 1 — Environment setup**

What we're building: A clean Python 3.11 virtual environment with all dependencies pinned, a `.gitignore` that excludes the venv and secrets, a `.env` file template for API keys, and a sanity-check script that verifies every import resolves and both LLM providers respond.

Files touched/created:
- `venv/` (not committed)
- `requirements.txt`
- `.gitignore`
- `.env.example`
- `sanity_check.py`
- `README_DEV.md` (brief dev-only notes)

Commands to run:
```bash
cd "c:\Users\Aarit\Documents\Meeting Assistant Agent 2.0"
py -3.11 -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install groq google-generativeai sentence-transformers faiss-cpu pydantic python-dotenv rich rouge-score bert-score datasets
pip freeze > requirements.txt
```

**Test:** `python sanity_check.py` — prints "Groq OK", "Gemini OK", "sentence-transformers OK", "FAISS OK" with no exceptions. If a provider key is missing, the script prints a clear warning but does not crash (key will be added before Step 2).

**Confidence: High** — all packages are mainstream, pip-installable on Windows Python 3.11. Groq and Gemini free tiers are stable as of 2026 (verified in Murmur's README). `faiss-cpu` has a Windows wheel.

---

**Step 2 — LLM dispatch module (riskiest piece — built first)**

What we're building: A single `llm.py` module modelled directly on Murmur's `llm.py` but trimmed to two providers (Groq + Gemini) plus an Ollama fallback. Single function `call_llm(provider, system_prompt, user_message) -> str`. Provider and model are configurable via env vars. A second function `call_llm_json(provider, system_prompt, user_message, schema) -> dict` wraps the first, adds a JSON-mode instruction suffix to the system prompt, and parses/validates the response with Pydantic. This is the riskiest step because free-tier rate limits and JSON mode reliability are the two most likely blockers for the whole project.

Files touched/created:
- `llm.py`

Commands to run:
```bash
python -c "from llm import call_llm; print(call_llm('groq', 'You are helpful.', 'Say hello in one word.'))"
```

**Test:** The command above prints a one-word greeting from Groq. Then run the same with `'gemini'`. Both succeed. Then run a `call_llm_json` test that asks for `{"name": str, "age": int}` and verify the returned dict has those keys with correct types.

**Confidence: Medium** — Groq's free tier (6000 req/day, 30 req/min as of 2026) is workable. JSON mode via prompt instruction (not native structured output) is reliable for simple schemas. Fallback: if Groq JSON parsing fails >20% of the time in practice, switch to Gemini's native structured output (`response_mime_type="application/json"`), which is more reliable. Ollama is available as a fully offline fallback if both cloud providers have issues.

---

**Step 3 — Pydantic schemas for structured extraction**

What we're building: `schemas.py` with three Pydantic v2 models: `ActionItem` (description, owner, deadline, evidence_quote — all str, owner/deadline Optional), `Decision` (description, evidence_quote), and `MeetingExtraction` (summary: str, action_items: list[ActionItem], decisions: list[Decision]). These are the single source of truth for what the LLM is asked to produce and what the citation guard validates against.

Files touched/created:
- `schemas.py`

Commands to run:
```bash
python -c "from schemas import MeetingExtraction; m = MeetingExtraction.model_validate({'summary': 'Test', 'action_items': [], 'decisions': []}); print(m)"
```

**Test:** The above command prints a valid `MeetingExtraction` object. Also test that a missing required field raises a `ValidationError`.

**Confidence: High** — Pydantic v2 is well-documented, installed in Step 1.

---

**Step 4 — Extraction prompt and system prompt**

What we're building: `prompts.py` with a `EXTRACTION_SYSTEM_PROMPT` string that instructs the LLM to output a JSON object matching the `MeetingExtraction` schema. The prompt includes: the schema definition inline, the `evidence_quote` rule (must be verbatim from transcript), a note that `owner` and `deadline` should be null if not explicitly stated (not inferred), and one complete few-shot example using the `q1-planning-sarah.txt` transcript. Also a `build_extraction_user_prompt(transcript_text: str) -> str` function.

Files touched/created:
- `prompts.py`

Commands to run: (no commands; this is a file with constants and a function)

**Test:** Import `build_extraction_user_prompt`, call it with a 3-sentence transcript, verify it returns a non-empty string containing the transcript text.

**Confidence: High** — pure Python string templating, no external dependencies.

---

**Step 5 — Citation guard**

What we're building: `citation_guard.py` with a single function `validate_citations(extraction: MeetingExtraction, transcript_text: str) -> CitationReport`. The `CitationReport` dataclass has `accepted_actions: list[ActionItem]`, `rejected_actions: list[tuple[ActionItem, str]]`, `accepted_decisions: list[Decision]`, `rejected_decisions: list[tuple[Decision, str]]`. An item is accepted if its `evidence_quote` is a case-sensitive substring of the transcript; rejected otherwise with reason "evidence_quote not found in transcript". This is the core hallucination-checking mechanism — a direct port and simplification of MeetMind's `actions.py` guard.

Files touched/created:
- `citation_guard.py`

Commands to run:
```bash
python -c "
from schemas import ActionItem, Decision, MeetingExtraction
from citation_guard import validate_citations
t = 'Alice will finish the report by Friday.'
item = ActionItem(description='Finish report', owner='Alice', deadline='Friday', evidence_quote='Alice will finish the report by Friday.')
bad = ActionItem(description='Do something', owner='Bob', deadline=None, evidence_quote='Bob said something that never happened.')
ext = MeetingExtraction(summary='Test', action_items=[item, bad], decisions=[])
report = validate_citations(ext, t)
print(len(report.accepted_actions), len(report.rejected_actions))
"
```

**Test:** The above prints `1 1` — one accepted, one rejected.

**Confidence: High** — simple string membership check, no LLM involved.

---

**Step 6 — Extraction pipeline: end-to-end on sample transcripts**

What we're building: `extractor.py` with a `run_extraction(transcript_text: str, provider: str = "groq") -> tuple[MeetingExtraction, CitationReport]` function. It calls `call_llm_json`, validates with Pydantic, runs the citation guard, and returns both objects. Also adds retry logic: if the LLM returns malformed JSON (parse error), retry once with a corrective prompt ("Your previous response was not valid JSON. Please output only the JSON object."). Also a `load_transcript(path: str) -> str` helper.

Files touched/created:
- `extractor.py`

Commands to run:
```bash
python extractor.py references/meeting-notes-processor-main/examples/q1-planning-sarah.txt
```

**Test:** Running the above prints a formatted table (using `rich`) showing: the TL;DR summary, each action item with its evidence_quote and ACCEPTED/REJECTED status, and each decision. For `q1-planning-sarah.txt`, expect 2-3 action items (Edd: roadmap, Edd: CI/CD, Sarah: hiring), all ACCEPTED since the transcript is clean.

**Confidence: Medium** — the LLM JSON output will likely need 1-2 prompt iterations to be reliable. The retry logic and Pydantic validation catch most failure modes. Fallback: if JSON parsing fails repeatedly, use Gemini's `response_mime_type="application/json"` native mode instead of prompt-based JSON.

---

**Step 7 — AMI dataset loader and sampler**

What we're building: `ami_loader.py` that downloads a sample of AMI meetings from HuggingFace (`datasets.load_dataset("edinburghcstr/ami", "ihm")`), extracts the transcript text (concatenating speaker-labeled utterances into `Speaker: text\n` format), and extracts the gold summary and gold action items from the AMI annotations. Returns a list of `AMISample(meeting_id, transcript_text, gold_summary, gold_action_items)` dataclass instances. Includes a `--n` flag to limit to the first N meetings (default 20 for development).

Files touched/created:
- `ami_loader.py`

Commands to run:
```bash
python ami_loader.py --n 3
```

**Test:** Prints 3 meeting IDs, the first 200 characters of each transcript, and the gold summary. Verifies that the HuggingFace download succeeds and the fields map correctly.

**Confidence: Medium** — HuggingFace `datasets` is reliable, but the AMI dataset's field names and structure need to be verified against the actual dataset schema. Fallback: if the AMI dataset format turns out to be inconvenient, use `pszemraj/qmsum-cleaned` which is simpler and pre-cleaned; or generate a small synthetic benchmark from the 3 sample transcripts by hand-annotating gold action items.

---

**Step 8 — Evaluation script: ROUGE and action-item precision/recall**

What we're building: `eval.py` that runs `run_extraction` on N AMI meetings and computes:
- ROUGE-1, ROUGE-2, ROUGE-L for generated summaries vs. gold summaries (`rouge-score` library)
- Precision/recall/F1 for extracted action items vs. gold action items (soft matching: an extracted item is a true positive if it shares ≥50% token overlap with any gold item, using Jaccard similarity)
- Citation-guard rejection rate: fraction of extracted items that failed the verbatim check

Prints a summary table with `rich` and saves results to `eval_results.json`.

Files touched/created:
- `eval.py`

Commands to run:
```bash
python eval.py --n 20
```

**Test:** After running, `eval_results.json` exists and contains `rouge_1`, `rouge_2`, `rouge_l`, `action_precision`, `action_recall`, `action_f1`, `rejection_rate` fields, all floats in [0, 1]. Typical expected values: ROUGE-1 ~0.30-0.45 (meeting summarization is hard), action-item precision ~0.50-0.70 (LLMs are decent at this).

**Confidence: Medium** — the soft-matching logic for action items is custom but simple (token Jaccard). The main unknown is whether AMI's annotation format exposes action items in a machine-readable way; the dataset may store them differently per split. Fallback: if AMI gold action items are not extractable, evaluate summaries only (ROUGE scores are enough for an eval story) and note the limitation in the README.

---

**Step 9 — CLI: extract command**

What we're building: `cli.py` with a `extract` command using Python's `argparse`. Usage: `python cli.py extract <transcript_file> [--provider groq|gemini|ollama]`. Loads the transcript, runs `run_extraction`, prints the result in a formatted rich table (summary, action items with citation status, decisions). Saves output to `<transcript_file>.extraction.json`.

Files touched/created:
- `cli.py` (new)

Commands to run:
```bash
python cli.py extract "references/meeting-notes-processor-main/examples/dunder-mifflin-sales.txt"
```

**Test:** Command completes without errors, prints a formatted table, and creates `dunder-mifflin-sales.txt.extraction.json` with valid JSON content.

**Confidence: High** — argparse is stdlib, rich table rendering is straightforward.

---

**Step 10 — Hierarchical Parent-Child RAG index**

What we're building: `rag_index.py` implementing the core RAG component. This is the correct RAG type for conversational transcripts — meeting dialogue is context-dependent, so a single retrieved utterance like "I'll handle that" is uninterpretable without its neighbours.

The design:
- **Child chunks**: individual speaker turns or utterance pairs (~1-2 lines). These are embedded and indexed — small and precise, so retrieval is accurate.
- **Parent windows**: groups of ~5-6 consecutive utterances centred on each child chunk. These are what gets passed to the LLM after retrieval — wide enough for full conversational context.
- **Mapping**: each child chunk stores a pointer to its parent window index. Retrieval returns child matches; the system fetches the parent windows before generation.

The `HierarchicalRAGIndex` class:
- `build(transcript_text: str) -> None` — splits transcript into child/parent chunks, embeds child chunks with `sentence-transformers` (all-MiniLM-L6-v2), stores in an in-memory `faiss.IndexFlatIP`.
- `search(query: str, k: int = 3) -> list[RAGResult]` — embeds query, retrieves top-k child chunks, expands each to its parent window, deduplicates overlapping windows, returns `RAGResult(child_text, parent_window, score)`.
- `save(path: str)` / `load(path: str)` — serialize to disk as `<name>.faiss` + `<name>.meta.json` so the index is not rebuilt on every run.

Files touched/created:
- `rag_index.py`

Commands to run:
```bash
python -c "
from rag_index import HierarchicalRAGIndex
transcript = '''Alice: We need to finalize the roadmap by Friday.
Bob: I can take that on. I'll send a draft by Thursday.
Alice: Perfect. What about the CI/CD setup?
Bob: I'll handle that too, but need two weeks.
Alice: OK. Sarah, can you own the hiring process?
Sarah: Yes, I already have candidates in mind.'''
idx = HierarchicalRAGIndex()
idx.build(transcript)
results = idx.search('Who is responsible for the roadmap?')
for r in results:
    print(f'{r.score:.3f} | child: {r.child_text[:50]} | parent window: {len(r.parent_window)} chars')
"
```

**Test:** Top result has the child text containing Bob's roadmap commitment; its parent window includes Alice's question AND Bob's reply (context preserved). Score > 0.5. A second `idx.search` call for "CI/CD" returns a different non-overlapping parent window.

**Confidence: High** — sentence-transformers + FAISS is battle-tested. The parent-child mapping is pure Python (list indexing). all-MiniLM-L6-v2 runs on CPU in ~100ms per query. The only design decision is parent window size (5-6 turns) — easy to tune if needed.

---

**Step 11 — CLI: search command (RAG search)**

What we're building: Add a `search` command to `cli.py`. Usage: `python cli.py search <transcript_file> "<query>" [--k 3]`. Builds (or loads cached) `HierarchicalRAGIndex` for the transcript, runs the query, and prints: the matched child text (the precise hit), then the full parent window (the context the LLM would receive), plus the similarity score. This output makes the Parent-Child RAG design visually obvious — the evaluator can see both the small retrieval unit and the expanded context side-by-side.

Files touched/created:
- `cli.py` (updated)

Commands to run:
```bash
python cli.py search "references/meeting-notes-processor-main/examples/q1-planning-sarah.txt" "what did Edd agree to do"
```

**Test:** Output shows: child text = the exact utterance where Edd commits to something; parent window = the surrounding 5-6 lines of dialogue. Second run is faster (cache hit — index loaded from disk, not rebuilt).

**Confidence: High** — thin wrapper over Step 10.

---

**Step 12 — Agentic Q&A: tool definitions**

What we're building: `agent_tools.py` defining two tool functions and their JSON descriptions (in the style of function-calling schemas):
- `rag_search(query: str) -> str` — calls `HierarchicalRAGIndex.search`, returns the top-3 **parent windows** (not just child sentences) formatted as a string. The LLM therefore always receives full conversational context, not isolated utterances.
- `get_extracted_data(field: Literal["action_items", "decisions", "summary"]) -> str` — loads `<transcript>.extraction.json` and returns the requested field as a formatted string.

Both functions take a loaded `HierarchicalRAGIndex` and extraction JSON as context (injected at call time). The JSON schema for each tool is defined as a plain Python dict — no LangChain, no function-calling framework.

Files touched/created:
- `agent_tools.py`

Commands to run: (unit test)
```bash
python -c "
from agent_tools import get_tool_schemas
schemas = get_tool_schemas()
print([s['name'] for s in schemas])
"
```

**Test:** Prints `['rag_search', 'get_extracted_data']`.

**Confidence: High** — pure Python, no external dependencies.

---

**Step 13 — Agentic Q&A: ReAct loop**

What we're building: `agent.py` implementing a minimal ReAct (Reason + Act) agent. Loop:
1. Send user question + tool schemas + transcript context to LLM. Ask it to output a JSON decision: `{"thought": str, "tool": str, "tool_input": dict}` or `{"thought": str, "final_answer": str}`.
2. If `tool` is present, execute the tool, append the tool result to context, loop (max 3 iterations).
3. If `final_answer` is present, print the answer.

The agent always cites: after the final answer, it appends "Evidence: [relevant quote]" if the tool result contained a transcript span. This is implemented as a single Python function `run_agent(question: str, transcript_path: str, provider: str = "groq") -> str`. No framework — the loop is ~50 lines of Python.

Files touched/created:
- `agent.py`

Commands to run:
```bash
python agent.py "references/meeting-notes-processor-main/examples/q1-planning-sarah.txt" "What did Edd agree to do about the CI/CD pipeline?"
```

**Test:** The agent prints its reasoning steps (Thought: ..., Action: search_transcript, Observation: ...) and a final answer that mentions Edd and CI/CD, with a quoted transcript span. The answer is factually grounded in the transcript text.

**Confidence: Medium** — ReAct with LLMs via plain JSON prompt is well-documented and works reliably for 2-tool setups. The main risk is that the LLM occasionally outputs malformed JSON for the reasoning step. Mitigation: add a fallback that, if JSON parsing fails on the reasoning step, falls back to a direct one-shot answer without tool use. Fallback labeled clearly as "direct answer (tool selection failed)" so the evaluator can see when it happens.

---

**Step 14 — CLI: ask command**

What we're building: Add an `ask` command to `cli.py`. Usage: `python cli.py ask <transcript_file> "<question>" [--provider groq|gemini|ollama]`. Calls `run_agent` and prints the result with `rich`.

Files touched/created:
- `cli.py` (updated)

Commands to run:
```bash
python cli.py ask "references/meeting-notes-processor-main/examples/dunder-mifflin-sales.txt" "Who is responsible for following up with the client?"
```

**Test:** Agent returns a grounded answer with a cited transcript span. No crash, no infinite loop.

**Confidence: High** — thin wrapper over Step 13.

---

**Step 15 — CLI: eval command + final integration test**

What we're building: Add an `eval` command to `cli.py`: `python cli.py eval --n 20 [--provider groq]`. Calls `eval.py` logic, prints the results table, saves `eval_results.json`. Also: run an end-to-end integration test on all 3 sample transcripts from `references/examples/` to verify the full pipeline (extract → search → ask) works on each without errors.

Files touched/created:
- `cli.py` (updated)
- `tests/integration_test.py`

Commands to run:
```bash
python cli.py eval --n 20
python tests/integration_test.py
```

**Test:** `cli.py eval` prints a results table with 7 numeric columns and no exceptions. `integration_test.py` runs all 3 transcripts through `extract` + `search` (RAG) + `ask` and prints PASS/FAIL for each. All 3 should PASS. The `search` test specifically checks that the returned parent window is longer than the child text (validating the Parent-Child expansion is working).

**Confidence: Medium** — depends on Groq rate limits during the 20-meeting eval run (~20-40 LLM calls). At 30 req/min free tier, this takes 1-2 minutes with no delays, or 5-10 minutes with conservative rate limiting. If Groq rate-limits: add a `time.sleep(2)` between meetings, or switch to Gemini (1500 req/day is more than enough for a 20-meeting eval).

---

# WOW FEATURE STEPS (clearly separated — cut here if time is short)

---

**Step W1 — Cross-meeting corpus RAG**

What we're building: The headline wow feature. After running `extract` on a folder of transcripts, `corpus.py` persists all their child-chunk embeddings into a single **shared FAISS index** stored at `corpus/corpus.faiss` + `corpus/corpus.meta.json`. The meta file stores per-chunk metadata: `{meeting_id, meeting_date, speaker, child_text, parent_window}`. This is a natural, zero-extra-dependency extension of the same `HierarchicalRAGIndex` already built in Step 10 — same embedding model, same FAISS format, just a persistent shared store instead of a per-file in-memory index.

New CLI command: `python cli.py corpus-ask "<question>" [--k 5]`
- Embeds the question with all-MiniLM-L6-v2
- Retrieves top-k child chunks *across all indexed meetings*
- Expands each to its parent window + attaches meeting metadata
- Sends to LLM: "Answer the question using the meeting excerpts below. Cite the meeting ID and speaker for each piece of evidence."
- Returns: a cited, grounded answer showing which meeting and speaker each claim comes from

Example: `python cli.py corpus-ask "What have we decided about the CI/CD tooling across all our meetings?"` → answer cites two different meetings, quotes the relevant exchange from each.

Files touched/created:
- `corpus.py`
- `cli.py` (updated, adds `corpus-build` and `corpus-ask` commands)

Commands to run:
```bash
python cli.py corpus-build references/meeting-notes-processor-main/examples/
python cli.py corpus-ask "What have we decided about CI/CD tooling?"
```

**Test:** `corpus-build` creates `corpus/corpus.faiss` and `corpus/corpus.meta.json`. `corpus-ask` returns an answer that references at least one meeting ID and includes a quoted parent window. Run with a question that only appears in one of the sample transcripts to verify retrieval is narrowing correctly.

**Confidence: Medium** — the indexing and retrieval are direct extensions of Step 10 (High confidence). The main unknown is LLM quality on multi-document synthesis with citation formatting; this improves with a well-crafted system prompt. Fallback: if citation formatting is unreliable, simplify to returning the top-k parent windows verbatim alongside the LLM answer.

---

**Step W2 — Hallucination dashboard (Streamlit)**

What we're building: `dashboard.py` — a Streamlit app that loads `eval_results.json` and per-meeting extraction JSONs, displays a sortable table of meetings with ROUGE scores, action-item F1, and rejection rate per meeting, and a detail view showing accepted vs. rejected items side-by-side with transcript highlights. Color-codes: green for accepted, red for rejected.

Files touched/created:
- `dashboard.py`

Commands to run:
```bash
pip install streamlit
streamlit run dashboard.py
```

**Test:** App opens in browser, table shows N rows (one per evaluated meeting), clicking a row shows the extraction detail. No crashes on the 20-meeting eval output.

**Confidence: High** — Streamlit is extremely well-documented and the data is already structured in `eval_results.json`.

---

**Step W3 — Cross-meeting action-item tracker**

What we're building: `tracker.py` that takes a folder of chronologically ordered transcripts, runs extraction on each, and then uses the corpus RAG index (from W1) to find later transcripts that mention each open action item. Asks the LLM with the citation guard: does the retrieved passage confirm the action was completed? Produces a Markdown table: action item | owner | opened in | status (open / closed in meeting X) | evidence quote. Builds naturally on the corpus RAG layer — retrieval does the heavy lifting of finding relevant later meetings, LLM only needs to judge completion.

Files touched/created:
- `tracker.py`

Commands to run:
```bash
python tracker.py --folder references/meeting-notes-processor-main/examples/
```

**Test:** Runs on 3 sample transcripts without errors. Since these are unrelated fictional meetings, all items remain "open" — correct and expected. Create a synthetic two-meeting pair (meeting A assigns action, meeting B confirms it) to verify the "closed" path.

**Confidence: Medium** — the retrieval step (corpus RAG) is already built. The closure judgment via LLM + citation guard is proven in MeetMind. Main risk: false positives. The citation guard mitigates this.

---

# Evaluator Map & Resume Bullet

## Feature → Lab Evaluator Probe

| Feature | What an evaluator will likely ask |
|---|---|
| Structured JSON extraction | "How did you prompt the LLM to produce JSON? What happens when it doesn't?" |
| Pydantic schema validation | "Why Pydantic? What does it catch that plain JSON parsing doesn't?" |
| Verbatim-citation guard | "How do you know the evidence quote is real? What's the rejection rate?" |
| ROUGE evaluation | "What does ROUGE measure? What doesn't it measure? Why ROUGE-L vs. ROUGE-2?" |
| Action-item precision/recall | "How did you define a true positive for a soft match? Is Jaccard the right metric?" |
| Hierarchical Parent-Child RAG | "Why Parent-Child RAG specifically? How is it different from naive chunking? What's a parent window?" |
| Cross-meeting corpus RAG | "How do you prevent the corpus index from returning irrelevant meetings? How do you cite sources?" |
| FAISS + sentence-transformers | "What embedding model? Why cosine similarity? What's the tradeoff vs. BM25?" |
| ReAct agent loop | "Walk me through one iteration of the agent loop. When does it terminate?" |
| AMI corpus | "Why AMI? What's IHM vs. SDM? What's in the gold annotations?" |
| Multi-provider dispatch | "What happens if Groq rate-limits mid-eval? How does the fallback work?" |

## Resume Bullet

> Built a meeting transcript analysis system with structured action-item/decision extraction (hallucination-guarded via verbatim citation checks), automated quality evaluation (ROUGE + precision/recall) on the AMI Meeting Corpus, Hierarchical Parent-Child RAG for context-preserving single-meeting Q&A, and a persistent multi-document RAG corpus for cross-meeting natural-language queries; stack: Python, Groq LLM API, sentence-transformers, FAISS, Pydantic v2, HuggingFace Datasets.
