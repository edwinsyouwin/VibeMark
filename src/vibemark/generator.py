"""Anthropic SDK orchestration for content generation."""

from __future__ import annotations

import anthropic

from vibemark.models import Channel, GeneratedContent, VibemarkConfig
from vibemark.prompts import SYSTEM_PROMPT, build_prompt


def generate_content(
    config: VibemarkConfig,
    channel: Channel,
    model: str | None = None,
) -> GeneratedContent:
    """Call the Claude API and return generated content."""
    model_name = model or config.model
    client = anthropic.Anthropic()

    user_prompt = build_prompt(config, channel)

    message = client.messages.create(
        model=model_name,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    content_text = ""
    for block in message.content:
        if block.type == "text":
            content_text += block.text

    return GeneratedContent(
        channel=channel,
        content=content_text,
        model_used=model_name,
        prompt_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
    )
