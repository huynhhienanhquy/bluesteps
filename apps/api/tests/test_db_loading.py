from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, event, text
from sqlalchemy.engine import make_url

from bluesteps_api.config import Settings
from bluesteps_api.db import make_engine
from bluesteps_api.main import create_app

pytestmark = pytest.mark.postgres


def test_connection_startup_keeps_utc_and_other_options(
    database: tuple[Engine, Engine, str], settings: Settings
) -> None:
    url = make_url(database[2]).update_query_dict(
        {"options": "-c application_name=bluesteps-loading-test -c timezone=Asia/Bangkok"}
    )
    config = settings.model_copy(update={"database_url": SecretStr(url.render_as_string(hide_password=False))})
    engine = make_engine(config)
    try:
        # Both reuse and a new physical connection must retain UTC after commit.
        for reconnect in (False, False, True):
            if reconnect:
                engine.dispose()
            with engine.begin() as connection:
                assert connection.scalar(text("show timezone")) == "UTC"
                assert connection.scalar(text("show application_name")) == "bluesteps-loading-test"
    finally:
        engine.dispose()


def test_warm_catalog_requests_only_execute_the_catalog_query(
    database: tuple[Engine, Engine, str], owner: Engine, settings: Settings
) -> None:
    config = settings.model_copy(update={"database_url": SecretStr(database[2])})
    engine = make_engine(config)
    statements: list[str] = []
    try:
        with TestClient(create_app(config, engine=engine)) as client:
            # Warm connection initialization separately from request work.
            assert client.get("/v1/events").status_code == 200

            @event.listens_for(engine, "before_cursor_execute")
            def record_statement(
                connection: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool
            ) -> None:
                statements.append(statement)

            for path in ("/v1/events", "/v1/articles", "/v1/waste-items"):
                statements.clear()
                response = client.get(path)
                assert response.status_code == 200, response.text
                assert response.json()["items"]
                assert len(statements) == 1
                assert statements[0].lstrip().lower().startswith("select")
    finally:
        engine.dispose()
