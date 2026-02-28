"""Content generation endpoints with SSE streaming."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from vibemark.api.dependencies import get_db
from vibemark.db.models import GeneratedContentRecord, Project
from vibemark.models import Channel, VibemarkConfig
from vibemark.services.config_service import config_from_dict

router = APIRouter(tags=["generation"])


class GenerateRequest(BaseModel):
    channel: str  # "social", "landing", "readme"


class ContentResponse(BaseModel):
    id: int
    project_id: int
    channel: str
    content: str
    model_used: str
    prompt_tokens: int | None
    output_tokens: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ContentUpdateRequest(BaseModel):
    content: str


def _load_config(project: Project) -> VibemarkConfig:
    if project.config and project.config.config_json:
        return config_from_dict(project.config.get_config_dict())
    cfg = VibemarkConfig()
    cfg.project.name = project.name
    cfg.project.description = project.description
    cfg.project.language = project.language
    return cfg


@router.post("/projects/{project_id}/generate")
def generate_content(project_id: int, body: GenerateRequest, db: Session = Depends(get_db)):
    """Generate marketing content with SSE streaming."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        channel = Channel(body.channel)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid channel: {body.channel}")

    config = _load_config(project)

    async def event_generator():
        from vibemark.prompts import SYSTEM_PROMPT, build_prompt
        import anthropic

        client = anthropic.Anthropic()
        user_prompt = build_prompt(config, channel)
        model_name = config.model or "claude-sonnet-4-20250514"

        full_text = ""
        input_tokens = 0
        output_tokens = 0

        with client.messages.stream(
            model=model_name,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text in stream.text_stream:
                full_text += text
                yield {"event": "token", "data": json.dumps({"type": "token", "content": text})}

            # Get final message for token counts
            final = stream.get_final_message()
            input_tokens = final.usage.input_tokens
            output_tokens = final.usage.output_tokens

        # Save to DB
        record = GeneratedContentRecord(
            project_id=project_id,
            channel=channel.value,
            content=full_text,
            model_used=model_name,
            prompt_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        yield {
            "event": "done",
            "data": json.dumps({
                "type": "done",
                "content_id": record.id,
                "prompt_tokens": input_tokens,
                "output_tokens": output_tokens,
            }),
        }

    return EventSourceResponse(event_generator())


# ── Content Library CRUD ──────────────────────────────────────────────


@router.get("/projects/{project_id}/content", response_model=list[ContentResponse])
def list_content(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(GeneratedContentRecord)
        .filter(GeneratedContentRecord.project_id == project_id)
        .order_by(GeneratedContentRecord.created_at.desc())
        .all()
    )


@router.get("/content/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    record = db.query(GeneratedContentRecord).filter(GeneratedContentRecord.id == content_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Content not found")
    return record


@router.put("/content/{content_id}", response_model=ContentResponse)
def update_content(content_id: int, body: ContentUpdateRequest, db: Session = Depends(get_db)):
    record = db.query(GeneratedContentRecord).filter(GeneratedContentRecord.id == content_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Content not found")
    record.content = body.content
    db.commit()
    db.refresh(record)
    return record


@router.delete("/content/{content_id}", status_code=204)
def delete_content(content_id: int, db: Session = Depends(get_db)):
    record = db.query(GeneratedContentRecord).filter(GeneratedContentRecord.id == content_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(record)
    db.commit()
