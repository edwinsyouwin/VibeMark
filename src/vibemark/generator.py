"""Anthropic SDK orchestration for content generation.

Delegates to generation_service for business logic.
"""

from __future__ import annotations

from vibemark.models import Channel, GeneratedContent, VibemarkConfig
from vibemark.services.generation_service import generate_content as _generate


def generate_content(
    config: VibemarkConfig,
    channel: Channel,
    model: str | None = None,
) -> GeneratedContent:
    """Call the Claude API and return generated content."""
    return _generate(config, channel, model=model)
