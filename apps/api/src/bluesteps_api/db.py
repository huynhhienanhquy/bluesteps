from collections.abc import Generator, Mapping
from typing import Any

from fastapi import Request
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from .config import Settings
from .errors import APIError


def make_engine(settings: Settings) -> Engine:
    url = make_url(settings.database_url.get_secret_value())
    # Set UTC in the connection startup packet rather than paying a database
    # round trip on every request. Preserve other configured libpq options.
    options = " ".join((*url.normalized_query.get("options", ()), "-c timezone=UTC"))
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=settings.pool_size,
        max_overflow=0,
        hide_parameters=True,
        connect_args={"prepare_threshold": None, "connect_timeout": 5, "options": options},
    )


def db_session(request: Request) -> Generator[Session, None, None]:
    # Consumers use function scope: finish commit/rollback before sending the response.
    # A client can immediately GET after a command, and commit errors must not become 200s.
    with Session(request.app.state.engine, expire_on_commit=False) as db:
        try:
            yield db
            db.commit()
        except APIError as exc:
            # Security failures may need to persist rate limits or family revocation.
            if exc.commit:
                db.commit()
            else:
                db.rollback()
            raise
        except Exception:
            db.rollback()
            raise


def one(db: Session, sql: str, **params: Any) -> Mapping[str, Any] | None:
    result = db.execute(text(sql), params).mappings().first()
    return dict(result) if result is not None else None


def rows(db: Session, sql: str, **params: Any) -> list[Mapping[str, Any]]:
    return [dict(row) for row in db.execute(text(sql), params).mappings()]


def run(db: Session, sql: str, **params: Any) -> None:
    db.execute(text(sql), params)
