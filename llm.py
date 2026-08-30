"""
llm.py — Multi-provider LLM dispatch module.

Design adapted from Murmur's llm.py (references/murmur-master/murmur/llm.py),
extended with:
  - google-genai (the current, non-deprecated Google SDK)
  - call_llm_json() for structured output extraction
  - Rate-limit retry with exponential backoff

Usage:
    from llm import call_llm, call_llm_json

    text = call_llm("groq", "You are helpful.", "Say hello.")
    data = call_llm_json("groq", SYSTEM_PROMPT, user_msg, schema=MyModel)

Provider selection (in priority order):
    1. Explicit `provider` argument
    2. LLM_PROVIDER env var
    3. Falls back to "groq"

Set keys in .env:
    GROQ_API_KEY=...
    GEMINI_API_KEY=...
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


# ── Groq ────────────────────────────────────────────────────────────────────

def _groq_rate_limit_wait(exc: Exception, attempt: int) -> None:
    """Parse the 'try again in X.Xs' hint from a Groq RateLimitError and sleep."""
    import re
    wait = 30.0  # conservative fallback
    msg = str(exc)
    m = re.search(r"try again in ([\d.]+)s", msg)
    if m:
        wait = float(m.group(1)) + 1.0  # add 1s buffer
    print(f"  [rate limit] waiting {wait:.1f}s before retry {attempt + 1}...")
    time.sleep(wait)


def _call_groq(system_prompt: str, user_message: str) -> str:
    from groq import Groq, RateLimitError

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.getenv("GROQ_MODEL", "groq/compound-mini")

    for attempt in range(4):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=2048,
            )
            return resp.choices[0].message.content
        except RateLimitError as e:
            if attempt == 3:
                raise
            _groq_rate_limit_wait(e, attempt)

    raise RuntimeError("Groq: exhausted retries")


def _call_groq_json(system_prompt: str, user_message: str) -> str:
    """Groq with JSON mode enabled (more reliable than prompt-only JSON)."""
    from groq import Groq, RateLimitError

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.getenv("GROQ_MODEL", "groq/compound-mini")

    for attempt in range(4):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                max_tokens=2048,
            )
            return resp.choices[0].message.content
        except RateLimitError as e:
            if attempt == 3:
                raise
            _groq_rate_limit_wait(e, attempt)

    raise RuntimeError("Groq: exhausted retries")


# ── Gemini (google-genai, the current non-deprecated SDK) ───────────────────

def _call_gemini(system_prompt: str, user_message: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    resp = client.models.generate_content(
        model=model,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=2048,
        ),
    )
    if resp.text:
        return resp.text
    if resp.candidates and resp.candidates[0].content and resp.candidates[0].content.parts:
        return "".join(p.text for p in resp.candidates[0].content.parts if hasattr(p, "text") and p.text)
    return ""


def _call_gemini_json(system_prompt: str, user_message: str) -> str:
    """Gemini with JSON output mode (native structured output)."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    resp = client.models.generate_content(
        model=model,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            max_output_tokens=2048,
        ),
    )
    if resp.text:
        return resp.text
    if resp.candidates and resp.candidates[0].content and resp.candidates[0].content.parts:
        return "".join(p.text for p in resp.candidates[0].content.parts if hasattr(p, "text") and p.text)
    return "{}"


# ── Ollama (fully local, no API key) ────────────────────────────────────────

def _call_ollama(system_prompt: str, user_message: str) -> str:
    import ollama

    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    resp = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return resp["message"]["content"]


def _call_ollama_json(system_prompt: str, user_message: str) -> str:
    import ollama

    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    resp = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        format="json",
    )
    return resp["message"]["content"]


# ── Provider registry ────────────────────────────────────────────────────────

# Maps name → (text_fn, json_fn, required_env_var_or_None, pip_package)
_PROVIDERS: dict[str, tuple] = {
    "groq": (_call_groq, _call_groq_json, "GROQ_API_KEY", "groq"),
    "gemini": (_call_gemini, _call_gemini_json, "GEMINI_API_KEY", "google-genai"),
    "ollama": (_call_ollama, _call_ollama_json, None, "ollama"),
}


