"""
agent_tools.py — Tool definitions for the MeetingMind ReAct agent.

Each tool is a callable that takes a dict of arguments and returns a string result.
The TOOLS list is what gets injected into the agent's system prompt.

Available tools:
  - rag_search    : Search the transcript index for relevant excerpts
  - get_extraction: Run the full extraction pipeline and return JSON
  - get_summary   : Return just the meeting summary
  - calculator    : Safely evaluate a mathematical expression (pure Python, no API)
  - web_search    : Search the web via DuckDuckGo (free, no API key needed)
"""

from __future__ import annotations

from typing import Any, Callable


# ── Tool type ─────────────────────────────────────────────────────────────────

class Tool:
    """A single agent tool with schema and callable implementation."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        fn: Callable[[dict], str],
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self._fn = fn

    def __call__(self, args: dict) -> str:
        return self._fn(args)

    def schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


# ── Tool factories ────────────────────────────────────────────────────────────

def make_rag_search_tool(idx) -> Tool:
    """Create a rag_search tool bound to a HierarchicalRAGIndex instance."""

    def _rag_search(args: dict) -> str:
        query = str(args.get("query", ""))
        k = int(args.get("k", 3))
        results = idx.search(query, k=k)
        if not results:
            return "No relevant excerpts found for this query."

        parts = []
        for i, r in enumerate(results, 1):
            parts.append(
                f"[Result {i} | score={r.score:.3f}]\n"
                f"Matched: {r.child_text}\n"
                f"Context:\n{r.parent_window}"
            )
        return "\n\n---\n\n".join(parts)

    return Tool(
        name="rag_search",
        description=(
            "Search the meeting transcript for passages relevant to a query. "
            "Returns up to k context windows (5-turn excerpts) from the transcript. "
            "Always use this before answering factual questions about the meeting."
        ),
        parameters={
            "query": {
                "type": "string",
                "description": "Natural language search query",
                "required": True,
            },
            "k": {
                "type": "integer",
                "description": "Number of results to return (default 3)",
                "required": False,
            },
        },
        fn=_rag_search,
    )


def make_get_extraction_tool(transcript_text: str, provider: str) -> Tool:
    """Create a get_extraction tool that runs the full pipeline on demand."""

    _cache: dict[str, Any] = {}  # simple cache so we only call the LLM once

    def _get_extraction(args: dict) -> str:
        import json
        from extractor import run_extraction

        if "result" not in _cache:
            extraction, report = run_extraction(transcript_text, provider=provider)
            _cache["result"] = (extraction, report)
        else:
            extraction, report = _cache["result"]

        out = {
            "summary": extraction.summary,
            "action_items": [
                {**a.model_dump(), "accepted": idx < len(report.accepted_actions)}
                for idx, a in enumerate(extraction.action_items)
            ],
            "decisions": [d.model_dump() for d in extraction.decisions],
            "citation_rejection_rate": report.rejection_rate,
        }
        return json.dumps(out, indent=2)

    return Tool(
        name="get_extraction",
        description=(
            "Run the full extraction pipeline and return a JSON object with "
            "the meeting summary, all action items (with owners and deadlines), "
            "all decisions, and the citation rejection rate. "
            "Use this when the question requires structured data like action items."
        ),
        parameters={},
        fn=_get_extraction,
    )


def make_get_summary_tool(transcript_text: str, provider: str) -> Tool:
    """Create a get_summary tool for quick summary-only questions."""

    _cache: dict[str, str] = {}

    def _get_summary(args: dict) -> str:
        from extractor import run_extraction

        if "summary" not in _cache:
            extraction, _ = run_extraction(transcript_text, provider=provider)
            _cache["summary"] = extraction.summary
        return _cache["summary"]

    return Tool(
        name="get_summary",
        description=(
            "Get a 2-3 sentence TL;DR summary of the meeting. "
            "Use this for high-level overview questions."
        ),
        parameters={},
        fn=_get_summary,
    )


def make_calculator_tool() -> Tool:
    """A safe arithmetic calculator using Python's ast module (no eval of arbitrary code)."""

    def _calculator(args: dict) -> str:
        import ast
        import operator
        expression = str(args.get("expression", "")).strip()
        if not expression:
            return "Error: No expression provided."

        # Safe operator whitelist — prevents code injection
        SAFE_OPS = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Pow: operator.pow,
            ast.USub: operator.neg,
            ast.Mod: operator.mod,
        }

        def _eval(node):
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return node.value
            elif isinstance(node, ast.BinOp) and type(node.op) in SAFE_OPS:
                return SAFE_OPS[type(node.op)](_eval(node.left), _eval(node.right))
            elif isinstance(node, ast.UnaryOp) and type(node.op) in SAFE_OPS:
                return SAFE_OPS[type(node.op)](_eval(node.operand))
            else:
                raise ValueError(f"Unsafe expression: {ast.dump(node)}")

        try:
            tree = ast.parse(expression, mode="eval")
            result = _eval(tree.body)
            return f"Result of `{expression}` = {result}"
        except Exception as e:
            return f"Calculator error: {e}. Please provide a valid arithmetic expression like '10000 + 15000 * 2'."

    return Tool(
        name="calculator",
        description=(
            "Safely evaluate a mathematical arithmetic expression. "
            "Use this whenever the question involves numbers, totals, percentages, "
            "averages, or any arithmetic — e.g. budgets, timelines, counts. "
            "Pass a clean expression like '10000 + 15000' or '(50000 * 0.15)'."
        ),
        parameters={
            "expression": {
                "type": "string",
                "description": "A valid arithmetic expression using +, -, *, /, **, % operators",
                "required": True,
            }
        },
        fn=_calculator,
    )


