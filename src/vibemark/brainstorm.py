"""Interactive brainstorming and marketing consultation using Claude."""

from __future__ import annotations

from pathlib import Path

import anthropic
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt

from vibemark.models import VibemarkConfig

console = Console()

CONSULTANT_SYSTEM = """\
You are a seasoned marketing consultant who specializes in helping solo developers \
and small teams market their software products. You're warm, encouraging, and practical.

Your approach:
- Ask one focused question at a time — never overwhelm
- Explain WHY each question matters for marketing (teach as you go)
- Give concrete examples and frameworks when helpful
- Validate and build on what the user shares
- Think like a marketer, not an engineer — focus on benefits over features
- Be honest when something needs work; offer alternatives

You have access to this project context:
{context}

Current session topic: {topic}
Insights gathered so far: {insights}"""

INTERVIEW_TOPICS = [
    {
        "key": "problem",
        "title": "The Problem You Solve",
        "opener": """\
Let's start with the foundation of all great marketing: **the problem**.

Every successful product is really a solution in disguise. Even if your project started as \
a fun experiment, people will use it because it solves a pain point for them.

**Tell me: What problem does your project solve? Or what frustration inspired you to build it?**

Don't worry about being polished — just tell me the story. Even "I was annoyed that X didn't exist" \
is a great starting point.""",
        "config_field": "problem_statement",
    },
    {
        "key": "audience",
        "title": "Who It's For",
        "opener": """\
Now let's figure out **who needs this most**.

A common mistake is saying "it's for everyone." In marketing, trying to reach everyone means \
reaching no one. The best products start by being *essential* to a small, specific group — then expand.

Think about:
- Who would be most excited to discover your project?
- Who feels the problem you solve most acutely?
- Is there a specific role, industry, or situation where this clicks?

**Describe your ideal user. Who are they, and what's their day like when they run into the problem you solve?**""",
        "config_field": "target_personas",
    },
    {
        "key": "differentiation",
        "title": "What Makes You Different",
        "opener": """\
Time for **positioning** — figuring out your unique angle.

Even if there are alternatives out there, there's a reason you built this. Maybe it's simpler, \
faster, more opinionated, or takes a completely different approach. Your differentiator doesn't \
have to be a feature — it can be a philosophy, a constraint you embrace, or even your personality.

**What existing tools or approaches do people currently use for this problem? And what's different about your approach?**

It's okay if you're not sure about competitors. Tell me what you know and we'll figure out your angle together.""",
        "config_field": "differentiators",
    },
    {
        "key": "value",
        "title": "Your Value Proposition",
        "opener": """\
Let's craft your **value proposition** — the one sentence that makes people go "I need this."

A great value prop follows this pattern:
> **[Product]** helps **[audience]** do **[outcome]** by **[unique approach]**.

Based on what you've told me so far, I'll help you draft one. But first:

**What's the #1 outcome or feeling someone gets from using your project? What changes for them?**

Think about the *after* state — what's better in their world because your tool exists?""",
        "config_field": "value_proposition",
    },
    {
        "key": "story",
        "title": "Your Origin Story",
        "opener": """\
People connect with **stories**, not specs. Your origin story is a secret marketing weapon, \
especially as a solo builder.

Developers love hearing:
- "I built this because..."
- "I was frustrated with X, so I..."
- "This started as a weekend project when..."

These stories make your project feel human and authentic. They're gold for Show HN posts, \
Twitter threads, and README intros.

**Tell me: How did this project come to life? What was the moment you decided to build it?**""",
        "config_field": "origin_story",
    },
    {
        "key": "goals",
        "title": "Marketing Goals",
        "opener": """\
Finally, let's talk about **what success looks like** for you.

Marketing without goals is just noise. Different goals lead to completely different strategies:
- **Awareness**: Getting the word out (Show HN, Twitter, blog posts)
- **Adoption**: Getting people to actually use it (great docs, easy onboarding)
- **Community**: Building a group of engaged users (Discord, contributors)
- **Revenue**: Turning it into a business (landing pages, conversion)

**What are you hoping to achieve? Pick 1-2 goals, and tell me what "working" would look like for you.**""",
        "config_field": "goals",
    },
]


