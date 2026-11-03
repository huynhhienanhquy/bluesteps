from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.reminders import schedule_time
from bluesteps_api.worker import process_one

from .test_participation import event

pytestmark = pytest.mark.postgres


def settings_body(event_id: str, version: int = 0) -> dict[str, Any]:
    return {
        "enabled": True,
        "eventIds": [event_id],
        "offsets": [10],
        "inApp": True,
        "email": False,
        "sound": True,
        "quietStart": "00:00",
        "quietEnd": "00:00",
        "timezone": "Asia/Bangkok",
        "expectedVersion": version,
    }


def test_reminder_ownership_versions_scheduling_and_cancel(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = event(owner)
    body = settings_body(id)
    assert client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=body).status_code == 422
    client.put(f"/v1/me/saved-events/{id}", headers=users["alice"]["headers"], json={})
    response = client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["eventIds"] == [id] and response.json()["nextReminder"]
    assert client.get("/v1/me/event-reminders", headers=users["bob"]["headers"]).json()["eventIds"] == []
    assert client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=body).status_code == 409
    body.update(enabled=False, expectedVersion=1)
    assert client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=body).status_code == 200
    with owner.connect() as db:
        assert (
            db.execute(text("select count(*) from app_private.event_reminder_jobs where status='pending'")).scalar_one()
            == 0
        )


def test_due_reminder_is_dispatched_once_and_unsaved_events_are_cancelled(
    client: TestClient, owner: Engine, database: tuple[Engine, Engine, str], users: dict[str, Any]
) -> None:
    id = event(owner)
    client.put(f"/v1/me/saved-events/{id}", headers=users["alice"]["headers"], json={})
    response = client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=settings_body(id))
    assert response.status_code == 200, response.text
    with owner.begin() as db:
        db.execute(text("update app_private.event_reminder_jobs set scheduled_for=now()-interval '1 minute'"))
    assert process_one(database[1], client.app.state.settings)
    assert process_one(database[1], client.app.state.settings) is False
    inbox = client.get("/v1/me/notifications", headers=users["alice"]["headers"]).json()["items"]
    assert len(inbox) == 1 and inbox[0]["title"] == "Nhắc lịch hoạt động"
    # A newer schedule becomes ineligible when the saved/registered relationship is removed.
    body = settings_body(id, 1)
    assert client.put("/v1/me/event-reminders", headers=users["alice"]["headers"], json=body).status_code == 200
    client.delete(f"/v1/me/saved-events/{id}", headers=users["alice"]["headers"])
    with owner.begin() as db:
        db.execute(
            text(
                """update app_private.event_reminder_jobs
                set scheduled_for=now()-interval '1 minute' where status='pending'"""
            )
        )
    assert process_one(database[1], client.app.state.settings) is False
    assert len(client.get("/v1/me/notifications", headers=users["alice"]["headers"]).json()["items"]) == 1


def test_quiet_hours_shift_reminders_without_changing_the_event_time() -> None:
    starts = datetime(2026, 11, 3, 1, 0, tzinfo=UTC)  # 08:00 Bangkok
    due = schedule_time(starts, 180, "Asia/Bangkok", "22:00", "07:00")
    assert due == datetime(2026, 11, 3, 0, 0, tzinfo=UTC)
    assert due < starts
    assert schedule_time(starts, 60, "Asia/Bangkok", "22:00", "07:00") == starts - timedelta(hours=1)