def make_web_search_tool() -> Tool:
    """Free DuckDuckGo web search — no API key required."""

    def _web_search(args: dict) -> str:
        query = str(args.get("query", "")).strip()
        if not query:
            return "Error: No search query provided."
        try:
            from ddgs import DDGS
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=3):
                    results.append(
                        f"Title: {r.get('title', 'N/A')}\n"
                        f"URL: {r.get('href', 'N/A')}\n"
                        f"Snippet: {r.get('body', 'N/A')}"
                    )
            if not results:
                return "No web results found for this query."
            return "\n\n---\n\n".join(results)
        except ImportError:
            return "Error: ddgs package not installed. Run: pip install ddgs"
        except Exception as e:
            return f"Web search error: {e}"

    return Tool(
        name="web_search",
        description=(
            "Search the live web via DuckDuckGo (free, no API key required). "
            "Use this when the question references a company, person, product, event, "
            "or any entity that requires real-world background knowledge not present in the transcript. "
            "For example: 'Who is Heinz?', 'What is Dunder Mifflin?', 'What is the current price of X?'"
        ),
        parameters={
            "query": {
                "type": "string",
                "description": "The search query to look up on the web",
                "required": True,
            }
        },
        fn=_web_search,
    )


def make_sentiment_analyzer_tool(transcript_text: str) -> Tool:
    """Sentiment analysis per-speaker using VADER (no API, runs 100% locally)."""

    def _sentiment_analyzer(args: dict) -> str:
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        except ImportError:
            # Graceful fallback using very simple word lists
            return _simple_sentiment(transcript_text, args)

        target = str(args.get("target", "all")).strip().lower()
        analyzer = SentimentIntensityAnalyzer()

        # Parse speakers and their lines
        speakers: dict[str, list[str]] = {}
        for line in transcript_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if ":" in line:
                speaker, _, text = line.partition(":")
                speaker = speaker.strip()
                text = text.strip()
                if text:
                    speakers.setdefault(speaker, []).append(text)

        if target != "all" and target in {s.lower() for s in speakers}:
            matched = {s: v for s, v in speakers.items() if s.lower() == target}
        else:
            matched = speakers

        if not matched:
            return "No speaker turns found for analysis."

        report_lines = ["=== SENTIMENT ANALYSIS REPORT ===\n"]
        overall_scores = []

        for speaker, utterances in matched.items():
            combined = " ".join(utterances)
            scores = analyzer.polarity_scores(combined)
            compound = scores["compound"]
            overall_scores.append(compound)

            if compound >= 0.05:
                tone = "POSITIVE"
            elif compound <= -0.05:
                tone = "NEGATIVE"
            else:
                tone = "NEUTRAL"

            report_lines.append(
                f"Speaker: {speaker}\n"
                f"  Tone: {tone} (compound={compound:+.3f})\n"
                f"  Breakdown: pos={scores['pos']:.2f} | neu={scores['neu']:.2f} | neg={scores['neg']:.2f}\n"
                f"  Utterances analysed: {len(utterances)}"
            )

        avg = sum(overall_scores) / len(overall_scores) if overall_scores else 0
        meeting_tone = "POSITIVE" if avg >= 0.05 else ("NEGATIVE" if avg <= -0.05 else "NEUTRAL")
        report_lines.append(f"\nOVERALL MEETING SENTIMENT: {meeting_tone} (avg compound={avg:+.3f})")
        return "\n".join(report_lines)

    def _simple_sentiment(text: str, args: dict) -> str:
        """Pure-Python keyword fallback if vaderSentiment is not installed."""
        pos_words = {"agree", "great", "excellent", "good", "happy", "approved", "yes", "committed", "resolved", "done"}
        neg_words = {"no", "problem", "issue", "blocked", "concern", "risk", "delay", "difficult", "fail", "reject", "worried"}
        words = text.lower().split()
        pos = sum(1 for w in words if w in pos_words)
        neg = sum(1 for w in words if w in neg_words)
        ratio = (pos - neg) / max(len(words), 1)
        tone = "POSITIVE" if ratio > 0.01 else ("NEGATIVE" if ratio < -0.01 else "NEUTRAL")
        return f"Meeting Sentiment: {tone} (pos_hits={pos}, neg_hits={neg}, ratio={ratio:.4f}). Install 'vaderSentiment' for full per-speaker analysis."

    return Tool(
        name="sentiment_analyzer",
        description=(
            "Analyze the emotional tone and sentiment of the meeting — overall or per speaker. "
            "Runs VADER NLP locally, zero API calls. Returns compound sentiment score (−1 negative → +1 positive), "
            "tone label (POSITIVE / NEUTRAL / NEGATIVE), and a full per-speaker breakdown. "
            "Use when asked: 'Was the meeting tense?', 'How did X feel about Y?', 'What was the meeting mood?'"
        ),
        parameters={
            "target": {
                "type": "string",
                "description": "Speaker name to focus on, or 'all' for the full meeting (default: 'all')",
                "required": False,
            }
        },
        fn=_sentiment_analyzer,
    )


