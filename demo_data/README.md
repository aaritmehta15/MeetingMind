# 📁 Enterprise Meeting Intelligence Benchmark Datasets

This directory contains standardized, long-form enterprise meeting datasets engineered to benchmark, evaluate, and demonstrate the full capabilities of the **MeetingMind Intelligence Engine**.

These transcripts simulate real-world executive, engineering, security, and commercial conversations—featuring multi-turn speaker dynamics, complex technical trade-offs, financial metrics, conflicting timelines, and grounded deliverable commitments.

---

## 📊 Dataset Catalog & Evaluation Scenarios

| Benchmark Dataset | Domain & Context | Participants | Key Evaluation Capabilities |
| :--- | :--- | :--- | :--- |
| **`01_cloud_architecture_migration_sync.txt`** | **Cloud Infrastructure & Architecture Review**<br>*(AWS spend, EKS Graviton3, Aurora sharding)* | 4 Speakers<br>*(VP Infra, Cloud Architect, Lead SRE, Principal DB Eng)* | • Financial run-rate & cost-reduction calculation ($142k → $94k)<br>• Technical decision extraction (EKS vs Savings Plan, Aurora vs CockroachDB)<br>• Hard deadlines with exact date/time attribution |
| **`02_q3_crossfunctional_product_launch.txt`** | **Cross-Functional Product Launch & Readiness**<br>*(GA timeline, Safari SSO blocker, Stripe Billing)* | 5 Speakers<br>*(Head of Product, Frontend Arch, Lead Designer, Billing Lead, VP CS)* | • Cross-browser blocker triage & timeline adjustment (delay to Nov 10)<br>• Third-party integration verification (Stripe ACH & webhooks)<br>• Multidisciplinary task handoffs (Figma design specs, Cypress tests) |
| **`03_security_incident_postmortem_audit.txt`** | **Security Incident Post-Mortem & SOC-2 Audit**<br>*(WAF rate-limit bypass, OIDC, Teleport MFA)* | 4 Speakers<br>*(CISO, Lead AppSec Eng, Staff DevOps Eng, Compliance Dir)* | • Root-cause analysis & severity triage (INC-8492 credential stuffing)<br>• Compliance audit remediation (SOC-2 Type II CC6.1 criteria)<br>• Security policy decision tracking (hardware FIDO2 WebAuthn keys) |
| **`04_enterprise_client_qbr_negotiation.txt`** | **Enterprise Commercial QBR & Expansion**<br>*(Multi-year contract, EU data residency, SLA terms)* | 4 Speakers<br>*(Enterprise AE, Client CTO, VP Solutions Eng, Legal Counsel)* | • High-stakes contract terms negotiation ($480,000 multi-year)<br>• Regulatory & sovereignty compliance (Frankfurt AWS eu-central-1 CMEK)<br>• Service Level Agreement guarantees (99.99% uptime with 15m P0 response) |
| **`05_ai_copilot_engineering_roadmap_sync.txt`** | **AI Copilot & LLM Infrastructure Roadmap**<br>*(Model fine-tuning, latency SLAs, GPU cluster costs)* | 4 Speakers<br>*(VP of AI, Staff ML Eng, Lead Data Eng, Head of Product)* | • LLM evaluation & latency budgeting (p95 < 800ms)<br>• GPU infrastructure cost optimization (H100 vs L40S spot instances)<br>• Production deployment milestone commitments |

---

## 🎯 Technical Evaluation Objectives

These datasets are specifically formatted to stress-test MeetingMind across four core dimensions:

1. **Deterministic Citation Grounding (0% Hallucinations)**:
   - Evaluates whether the extraction engine anchors every generated action item, owner, and deadline strictly to exact verbatim substring spans from the transcript dialogue.
2. **Ambiguity & Disputed Timeline Disambiguation**:
   - Tests the model's ability to distinguish between initial exploratory proposals, dissenting objections, and final consensus decisions made by the group.
3. **Hierarchical Parent-Child RAG Precision**:
   - Tests vector search precision over granular speaker turns (child chunks) while expanding to 5-turn parent windows to answer contextual questions without conversational context loss.
4. **Automated Cross-Tool Formatting**:
   - Tests one-click deliverable generation: Executive Briefs, Jira/Linear markdown tickets, formal Client and Internal Follow-up Emails, and Slack/Teams broadcasts.

---

## 🔒 Enterprise Compliance & Data Integrity

- **Anonymized Enterprise Standards**: All benchmarks are sanitized and structured to mirror Fortune 500 operational syncs without exposing real-world proprietary intellectual property.
- **Zero PII Exposure**: Completely free from confidential personal data, internal keys, or live infrastructure secrets.
- **Deterministic Evaluation Baseline**: Serves as a repeatable benchmark suite for comparing Groq (Llama-3), Google Gemini, and local Ollama models.

---

## 🚀 Running Benchmarks in MeetingMind

### 1. In the Web UI
- **Extraction Studio**: Open the pre-loaded transcript dropdown or paste any benchmark file to extract structured action items and citations.
- **Query Hub / Corpus Studio**: Ingest all four benchmark meetings to run cross-meeting synthesis and multi-document queries (e.g., *"What infrastructure and compliance commitments were agreed to for European expansion?"*).

### 2. Via CLI
```bash
# Run structured extraction on cloud architecture sync
python cli.py extract demo_data/01_cloud_architecture_migration_sync.txt

# Run semantic RAG search across security audit
python cli.py search demo_data/03_security_incident_postmortem_audit.txt "what was the root cause of the WAF bypass"

# Build persistent multi-meeting corpus across all four benchmarks
python cli.py corpus-build demo_data --corpus-dir corpus
```
