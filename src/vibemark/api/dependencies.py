"""FastAPI dependency injection."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy.orm import Session

from vibemark.db.engine import get_session_factory


def get_db() -> Iterator[Session]:
    """Yield a database session, closing it after the request."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
