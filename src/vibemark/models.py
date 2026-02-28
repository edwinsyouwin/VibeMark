"""Pydantic models for Vibemark."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Channel(str, Enum):
    SOCIAL = "social"
    LANDING = "landing"
    README = "readme"


class ProjectProfile(BaseModel):
    """Extracted project metadata from scanning project files."""

    name: str = ""
    description: str = ""
    language: str = ""
    frameworks: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    repo_url: str = ""
    license: str = ""
    readme_content: str = ""


class MarketingInsights(BaseModel):
    """Deep marketing insights gathered through brainstorming/interview."""

    problem_statement: str = ""
    target_personas: list[str] = Field(default_factory=list)
    value_proposition: str = ""
    differentiators: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list)
    competitors: list[str] = Field(default_factory=list)
    origin_story: str = ""
    goals: list[str] = Field(default_factory=list)


class BrandVoice(BaseModel):
    """Brand voice and tone settings."""

    tone: str = "professional yet approachable"
    audience: str = ""
    tagline: str = ""
    keywords: list[str] = Field(default_factory=list)


class VibemarkConfig(BaseModel):
    """Full vibemark.yaml configuration."""

    project: ProjectProfile = Field(default_factory=ProjectProfile)
    brand: BrandVoice = Field(default_factory=BrandVoice)
    insights: MarketingInsights = Field(default_factory=MarketingInsights)
    model: str = "claude-sonnet-4-20250514"

    def merge_scan(self, scanned: ProjectProfile) -> None:
        """Merge scanned data into config. Existing config values take priority."""
        for field_name in scanned.model_fields:
            scanned_val = getattr(scanned, field_name)
            config_val = getattr(self.project, field_name)
            # Only fill in if config value is empty/default
            if not config_val and scanned_val:
                setattr(self.project, field_name, scanned_val)


class GeneratedContent(BaseModel):
    """Output from the AI generator."""

    channel: Channel
    content: str
    model_used: str = ""
    prompt_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class InterviewTurnResult(BaseModel):
    """Result of a single interview turn."""

    response: str
    should_advance: bool = False


class InterviewSession(BaseModel):
    """State for a turn-by-turn interview session."""

    config: VibemarkConfig
    model: str = "claude-sonnet-4-20250514"
    current_topic_index: int = 0
    messages: list[dict] = Field(default_factory=list)
    raw_answers: str = ""
    finished: bool = False

    class Config:
        arbitrary_types_allowed = True


class BrainstormSession(BaseModel):
    """State for a turn-by-turn brainstorm session."""

    config: VibemarkConfig
    topic: str
    model: str = "claude-sonnet-4-20250514"
    messages: list[dict] = Field(default_factory=list)
    started: bool = False
    finished: bool = False

    class Config:
        arbitrary_types_allowed = True
