# 📁 Meeting Intelligence Benchmark & Evaluation Datasets

This repository module contains curated meeting transcripts designed for validating, benchmarking, and demonstrating the **MeetingMind Intelligence Engine**. 

These datasets serve as standardized test suites for evaluating multi-speaker diarization, semantic context preservation, deterministic citation verification, and cross-meeting Hierarchical RAG search.

---

## 📊 Dataset Catalog & Benchmark Scenarios

| Dataset File | Domain / Context | Primary Evaluation Target | Key Characteristics |
| :--- | :--- | :--- | :--- |
| `q1-planning-sarah.txt` | **Engineering & Product Sync** | Action Item & Deadline Extraction | Clear task allocation, sprint timelines, CI/CD tooling deliberations, and ownership handoffs. |
| `dunder-mifflin-sales.txt` | **Enterprise Sales Strategy** | Disputed Ownership & Dialogue Disambiguation | Multi-stakeholder negotiation, conflicting account assignments, sales quotas, and cross-talk resolution. |
| `mad-men-heinz.txt` | **Executive Client Campaign Review** | Decision Tracking & Strategic Pivots | High-stakes client objections, creative direction alignment, deliverable commitments, and strategic consensus. |

---

## 🎯 Evaluation Objectives

Each transcript is engineered to stress-test specific capabilities of the MeetingMind NLP pipeline:

1. **Deterministic Citation Grounding**: Validating that every extracted action item and decision links strictly to verbatim conversational spans without speculative extrapolation.
2. **Ambiguity & Conflict Resolution**: Disambiguating overlapping claims (e.g., disputed account ownership or conflicting timeline estimates) to verify truthful model extraction.
3. **Hierarchical Parent-Child RAG**: Testing vector retrieval precision across granular child dialogue turns while preserving 5-turn parent context for conversational coherence.
4. **Automated Deliverable Generation**: Powering instant conversion into Executive Briefs, Jira/Linear formatted tasks, Action-Oriented Follow-up Emails, and Slack Standup summaries.

---

## 🔒 Enterprise Compliance & Data Integrity

- **Clean Anonymization**: All datasets are thoroughly curated and sanitized, ensuring zero exposure of proprietary enterprise data, confidential financials, or sensitive internal credentials.
- **Zero PII Footprint**: Fully compliant with enterprise privacy standards and safe for open demonstration, continuous integration (CI) tests, and multi-provider LLM benchmarking.
- **Reproducible Baseline**: Provides consistent, deterministic input for testing extraction models across OpenAI, Groq (Llama-3), Google Gemini, and local Ollama deployments.

---

## 🚀 Usage in MeetingMind

These datasets can be loaded directly through:
- **Extraction Studio**: Select any pre-loaded sample from the dropdown or paste the transcript to run instant structured extraction and citation verification.
- **Corpus Studio**: Ingest and index the files into the persistent FAISS vector corpus for cross-meeting multi-document queries.
- **CLI & Automated Testing**:
  ```bash
  # Run structured extraction on sample sync
  python cli.py extract demo_data/q1-planning-sarah.txt

  # Execute semantic RAG search across sample meetings
  python cli.py search demo_data/dunder-mifflin-sales.txt "who owns the manufacturing accounts"
  ```
