"""Conversation endpoints — interview and brainstorm with SSE streaming."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from vibemark.api.dependencies import get_db
from vibemark.db.models import Conversation, Message, Project, ProjectConfig
from vibemark.models import VibemarkConfig
from vibemark.services.config_service import config_from_dict

router = APIRouter(tags=["conversations"])


# ── Schemas ───────────────────────────────────────────────────────────


class ConversationCreate(BaseModel):
    project_id: int
    conversation_type: str  # "interview" or "brainstorm"
    topic: str = ""


class MessageCreate(BaseModel):
    content: str


class ConversationResponse(BaseModel):
    id: int
    project_id: int
    conversation_type: str
    topic: str
    current_topic_index: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────


def _load_config(project: Project) -> VibemarkConfig:
    """Load VibemarkConfig from DB project config."""
    if project.config and project.config.config_json:
        return config_from_dict(project.config.get_config_dict())
    return VibemarkConfig()


def _build_messages_for_api(db_messages: list[Message]) -> list[dict]:
    """Convert DB messages to Anthropic API format."""
    return [{"role": m.role, "content": m.content} for m in db_messages if m.role in ("user", "assistant")]


# ── Endpoints ─────────────────────────────────────────────────────────


@router.get("/projects/{project_id}/conversations", response_model=list[ConversationResponse])
def list_conversations(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Conversation)
        .filter(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
def create_conversation(body: ConversationCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == body.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conv = Conversation(
        project_id=body.project_id,
        conversation_type=body.conversation_type,
        topic=body.topic,
        current_topic_index=0,
        status="active",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # For interviews, add the first topic opener as a system message
    if body.conversation_type == "interview":
        from vibemark.brainstorm import INTERVIEW_TOPICS

        if INTERVIEW_TOPICS:
            opener = INTERVIEW_TOPICS[0]["opener"]
            msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=opener,
            )
            db.add(msg)
            db.commit()

    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.id)
        .all()
    )


@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, body: MessageCreate, db: Session = Depends(get_db)):
    """Send a user message and stream back the assistant response via SSE."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.status == "finished":
        raise HTTPException(status_code=400, detail="Conversation is finished")

    project = db.query(Project).filter(Project.id == conv.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=body.content)
    db.add(user_msg)
    db.commit()

    config = _load_config(project)
    existing_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.id)
        .all()
    )

    async def event_generator():
        import anthropic
        from vibemark.brainstorm import CONSULTANT_SYSTEM, INTERVIEW_TOPICS
        from vibemark.prompts import build_project_context

        client = anthropic.Anthropic()
        context = build_project_context(config)

        if conv.conversation_type == "interview":
            topic_idx = conv.current_topic_index
            topics = INTERVIEW_TOPICS
            topic_title = topics[topic_idx]["title"] if topic_idx < len(topics) else "General"

            from vibemark.services.conversation_service import _summarize_insights
            insights_str = _summarize_insights(config.insights)

            system = CONSULTANT_SYSTEM.format(
                context=context, topic=topic_title, insights=insights_str,
            )

            api_messages = _build_messages_for_api(existing_messages)
            if api_messages and api_messages[-1]["role"] == "user":
                api_messages[-1] = {
                    "role": "user",
                    "content": api_messages[-1]["content"]
                    + "\n\n[System: Respond as the marketing consultant. Acknowledge what they shared, "
                    "add your expert perspective, then either ask a focused follow-up question or "
                    "summarize the key insight if you have enough. Keep it concise — 2-3 paragraphs max. "
                    "If you think this topic is well-covered, end with 'Let's move on to the next topic.' ]",
                }
        else:
            # Brainstorm
            from vibemark.services.conversation_service import _summarize_insights
            insights_str = _summarize_insights(config.insights)

            system = (
                CONSULTANT_SYSTEM.format(context=context, topic=conv.topic, insights=insights_str)
                + "\n\nThis is a free-form brainstorming session. Help the user explore ideas, "
                "offer frameworks, give examples from successful developer tools, and help them "
                "think through their marketing strategy. Be collaborative and creative."
            )
            api_messages = _build_messages_for_api(existing_messages)

        full_text = ""
        with client.messages.stream(
            model=config.model or "claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system,
            messages=api_messages,
        ) as stream:
            for text in stream.text_stream:
                full_text += text
                yield {"event": "token", "data": json.dumps({"type": "token", "content": text})}

        # Save assistant message
        session = db.object_session(conv) or db
        assistant_msg = Message(conversation_id=conv.id, role="assistant", content=full_text)
        session.add(assistant_msg)

        should_advance = "move on" in full_text.lower() or "next topic" in full_text.lower()
        yield {
            "event": "done",
            "data": json.dumps({"type": "done", "should_advance": should_advance}),
        }
        session.commit()

    return EventSourceResponse(event_generator())


