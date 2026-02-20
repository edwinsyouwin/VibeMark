"""Claude prompt templates for each marketing channel."""

from __future__ import annotations

from vibemark.models import Channel, VibemarkConfig

SYSTEM_PROMPT = """\
You are a marketing copywriter specializing in developer tools and software products.
You write compelling, accurate marketing content based on project details provided.
Always stay truthful to the project's actual capabilities — never invent features.
Adapt your tone to match the brand voice specified."""


def build_project_context(config: VibemarkConfig) -> str:
    """Build a context block describing the project."""
    p = config.project
    b = config.brand
    parts = [f"Project name: {p.name}"]
    if p.description:
        parts.append(f"Description: {p.description}")
    if p.language:
        parts.append(f"Language: {p.language}")
    if p.frameworks:
        parts.append(f"Frameworks: {', '.join(p.frameworks)}")
    if p.features:
        parts.append(f"Key features: {', '.join(p.features)}")
    if p.repo_url:
        parts.append(f"Repository: {p.repo_url}")
    if p.license:
        parts.append(f"License: {p.license}")
    if b.tone:
        parts.append(f"Brand tone: {b.tone}")
    if b.audience:
        parts.append(f"Target audience: {b.audience}")
    if b.tagline:
        parts.append(f"Tagline: {b.tagline}")
    if b.keywords:
        parts.append(f"Keywords: {', '.join(b.keywords)}")
    # Include marketing insights if available
    m = config.insights
    if m.problem_statement:
        parts.append(f"Problem solved: {m.problem_statement}")
    if m.value_proposition:
        parts.append(f"Value proposition: {m.value_proposition}")
    if m.target_personas:
        parts.append(f"Target personas: {', '.join(m.target_personas)}")
    if m.differentiators:
        parts.append(f"Differentiators: {', '.join(m.differentiators)}")
    if m.use_cases:
        parts.append(f"Use cases: {', '.join(m.use_cases)}")
    if m.competitors:
        parts.append(f"Competitors/alternatives: {', '.join(m.competitors)}")
    if m.origin_story:
        parts.append(f"Origin story: {m.origin_story}")
    if m.goals:
        parts.append(f"Marketing goals: {', '.join(m.goals)}")
    if p.readme_content:
        parts.append(f"\n--- README (for context) ---\n{p.readme_content[:5000]}")
    return "\n".join(parts)


CHANNEL_PROMPTS: dict[Channel, str] = {
    Channel.SOCIAL: """\
Generate social media marketing content for this project.

Produce the following:
1. **Twitter/X thread** (5-7 tweets, each under 280 characters)
2. **LinkedIn post** (professional tone, 150-300 words)
3. **Hacker News / Reddit title + comment** (authentic, not salesy)

Format each section with a markdown heading (## Twitter Thread, ## LinkedIn Post, ## HN/Reddit).
Include relevant hashtags for social posts where appropriate.""",

    Channel.LANDING: """\
Generate landing page copy for this project.

Produce the following sections:
1. **Hero** — headline (under 10 words) + subheadline (1-2 sentences) + CTA button text
2. **Features** — 3-5 feature blocks, each with a short title and 1-2 sentence description
3. **How It Works** — 3-4 numbered steps
4. **Social Proof / Trust** — suggested testimonial prompts or trust signals
5. **Final CTA** — closing pitch + button text

Format with markdown headings. Keep it concise and conversion-focused.""",

    Channel.README: """\
Generate a polished README.md for this project.

Produce the following sections:
1. **Title + badges** (suggest relevant shields.io badges)
2. **One-liner description**
3. **Features** — bulleted list of key features
4. **Quick Start** — installation + minimal usage example
5. **Usage** — more detailed examples
6. **Configuration** — key options/settings if applicable
7. **Contributing** — brief contribution guidelines
8. **License**

Use idiomatic markdown. Make the Quick Start copy-pasteable.""",
}


def build_prompt(config: VibemarkConfig, channel: Channel) -> str:
    """Build the full user prompt for a given channel."""
    context = build_project_context(config)
    channel_instruction = CHANNEL_PROMPTS[channel]
    return f"""{channel_instruction}

---
PROJECT DETAILS:
{context}"""
