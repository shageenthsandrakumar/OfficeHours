"""Provider-swappable LLM client.

All agent code calls `complete()` here. To switch to GMI at kickoff:
  1. Set GMI_API_KEY and GMI_ENDPOINT in .env
  2. Change _get_client() to return an OpenAI-compat client pointed at GMI.
  No agent code changes needed.
"""
from __future__ import annotations

import anthropic

from app.config import settings


def _build_messages(system: str, turns: list[dict]) -> tuple[str, list[dict]]:
    return system, turns


def complete(system_prompt: str, messages: list[dict], max_tokens: int = 1024) -> str:
    """Call the configured LLM and return the assistant's reply as a string."""
    if settings.gmi_api_key and settings.gmi_endpoint:
        return _complete_gmi(system_prompt, messages, max_tokens)
    return _complete_anthropic(system_prompt, messages, max_tokens)


def _complete_anthropic(system_prompt: str, messages: list[dict], max_tokens: int) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=settings.default_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def _complete_gmi(system_prompt: str, messages: list[dict], max_tokens: int) -> str:
    """OpenAI-compat call to GMI inference cloud."""
    import openai  # imported lazily — only needed when GMI is active
    client = openai.OpenAI(api_key=settings.gmi_api_key, base_url=settings.gmi_endpoint)
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = client.chat.completions.create(
        model=settings.default_model,
        messages=full_messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content
