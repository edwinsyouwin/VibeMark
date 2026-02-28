"""Project CRUD endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from vibemark.api.dependencies import get_db
from vibemark.db.models import Project, ProjectConfig

router = APIRouter(tags=["projects"])


# ── Schemas ───────────────────────────────────────────────────────────


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    language: str = ""
    repo_url: str = ""
    github_repo_full_name: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    language: str | None = None
    repo_url: str | None = None
    github_repo_full_name: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    language: str
    repo_url: str
    github_repo_full_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.updated_at.desc()).all()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=body.name,
        description=body.description,
        language=body.language,
        repo_url=body.repo_url,
        github_repo_full_name=body.github_repo_full_name,
    )
    db.add(project)
    db.flush()

    # Create default config
    config = ProjectConfig(project_id=project.id, config_json="{}")
    db.add(config)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    project.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
