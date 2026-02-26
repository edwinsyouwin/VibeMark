"""FastAPI application factory."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vibemark.db.engine import init_db


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Vibemark API",
        description="Marketing automation API for vibe-coded projects",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize database on startup
    @app.on_event("startup")
    def startup():
        init_db()

    # Register routers
    from vibemark.api.routers.config import router as config_router
    from vibemark.api.routers.conversations import router as conversations_router
    from vibemark.api.routers.generation import router as generation_router
    from vibemark.api.routers.github import router as github_router
    from vibemark.api.routers.projects import router as projects_router

    app.include_router(projects_router, prefix="/api")
    app.include_router(config_router, prefix="/api")
    app.include_router(conversations_router, prefix="/api")
    app.include_router(generation_router, prefix="/api")
    app.include_router(github_router, prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