def build_context(config: VibemarkConfig) -> str:
    """Build project context for the consultant."""
    from vibemark.prompts import build_project_context

    return build_project_context(config)


def run_interview(config: VibemarkConfig, model: str | None = None) -> VibemarkConfig:
    """Run the structured interview flow, updating config with insights."""
    model_name = model or config.model
    client = anthropic.Anthropic()

    console.print(
        Panel(
            "[bold]Welcome to the Vibemark Marketing Workshop[/bold]\n\n"
            "I'm going to walk you through the key questions every marketer asks about a new product. "
            "Think of this as a consulting session — by the end, you'll have a solid foundation for all your marketing.\n\n"
            "For each topic, I'll explain why it matters and ask you questions. "
            "Type your answers naturally. Type [bold cyan]skip[/bold cyan] to move on or [bold cyan]done[/bold cyan] to finish early.",
            border_style="cyan",
        )
    )

    context = build_context(config)

    for i, topic in enumerate(INTERVIEW_TOPICS, 1):
        console.print(f"\n[bold cyan]--- Step {i}/{len(INTERVIEW_TOPICS)}: {topic['title']} ---[/bold cyan]\n")
        console.print(Markdown(topic["opener"]))
        console.print()

        # Collect multi-turn conversation for this topic
        messages: list[dict] = []
        insight_text = ""

        while True:
            answer = Prompt.ask("[bold green]You[/bold green]")
            if answer.lower() in ("skip", "done"):
                break

            messages.append({"role": "user", "content": answer})

            # Build system prompt with current insights
            insights_so_far = _summarize_insights(config.insights)
            system = CONSULTANT_SYSTEM.format(
                context=context,
                topic=topic["title"],
                insights=insights_so_far,
            )

            # Add instruction for the consultant to ask follow-up or wrap up
            messages_with_nudge = messages.copy()
            messages_with_nudge[-1] = {
                "role": "user",
                "content": answer
                + "\n\n[System: Respond as the marketing consultant. Acknowledge what they shared, "
                "add your expert perspective, then either ask a focused follow-up question or "
                "summarize the key insight if you have enough. Keep it concise — 2-3 paragraphs max. "
                "If you think this topic is well-covered, end with 'Let's move on to the next topic.' ]",
            }

            response = client.messages.create(
                model=model_name,
                max_tokens=1024,
                system=system,
                messages=messages_with_nudge,
            )

            assistant_text = "".join(b.text for b in response.content if b.type == "text")
            messages.append({"role": "assistant", "content": assistant_text})
            insight_text += f"\n{answer}"

            console.print()
            console.print(Panel(Markdown(assistant_text), border_style="dim"))
            console.print()

            if "move on" in assistant_text.lower() or "next topic" in assistant_text.lower():
                break

        # Save insight to config
        if insight_text.strip():
            _save_insight(config, topic, insight_text.strip(), client, model_name, context)

        if answer.lower() == "done":
            break

    # Final synthesis
    _synthesize(config, client, model_name, context)

    return config


def run_brainstorm(config: VibemarkConfig, topic: str, model: str | None = None) -> None:
    """Run an open-ended brainstorming session on a specific marketing topic."""
    model_name = model or config.model
    client = anthropic.Anthropic()

    context = build_context(config)
    insights = _summarize_insights(config.insights)

    system = (
        CONSULTANT_SYSTEM.format(context=context, topic=topic, insights=insights)
        + "\n\nThis is a free-form brainstorming session. Help the user explore ideas, "
        "offer frameworks, give examples from successful developer tools, and help them "
        "think through their marketing strategy. Be collaborative and creative."
    )

    console.print(
        Panel(
            f"[bold]Brainstorming: {topic}[/bold]\n\n"
            "Let's explore this together. Share your thoughts and I'll help you develop them.\n"
            "Type [bold cyan]done[/bold cyan] when you're finished.",
            border_style="magenta",
        )
    )

    messages: list[dict] = []

    # Kick off with an opening from the consultant
    opening = client.messages.create(
        model=model_name,
        max_tokens=1024,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"I want to brainstorm about: {topic}. Help me think through this as my marketing consultant.",
            }
        ],
    )
    opening_text = "".join(b.text for b in opening.content if b.type == "text")
    messages.append(
        {
            "role": "user",
            "content": f"I want to brainstorm about: {topic}. Help me think through this as my marketing consultant.",
        }
    )
    messages.append({"role": "assistant", "content": opening_text})

    console.print()
    console.print(Panel(Markdown(opening_text), border_style="dim"))
    console.print()

    while True:
        answer = Prompt.ask("[bold green]You[/bold green]")
        if answer.lower() == "done":
            break

        messages.append({"role": "user", "content": answer})

        response = client.messages.create(
            model=model_name,
            max_tokens=1024,
            system=system,
            messages=messages,
        )

        assistant_text = "".join(b.text for b in response.content if b.type == "text")
        messages.append({"role": "assistant", "content": assistant_text})

        console.print()
        console.print(Panel(Markdown(assistant_text), border_style="dim"))
        console.print()

    console.print("[bold green]Brainstorm session complete![/bold green]")


