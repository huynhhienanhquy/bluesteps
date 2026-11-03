from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.config import Settings
from bluesteps_api.seed import fixture_id
from bluesteps_api.worker import process_one

from .test_composer import picture, start, upload

pytestmark = pytest.mark.postgres


def headers(user: dict[str, Any]) -> dict[str, str]:
    return {**user["headers"], "Idempotency-Key": str(uuid4())}


def draft(client: TestClient, user: dict[str, Any], photos: list[str] | None = None) -> dict[str, Any]:
    result = client.post(
        "/v1/point-proposals",
        headers=headers(user),
        json={
            "name": "Điểm cộng đồng",
            "address": "Lối vào khu dân cư",
            "latitude": 16.07,
            "longitude": 108.22,
            "materialIds": [str(fixture_id("material", "Nhựa"))],
            "hours": "Thứ Bảy 08:00–17:00",
            "mediaIds": photos or [],
        },
    )
    assert result.status_code == 201, result.text
    return dict(result.json())


def moderator(owner: Engine, user: dict[str, Any]) -> None:
    with owner.begin() as db:
        db.execute(
            text("insert into app_private.user_roles(user_id,role) values (:uid,'moderator')"), {"uid": user["id"]}
        )


def test_proposal_draft_reload_edit_requires_owner_version_and_image_evidence(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"], users["bob"]
    asset = upload(client, alice)
    proposal = draft(client, alice, [asset["id"]])
    path = "/v1/point-proposals/" + proposal["id"]
    assert proposal["media"][0]["id"] == asset["id"] and proposal["hours"] == "Thứ Bảy 08:00–17:00"
    assert client.get(path, headers=alice["headers"]).json() == proposal
    assert client.get(path, headers=bob["headers"]).status_code == 404
    assert client.get("/v1/me/point-proposals", headers=bob["headers"]).json()["items"] == []
    body = {k: proposal[k] for k in ["name", "address", "latitude", "longitude", "materialIds", "hours", "mediaIds"]}
    body.update(name="Điểm đã chỉnh ghim", latitude=16.08, expectedVersion=1)
    assert client.put(path, headers=bob["headers"], json=body).status_code == 404
    updated = client.put(path, headers=alice["headers"], json=body)
    assert updated.status_code == 200, updated.text
    assert updated.json()["version"] == 2 and updated.json()["latitude"] == 16.08
    assert client.put(path, headers=alice["headers"], json=body).status_code == 409
    assert client.delete("/v1/media-assets/" + asset["id"], headers=alice["headers"]).status_code == 409
    assert client.get("/v1/me/media-assets", headers=alice["headers"]).json()["items"][0]["inUse"]
    assert client.get("/v1/me/point-proposals", headers=alice["headers"]).json()["items"][0]["version"] == 2


def test_invalid_evidence_rolls_back_and_submit_requires_photo_ack(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"], users["bob"]
    proposal = draft(client, alice)
    path = "/v1/point-proposals/" + proposal["id"]
    assert (
        client.post(
            path + "/submit", headers=headers(alice), json={"expectedVersion": 1, "acknowledged": True}
        ).status_code
        == 422
    )
    assert (
        client.post(
            path + "/submit", headers=headers(alice), json={"expectedVersion": 1, "acknowledged": False}
        ).status_code
        == 422
    )
    foreign = upload(client, bob)
    incomplete = start(client, alice, picture())
    wrong = upload(client, alice, b"plain file", "file")
    image = upload(client, alice)
    body = {k: proposal[k] for k in ["name", "address", "latitude", "longitude", "materialIds", "hours", "mediaIds"]}
    for ids, status in [
        ([foreign["id"]], 404),
        ([incomplete], 422),
        ([wrong["id"]], 422),
        ([image["id"]] * 2, 422),
        ([image["id"]] * 6, 422),
    ]:
        response = client.put(path, headers=alice["headers"], json={**body, "expectedVersion": 1, "mediaIds": ids})
        assert response.status_code == status, response.text
        unchanged = client.get(path, headers=alice["headers"]).json()
        assert unchanged["version"] == 1 and unchanged["media"] == []


def test_submit_moderate_publish_once_and_private_evidence_acl(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob, eve = users["alice"], users["bob"], users["eve"]
    moderator(owner, bob)
    moderator(owner, alice)
    image = upload(client, alice)
    proposal = draft(client, alice, [image["id"]])
    path = "/v1/point-proposals/" + proposal["id"]
    photo = "/v1/media-assets/" + image["id"]
    assert client.get(photo, headers=bob["headers"]).status_code == 404  # Drafts remain private.
    request_headers = headers(alice)
    submitted = client.post(
        path + "/submit", headers=request_headers, json={"expectedVersion": 1, "acknowledged": True}
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["state"] == "submitted" and submitted.json()["version"] == 2
    assert (
        client.post(path + "/submit", headers=request_headers, json={"expectedVersion": 1, "acknowledged": True}).json()
        == submitted.json()
    )
    assert (
        client.post(
            path + "/submit", headers=headers(bob), json={"expectedVersion": 2, "acknowledged": True}
        ).status_code
        == 404
    )
    assert client.get(photo + "/content", headers=bob["headers"]).status_code == 200
    assert client.get(photo + "/content", headers=eve["headers"]).status_code == 404
    assert client.get(photo + "/content").status_code == 404
    assert client.get("/v1/admin/collection-submissions/proposals", headers=eve["headers"]).status_code == 403
    queue = client.get("/v1/admin/collection-submissions/proposals", headers=bob["headers"])
    assert queue.status_code == 200, queue.text
    assert queue.json()["items"][0]["media"][0]["id"] == image["id"]
    decision = "/v1/admin/point-proposals/" + proposal["id"] + "/decision"
    body = {"expectedVersion": 2, "decision": "approve", "reason": "Đã xác minh địa điểm và vật liệu"}
    assert client.post(decision, headers=alice["headers"], json=body).status_code == 403
    assert client.post(decision, headers=eve["headers"], json=body).status_code == 403

    def approve() -> int:
        return client.post(decision, headers=bob["headers"], json=body).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _: approve(), range(2))) == [200, 409]
    final = client.get(path, headers=alice["headers"]).json()
    published = client.get("/v1/collection-points/" + final["publishedPointId"])
    assert published.status_code == 200, published.text
    assert published.json()["name"] == proposal["name"] and published.json()["hours"] == proposal["hours"]
    assert published.json()["capacityState"] == "unknown" and published.json()["openNow"] is None
    assert len(published.json()["materials"]) == 1
    with owner.connect() as db:
        assert (
            db.execute(
                text("select count(*) from app_private.collection_points where code like 'community-%'")
            ).scalar_one()
            == 1
        )
        assert (
            db.execute(
                text("select count(*) from app_private.audit_logs where action='point_proposals.approved'")
            ).scalar_one()
            == 1
        )
    edit = {k: proposal[k] for k in ["name", "address", "latitude", "longitude", "materialIds", "hours", "mediaIds"]}
    assert client.put(path, headers=alice["headers"], json={**edit, "expectedVersion": 3}).status_code == 409
    assert client.get(photo + "/content").status_code == 404  # Approval never makes evidence public.


def test_report_images_issues_persist_without_changing_point(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    image = upload(client, alice)
    point = str(fixture_id("point", "green-hub"))
    photo = "/v1/media-assets/" + image["id"]
    body = {
        "issueTypes": ["full", "unsupported_material"],
        "description": "Không tiếp nhận nhựa như công bố",
        "observedAt": datetime.now(UTC).isoformat(),
        "mediaIds": [image["id"]],
    }
    request_headers = headers(alice)
    response = client.post("/v1/collection-points/" + point + "/reports", headers=request_headers, json=body)
    assert response.status_code == 201, response.text
    report = response.json()
    assert (
        client.post("/v1/collection-points/" + point + "/reports", headers=request_headers, json=body).json() == report
    )
    assert client.get("/v1/point-reports/" + report["id"], headers=alice["headers"]).json() == report
    assert client.get("/v1/point-reports/" + report["id"], headers=bob["headers"]).status_code == 404
    assert (
        client.get("/v1/me/point-reports", headers=alice["headers"]).json()["items"][0]["media"][0]["id"] == image["id"]
    )
    assert client.get(photo + "/content", headers=bob["headers"]).status_code == 404
    moderator(owner, bob)
    assert client.get(photo + "/content", headers=bob["headers"]).status_code == 200
    assert (
        client.get("/v1/admin/collection-submissions/reports", headers=bob["headers"]).json()["items"][0]["id"]
        == report["id"]
    )
    assert (
        client.post(
            "/v1/admin/point-reports/" + report["id"] + "/decision",
            headers=bob["headers"],
            json={"decision": "approve", "reason": "Đã xem ảnh, chờ xác nhận vận hành", "expectedVersion": 1},
        ).status_code
        == 200
    )
    assert client.get("/v1/collection-points/" + point).json()["capacityState"] == "unknown"
    assert client.delete(photo, headers=alice["headers"]).status_code == 409
    with owner.begin() as db:
        db.execute(text("delete from app_private.user_roles where user_id=:id"), {"id": bob["id"]})
    assert client.get(photo + "/content", headers=bob["headers"]).status_code == 404


def test_rejection_stays_private_and_notification_opens_own_receipt(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
    database: tuple[Engine, Engine, str],
    settings: Settings,
) -> None:
    alice, bob = users["alice"], users["bob"]
    moderator(owner, bob)
    asset = upload(client, alice)
    proposal = draft(client, alice, [asset["id"]])
    path = "/v1/point-proposals/" + proposal["id"]
    submitted = client.post(path + "/submit", headers=headers(alice), json={"expectedVersion": 1, "acknowledged": True})
    assert submitted.status_code == 200, submitted.text
    decided = client.post(
        "/v1/admin/point-proposals/" + proposal["id"] + "/decision",
        headers=bob["headers"],
        json={"decision": "reject", "expectedVersion": 2, "reason": "Chưa xác minh được địa điểm"},
    )
    assert decided.status_code == 200, decided.text
    final = client.get(path, headers=alice["headers"]).json()
    assert final["state"] == "rejected" and final["publishedPointId"] is None
    assert final["reviewReason"] == "Chưa xác minh được địa điểm"
    for _ in range(10):
        if not process_one(database[1], settings):
            break
    inbox = client.get("/v1/me/notifications", headers=alice["headers"]).json()["items"]
    assert len(inbox) == 1 and inbox[0]["targetPath"] == "/point-proposal?id=" + proposal["id"]
    assert client.get(path, headers=bob["headers"]).status_code == 404
    with owner.connect() as db:
        assert (
            db.execute(
                text("select count(*) from app_private.collection_points where code like 'community-%'")
            ).scalar_one()
            == 0
        )
