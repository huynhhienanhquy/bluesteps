from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.postgres


def sort(client: TestClient, headers: dict[str, str], weight: str | None = None, key: str | None = None) -> Any:
    item = client.get("/v1/waste-items").json()["items"][0]["id"]
    return client.post(
        "/v1/sorting-actions",
        headers={**headers, "Idempotency-Key": key or str(uuid4())},
        json={"source": "manual", "itemId": item, **({"reportedWeightKg": weight} if weight is not None else {})},
    )


def test_empty_insights_are_zero_without_invented_weights(client: TestClient, users: dict[str, Any]) -> None:
    result = client.get("/v1/me/insights", headers=users["alice"]["headers"])
    assert result.status_code == 200, result.text
    data = result.json()
    assert data["sortingActions"] == data["periodActions"] == data["weighedActions"] == 0
    assert data["reportedWeightKg"] is None and data["verifiedKg"] is None
    assert len(data["frequency"]) == 7 and all(day["actions"] == 0 for day in data["frequency"])
    assert data["categories"] == data["materials"] == data["targets"] == []
    assert client.get("/v1/me/insights?days=1000", headers=users["alice"]["headers"]).status_code == 422


def test_weighted_actions_replay_and_owner_period_breakdowns(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    key = str(uuid4())
    first = sort(client, alice, "1.250", key)
    assert first.status_code == 201, first.text
    assert sort(client, alice, "1.250", key).json()["actionId"] == first.json()["actionId"]
    assert sort(client, alice).status_code == 201
    assert sort(client, bob, "2.000").status_code == 201
    data = client.get("/v1/me/insights", headers=alice).json()
    assert data["sortingActions"] == data["periodActions"] == 2
    assert data["reportedWeightKg"] == "1.250" and data["weighedActions"] == 1 and data["verifiedKg"] is None
    assert sum(day["actions"] for day in data["frequency"]) == 2
    assert (
        sum(item["actions"] for item in data["categories"]) == sum(item["actions"] for item in data["materials"]) == 2
    )
    past = client.get("/v1/me/insights?end=2020-01-01", headers=alice).json()
    assert past["periodActions"] == 0 and past["sortingActions"] == 2 and past["reportedWeightKg"] is None
    assert sort(client, alice, "-1").status_code == 422
    assert sort(client, alice, "1.0001").status_code == 422


def test_frequency_uses_member_timezone_at_date_boundaries(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    alice = users["alice"]["headers"]
    action = sort(client, alice).json()["actionId"]
    with owner.begin() as db:
        db.execute(
            text("update app_private.sorting_actions set created_at='2026-11-01T18:30:00Z' where id=:id"),
            {"id": action},
        )
    data = client.get("/v1/me/insights?end=2026-11-02", headers=alice).json()
    assert data["frequency"][-1]["date"] == "2026-11-02" and data["frequency"][-1]["actions"] == 1
    assert client.get("/v1/me/insights?end=2026-11-01", headers=alice).json()["periodActions"] == 0
    prefs = client.get("/v1/me/preferences", headers=alice).json()
    assert (
        client.patch(
            "/v1/me/preferences",
            headers=alice,
            json={**prefs, "timezone": "America/New_York", "expectedVersion": prefs["version"]},
        ).status_code
        == 200
    )
    data = client.get("/v1/me/insights?end=2026-11-01", headers=alice).json()
    assert data["frequency"][-1]["actions"] == 1


def test_targets_track_actual_progress_with_version_and_ownership(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    today = datetime.now(UTC).date()
    body = {
        "title": "Phân loại nhựa",
        "metric": "reported_weight_kg",
        "target": "1.250",
        "startsOn": str(today - timedelta(days=1)),
        "endsOn": str(today + timedelta(days=7)),
    }
    key = {**alice, "Idempotency-Key": str(uuid4())}
    first = client.post("/v1/me/targets", headers=key, json=body)
    assert first.status_code == 201, first.text
    id = first.json()["id"]
    assert client.post("/v1/me/targets", headers=key, json=body).json()["id"] == id
    assert client.get("/v1/me/targets", headers=bob).json() == []
    assert sort(client, alice, "1.250").status_code == 201
    goal = client.get("/v1/me/targets", headers=alice).json()[0]
    assert goal["progress"] == "1.250" and goal["completed"] is True
    update = {**body, "target": "2", "expectedVersion": 1}
    assert client.put(f"/v1/me/targets/{id}", headers=bob, json=update).status_code == 404
    changed = client.put(f"/v1/me/targets/{id}", headers=alice, json=update)
    assert changed.status_code == 200 and changed.json()["version"] == 2 and changed.json()["completed"] is False
    assert client.put(f"/v1/me/targets/{id}", headers=alice, json=update).status_code == 409
    assert client.delete(f"/v1/me/targets/{id}", headers=bob).status_code == 404
    assert client.delete(f"/v1/me/targets/{id}", headers=alice).status_code == 204
    assert client.get("/v1/me/targets", headers=alice).json() == []
    invalid = {**body, "metric": "sorting_actions", "target": "1.5"}
    assert (
        client.post("/v1/me/targets", headers={**alice, "Idempotency-Key": str(uuid4())}, json=invalid).status_code
        == 422
    )


def test_leaderboard_is_opt_in_paged_and_respects_blocks(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    assert client.get("/v1/me/leaderboard", headers=alice).json()["items"] == []
    for headers in [alice, bob]:
        response = client.put(
            "/v1/me/leaderboard-preference", headers=headers, json={"optedIn": True, "expectedVersion": 0}
        )
        assert response.status_code == 200, response.text
    assert sort(client, alice).status_code == 201
    board = client.get("/v1/me/leaderboard?limit=1", headers=alice).json()
    assert board["items"][0]["id"] == users["alice"]["id"] and board["items"][0]["points"] == "5"
    assert board["nextCursor"] == "1"
    assert client.get("/v1/me/leaderboard?cursor=1", headers=alice).json()["items"][0]["id"] == users["bob"]["id"]
    assert client.get("/v1/me/achievement-summary", headers=alice).json()["rank"] == 1
    assert (
        client.put(
            "/v1/me/leaderboard-preference", headers=alice, json={"optedIn": False, "expectedVersion": 0}
        ).status_code
        == 409
    )
    assert client.put(f"/v1/me/blocks/{users['bob']['id']}", headers=alice).status_code == 204
    assert len(client.get("/v1/me/leaderboard", headers=alice).json()["items"]) == 1
    assert client.get("/v1/me/leaderboard?cursor=999999999999999999999", headers=alice).status_code == 400


def test_milestones_have_recorded_evidence_and_do_not_copy_other_members(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    for _ in range(10):
        assert sort(client, alice).status_code == 201
    badges = {item["code"]: item for item in client.get("/v1/me/badges", headers=alice).json()}
    assert badges["first-sort"]["earned"] and badges["first-sort"]["earnedAt"]
    assert badges["ten-sorts"]["progress"] == 10 and badges["ten-sorts"]["earnedAt"]
    assert not badges["first-event"]["earned"] and badges["first-event"]["earnedAt"] is None
    assert all(not item["earned"] for item in client.get("/v1/me/badges", headers=bob).json())
