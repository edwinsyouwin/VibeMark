"""Project config endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from vibemark.api.dependencies import get_db
from vibemark.db.models import Project, ProjectConfig
from vibemark.models import VibemarkConfig
from vibemark.services.config_service import config_from_dict, config_to_dict

router = APIRouter(tags=["config"])


@router.get("/projects/{project_id}/config")
def get_project_config(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.config:
        return config_to_dict(VibemarkConfig())

    return project.config.get_config_dict()


@router.put("/projects/{project_id}/config")
def update_project_config(project_id: int, body: dict, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate the config
    config_from_dict(body)

    if not project.config:
        project.config = ProjectConfig(project_id=project_id)

    project.config.set_config_dict(body)
    db.commit()

    return project.config.get_config_dict()
