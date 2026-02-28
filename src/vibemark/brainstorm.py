"""Interactive brainstorming and marketing consultation using Claude.

This module is the CLI adapter — it handles Rich terminal UI and delegates
business logic to the conversation service.
"""

from __future__ import annotations

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt

from vibemark.models import VibemarkConfig

console = Console()

# ── Constants shared with conversation_service ────────────────────────

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
    """Run the structured interview flow, updating config with insights.

    Uses the conversation service for business logic, Rich for terminal UI.
    """
    from vibemark.services.conversation_service import (
        advance_topic,
        finish_interview,
        get_current_topic,
        get_topic_opener,
        interview_turn,
        start_interview,
    )

    session = start_interview(config, model=model)

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

    topic_count = len(INTERVIEW_TOPICS)

    while not session.finished:
        topic = get_current_topic(session)
        if topic is None:
            break

        idx = session.current_topic_index + 1
        console.print(f"\n[bold cyan]--- Step {idx}/{topic_count}: {topic['title']} ---[/bold cyan]\n")

        opener = get_topic_opener(session)
        if opener:
            console.print(Markdown(opener))
            console.print()

        while True:
            answer = Prompt.ask("[bold green]You[/bold green]")
            if answer.lower() in ("skip", "done"):
                break

            result = interview_turn(session, answer)

            console.print()
            console.print(Panel(Markdown(result.response), border_style="dim"))
            console.print()

            if result.should_advance:
                break

        # Advance to next topic
        advance_topic(session)

        if answer.lower() == "done":
            break

    # Final synthesis
    synthesis = finish_interview(session)
    if synthesis:
        console.print()
        console.print(
            Panel(
                Markdown(synthesis),
                title="[bold green]Session Summary[/bold green]",
                border_style="green",
            )
        )

    return session.config


def run_brainstorm(config: VibemarkConfig, topic: str, model: str | None = None) -> None:
    """Run an open-ended brainstorming session on a specific marketing topic.

    Uses the conversation service for business logic, Rich for terminal UI.
    """
    from vibemark.services.conversation_service import (
        brainstorm_opener,
        brainstorm_turn,
        start_brainstorm,
    )

    session = start_brainstorm(config, topic, model=model)

    console.print(
        Panel(
            f"[bold]Brainstorming: {topic}[/bold]\n\n"
            "Let's explore this together. Share your thoughts and I'll help you develop them.\n"
            "Type [bold cyan]done[/bold cyan] when you're finished.",
            border_style="magenta",
        )
    )

    # Opening from the consultant
    opening_text = brainstorm_opener(session)
    console.print()
    console.print(Panel(Markdown(opening_text), border_style="dim"))
    console.print()

    while True:
        answer = Prompt.ask("[bold green]You[/bold green]")
        if answer.lower() == "done":
            break

        assistant_text = brainstorm_turn(session, answer)

        console.print()
        console.print(Panel(Markdown(assistant_text), border_style="dim"))
        console.print()

    console.print("[bold green]Brainstorm session complete![/bold green]")
