import os
from dotenv import load_dotenv

load_dotenv()

from extractor import run_extraction
from pathlib import Path

sample_text = Path("examples/dunder-mifflin-sales.txt").read_text(encoding="utf-8")

print("--- Testing Extraction with Gemini ---")
try:
    res_gemini, report_gemini = run_extraction(sample_text, provider="gemini")
    print("SUCCESS: Gemini Extraction Succeeded!")
    print(f"Summary: {res_gemini.summary[:100]}...")
    print(f"Action Items ({len(res_gemini.action_items)}): {[a.description for a in res_gemini.action_items[:2]]}")
    print(f"Decisions ({len(res_gemini.decisions)}): {[d.description for d in res_gemini.decisions[:2]]}")
    print(f"Citation Acceptance: {len(report_gemini.accepted_actions)}/{len(res_gemini.action_items)} actions accepted")
except Exception as e:
    print("FAIL: Gemini Extraction Error:", type(e), e)

print("\n--- Testing Extraction with Groq ---")
try:
    res_groq, report_groq = run_extraction(sample_text, provider="groq")
    print("SUCCESS: Groq Extraction Succeeded!")
    print(f"Summary: {res_groq.summary[:100]}...")
    print(f"Action Items ({len(res_groq.action_items)}): {[a.description for a in res_groq.action_items[:2]]}")
    print(f"Citation Acceptance: {len(report_groq.accepted_actions)}/{len(res_groq.action_items)} actions accepted")
except Exception as e:
    print("FAIL: Groq Extraction Error:", type(e), e)