def make_speaker_stats_tool(transcript_text: str) -> Tool:
    """Pure-Python speaker participation analytics — no dependencies."""

    def _speaker_stats(args: dict) -> str:
        import re
        lines = [l.strip() for l in transcript_text.split("\n") if l.strip()]
        speaker_data: dict[str, dict] = {}

        for line in lines:
            m = re.match(r"^([A-Za-z0-9_\-\s]{1,40})\s*:\s*(.+)$", line)
            if not m:
                continue
            speaker = m.group(1).strip()
            text = m.group(2).strip()
            word_count = len(text.split())
            question_count = text.count("?")
            interruptions = 1 if text.endswith("--") or text.endswith("—") else 0

            d = speaker_data.setdefault(speaker, {
                "turns": 0, "words": 0, "questions": 0, "interruptions": 0
            })
            d["turns"] += 1
            d["words"] += word_count
            d["questions"] += question_count
            d["interruptions"] += interruptions

        if not speaker_data:
            return "Could not parse any speaker turns from the transcript."

        total_words = sum(v["words"] for v in speaker_data.values())
        total_turns = sum(v["turns"] for v in speaker_data.values())

        lines_out = ["=== SPEAKER PARTICIPATION STATS ===\n"]
        for speaker, d in sorted(speaker_data.items(), key=lambda x: x[1]["words"], reverse=True):
            share = (d["words"] / max(total_words, 1)) * 100
            lines_out.append(
                f"Speaker: {speaker}\n"
                f"  Talk share: {share:.1f}% ({d['words']} words across {d['turns']} turns)\n"
                f"  Questions asked: {d['questions']}\n"
                f"  Interruptions: {d['interruptions']}"
            )

        lines_out.append(
            f"\nMeeting totals: {total_words} words | {total_turns} turns | {len(speaker_data)} participants"
        )

        most_dominant = max(speaker_data, key=lambda s: speaker_data[s]["words"])
        most_questions = max(speaker_data, key=lambda s: speaker_data[s]["questions"])
        lines_out.append(
            f"Most dominant speaker: {most_dominant} ({speaker_data[most_dominant]['words']} words)\n"
            f"Most inquisitive speaker: {most_questions} ({speaker_data[most_questions]['questions']} questions)"
        )

        return "\n".join(lines_out)

    return Tool(
        name="speaker_stats",
        description=(
            "Compute detailed participation statistics for each meeting participant — "
            "talk time share (%), word count, number of turns, questions asked, and interruptions. "
            "Pure Python, zero API calls, instant results. "
            "Use when asked: 'Who dominated the meeting?', 'Who asked the most questions?', 'What percentage did X speak?'"
        ),
        parameters={},
        fn=_speaker_stats,
    )