def _summarize_insights(insights) -> str:  # noqa: ANN001
    """Format current insights as a string."""
    parts = []
    if insights.problem_statement:
        parts.append(f"Problem: {insights.problem_statement}")
    if insights.target_personas:
        parts.append(f"Audience: {', '.join(insights.target_personas)}")
    if insights.value_proposition:
        parts.append(f"Value prop: {insights.value_proposition}")
    if insights.differentiators:
        parts.append(f"Differentiators: {', '.join(insights.differentiators)}")
    if insights.use_cases:
        parts.append(f"Use cases: {', '.join(insights.use_cases)}")
    if insights.origin_story:
        parts.append(f"Origin: {insights.origin_story}")
    if insights.goals:
        parts.append(f"Goals: {', '.join(insights.goals)}")
    return "\n".join(parts) if parts else "(none yet)"


def _save_insight(
    config: VibemarkConfig,
    topic: dict,
    raw_answer: str,
    client: anthropic.Anthropic,
    model: str,
    context: str,
) -> None:
    """Use Claude to distill the user's answers into a clean insight and save to config."""
    field = topic["config_field"]

    # Ask Claude to distill
    is_list = field in ("target_personas", "differentiators", "use_cases", "competitors", "goals")

    if is_list:
        instruction = (
            f"Based on the user's answers about '{topic['title']}', extract a concise list of key points. "
            "Return ONLY a JSON array of short strings, e.g. [\"point 1\", \"point 2\"]. No other text."
        )
    else:
        instruction = (
            f"Based on the user's answers about '{topic['title']}', write a concise 1-2 sentence summary "
            "capturing the key insight. Return ONLY the summary text, nothing else."
        )

    response = client.messages.create(
        model=model,
        max_tokens=256,
        messages=[{"role": "user", "content": f"{instruction}\n\nUser's answers:\n{raw_answer}"}],
    )
    result = "".join(b.text for b in response.content if b.type == "text").strip()

    if is_list:
        import json

        try:
            items = json.loads(result)
            if isinstance(items, list):
                setattr(config.insights, field, [str(x) for x in items])
        except json.JSONDecodeError:
            # Fallback: split by newlines
            setattr(config.insights, field, [line.strip("- ") for line in result.splitlines() if line.strip()])
    else:
        setattr(config.insights, field, result)


def _synthesize(
    config: VibemarkConfig,
    client: anthropic.Anthropic,
    model: str,
    context: str,
) -> None:
    """Generate a final synthesis of all insights."""
    insights = _summarize_insights(config.insights)
    if insights == "(none yet)":
        return

    response = client.messages.create(
        model=model,
        max_tokens=1024,
        system="You are a marketing consultant wrapping up a discovery session.",
        messages=[
            {
                "role": "user",
                "content": (
                    f"Here's what we gathered about the project:\n\n{context}\n\n"
                    f"Marketing insights:\n{insights}\n\n"
                    "Give a brief, encouraging wrap-up (3-4 paragraphs):\n"
                    "1. Summarize their marketing foundation\n"
                    "2. Suggest which marketing channel to tackle first and why\n"
                    "3. Give one specific, actionable next step\n"
                    "Keep it warm and practical."
                ),
            }
        ],
    )
    synthesis = "".join(b.text for b in response.content if b.type == "text")

    console.print()
    console.print(
        Panel(
            Markdown(synthesis),
            title="[bold green]Session Summary[/bold green]",
            border_style="green",
        )
    )
