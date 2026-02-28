"""SQLAlchemy engine and session factory."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_DEFAULT_DB_DIR = Path.home() / ".vibemark"
_DEFAULT_DB_PATH = _DEFAULT_DB_DIR / "vibemark.db"

_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine(db_path: Path | None = None):
    """Get or create the SQLAlchemy engine."""
    global _engine
    if _engine is None:
        path = db_path or _DEFAULT_DB_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            f"sqlite:///{path}",
            connect_args={"check_same_thread": False},
            echo=False,
        )
    return _engine


def get_session_factory(db_path: Path | None = None) -> sessionmaker[Session]:
    """Get or create the session factory."""
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine(db_path)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


def init_db(db_path: Path | None = None) -> None:
    """Create all tables."""
    from vibemark.db.models import Base

    engine = get_engine(db_path)
    Base.metadata.create_all(bind=engine)