def make_timeline_extractor_tool(transcript_text: str) -> Tool:
    """Extract all date/deadline/time mentions from the transcript using regex — no API."""

    def _timeline_extractor(args: dict) -> str:
        import re
        # Patterns for common date/time mentions in meetings
        patterns = [
            r"\b(?:by|before|until|due|deadline[:\s]+)?\s*"
            r"(?:(?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))"
            r"(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)))?",
            r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)"
            r"\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*20\d{2})?",
            r"\b(?:Q[1-4]\s*(?:20\d{2})?)",
            r"\b(?:end\s+of\s+(?:the\s+)?(?:week|month|quarter|year|day))",
            r"\b(?:\d{1,2}/\d{1,2}(?:/\d{2,4})?)",
            r"\b(?:\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\b",
            r"\b(?:in\s+(?:one|two|three|four|five|six|a\s+few|two\s+to\s+three)?\s*"
            r"(?:day|week|month|hour)s?\b)",
            r"\b(?:tomorrow|today|tonight|this\s+week|next\s+week|this\s+month|next\s+month)\b",
            r"\b(?:by|before)\s+EOD\b",
            r"\b(?:ASAP|immediately|right\s+away|urgent(?:ly)?)\b",
        ]

        # For each match, find the surrounding sentence for context
        found = []
        combined_pattern = "|".join(patterns)
        for m in re.finditer(combined_pattern, transcript_text, re.IGNORECASE):
            mention = m.group(0).strip()
            start = max(0, m.start() - 80)
            end = min(len(transcript_text), m.end() + 80)
            context = transcript_text[start:end].replace("\n", " ").strip()
            found.append((mention, context))

        if not found:
            return "No explicit date or deadline mentions found in the transcript."

        lines_out = [f"=== TIMELINE: {len(found)} date/deadline mention(s) found ===\n"]
        for i, (mention, context) in enumerate(found, 1):
            lines_out.append(f"{i}. Mention: '{mention}'\n   Context: ...{context}...")

        return "\n".join(lines_out)

    return Tool(
        name="timeline_extractor",
        description=(
            "Extract ALL date, time, and deadline mentions from the meeting transcript using pattern matching. "
            "Detects: specific dates (Jan 15), weekdays (next Monday), quarters (Q3 2025), "
            "relative times (end of week, in 2 days, ASAP), and clock times (3:00pm). "
            "Returns each mention with surrounding context. No API needed — pure regex engine. "
            "Use when asked: 'What deadlines were mentioned?', 'When is X due?', 'Build a timeline for this meeting.'"
        ),
        parameters={},
        fn=_timeline_extractor,
    )


def make_keyword_frequency_tool(transcript_text: str) -> Tool:
    """Pure-Python TF-weighted keyword extraction — no ML, no API, pure stdlib."""

    def _keyword_frequency(args: dict) -> str:
        import re
        from collections import Counter

        top_n = int(args.get("top_n", 15))

        STOPWORDS = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "is", "it", "that", "this", "was", "are", "we", "i",
            "you", "he", "she", "they", "my", "our", "your", "its", "be", "been",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "can", "just", "so", "if", "as", "by",
            "from", "also", "up", "out", "not", "no", "what", "how", "when",
            "where", "who", "which", "about", "into", "than", "then", "there",
            "their", "them", "like", "know", "think", "need", "want", "get",
            "go", "going", "yeah", "okay", "right", "yes", "um", "uh", "well"
        }

        words = re.findall(r"\b[a-zA-Z]{3,}\b", transcript_text.lower())
        filtered = [w for w in words if w not in STOPWORDS]
        counts = Counter(filtered)

        top_words = counts.most_common(top_n)
        total = sum(counts.values())

        lines_out = [f"=== TOP {top_n} KEYWORDS BY FREQUENCY ===\n"]
        lines_out.append(f"Total meaningful words analysed: {total}\n")

        for rank, (word, count) in enumerate(top_words, 1):
            pct = (count / max(total, 1)) * 100
            bar = "█" * min(int(pct * 10), 30)
            lines_out.append(f"{rank:>2}. {word:<20} {count:>4}x  ({pct:.1f}%)  {bar}")

        # Bigrams (two-word phrases)
        bigrams = Counter(zip(filtered, filtered[1:]))
        top_bigrams = bigrams.most_common(5)
        lines_out.append("\nTop recurring 2-word phrases:")
        for phrase, count in top_bigrams:
            lines_out.append(f"  '{phrase[0]} {phrase[1]}' — {count}x")

        return "\n".join(lines_out)

    return Tool(
        name="keyword_frequency",
        description=(
            "Identify the most frequently discussed topics and key terms in the meeting transcript "
            "using statistical term frequency analysis. Returns a ranked keyword leaderboard with "
            "occurrence counts, percentage share, and top recurring 2-word phrases. "
            "No AI or API needed — pure Python Counter-based analysis. "
            "Use when asked: 'What were the main topics?', 'What was discussed most?', 'What is the meeting about?'"
        ),
        parameters={
            "top_n": {
                "type": "integer",
                "description": "Number of top keywords to return (default 15)",
                "required": False,
            }
        },
        fn=_keyword_frequency,
    )


