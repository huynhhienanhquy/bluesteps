from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.postgres


def new_point(owner: Engine, name: str, **values: Any) -> str:
    id = str(uuid4())
    with owner.begin() as db:
        db.execute(
            text("""insert into app_private.collection_points(id,code,name,address,latitude,longitude,published,
            always_open,staffed,capacity_state,status_observed_at,status_expires_at)
            values (:id,:code,:name,'Test location',:lat,:lng,:published,:always,:staffed,
              :capacity,:observed,:expires)"""),
            {
                "id": id,
                "code": id,
                "name": name,
                "lat": values.get("lat", 10.77),
                "lng": 106.7,
                "published": values.get("published", True),
                "always": values.get("always"),
                "staffed": values.get("staffed"),
                "capacity": values.get("capacity", "unknown"),
                "observed": values.get("observed"),
                "expires": values.get("expires"),
            },
        )
    return id


@pytest.mark.parametrize("website", [None, "https://example.org/collection"])
def test_collection_list_and_detail_include_optional_website(
    client: TestClient, owner: Engine, website: str | None
) -> None:
    id = new_point(owner, "Website regression")
    with owner.begin() as db:
        db.execute(
            text("update app_private.collection_points set website_url=:website where id=:id"),
            {"website": website, "id": id},
        )
    result = client.get("/v1/collection-points?q=Website regression&match_mode=all&limit=20")
    assert result.status_code == 200, result.text
    assert len(result.json()["items"]) == 1
    assert result.json()["items"][0]["websiteUrl"] == website
    detail = client.get(f"/v1/collection-points/{id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["websiteUrl"] == website


def test_operational_filters_exclude_unknown_expired_unpublished_and_filter_before_pagination(
    client: TestClient, owner: Engine
) -> None:
    now = datetime.now(UTC)
    known = new_point(
        owner,
        "Facts available",
        always=True,
        staffed=True,
        capacity="available",
        observed=now - timedelta(minutes=1),
        expires=now + timedelta(minutes=15),
    )
    new_point(owner, "Facts unknown")
    expired = new_point(
        owner,
        "Facts expired",
        always=True,
        staffed=True,
        capacity="available",
        observed=now - timedelta(hours=2),
        expires=now - timedelta(hours=1),
    )
    new_point(
        owner,
        "Facts private",
        published=False,
        always=True,
        staffed=True,
        capacity="available",
        observed=now,
        expires=now + timedelta(minutes=15),
    )
    query = "/v1/collection-points?q=Facts&only_open=true&open_24h=true&staffed_only=true&available_only=true&limit=1"
    result = client.get(query)
    assert result.status_code == 200, result.text
    assert [p["id"] for p in result.json()["items"]] == [known] and result.json()["nextCursor"] is None
    assert client.get(f"/v1/collection-points/{expired}").json()["capacityState"] == "unknown"
    rows = client.get("/v1/collection-points?q=Facts").json()["items"]
    assert len(rows) == 3 and next(p for p in rows if p["name"] == "Facts unknown")["openNow"] is None


def test_temporary_closure_overrides_regular_hours(client: TestClient, owner: Engine) -> None:
    now = datetime.now(UTC)
    id = new_point(
        owner, "Closed temporarily", always=True, capacity="closed", observed=now, expires=now + timedelta(hours=1)
    )
    assert client.get(f"/v1/collection-points/{id}").json()["openNow"] is False
    assert client.get("/v1/collection-points?q=Closed temporarily&only_open=true").json()["items"] == []


def test_comparison_preserves_requested_order_and_recommends_only_verified_open_capacity(
    client: TestClient, owner: Engine
) -> None:
    now = datetime.now(UTC)
    near = new_point(
        owner, "Compare near", always=True, capacity="available", observed=now, expires=now + timedelta(hours=1)
    )
    far = new_point(
        owner,
        "Compare far",
        lat=10.87,
        always=True,
        capacity="available",
        observed=now,
        expires=now + timedelta(hours=1),
    )
    path = f"/v1/collection-points/compare?ids={far}&ids={near}"
    response = client.get(path + "&lat=10.77&lng=106.7")
    assert response.status_code == 200, response.text
    result = response.json()
    assert [p["id"] for p in result["items"]] == [far, near] and result["recommendedId"] == near
    assert client.get(path).json()["recommendedId"] is None
    assert client.get(f"/v1/collection-points/compare?ids={near}&ids={near}").status_code == 422


def test_gps_radius_uses_geography_and_returns_actual_distance(client: TestClient, owner: Engine) -> None:
    near = new_point(owner, "Distance near", lat=10.77)
    new_point(owner, "Distance far", lat=11.77)
    result = client.get("/v1/collection-points?q=Distance&lat=10.77&lng=106.7&radius_m=1000").json()
    assert [p["id"] for p in result["items"]] == [near] and result["items"][0]["distanceM"] == 0
    assert client.get("/v1/collection-points?lat=10.77").status_code == 422
    assert client.get("/v1/collection-points?lat=91&lng=0").status_code == 422


def test_opening_hours_cover_local_overnight_and_week_boundaries(owner: Engine) -> None:
    id = new_point(owner, "Hours test")
    with owner.begin() as db:
        db.execute(
            text(
                "update app_private.collection_points set schedule_known=true,timezone='Asia/Ho_Chi_Minh' where id=:id"
            ),
            {"id": id},
        )
        db.execute(
            text("insert into app_private.point_opening_hours values (:id,0,1320,1560),(:id,6,1320,1560)"), {"id": id}
        )
        for at, expected in [
            ("2026-11-02T16:00:00Z", True),
            ("2026-11-02T18:00:00Z", True),
            ("2026-11-02T19:00:00Z", False),
            ("2026-11-01T18:00:00Z", True),
            ("2026-11-02T14:00:00Z", False),
        ]:
            assert (
                db.execute(
                    text("select app_private.point_open_at(:id,cast(:at as timestamptz))"),
                    {"id": id, "code": id, "at": at},
                ).scalar_one()
                is expected
            )


def test_operational_updates_need_moderation_version_expiry_and_audit(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = new_point(owner, "Updated point")
    body = {
        "expectedVersion": 1,
        "reason": "Operator confirmed hours and capacity",
        "alwaysOpen": True,
        "staffed": True,
        "capacityState": "available",
        "statusObservedAt": datetime.now(UTC).isoformat(),
        "statusExpiresAt": (datetime.now(UTC) + timedelta(minutes=15)).isoformat(),
    }
    path = f"/v1/admin/collection-points/{id}/operations"
    assert client.put(path, headers=users["alice"]["headers"], json=body).status_code == 403
    with owner.begin() as db:
        db.execute(text("insert into app_private.user_roles values (:id,'moderator')"), {"id": users["bob"]["id"]})
    response = client.put(path, headers=users["bob"]["headers"], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["openNow"] is True and response.json()["capacityState"] == "available"
    assert client.put(path, headers=users["bob"]["headers"], json=body).status_code == 409
    assert (
        client.put(
            path,
            headers=users["bob"]["headers"],
            json={**body, "expectedVersion": 2, "statusExpiresAt": (datetime.now(UTC) + timedelta(days=2)).isoformat()},
        ).status_code
        == 422
    )
    with owner.connect() as db:
        assert (
            db.execute(text("select count(*) from app_private.audit_logs where target_id=:id"), {"id": id}).scalar_one()
            == 1
        )


def test_active_stop_replacement_preserves_other_stop_ids_and_rejects_stale_foreign_or_visited(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    a, b, c = [new_point(owner, name) for name in ("Route A", "Route B", "Route C")]
    headers = {**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
    route = client.post("/v1/routes", headers=headers, json={"stopIds": [a, b]}).json()
    id = route["id"]
    active = client.post(f"/v1/routes/{id}/start", headers=headers).json()
    stop = active["stops"][0]["id"]
    path = f"/v1/routes/{id}/stops/{stop}/replacement"
    body = {"pointId": c, "expectedVersion": active["version"]}
    assert client.put(path, headers=users["bob"]["headers"], json=body).status_code == 404
    result = client.put(path, headers=headers, json=body)
    assert result.status_code == 200, result.text
    updated = result.json()
    assert updated["stops"][0]["id"] != stop and updated["stops"][1]["id"] == active["stops"][1]["id"]
    assert [s["pointId"] for s in updated["stops"]] == [c, b] and updated["status"] == "active"
    assert client.put(path, headers=headers, json=body).status_code == 409
    assert client.post(f"/v1/routes/{id}/stops/{stop}/arrive", headers=headers).status_code == 404
    stop = updated["stops"][0]["id"]
    path = f"/v1/routes/{id}/stops/{stop}/replacement"
    client.post(f"/v1/routes/{id}/stops/{stop}/arrive", headers=headers)
    assert (
        client.put(path, headers=headers, json={"pointId": a, "expectedVersion": updated["version"]}).status_code == 409
    )
