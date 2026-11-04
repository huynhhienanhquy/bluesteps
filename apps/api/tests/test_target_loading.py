from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event, text
from sqlalchemy.orm import Session

from bluesteps_api.insights import targets
from bluesteps_api.security import Actor

from .test_participation import event as create_event

pytestmark = pytest.mark.postgres


def test_twenty_targets_load_in_two_queries_with_owned_progress_and_timezone_boundaries(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"]["id"], users["bob"]["id"]
    waste_id = client.get("/v1/waste-items").json()["items"][0]["id"]
    checkins = [
        (alice, "2026-11-01T04:00:00Z", "registered"),
        (alice, "2026-11-01T06:00:00Z", "cancelled"),
        (alice, "2026-11-02T04:59:59Z", "registered"),
        (alice, "2026-11-02T05:00:00Z", "registered"),
        (bob, "2026-11-01T07:00:00Z", "registered"),
    ]
    event_ids = [create_event(owner) for _ in checkins]
    expected: dict[str, tuple[str, bool]] = {}
    with owner.begin() as db:
        for uid, created, weight in [
            (alice, "2026-10-31T23:59:59Z", "9"),
            (alice, "2026-11-01T00:00:00Z", "1"),
            (alice, "2026-11-01T03:59:59Z", "2"),
            (alice, "2026-11-01T04:00:00Z", "3"),
            (alice, "2026-11-01T06:00:00Z", None),
            (alice, "2026-11-02T04:59:59Z", "4"),
            (alice, "2026-11-02T05:00:00Z", "5"),
            (bob, "2026-11-01T07:00:00Z", "99"),
        ]:
            db.execute(
                text("""insert into app_private.sorting_actions
                (user_id,item_id,source,evidence_status,reported_weight_kg,created_at)
                values (:uid,:item,'manual','self_reported',:weight,:created)"""),
                {"uid": uid, "item": waste_id, "weight": weight, "created": datetime.fromisoformat(created)},
            )
        for event_id, (uid, checked, status) in zip(event_ids, checkins, strict=True):
            db.execute(
                text("""insert into app_private.event_registrations
                (user_id,event_id,full_name,attendee_count,volunteer_role,phone,email,
                 safety_consent,contact_consent,status,checked_in_at)
                values (:uid,:event,'Member',1,'Volunteer','0901234567','member@example.com',
                  true,true,:status,:checked)"""),
                {"uid": uid, "event": event_id, "status": status, "checked": datetime.fromisoformat(checked)},
            )
        variants = [
            ("sorting_actions", "UTC", "4", True),
            ("sorting_actions", "America/New_York", "3", True),
            ("reported_weight_kg", "UTC", "6.000", True),
            ("reported_weight_kg", "America/New_York", "7.000", True),
            ("event_checkins", "UTC", "1", False),
            ("event_checkins", "America/New_York", "2", True),
        ]
        for index in range(22):
            metric, timezone, progress, completed = variants[index % len(variants)]
            id = str(uuid4())
            db.execute(
                text("""insert into app_private.personal_targets
                (id,user_id,title,metric,target,starts_on,ends_on,timezone,archived_at,created_at)
                values (:id,:uid,:title,:metric,2,'2026-11-01','2026-11-01',:timezone,:archived,:created)"""),
                {
                    "id": id,
                    "uid": bob if index == 21 else alice,
                    "title": f"Target {index}",
                    "metric": metric,
                    "timezone": timezone,
                    "archived": datetime.now(UTC) if index == 20 else None,
                    "created": datetime(2026, 10, 1, 0, index, tzinfo=UTC),
                },
            )
            if index < 20:
                expected[id] = progress, completed

    statements: list[str] = []

    def track_query(
        connection: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool
    ) -> None:
        statements.append(statement)

    event.listen(owner, "before_cursor_execute", track_query)
    try:
        with Session(owner) as session:
            result = targets(session, Actor(UUID(alice), uuid4()))
    finally:
        event.remove(owner, "before_cursor_execute", track_query)

    assert len(statements) == 2
    assert len(result) == 20
    assert [item["title"] for item in result] == [f"Target {index}" for index in reversed(range(20))]
    assert {item["id"]: (item["progress"], item["completed"]) for item in result} == expected
    assert all("userId" not in item and "archivedAt" not in item for item in result)

    response = client.get("/v1/me/targets", headers=users["alice"]["headers"])
    assert response.status_code == 200, response.text
    assert {item["id"]: (item["progress"], item["completed"]) for item in response.json()} == expected