def make_citation_checker_tool(transcript_text: str) -> Tool:
    """Verbatim substring citation validator — checks if a claim is grounded in the transcript."""

    def _citation_checker(args: dict) -> str:
        claim = str(args.get("claim", "")).strip()
        if not claim:
            return "Error: Provide a 'claim' string to validate."

        # Normalize whitespace for matching
        import re
        norm_transcript = re.sub(r"\s+", " ", transcript_text.lower())
        norm_claim = re.sub(r"\s+", " ", claim.lower())

        # Try exact substring first
        if norm_claim in norm_transcript:
            return (
                f"VERIFIED: The exact claim is verbatim in the transcript.\n"
                f"Claim: '{claim}'"
            )

        # Try word-level overlap scoring
        claim_words = set(norm_claim.split())
        transcript_words = set(norm_transcript.split())
        overlap = claim_words & transcript_words
        coverage = len(overlap) / max(len(claim_words), 1)

        # Sliding window best-match
        claim_tokens = norm_claim.split()
        trans_tokens = norm_transcript.split()
        best_overlap = 0
        window_size = len(claim_tokens)
        if window_size <= len(trans_tokens):
            for i in range(len(trans_tokens) - window_size + 1):
                window = set(trans_tokens[i:i + window_size])
                overlap_count = len(set(claim_tokens) & window)
                best_overlap = max(best_overlap, overlap_count)

        window_score = best_overlap / max(window_size, 1)

        if window_score >= 0.85:
            verdict = "LIKELY GROUNDED"
            detail = f"~{window_score * 100:.0f}% of claim words found in a single contiguous window."
        elif window_score >= 0.6:
            verdict = "PARTIALLY GROUNDED"
            detail = f"~{window_score * 100:.0f}% word overlap — some claim terms appear in transcript."
        else:
            verdict = "UNVERIFIED / HALLUCINATION RISK"
            detail = f"Only {window_score * 100:.0f}% word overlap. This claim may not be grounded in the transcript."

        return (
            f"Citation Check Result: {verdict}\n"
            f"Claim: '{claim}'\n"
            f"Analysis: {detail}\n"
            f"Matched words: {sorted(overlap)[:10]}"
        )

    return Tool(
        name="citation_checker",
        description=(
            "Verify whether a specific claim, quote, or action item is verbatim grounded in the meeting transcript. "
            "Uses exact substring matching + sliding-window word overlap scoring to detect hallucinations. "
            "Returns VERIFIED / LIKELY GROUNDED / PARTIALLY GROUNDED / UNVERIFIED. "
            "No API needed — pure string analysis. "
            "Use when asked: 'Did X actually say that?', 'Is this action item real?', 'Verify this quote.'"
        ),
        parameters={
            "claim": {
                "type": "string",
                "description": "The exact quote or paraphrased claim to validate against the transcript",
                "required": True,
            }
        },
        fn=_citation_checker,
    )


def build_tools(
    transcript_text: str,
    idx,
    provider: str,
) -> list[Tool]:
    """Build the full set of agent tools for a given transcript and RAG index.

    Args:
        transcript_text: The raw transcript.
        idx: A built HierarchicalRAGIndex instance.
        provider: LLM provider for extraction tools.

    Returns:
        List of Tool objects ready to be registered with the agent.
    """
    return [
        # ── Core transcript search ─────────────────────────────────────
        make_rag_search_tool(idx),
        # ── LLM-backed extraction (cached, single call) ────────────────
        make_get_extraction_tool(transcript_text, provider),
        make_get_summary_tool(transcript_text, provider),
        # ── Utility: math ─────────────────────────────────────────────
        make_calculator_tool(),
        # ── Real live data ─────────────────────────────────────────────
        make_web_search_tool(),
        # ── Real local NLP/analytics — zero API cost ───────────────────
        make_sentiment_analyzer_tool(transcript_text),
        make_speaker_stats_tool(transcript_text),
        make_timeline_extractor_tool(transcript_text),
        make_keyword_frequency_tool(transcript_text),
        make_citation_checker_tool(transcript_text),
    ]
