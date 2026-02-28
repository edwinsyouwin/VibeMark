"""Conversation service — turn-by-turn interview and brainstorm logic.

Provides a stateful, UI-agnostic API for running interview and brainstorm
sessions. The CLI adapter (brainstorm.py) and web API both call into this.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import TYPE_CHECKING

import anthropic

from vibemark.brainstorm import CONSULTANT_SYSTEM, INTERVIEW_TOPICS
from vibemark.models import (
    BrainstormSession,
    InterviewSession,
    InterviewTurnResult,
    VibemarkConfig,
)
from vibemark.prompts import build_project_context

if TYPE_CHECKING:
    pass


def _build_system_prompt(config: VibemarkConfig, topic_title: str) -> str:
    """Build the consultant system prompt."""
    context = build_project_context(config)
    insights = _summarize_insights(config.insights)
    return CONSULTANT_SYSTEM.format(
        context=context,
        topic=topic_title,
        insights=insights,
    )


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


# ── Interview ─────────────────────────────────────────────────────────


def start_interview(config: VibemarkConfig, model: str | None = None) -> InterviewSession:
    """Start a new interview session. Returns session with first topic opener."""
    model_name = model or config.model
    return InterviewSession(
        config=config,
        model=model_name,
        current_topic_index=0,
        messages=[],
        raw_answers="",
        finished=False,
    )


def get_current_topic(session: InterviewSession) -> dict | None:
    """Get the current interview topic, or None if all topics are done."""
    if session.current_topic_index >= len(INTERVIEW_TOPICS):
        return None
    return INTERVIEW_TOPICS[session.current_topic_index]


def get_topic_opener(session: InterviewSession) -> str | None:
    """Get the opener text for the current topic."""
    topic = get_current_topic(session)
    if topic is None:
        return None
    return topic["opener"]


def interview_turn(session: InterviewSession, user_message: str) -> InterviewTurnResult:
    """Process one turn of the interview. Returns the assistant response and whether to advance."""
    client = anthropic.Anthropic()
    topic = get_current_topic(session)
    if topic is None:
        session.finished = True
        return InterviewTurnResult(response="", should_advance=True)

    session.messages.append({"role": "user", "content": user_message})
    session.raw_answers += f"\n{user_message}"

    system = _build_system_prompt(session.config, topic["title"])

    messages_with_nudge = session.messages.copy()
    messages_with_nudge[-1] = {
        "role": "user",
        "content": user_message
        + "\n\n[System: Respond as the marketing consultant. Acknowledge what they shared, "
        "add your expert perspective, then either ask a focused follow-up question or "
        "summarize the key insight if you have enough. Keep it concise — 2-3 paragraphs max. "
        "If you think this topic is well-covered, end with 'Let's move on to the next topic.' ]",
    }

    response = client.messages.create(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=messages_with_nudge,
    )

    assistant_text = "".join(b.text for b in response.content if b.type == "text")
    session.messages.append({"role": "assistant", "content": assistant_text})

    should_advance = "move on" in assistant_text.lower() or "next topic" in assistant_text.lower()

    return InterviewTurnResult(response=assistant_text, should_advance=should_advance)


def interview_turn_stream(
    session: InterviewSession, user_message: str
) -> Iterator[str]:
    """Streaming variant of interview_turn. Yields tokens, then updates session."""
    client = anthropic.Anthropic()
    topic = get_current_topic(session)
    if topic is None:
        session.finished = True
        return

    session.messages.append({"role": "user", "content": user_message})
    session.raw_answers += f"\n{user_message}"

    system = _build_system_prompt(session.config, topic["title"])

    messages_with_nudge = session.messages.copy()
    messages_with_nudge[-1] = {
        "role": "user",
        "content": user_message
        + "\n\n[System: Respond as the marketing consultant. Acknowledge what they shared, "
        "add your expert perspective, then either ask a focused follow-up question or "
        "summarize the key insight if you have enough. Keep it concise — 2-3 paragraphs max. "
        "If you think this topic is well-covered, end with 'Let's move on to the next topic.' ]",
    }

    full_text = ""
    with client.messages.stream(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=messages_with_nudge,
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            yield text

    session.messages.append({"role": "assistant", "content": full_text})


def advance_topic(session: InterviewSession) -> str | None:
    """Save current topic insight and advance to next. Returns next opener or None."""
    topic = get_current_topic(session)
    if topic and session.raw_answers.strip():
        _save_insight_to_config(session, topic)

    session.current_topic_index += 1
    session.messages = []
    session.raw_answers = ""

    next_opener = get_topic_opener(session)
    if next_opener is None:
        session.finished = True
    return next_opener


def finish_interview(session: InterviewSession) -> str:
    """Finalize the interview — save any remaining insight and run synthesis."""
    # Save current topic if there's pending answers
    topic = get_current_topic(session)
    if topic and session.raw_answers.strip():
        _save_insight_to_config(session, topic)

    session.finished = True
    return synthesize(session)


def synthesize(session: InterviewSession) -> str:
    """Generate a final synthesis of all insights."""
    client = anthropic.Anthropic()
    context = build_project_context(session.config)
    insights = _summarize_insights(session.config.insights)
    if insights == "(none yet)":
        return ""

    response = client.messages.create(
        model=session.model,
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
    return "".join(b.text for b in response.content if b.type == "text")


def synthesize_stream(session: InterviewSession) -> Iterator[str]:
    """Streaming variant of synthesize."""
    client = anthropic.Anthropic()
    context = build_project_context(session.config)
    insights = _summarize_insights(session.config.insights)
    if insights == "(none yet)":
        return

    with client.messages.stream(
        model=session.model,
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
    ) as stream:
        for text in stream.text_stream:
            yield text


def _save_insight_to_config(session: InterviewSession, topic: dict) -> None:
    """Use Claude to distill the user's answers into a clean insight and save to config."""
    client = anthropic.Anthropic()
    field = topic["config_field"]
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
        model=session.model,
        max_tokens=256,
        messages=[{"role": "user", "content": f"{instruction}\n\nUser's answers:\n{session.raw_answers.strip()}"}],
    )
    result = "".join(b.text for b in response.content if b.type == "text").strip()

    if is_list:
        try:
            items = json.loads(result)
            if isinstance(items, list):
                setattr(session.config.insights, field, [str(x) for x in items])
        except json.JSONDecodeError:
            setattr(
                session.config.insights,
                field,
                [line.strip("- ") for line in result.splitlines() if line.strip()],
            )
    else:
        setattr(session.config.insights, field, result)


