# MeetingMind Evaluator — Developer Notes

## Python version
Project uses **Python 3.14** (3.11+ was the target; 3.14 is what's installed and fully compatible).

## Quick start
```powershell
# From the project root:
venv\Scripts\activate

# Verify environment
python sanity_check.py

# Copy and fill in API keys
copy .env.example .env
# Then edit .env with your Groq and/or Gemini keys
```

## Getting API keys (both free, no credit card)
- **Groq**: https://console.groq.com → create account → API Keys → create key
- **Gemini**: https://aistudio.google.com/app/apikey → sign in with Google → create key

## Using the venv in PowerShell
```powershell
venv\Scripts\Activate.ps1   # activate
deactivate                   # deactivate
```
If PowerShell blocks the activation script:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Running CLI commands (always from project root with venv active)
```powershell
python cli.py extract <transcript_file>
python cli.py search  <transcript_file> "<query>"
python cli.py ask     <transcript_file> "<question>"
python cli.py eval    --n 20
python cli.py corpus-build <folder>
python cli.py corpus-ask   "<question>"
```

## Key design decisions
- **Hierarchical Parent-Child RAG**: child utterances indexed for retrieval; parent windows (5-6 turns) passed to LLM. Preserves conversational context that flat chunking would destroy.
- **Verbatim-citation guard**: every extracted action item and decision must contain an `evidence_quote` that is a literal substring of the transcript. Items that fail are flagged, not silently dropped.
- **No orchestration framework**: the agent loop is ~50 lines of plain Python. Easier to debug, easier to explain.
- **Multi-provider LLM dispatch**: default = Groq (fastest free tier), fallback = Gemini. Set `LLM_PROVIDER=gemini` in `.env` to switch.
