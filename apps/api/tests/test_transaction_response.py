from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session
from starlette.types import Message, Receive, Scope, Send

from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


def test_saved_event_is_committed_before_http_success_starts(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    event_id = str(fixture_id("event", "beach"))
    observed: list[bool] = []

    async def application(scope: Scope, receive: Receive, send: Send) -> None:
        async def observe(message: Message) -> None:
            if message["type"] == "http.response.start" and message["status"] == 200:
                with owner.connect() as db:
                    observed.append(
                        bool(
                            db.execute(
                                text("""select exists(select 1 from app_private.saved_events
                        where user_id=:uid and event_id=:eid)"""),
                                {"uid": users["alice"]["id"], "eid": event_id},
                            ).scalar_one()
                        )
                    )
            await send(message)

        await client.app(scope, receive, observe)

    browser = TestClient(application)
    result = browser.put(f"/v1/me/saved-events/{event_id}", headers=users["alice"]["headers"], json={})
    assert result.status_code == 200, result.text
    assert observed == [True]


def test_commit_failure_does_not_send_a_success_response(
    client: TestClient, owner: Engine, users: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    def failed_commit(_session: Session) -> None:
        raise RuntimeError("Simulated commit failure")

    monkeypatch.setattr(Session, "commit", failed_commit)
    browser = TestClient(client.app, raise_server_exceptions=False)
    event_id = str(fixture_id("event", "beach"))
    result = browser.put(f"/v1/me/saved-events/{event_id}", headers=users["alice"]["headers"], json={})
    assert result.status_code == 500
    with owner.connect() as db:
        assert not db.execute(
            text("""select exists(select 1 from app_private.saved_events
            where user_id=:uid and event_id=:eid)"""),
            {"uid": users["alice"]["id"], "eid": event_id},
        ).scalar_one()
