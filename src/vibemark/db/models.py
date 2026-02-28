"""SQLAlchemy ORM models for the web backend."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(100), default="")
    repo_url: Mapped[str] = mapped_column(String(500), default="")
    github_repo_full_name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    config: Mapped[ProjectConfig | None] = relationship(
        "ProjectConfig", back_populates="project", uselist=False, cascade="all, delete-orphan"
    )
    conversations: Mapped[list[Conversation]] = relationship(
        "Conversation", back_populates="project", cascade="all, delete-orphan"
    )
    generated_contents: Mapped[list[GeneratedContentRecord]] = relationship(
        "GeneratedContentRecord", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectConfig(Base):
    __tablename__ = "project_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), unique=True
    )
    config_json: Mapped[str] = mapped_column(Text, default="{}")

    project: Mapped[Project] = relationship("Project", back_populates="config")

    def get_config_dict(self) -> dict:
        return json.loads(self.config_json) if self.config_json else {}

    def set_config_dict(self, data: dict) -> None:
        self.config_json = json.dumps(data)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE")
    )
    conversation_type: Mapped[str] = mapped_column(String(50))  # "interview" or "brainstorm"
    topic: Mapped[str] = mapped_column(String(255), default="")
    current_topic_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="active")  # "active", "finished"
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project: Mapped[Project] = relationship("Project", back_populates="conversations")
    messages: Mapped[list[Message]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.id"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(50))  # "user", "assistant", "system"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")


class GeneratedContentRecord(Base):
    __tablename__ = "generated_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE")
    )
    channel: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    model_used: Mapped[str] = mapped_column(String(100), default="")
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    project: Mapped[Project] = relationship("Project", back_populates="generated_contents")


class GitHubAuth(Base):
    __tablename__ = "github_auth"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    access_token: Mapped[str] = mapped_column(String(255))
    username: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