def _resolve_provider(provider: str | None) -> str:
    if provider:
        return provider.lower()
    return os.getenv("LLM_PROVIDER", "groq").lower()


def _validate_provider(provider: str) -> None:
    if provider not in _PROVIDERS:
        raise RuntimeError(
            f"Unknown LLM provider '{provider}'. "
            f"Choose from: {', '.join(_PROVIDERS)}"
        )
    _, _, env_var, pip_pkg = _PROVIDERS[provider]
    if env_var and not os.getenv(env_var):
        raise RuntimeError(
            f"{env_var} not set. Add it to your .env file, "
            f"or switch provider with LLM_PROVIDER=ollama."
        )


# ── Public API ───────────────────────────────────────────────────────────────

def call_llm(
    provider: str | None,
    system_prompt: str,
    user_message: str,
) -> str:
    """Call an LLM provider. Returns the response text.

    Args:
        provider: 'groq', 'gemini', or 'ollama'. None → use LLM_PROVIDER env var.
        system_prompt: The system instruction.
        user_message: The user turn.

    Returns:
        Response text as a string.

    Raises:
        RuntimeError: if the provider is unknown or the API key is missing.
    """
    p = _resolve_provider(provider)
    _validate_provider(p)
    text_fn, _, _, pip_pkg = _PROVIDERS[p]
    try:
        return text_fn(system_prompt, user_message)
    except ImportError:
        raise RuntimeError(f"SDK for '{p}' not installed. Run: pip install {pip_pkg}")


def call_llm_json(
    provider: str | None,
    system_prompt: str,
    user_message: str,
    schema: Type[T],
) -> T:
    """Call an LLM provider in JSON mode and parse the result with Pydantic.

    Uses the provider's native JSON mode (Groq: response_format=json_object,
    Gemini: response_mime_type=application/json, Ollama: format=json).

    Retries once with a corrective prompt if the first response is not valid JSON.

    Args:
        provider: 'groq', 'gemini', or 'ollama'.
        system_prompt: The system instruction (should describe the JSON schema).
        user_message: The user turn.
        schema: A Pydantic BaseModel class to validate and parse into.

    Returns:
        A validated instance of `schema`.

    Raises:
        RuntimeError: if JSON parsing fails after retry.
        pydantic.ValidationError: if the JSON doesn't match the schema.
    """
    p = _resolve_provider(provider)
    _validate_provider(p)
    _, json_fn, _, pip_pkg = _PROVIDERS[p]

    try:
        raw = json_fn(system_prompt, user_message)
    except ImportError:
        raise RuntimeError(f"SDK for '{p}' not installed. Run: pip install {pip_pkg}")

    # First parse attempt
    try:
        data = _parse_json(raw)
        return schema.model_validate(data)
    except (json.JSONDecodeError, ValueError):
        pass  # fall through to retry

    # Retry with corrective prompt
    corrective = (
        "Your previous response was not valid JSON. "
        "Output ONLY a valid JSON object — no markdown fences, no explanation."
    )
    try:
        raw2 = json_fn(system_prompt, corrective + "\n\n" + user_message)
        data2 = _parse_json(raw2)
        return schema.model_validate(data2)
    except (json.JSONDecodeError, ValueError) as e:
        raise RuntimeError(
            f"LLM ({p}) returned non-JSON after retry. Last raw output: {raw2!r}"
        ) from e


def _parse_json(text: str) -> Any:
    """Parse JSON, robustly handling markdown code fences and extraneous text."""
    import re
    text = text.strip()
    
    # Check for markdown code fence
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if m:
        text = m.group(1).strip()
    else:
        # Fallback: extract substring between first { and last } or first [ and last ]
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            text = text[first_brace:last_brace + 1]
            
    return json.loads(text)
