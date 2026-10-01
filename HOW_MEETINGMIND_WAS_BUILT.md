# MeetingMind: Complete Viva Defense & Architectural Logic Guide
> **Everything you need to master, explain, and defend your Final Year Project with confidence.**

---

## 🎯 Quick Elevator Pitch (Say this to the examiners)

> *"MeetingMind is an intelligent meeting intelligence platform that turns raw conversational transcripts into 100% verified action items, decisions, analytics, and searchable multi-meeting knowledge bases. Unlike standard AI tools like ChatGPT that frequently hallucinate or guess commitments, MeetingMind uses a **deterministic citation guard** that mathematically verifies every single extracted task against exact quotes in the transcript. Furthermore, it incorporates a **Hierarchical Parent-Child RAG** system so context is never lost, a **zero-cost local NLP engine** that runs in milliseconds, and an **Autonomous ReAct Agent** that can reason through complex questions using tools."*

---

## 📑 Table of Contents

1. [The Real-World Problem We Solved](#1-the-real-world-problem-we-solved)
2. [Feature-by-Feature Conceptual Deep Dive](#2-feature-by-feature-conceptual-deep-dive)
   - [Feature 1: Extraction Studio & Deterministic Citation Guard](#feature-1-extraction-studio--deterministic-citation-guard)
   - [Feature 2: Zero-Cost Local NLP Analytics Engine](#feature-2-zero-cost-local-nlp-analytics-engine)
   - [Feature 3: Hierarchical Parent-Child RAG (Vector Search)](#feature-3-hierarchical-parent-child-rag-vector-search)
   - [Feature 4: Autonomous ReAct Reasoning Agent](#feature-4-autonomous-react-reasoning-agent)
   - [Feature 5: Knowledge Corpus (Cross-Meeting Intelligence)](#feature-5-knowledge-corpus-cross-meeting-intelligence)
   - [Feature 6: Action Item Tracker & Calendar Sync](#feature-6-action-item-tracker--calendar-sync)
   - [Feature 7: Multi-Provider Cloud Gateway & Auto-Failover](#feature-7-multi-provider-cloud-gateway--auto-failover)
3. [The End-to-End Pipeline: How Data Moves](#3-the-end-to-end-pipeline-how-data-moves)
4. [Top 15 Most Expected Viva Defense Questions & Answers](#4-top-15-most-expected-viva-defense-questions--answers)

---

## 1. The Real-World Problem We Solved

### The Problem with Standard AI Summarization
In modern engineering teams, businesses, and universities, dozens of hours are spent in meetings. If you feed a 1-hour transcript to standard ChatGPT or Gemini:
1. **Hallucination Risk**: The AI will casually invent commitments. If John says *"I might look at the schematic if I get free time,"* standard AI often summarizes: *"Action Item: John will complete the schematic by Friday."* In engineering and business, false commitments cause project failure.
2. **Context Fragmentation**: Standard chunking cuts conversations arbitrarily in the middle of a sentence, so the AI has no idea who agreed to what.
3. **High Latency & Expensive Costs**: Sending entire transcripts to cloud LLMs just to count who spoke the most or check if the meeting was happy or tense wastes money and takes 5–10 seconds.
4. **No Multi-Step Reasoning**: If you ask *"Did we stay within budget across our Phase 1 and Phase 2 hardware purchases?"*, a basic search engine cannot calculate numbers or cross-reference multiple speakers.

### Our Solution
MeetingMind was engineered with a **zero-trust, verifiable architecture**:
- Nothing is accepted as a task or decision unless it has a **verbatim quote** proveable in the text.
- Calculations and analytics are performed **locally on the CPU in milliseconds for free**.
- Semantic search preserves **conversational context before and after every statement**.
- An **autonomous reasoning agent** can plan, use specialized tools (including a safe calculator), and verify its own facts.

---

## 2. Feature-by-Feature Conceptual Deep Dive

---

### Feature 1: Extraction Studio & Deterministic Citation Guard

#### What this feature does:
It takes any meeting transcript, reads the entire conversation, and automatically extracts:
- A concise Executive Summary (TL;DR).
- All actionable tasks (Action Items) with their assigned owner, exact deadline, and verbatim evidence quote.
- All formal agreements and decisions made by the team.

#### The Behind-the-Scenes Logic (How it works without guessing):
1. **Schema Enforcement**:
   When we prompt the language model (Gemini or Groq), we do not ask for free-form text. We force the model to output a strict structured format (via Pydantic). The model is forbidden from returning any task unless it also supplies the exact, character-for-character quote from the transcript where the speaker agreed to it.
2. **The Verification Guard (The Lie Detector)**:
   Once the AI returns its extracted items, MeetingMind **does not trust the AI**. 
   Instead, our internal `Citation Guard` takes every single evidence quote and searches for it inside the original transcript text:
   - **Step 1 (Direct match)**: Does this exact sentence exist in the transcript?
   - **Step 2 (Whitespace cleanup)**: Normalizes extra spaces or line breaks.
   - **Step 3 (Punctuation normalization)**: Strips quotation marks, curly quotes, and dashes to make sure formatting differences don't falsely reject valid quotes.
3. **The Acceptance Verdict**:
   - If the quote is found in the transcript $\rightarrow$ The task is **Accepted** and marked **100% Grounded**.
   - If the quote was paraphrased, altered, or invented $\rightarrow$ The item is **Rejected** and flagged to the user.
4. **Interactive Dialogue Player**:
   In the UI, every dialogue turn is timestamped. If the user clicks on an action item's quote, the system automatically scrolls to and spotlights the exact line where the speaker said it.

---

### Feature 2: Zero-Cost Local NLP Analytics Engine

#### What this feature does:
It provides an instant statistical and psychological dashboard of the meeting in **under 100 milliseconds** with **zero API calls and zero dollar cost**:
- **Speaker Participation**: Talk-time percentage, word counts, turn counts, and who asked the most questions.
- **VADER Sentiment**: Emotional tone and valence of each participant (Positive, Neutral, Negative).
- **TF-IDF Keywords & Bigrams**: Most recurring technical terms and 2-word phrases.
- **Extracted Timeline**: Every date, milestone, and deadline mentioned, linked to the speaker who stated it.
- **Transcript Structural Health Score**: A grade (A+, B, C) on how clean and parseable the transcript format is.

#### The Behind-the-Scenes Logic:
1. **Zero LLM Token Usage**:
   Most people make the mistake of calling an expensive cloud LLM like GPT-4 for simple statistics. We built this entirely with local, rule-based algorithms running directly on the computer's CPU.
2. **Speaker Parsing Logic**:
   The engine scans line-by-line using regular expressions looking for `Speaker Name: Text`. It dynamically ignores transcript metadata headers (such as `Date:`, `Duration:`, `Participants:`).
3. **VADER Sentiment Logic**:
   VADER (Valence Aware Dictionary and sEntiment Reasoner) evaluates words based on their emotional weight (e.g., *"excellent"*, *"risk"*, *"delay"*, *"breakthrough"*). It calculates an overall compound tone score between $-1.0$ (very negative) and $+1.0$ (very positive) for each individual speaker.
4. **Milestone Timeline Logic**:
   Instead of grabbing isolated words like *"Friday"*, our engine extracts **entire complete sentences** that contain full dates (e.g., `Friday, December 5, 2025 at 10:00 AM`), links the speaker who said it, and presents clean milestone cards so the timeline actually makes sense.
5. **Structural Health Calculation**:
   It divides the number of well-attributed speaker lines by the total lines in the file to compute a percentage score. If someone uploads a raw messy text with no names, the health score drops and warns them before extraction.

---

### Feature 3: Hierarchical Parent-Child RAG (Vector Search)

#### What this feature does:
It allows users to search the meeting using natural questions (e.g., *"What were the thermal temperature limits agreed for the battery pack?"*) and retrieves the exact answer along with the conversational context surrounding it.

#### The Behind-the-Scenes Logic (Why "Hierarchical" is a breakthrough):

```
Conventional RAG (Flawed):
[ ... arbitrarily slices 500 characters ... ] ➔ Misses speaker names, cuts sentences in half.

MeetingMind Hierarchical RAG (Superior):
Child Chunk (The exact sentence):  "Akshat: The cold plate keeps temperatures below 38°C."
                                            ⬇
Parent Window (5-Turn Context):   Turn 1: Aarit asks about the thermal limits
                                  Turn 2: Akshat answers with 38°C
                                  Turn 3: Arhaan asks if that handles peak drive cycles
                                  Turn 4: Akshat confirms pressure drop tests
                                  Turn 5: Aarit approves the design
```

1. **Child Chunks (High-Precision Search)**:
   Each single speaker utterance is isolated as a "child chunk". We convert this utterance into a 384-dimensional mathematical vector using a lightweight local neural network (`all-MiniLM-L6-v2`).
2. **Cosine Similarity via FAISS**:
   When the user asks a question, the question is converted into the same mathematical vector space. Using FAISS (Facebook AI Similarity Search), we calculate the cosine similarity (angle between vectors). The closest vector identifies the exact sentence that answers the question.
3. **Parent Context Expansion (Conversational Memory)**:
   A single sentence by itself is often ambiguous (e.g., *"Yes, that works"* means nothing alone). Once FAISS finds the best child sentence, our system automatically retrieves the **2 turns spoken before it** and the **2 turns spoken after it** (a 5-turn parent window). This gives the user and the AI the full story of what led up to that statement.

---

### Feature 4: Autonomous ReAct Reasoning Agent

#### What this feature does:
When a user asks a complex question that cannot be answered by a single search (e.g., *"How much grant budget was spent, how much is left, and did Akshat agree to his thermal deadline?"*), the Autonomous Agent acts like a human analyst: it breaks down the question into steps, chooses tools, runs them, observes the outputs, and writes a comprehensive final answer.

#### The Behind-the-Scenes Logic (The ReAct Loop):
**ReAct** stands for **Reasoning + Acting**. The agent follows an iterative cycle:
1. **Thought**: The AI thinks about what it needs to do first (*"I first need to search the transcript for budget figures"*).
2. **Action**: It selects a specific tool from its arsenal of 7 tools (e.g., `rag_search`).
3. **Action Input**: It provides the search parameter (e.g., `{"query": "approved department grant expenditure"}`).
4. **Observation**: The system runs the tool locally and feeds the observation back to the agent (*"Grant is ₹40,000, Phase 1 was ₹24,200, Phase 2 was ₹9,600"*).
5. **Next Thought**: The agent evaluates what it learned and plans the next step (*"Now I need to calculate the remaining balance"*).
6. **Next Action**: It calls the `calculator` tool with `40000 - (24200 + 9600)`.
7. **Observation**: Result is `6200`.
8. **Final Answer**: Once the agent has all pieces of evidence, it outputs a complete, grounded answer with exact numbers and quotes.

#### The 7 Specialized Tools Available to the Agent:
1. `rag_search`: Searches the meeting for specific dialogue and facts.
2. `sentiment_analyzer`: Checks the emotional mood of any speaker.
3. `speaker_stats`: Looks up talk-time and question frequencies.
4. `timeline_extractor`: Fetches all explicit calendar dates and deadlines.
5. `keyword_frequency`: Identifies dominant topic words.
6. `calculator`: A **sandboxed arithmetic engine** that uses Python's Abstract Syntax Tree (AST) so it can safely calculate percentages, additions, and subtractions without any risk of executing malicious code.
7. `citation_checker`: Verifies whether a candidate claim is true or false by checking for exact transcript quotes.

---

### Feature 5: Knowledge Corpus (Cross-Meeting Intelligence)

#### What this feature does:
Instead of only analyzing one meeting at a time, MeetingMind can ingest an entire folder of meeting transcripts spanning weeks or months (e.g., Sprint 1, Sprint 2, Architecture Sync, Evaluation Review). Users can ask questions across the entire history of the project.

#### The Behind-the-Scenes Logic:
1. **Multi-Document Indexing**:
   Every transcript in the corpus folder is indexed into a unified multi-meeting vector index.
2. **Metadata Tagging**:
   Every conversational chunk is tagged with its source file name, meeting date, and speaker.
3. **Cross-Meeting Synthesis**:
   When you ask *"How did the battery cooling design evolve from Sprint 1 to the final defense review?"*, the system retrieves relevant turns from both early and late meetings, merges them in chronological order, and generates a coherent historical comparison.

---

### Feature 6: Action Item Tracker & Calendar Sync

#### What this feature does:
It aggregates every verified action item into an interactive checklist where users can mark tasks as completed, delete them, filter by owner, export them to CSV, or sync them directly to **Google Calendar**.

#### The Behind-the-Scenes Logic:
1. **Database Persistence**:
   Every extracted task is saved in our SQLite database tied to the logged-in user account.
2. **One-Click Calendar Deep Link**:
   Instead of requiring complex enterprise Google Cloud API OAuth verification tokens that expire, MeetingMind generates a standard RFC-compliant Google Calendar web intent URL:
   `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...`
   Clicking the button immediately opens the user's personal Google Calendar in a new tab with the event title, deadline date, and verbatim meeting quote pre-filled in the description.

---

### Feature 7: Multi-Provider Cloud Gateway & Auto-Failover

#### What this feature does:
Ensures the application never crashes, even if a third-party AI provider goes down, hits a rate limit, or if the user's local internet connection temporarily drops.

#### The Behind-the-Scenes Logic:
1. **Provider Support**:
   Supports **Google Gemini 2.0 Flash** (massive 1M token context, high speed), **Groq Qwen 2.5 / Llama 3.3** (ultra-fast inference), and **Ollama** (completely offline on local machine).
2. **Network Lag & DNS Retry**:
   If Windows has a momentary Wi-Fi reconnection or DNS lag (`[Errno 11001] getaddrinfo`), the system automatically pauses 1 second and retries.
3. **Automatic Cloud Failover**:
   If Google Gemini is unreachable or experiencing an outage, the backend **automatically switches to Groq** without the user needing to refresh or do anything.
4. **Graceful User Notification**:
   If the internet drops completely mid-stream, instead of an ugly browser crash or an obscure cryptographic error, the UI displays a clean, elegant card explaining that the network connection was interrupted, with a one-click **Retry** button.

---

## 3. The End-to-End Pipeline: How Data Moves

Here is the exact journey of a meeting transcript through MeetingMind:

```
1. USER UPLOADS TRANSCRIPT (.txt)
   │
   ├──▶ 2. LOCAL NLP PIPELINE (<100ms, Zero Cost)
   │       ├── Regex cleans speaker turns & strips headers
   │       ├── VADER scores sentiment per speaker
   │       ├── Term frequency counts unigrams & bigrams
   │       ├── Sentence analyzer extracts milestone dates with speakers
   │       └── Structural health metric grades formatting (A+, B, C)
   │
   ├──▶ 3. HIERARCHICAL RAG PIPELINE
   │       ├── Splits dialogue into single-turn Child Chunks
   │       ├── Builds 5-turn sliding Parent Context Windows
   │       ├── Encodes child chunks using all-MiniLM-L6-v2 (384-dim)
   │       └── Normalizes vectors & stores in FAISS IndexFlatIP
   │
   ├──▶ 4. EXTRACTION STUDIO PIPELINE
   │       ├── Injects full dialogue (up to 100k chars) into LLM prompt
   │       ├── Forces structured JSON response (Summary, Actions, Decisions)
   │       └── Passes output to CITATION GUARD:
   │               ├── Verifies every evidence quote against source text
   │               ├── Marks matched items as "100% Grounded"
   │               └── Saves tasks to SQLite database for tracking
   │
   └──▶ 5. AUTONOMOUS REACT AGENT (When user asks complex questions)
           ├── Agent plans strategy ("Thought")
           ├── Picks and runs tools (RAG search, Calculator, Sentiment)
           ├── Observes tool outputs and iterates
           └── Synthesizes final grounded answer with evidence quotes
```

---

## 4. Top 15 Most Expected Viva Defense Questions & Answers

### Q1: What is the core innovation of MeetingMind compared to just using ChatGPT?
**Answer:**
> *"ChatGPT produces unverified free-text summaries that frequently hallucinate commitments and attribute tasks to the wrong people. MeetingMind introduces a **deterministic verification loop**: every single extracted task and decision must include a verbatim evidence quote that our Citation Guard programmatically verifies against the source transcript. If an item cannot be proven with an exact quote, it is rejected. In addition, MeetingMind runs local NLP analytics in milliseconds at zero cost and uses Hierarchical RAG to preserve conversational context."*

---

### Q2: What is the difference between Child Chunks and Parent Windows in your RAG system?
**Answer:**
> *"In conversational transcripts, single speaker utterances are small and specific, while context is broad. If you chunk by large paragraphs, vector search gets diluted and inaccurate. If you chunk by single sentences, you lose what the previous speaker said.*
> 
> *Our **Hierarchical RAG** solves this: we index and search individual speaker turns as **Child Chunks** to achieve maximum vector precision. Once the best child turn is identified, we expand it into a **5-turn Parent Window** (2 turns before, the current turn, and 2 turns after). This gives the LLM the full conversational context without sacrificing search accuracy."*

---

### Q3: Why did you build the analytics engine locally instead of using an LLM?
**Answer:**
> *"Three reasons: **Cost, Latency, and Determinism**.*
> 1. *Cost: Running an LLM for word counts, sentiment, and keyword frequencies wastes paid API tokens.*
> 2. *Latency: Local NLP tools like VADER, Python Counter, and Regex execute on the local CPU in under 80 milliseconds, whereas an LLM call takes 2 to 5 seconds.*
> 3. *Determinism: Statistical counting and speaker math should be exact and mathematically repeatable, not estimated probabilistically by a language model."*

---

### Q4: How does your Citation Guard prevent hallucinations?
**Answer:**
> *"The Citation Guard is a deterministic verification layer. The LLM is forced by prompt and schema to provide an `evidence_quote` for every item. Our Python backend then runs multi-stage string matching (direct substring check, whitespace normalization, and smart-quote/punctuation normalization). If the quote does not appear verbatim in the source transcript, the item fails verification and is flagged to the user. This guarantees that no invented commitments can sneak into the final checklist."*

---

### Q5: What vector embedding model and vector database do you use, and why?
**Answer:**
> *"We use `sentence-transformers/all-MiniLM-L6-v2` because it produces compact 384-dimensional dense embeddings, runs efficiently on standard CPUs without requiring a dedicated GPU, and has proven semantic retrieval performance for conversational English.*
> 
> *For the vector database, we use **FAISS (Facebook AI Similarity Search)** with `IndexFlatIP` (Inner Product). By L2-normalizing both our chunk vectors and the query vector, inner product search is mathematically identical to Cosine Similarity, yielding fast, exact retrieval."*

---

### Q6: What is a ReAct agent and how does it work in your system?
**Answer:**
> *"ReAct stands for **Reasoning and Acting**. Instead of answering a query in one shot, the agent operates in an iterative loop:
> 1. It writes a **Thought** explaining its internal plan.
> 2. It chooses an **Action** (one of our 7 specialized tools) and specifies the **Action Input**.
> 3. The system executes that tool locally and returns an **Observation**.
> 4. The agent reads the observation, formulates its next thought, and repeats until it has gathered enough evidence to state the **Final Answer**.
> This allows the agent to solve multi-step problems, such as looking up financial numbers in a transcript and calculating remaining budget percentages."*

---

### Q7: Why did you create a dedicated Calculator tool for the agent instead of letting the LLM calculate math?
**Answer:**
> *"Large language models are notorious for making arithmetic errors because they predict tokens probabilistically rather than computing numbers algebraically. Our `calculator` tool parses mathematical expressions into an Abstract Syntax Tree (AST) using Python's `ast` module. It safely computes additions, subtractions, multiplications, and percentages with 100% mathematical accuracy while blocking any unsafe code execution."*

---

### Q8: How does the system handle very long meeting transcripts without cutting off text?
**Answer:**
> *"We expanded our transcript processing envelope to **100,000 characters** (~500+ turns of dialogue). Because we use modern high-capacity models—Google Gemini 2.0 Flash has a 1-million-token context window and Groq Qwen/Llama models have 128k context windows—the entire meeting fits comfortably into a single prompt without losing the critical decisions and action items agreed upon at the end of the meeting."*

---

### Q9: What happens if the internet disconnects or Google Gemini goes down during a meeting?
**Answer:**
> *"We implemented a **resilient multi-provider gateway**:
> 1. If a transient network glitch or DNS lag occurs, the system automatically pauses 1 second and retries.
> 2. If Gemini continues to fail or experiences an outage, MeetingMind automatically **fails over to Groq** using an alternate cloud API key without interrupting the user.
> 3. If there is no internet at all, the application displays a friendly network notice card with a one-click Retry button rather than crashing."*

---

### Q10: How did you test and validate your system?
**Answer:**
> *"We tested our system against real-world technical meetings, specifically our **Final Year Project (FYP) EV Battery Management System** transcripts:
> - **Meeting 06 (Architecture Sync, 116 turns)**: The system extracted all 5 engineering action items (KiCAD layout, ANSYS thermal simulation, INT8 ML quantization, FreeRTOS task scheduler, and project dossier) and 4 architectural decisions with **100% citation grounding** (0 rejections).
> - **Meeting 07 (Testing & Evaluation Review, 110 turns)**: Successfully extracted all final deliverables, budget audit reconciliations (₹33,800 spent out of ₹40,000 grant), and exact defense presentation dates with zero hallucinations."*

---

### Q11: How is user data stored and kept secure?
**Answer:**
> *"We use a relational **SQLite database** managed via **SQLAlchemy ORM**. Security features include:
> - Cryptographic password hashing using `bcrypt`.
> - Stateless session authorization using industry-standard `JWT (JSON Web Tokens)` with HMAC-SHA256 signatures.
> - Strict user isolation: every database query for meetings or tasks explicitly filters by the authenticated user's ID (`user_id == current_user.id`), preventing any unauthorized cross-account data access."*

---

### Q12: Why did you use React 19 and Vanilla CSS instead of Tailwind CSS?
**Answer:**
> *"We chose React 19 for modern component state management and fast rendering. For styling, we implemented a custom **Vanilla CSS Design System** using CSS custom properties (variables). This gave us complete, pixel-perfect control over our modern glassmorphism aesthetic (translucent panels, backdrop blur filters, and micro-animations) and allowed seamless switching between dark mode and light mode without loading heavy third-party CSS utility frameworks."*

---

### Q13: What is VADER sentiment analysis and why is it suitable for meetings?
**Answer:**
> *"VADER (Valence Aware Dictionary and sEntiment Reasoner) is an NLP lexicon and rule-based sentiment tool specifically tuned for conversational text. It understands capitalization (e.g., 'GREAT'), punctuation emphasis (e.g., '!'), negations (e.g., 'not good'), and degree modifiers (e.g., 'extremely efficient'). It calculates a normalized compound score between -1 and +1 in less than 5 milliseconds on CPU, making it ideal for instantaneous speaker mood tracking."*

---

### Q14: How does the Knowledge Corpus feature work across multiple meetings?
**Answer:**
> *"When a user builds a Knowledge Corpus, MeetingMind processes an entire directory of transcripts, breaks them down into speaker turns, tags each turn with the source meeting title and date, and embeds them into a unified multi-meeting FAISS index. When a user queries the corpus, the system retrieves relevant historical turns from multiple meetings, allowing users to see how decisions, designs, or budgets evolved over time."*

---

### Q15: What are the future enhancements you could add to this system?
**Answer:**
> *"Three promising directions for future expansion:
> 1. **Live Audio Streaming & Whisper Transcription**: Integrating real-time speech-to-text (Whisper API) so MeetingMind can transcribe live audio directly from Zoom or Google Meet microphones.
> 2. **Automated Email Follow-up Bot**: Automatically emailing each meeting participant their personalized checklist immediately after the meeting concludes.
> 3. **Graph-RAG Integration**: Connecting decisions and action items into a Knowledge Graph to visualize dependency chains (e.g., 'Task B cannot start until Task A is completed by Krutarth')."*

---

## 5. Summary Cheat-Sheet for Your Presentation

| Subsystem | Technology Used | Why it impresses examiners |
|---|---|---|
| **Citation Guard** | Python string normalization algorithms | Guarantees **0% hallucinations**; every task has proof in the transcript. |
| **Vector RAG** | `all-MiniLM-L6-v2` + FAISS (`IndexFlatIP`) | **Hierarchical**: searches single turns for accuracy, returns 5-turn parent windows for context. |
| **Local NLP** | VADER, Python Regex, Counter | Runs in **<80ms at $0.00 cost** without wasting expensive LLM tokens. |
| **Autonomous Agent**| ReAct Pattern (`Thought ➔ Action ➔ Observe`) | Breaks down complex queries into steps, uses 7 tools, and includes a **safe AST calculator**. |
| **Cloud Resiliency** | Multi-Provider Gateway (Gemini + Groq + Ollama) | Automatically retries network drops and **auto-fails over** between AI providers. |
| **Frontend UI** | React 19 + Vanilla CSS Glassmorphism | Clean, professional, dark/light theme, interactive transcript player, and Google Calendar sync. |
| **Security & DB** | SQLite + SQLAlchemy + JWT + Bcrypt | Enterprise-grade user data isolation and secure password hashing. |

---

*Good luck with your Viva Defense! You understand the logic, the architecture, and the engineering decisions behind every single line of code in MeetingMind.*
