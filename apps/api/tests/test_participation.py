import base64
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.postgres


def event(owner: Engine, capacity: int = 3) -> str:
    id = str(uuid4())
    with owner.begin() as db:
        db.execute(
            text("""insert into app_private.events
            (id,code,title,description,location,topic,starts_at,ends_at,capacity,published,details)
            values (:id,:code,'Hoạt động tham gia','Giới thiệu','Hà Nội','Phân loại',:starts,:ends,:capacity,true,
            cast(:details as jsonb))"""),
            {
                "id": id,
                "code": "participation-" + id,
                "starts": datetime.now(UTC) + timedelta(hours=1),
                "ends": datetime.now(UTC) + timedelta(hours=3),
                "capacity": capacity,
                "details": json.dumps({"volunteerRoles": ["Hướng dẫn phân loại"]}),
            },
        )
    return id


def payload(count: int = 1) -> dict[str, Any]:
    return {
        "fullName": "Người tham gia",
        "attendeeCount": count,
        "volunteerRole": "Hướng dẫn phân loại",
        "phone": "0901234567",
        "email": "attendee@example.com",
        "safetyConsent": True,
        "contactConsent": True,
    }


def register(client: TestClient, id: str, user: Any, body: dict[str, Any] | None = None, key: str | None = None) -> Any:
    return client.post(
        f"/v1/events/{id}/registrations",
        headers={**user["headers"], "Idempotency-Key": key or str(uuid4())},
        json=body or payload(),
    )


def test_registration_validation_idempotency_ownership_and_capacity(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = event(owner, 2)
    invalid = payload()
    invalid["safetyConsent"] = False
    assert register(client, id, users["alice"], invalid).status_code == 422
    invalid = payload()
    invalid["volunteerRole"] = "Vai trò khác"
    assert register(client, id, users["alice"], invalid).status_code == 422
    key = str(uuid4())
    first = register(client, id, users["alice"], payload(2), key)
    assert first.status_code == 201, first.text
    assert first.json()["attendeeCount"] == 2
    assert register(client, id, users["alice"], payload(2), key).json() == first.json()
    assert register(client, id, users["alice"], payload(2)).json()["id"] == first.json()["id"]
    assert register(client, id, users["alice"], payload(1), key).status_code == 409
    assert register(client, id, users["bob"]).json()["error"]["code"] == "EVENT_FULL"
    assert client.get(f"/v1/events/{id}/ticket", headers=users["bob"]["headers"]).status_code == 404
    with owner.connect() as db:
        assert (
            db.execute(text("select reserved_count from app_private.events where id=:id"), {"id": id}).scalar_one() == 2
        )


def test_cancel_releases_capacity_and_invalidates_the_old_ticket(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = event(owner, 1)
    assert register(client, id, users["alice"]).status_code == 201
    ticket = client.get(f"/v1/events/{id}/ticket", headers=users["alice"]["headers"]).json()
    assert base64.b64decode(ticket["qrImage"].split(",", 1)[1]).startswith(b"\x89PNG\r\n\x1a\n")
    assert client.delete(f"/v1/events/{id}/registration", headers=users["bob"]["headers"]).status_code == 404
    assert client.delete(f"/v1/events/{id}/registration", headers=users["alice"]["headers"]).status_code == 204
    assert client.get(f"/v1/events/{id}/ticket", headers=users["alice"]["headers"]).status_code == 409
    assert register(client, id, users["alice"]).status_code == 201
    new_ticket = client.get(f"/v1/events/{id}/ticket", headers=users["alice"]["headers"]).json()
    assert ticket["qrPayload"] != new_ticket["qrPayload"]
    assert (
        client.post(
            "/v1/event-tickets/check-in", json={"ticket": ticket["qrPayload"]}, headers=users["alice"]["headers"]
        ).status_code
        == 422
    )
    with owner.connect() as db:
        assert (
            db.execute(text("select reserved_count from app_private.events where id=:id"), {"id": id}).scalar_one() == 1
        )


def test_check_in_requires_organizer_and_feedback_requires_attendance_and_end(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = event(owner)
    assert register(client, id, users["alice"]).status_code == 201
    ticket = client.get(f"/v1/events/{id}/ticket", headers=users["alice"]["headers"]).json()["qrPayload"]
    assert (
        client.post(
            "/v1/event-tickets/check-in", json={"ticket": ticket}, headers=users["alice"]["headers"]
        ).status_code
        == 403
    )
    with owner.begin() as db:
        db.execute(
            text("insert into app_private.event_organizers values (:eid,:uid)"), {"eid": id, "uid": users["bob"]["id"]}
        )
    tampered = ticket[:-1] + ("0" if ticket[-1] != "0" else "1")
    assert (
        client.post(
            "/v1/event-tickets/check-in", json={"ticket": tampered}, headers=users["bob"]["headers"]
        ).status_code
        == 422
    )
    response = client.post("/v1/event-tickets/check-in", json={"ticket": ticket}, headers=users["bob"]["headers"])
    assert response.status_code == 200, response.text
    assert response.json()["checkedInAt"]
    repeated = client.post("/v1/event-tickets/check-in", json={"ticket": ticket}, headers=users["bob"]["headers"])
    assert repeated.json()["checkedInAt"] == response.json()["checkedInAt"]
    assert client.delete(f"/v1/events/{id}/registration", headers=users["alice"]["headers"]).status_code == 409
    review = {"rating": 4, "tags": ["well_organized"], "body": "Hữu ích"}
    assert client.put(f"/v1/events/{id}/feedback", json=review, headers=users["alice"]["headers"]).status_code == 409
    with owner.begin() as db:
        db.execute(
            text(
                """update app_private.events set starts_at=now()-interval '3 hours',
                ends_at=now()-interval '1 hour' where id=:id"""
            ),
            {"id": id},
        )
    assert client.put(f"/v1/events/{id}/feedback", json=review, headers=users["bob"]["headers"]).status_code == 409
    first = client.put(f"/v1/events/{id}/feedback", json=review, headers=users["alice"]["headers"])
    assert first.status_code == 200, first.text
    review["rating"] = 5
    second = client.put(f"/v1/events/{id}/feedback", json=review, headers=users["alice"]["headers"])
    assert second.json()["id"] == first.json()["id"]
    summary = client.get(f"/v1/events/{id}/summary", headers=users["alice"]["headers"]).json()
    assert summary["canReview"] is True and summary["checkedInCount"] == 1
    assert summary["averageRating"] == 5 and summary["feedback"]["rating"] == 5


def test_last_seat_is_not_oversold_under_concurrent_requests(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = event(owner, 1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda name: register(client, id, users[name]), ["alice", "bob"]))
    assert sorted(result.status_code for result in results) == [201, 409]
    with owner.connect() as db:
        assert (
            db.execute(text("select reserved_count from app_private.events where id=:id"), {"id": id}).scalar_one() == 1
        )
        assert (
            db.execute(
                text("select count(*) from app_private.event_registrations where event_id=:id"), {"id": id}
            ).scalar_one()
            == 1
        )
