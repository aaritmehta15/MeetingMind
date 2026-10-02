"""
transcription.py — Audio transcription and dialogue formatting for MeetingMind.

Accepts audio recordings (WAV, MP3, WEBM, M4A, OGG, FLAC) from live microphone
or uploaded files, and converts them into speaker-labeled meeting transcripts.
Uses Groq Whisper (whisper-large-v3-turbo) with automatic fallback to Gemini audio.
"""

from __future__ import annotations

import io
import os
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _transcribe_with_groq(audio_bytes: bytes, filename: str) -> str:
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    client = Groq(api_key=api_key)
    res = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3-turbo",
        response_format="verbose_json",
        prompt="Meeting conversation discussing tasks, decisions, technical architecture, and project updates."
    )
    return getattr(res, "text", "") or ""


def _transcribe_with_gemini(audio_bytes: bytes, filename: str) -> str:
    from google import genai
    from google.genai import types
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    client = genai.Client(api_key=api_key)
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".mp3": "audio/mp3",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".m4a": "audio/m4a",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".aac": "audio/aac",
    }
    mime_type = mime_map.get(ext, "audio/wav")

    part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
    prompt = (
        "Transcribe this meeting audio recording accurately into speaker-labeled dialogue turns "
        "(e.g., 'Speaker 1: ...', 'Speaker 2: ...' or actual names if spoken). "
        "Preserve every word, decision, number, commitment, and technical term exactly as spoken. "
        "Output ONLY the dialogue turns without conversational filler or introductory greetings."
    )
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    resp = client.models.generate_content(
        model=model,
        contents=[part, prompt]
    )
    return getattr(resp, "text", "") or ""


def format_transcript_turns(raw_text: str) -> str:
    """Ensure raw transcribed text has structured speaker-labeled turns (Speaker: text).
    
    If the text already has turns, returns it as-is.
    If it is a continuous stream of text, uses LLM to separate it into dialogue turns.
    """
    clean_text = raw_text.strip()
    if not clean_text:
        return "Speaker 1: (No audible speech detected)"

    lines = [l.strip() for l in clean_text.splitlines() if l.strip()]
    turn_count = sum(1 for l in lines if re.match(r"^[A-Za-z0-9_\-\s]{1,35}:", l))
    if turn_count >= max(2, len(lines) // 2):
        return clean_text

    # Use fast LLM pass to break into natural speaker turns
    try:
        from llm import call_llm
        system_prompt = (
            "You are an expert audio transcript processor. "
            "Convert the provided raw transcribed speech into clean meeting dialogue with speaker turns.\n"
            "Rules:\n"
            "1. Format each turn as: 'Speaker Name: Text' or 'Speaker 1: Text', 'Speaker 2: Text' if names aren't explicit.\n"
            "2. Break into realistic conversational turns based on topic transitions and natural speech flow.\n"
            "3. Maintain 100% fidelity to the original spoken words. Do not fabricate facts, decisions, or hallucinate.\n"
            "4. Output ONLY the formatted speaker turns."
        )
        provider = os.getenv("LLM_PROVIDER", "gemini")
        formatted = call_llm(provider, system_prompt, f"Raw transcript:\n{clean_text}")
        if formatted and any(":" in l for l in formatted.splitlines()):
            return formatted.strip()
    except Exception:
        pass

    # Safe fallback: wrap in a default speaker turn
    return f"Speaker 1: {clean_text}"


def transcribe_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """Transcribe audio bytes to meeting transcript text using Groq Whisper or Gemini.
    
    Returns clean speaker-labeled transcript text suitable for MeetingMind pipeline.
    """
    if not audio_bytes:
        return "Speaker 1: (Empty audio recording)"

    errors = []
    # 1. Primary: Groq Whisper (ultra-fast)
    try:
        raw_text = _transcribe_with_groq(audio_bytes, filename)
        if raw_text and raw_text.strip():
            return format_transcript_turns(raw_text)
    except Exception as e:
        errors.append(f"Groq Whisper: {e}")

    # 2. Secondary: Gemini Multimodal Audio
    try:
        raw_text = _transcribe_with_gemini(audio_bytes, filename)
        if raw_text and raw_text.strip():
            return format_transcript_turns(raw_text)
    except Exception as e:
        errors.append(f"Gemini Audio: {e}")

    # If both failed, raise informative exception
    raise RuntimeError(f"Audio transcription failed across all providers: {'; '.join(errors)}")