# ── Brainstorm ────────────────────────────────────────────────────────


def start_brainstorm(
    config: VibemarkConfig, topic: str, model: str | None = None
) -> BrainstormSession:
    """Start a new brainstorm session."""
    model_name = model or config.model
    return BrainstormSession(
        config=config,
        topic=topic,
        model=model_name,
        messages=[],
        started=False,
        finished=False,
    )


def brainstorm_opener(session: BrainstormSession) -> str:
    """Generate the opening message for a brainstorm session."""
    client = anthropic.Anthropic()
    system = _build_brainstorm_system(session)

    opening_msg = {
        "role": "user",
        "content": f"I want to brainstorm about: {session.topic}. Help me think through this as my marketing consultant.",
    }
    response = client.messages.create(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=[opening_msg],
    )
    opening_text = "".join(b.text for b in response.content if b.type == "text")

    session.messages.append(opening_msg)
    session.messages.append({"role": "assistant", "content": opening_text})
    session.started = True

    return opening_text


def brainstorm_opener_stream(session: BrainstormSession) -> Iterator[str]:
    """Streaming variant of brainstorm_opener."""
    client = anthropic.Anthropic()
    system = _build_brainstorm_system(session)

    opening_msg = {
        "role": "user",
        "content": f"I want to brainstorm about: {session.topic}. Help me think through this as my marketing consultant.",
    }
    session.messages.append(opening_msg)

    full_text = ""
    with client.messages.stream(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=[opening_msg],
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            yield text

    session.messages.append({"role": "assistant", "content": full_text})
    session.started = True


def brainstorm_turn(session: BrainstormSession, user_message: str) -> str:
    """Process one turn of brainstorming. Returns the assistant response."""
    client = anthropic.Anthropic()
    system = _build_brainstorm_system(session)

    session.messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=session.messages,
    )
    assistant_text = "".join(b.text for b in response.content if b.type == "text")
    session.messages.append({"role": "assistant", "content": assistant_text})

    return assistant_text


def brainstorm_turn_stream(session: BrainstormSession, user_message: str) -> Iterator[str]:
    """Streaming variant of brainstorm_turn."""
    client = anthropic.Anthropic()
    system = _build_brainstorm_system(session)

    session.messages.append({"role": "user", "content": user_message})

    full_text = ""
    with client.messages.stream(
        model=session.model,
        max_tokens=1024,
        system=system,
        messages=session.messages,
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            yield text

    session.messages.append({"role": "assistant", "content": full_text})


def _build_brainstorm_system(session: BrainstormSession) -> str:
    """Build the brainstorm system prompt."""
    context = build_project_context(session.config)
    insights = _summarize_insights(session.config.insights)
    return (
        CONSULTANT_SYSTEM.format(context=context, topic=session.topic, insights=insights)
        + "\n\nThis is a free-form brainstorming session. Help the user explore ideas, "
        "offer frameworks, give examples from successful developer tools, and help them "
        "think through their marketing strategy. Be collaborative and creative."
    )
