import json
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.notifications import dispatch_daily_reminder

from .test_participation import event
from .test_reminders import settings_body

pytestmark = pytest.mark.postgres


def test_device_schedule_is_owned_and_respects_relationship_channel_and_claim(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    headers = users["alice"]["headers"]
    event_id = event(owner)
    assert client.put(f"/v1/me/saved-events/{event_id}", headers=headers, json={}).status_code == 200
    assert client.put("/v1/me/event-reminders", headers=headers, json=settings_body(event_id)).status_code == 200
    schedule = client.get("/v1/me/device-reminders", headers=headers)
    assert schedule.status_code == 200, schedule.text
    assert len(schedule.json()) == 1 and schedule.json()[0]["targetPath"] == f"/events/{event_id}"
    assert client.get("/v1/me/device-reminders", headers=users["bob"]["headers"]).json() == []
    preference = client.get("/v1/me/notification-preferences", headers=headers).json()
    updated = client.put(
        "/v1/me/notification-preferences",
        headers=headers,
        json={**preference, "expectedVersion": 0, "activity": False, "dailyReminder": True},
    )
    assert updated.status_code == 200, updated.text
    daily = client.get("/v1/me/device-reminders", headers=headers).json()
    assert 6 <= len(daily) <= 7 and all(item["id"].startswith("daily:") for item in daily)
    preference = client.get("/v1/me/preferences", headers=headers).json()
    assert (
        client.patch(
            "/v1/me/preferences",
            headers=headers,
            json={**preference, "sound": False, "expectedVersion": preference["version"]},
        ).status_code
        == 200
    )
    assert all(not item["sound"] for item in client.get("/v1/me/device-reminders", headers=headers).json())
    client.delete(f"/v1/me/saved-events/{event_id}", headers=headers)
    assert all(
        item["id"].startswith("daily:") for item in client.get("/v1/me/device-reminders", headers=headers).json()
    )


def test_notification_filter_detail_ownership_and_read_state(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    ids = [str(uuid4()) for _ in range(3)]
    with owner.begin() as db:
        for index, id in enumerate(ids):
            db.execute(
                text("""insert into app_private.notifications(id,user_id,title,body,category,target_path,details)
                values (:id,:uid,:title,'Nội dung',:category,'/history',cast(:details as jsonb))"""),
                {
                    "id": id,
                    "uid": users["alice"]["id"],
                    "title": f"Thông báo {index}",
                    "category": "activity" if index == 0 else "offers",
                    "details": json.dumps({"points": "5"}),
                },
            )
    headers = users["alice"]["headers"]
    summary = client.get("/v1/me/notifications/summary", headers=headers).json()
    assert summary == {"total": 3, "unread": 3, "activity": 1}
    assert len(client.get("/v1/me/notifications?category=offers", headers=headers).json()["items"]) == 2
    item = client.get(f"/v1/me/notifications/{ids[0]}", headers=headers).json()
    assert item["targetPath"] == "/history" and item["details"]["points"] == "5"
    assert client.get(f"/v1/me/notifications/{ids[0]}", headers=users["bob"]["headers"]).status_code == 404
    assert client.patch(f"/v1/me/notifications/{ids[0]}", headers=headers, json={"read": True}).status_code == 204
    assert len(client.get("/v1/me/notifications?unread=true", headers=headers).json()["items"]) == 2
    assert client.get("/v1/me/notifications?category=invalid", headers=headers).status_code == 422


def test_preferences_persist_and_reject_stale_or_invalid_timezone(client: TestClient, users: dict[str, Any]) -> None:
    headers = users["alice"]["headers"]
    defaults = client.get("/v1/me/notification-preferences", headers=headers).json()
    body = {**defaults, "community": False, "expectedVersion": defaults["version"]}
    result = client.put("/v1/me/notification-preferences", headers=headers, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["version"] == 1 and result.json()["community"] is False
    assert client.get("/v1/me/notification-preferences", headers=headers).json()["community"] is False
    assert client.get("/v1/me/notification-preferences", headers=users["bob"]["headers"]).json()["community"] is True
    assert client.put("/v1/me/notification-preferences", headers=headers, json=body).status_code == 409
    body.update(expectedVersion=1, timezone="Unknown/Nowhere")
    assert client.put("/v1/me/notification-preferences", headers=headers, json=body).status_code == 422


def test_daily_reminder_is_once_per_local_day_and_skips_claimed_users(
    client: TestClient, owner: Engine, database: tuple[Engine, Engine, str], users: dict[str, Any]
) -> None:
    for name in ["alice", "bob"]:
        response = client.put(
            "/v1/me/notification-preferences",
            headers=users[name]["headers"],
            json={"expectedVersion": 0, "dailyReminder": True, "dailyTime": "00:00", "timezone": "UTC"},
        )
        assert response.status_code == 200, response.text
    assert (
        client.post(
            "/v1/me/daily-claims", headers={**users["bob"]["headers"], "Idempotency-Key": str(uuid4())}, json={}
        ).status_code
        == 200
    )
    assert dispatch_daily_reminder(database[1]) is True
    assert dispatch_daily_reminder(database[1]) is False
    inbox = client.get("/v1/me/notifications", headers=users["alice"]["headers"]).json()["items"]
    assert len(inbox) == 1 and inbox[0]["targetPath"] == "/rewards/catalog"
    assert client.get("/v1/me/notifications", headers=users["bob"]["headers"]).json()["items"] == []
