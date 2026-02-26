"""GitHub OAuth and repo endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from vibemark.api.dependencies import get_db
from vibemark.db.models import GitHubAuth, Project, ProjectConfig
from vibemark.services import github_service
from vibemark.services.config_service import config_to_dict

router = APIRouter(prefix="/github", tags=["github"])


class CallbackBody(BaseModel):
    code: str


class ScanResult(BaseModel):
    config: dict


def _get_token(db: Session) -> str:
    """Get the stored GitHub token or raise 401."""
    auth = db.query(GitHubAuth).order_by(GitHubAuth.id.desc()).first()
    if not auth:
        raise HTTPException(status_code=401, detail="GitHub not connected")
    return auth.access_token


@router.get("/auth-url")
def get_auth_url():
    try:
        url = github_service.get_auth_url()
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/callback")
def oauth_callback(body: CallbackBody, db: Session = Depends(get_db)):
    try:
        token = github_service.exchange_code(body.code)
        user = github_service.get_user(token)
        username = user.get("login", "")

        # Store token (replace any existing)
        existing = db.query(GitHubAuth).first()
        if existing:
            existing.access_token = token
            existing.username = username
        else:
            db.add(GitHubAuth(access_token=token, username=username))
        db.commit()

        return {"username": username}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
def github_status(db: Session = Depends(get_db)):
    auth = db.query(GitHubAuth).order_by(GitHubAuth.id.desc()).first()
    if not auth:
        return {"connected": False, "username": ""}
    return {"connected": True, "username": auth.username}


@router.get("/repos")
def list_repos(db: Session = Depends(get_db)):
    token = _get_token(db)
    repos = github_service.list_repos(token)
    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "name": r["name"],
            "description": r.get("description"),
            "language": r.get("language"),
            "html_url": r["html_url"],
            "private": r["private"],
        }
        for r in repos
    ]


@router.post("/repos/{repo_full_name:path}/scan")
def scan_repo(repo_full_name: str, db: Session = Depends(get_db)):
    """Scan a GitHub repo and return the profile."""
    token = _get_token(db)
    try:
        profile_data = github_service.scan_repo(token, repo_full_name)
        return profile_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