@router.post("/conversations/{conversation_id}/advance")
def advance_topic(conversation_id: int, db: Session = Depends(get_db)):
    """Advance to the next interview topic."""
    from vibemark.brainstorm import INTERVIEW_TOPICS

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.conversation_type != "interview":
        raise HTTPException(status_code=400, detail="Not an interview")

    # Save insight for the current topic before advancing
    project = db.query(Project).filter(Project.id == conv.project_id).first()
    if project:
        config = _load_config(project)
        _save_topic_insight(conv, config, db)
        # Persist updated config
        if project.config:
            from vibemark.services.config_service import config_to_dict
            project.config.set_config_dict(config_to_dict(config))

    conv.current_topic_index += 1
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    topics = INTERVIEW_TOPICS
    if conv.current_topic_index < len(topics):
        opener = topics[conv.current_topic_index]["opener"]
        msg = Message(conversation_id=conv.id, role="assistant", content=opener)
        db.add(msg)
        db.commit()
        return {
            "opener": opener,
            "topic_index": conv.current_topic_index,
            "topic_title": topics[conv.current_topic_index]["title"],
            "total_topics": len(topics),
        }
    else:
        conv.status = "finished"
        db.commit()
        return {"opener": None, "topic_index": conv.current_topic_index, "total_topics": len(topics)}


@router.post("/conversations/{conversation_id}/finish")
def finish_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Finish the conversation and generate synthesis."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    project = db.query(Project).filter(Project.id == conv.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    config = _load_config(project)

    # Save any remaining topic insight
    if conv.conversation_type == "interview":
        _save_topic_insight(conv, config, db)

    conv.status = "finished"
    conv.updated_at = datetime.now(timezone.utc)

    # Persist updated config
    if project.config:
        from vibemark.services.config_service import config_to_dict
        project.config.set_config_dict(config_to_dict(config))
    db.commit()

    # Generate synthesis
    if conv.conversation_type == "interview":
        from vibemark.services.conversation_service import InterviewSession, synthesize
        session = InterviewSession(config=config, model=config.model)
        synthesis = synthesize(session)
        if synthesis:
            msg = Message(conversation_id=conv.id, role="assistant", content=synthesis)
            db.add(msg)
            db.commit()
        return {"synthesis": synthesis}

    return {"synthesis": ""}


def _save_topic_insight(conv: Conversation, config: VibemarkConfig, db: Session) -> None:
    """Extract and save insight from the current topic's messages."""
    from vibemark.brainstorm import INTERVIEW_TOPICS

    topics = INTERVIEW_TOPICS
    if conv.current_topic_index >= len(topics):
        return

    topic = topics[conv.current_topic_index]
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.role == "user")
        .order_by(Message.id)
        .all()
    )

    raw_answers = "\n".join(m.content for m in messages)
    if not raw_answers.strip():
        return

    # Use Claude to distill
    import anthropic
    client = anthropic.Anthropic()
    field = topic["config_field"]
    is_list = field in ("target_personas", "differentiators", "use_cases", "competitors", "goals")

    if is_list:
        instruction = (
            f"Based on the user's answers about '{topic['title']}', extract a concise list of key points. "
            "Return ONLY a JSON array of short strings. No other text."
        )
    else:
        instruction = (
            f"Based on the user's answers about '{topic['title']}', write a concise 1-2 sentence summary. "
            "Return ONLY the summary text, nothing else."
        )

    response = client.messages.create(
        model=config.model or "claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": f"{instruction}\n\nUser's answers:\n{raw_answers}"}],
    )
    result = "".join(b.text for b in response.content if b.type == "text").strip()

    if is_list:
        try:
            items = json.loads(result)
            if isinstance(items, list):
                setattr(config.insights, field, [str(x) for x in items])
        except json.JSONDecodeError:
            setattr(config.insights, field, [line.strip("- ") for line in result.splitlines() if line.strip()])
    else:
        setattr(config.insights, field, result)
