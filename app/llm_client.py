"""Provider-swappable LLM client.

All agent code calls `complete()` — agents never touch the provider.

Three routes, auto-selected by what's set in .env (no code change to switch):

  1. GMI Anthropic-compatible (RECOMMENDED for this app — keeps Claude models):
       GMI_API_KEY=<key>
       GMI_BASE_URL=https://api.gmi-serving.com   (default)
       DEFAULT_MODEL=anthropic/claude-sonnet-4.6
     Uses the anthropic SDK pointed at GMI via auth_token (Bearer). Same response
     parsing as Anthropic-direct, so our Claude-tuned prompts work unchanged.

  2. GMI OpenAI-compatible (for open models like Llama / Minimax M2):
       GMI_API_KEY=<key>
       GMI_ENDPOINT=https://api.gmicloud.ai/v1
       DEFAULT_MODEL=meta-llama/Llama-3.3-70B-Instruct
     Uses the openai SDK. Selected only when GMI_ENDPOINT is set.

  3. Anthropic direct (default when no GMI key):
       ANTHROPIC_API_KEY=<key>
       DEFAULT_MODEL=claude-sonnet-4-6
"""
from __future__ import annotations

import anthropic

from app.config import settings


def complete(system_prompt: str, messages: list[dict], max_tokens: int = 1024) -> str:
    """Call the configured LLM and return the assistant's reply as a string."""
    if settings.gmi_api_key and settings.gmi_endpoint:
        return _complete_gmi_openai(system_prompt, messages, max_tokens)
    if settings.gmi_api_key:
        return _complete_anthropic(system_prompt, messages, max_tokens, via_gmi=True)
    return _complete_anthropic(system_prompt, messages, max_tokens, via_gmi=False)


def _complete_anthropic(
    system_prompt: str, messages: list[dict], max_tokens: int, via_gmi: bool = False
) -> str:
    """Anthropic SDK call — directly, or routed through GMI's Anthropic-compatible host."""
    if via_gmi:
        # GMI uses Bearer auth (ANTHROPIC_AUTH_TOKEN); base_url points at GMI.
        client = anthropic.Anthropic(
            base_url=settings.gmi_base_url,
            auth_token=settings.gmi_api_key,
        )
    else:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    response = client.messages.create(
        model=settings.default_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def _complete_gmi_openai(system_prompt: str, messages: list[dict], max_tokens: int) -> str:
    """OpenAI-compatible call to GMI inference cloud (open models)."""
    import openai  # lazy import — only needed on this route
    client = openai.OpenAI(api_key=settings.gmi_api_key, base_url=settings.gmi_endpoint)
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = client.chat.completions.create(
        model=settings.default_model,
        messages=full_messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content
