from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


def create(client: TestClient, headers: dict[str, str], **extra: Any) -> Any:
    return client.post(
        "/v1/scans",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"inputKind": "library", "clientImageId": str(uuid4()), **extra},
    )


def confirm(client: TestClient, headers: dict[str, str], scan: dict[str, Any], key: str | None = None) -> Any:
    return client.post(
        "/v1/sorting-actions",
        headers={**headers, "Idempotency-Key": key or str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": scan["resultItem"]["id"]},
    )


def test_fixed_scan_contract_owner_and_no_implicit_points(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    result = create(client, alice)
    assert result.status_code == 201, result.text
    data = result.json()
    assert data["resultMode"] == "fixed" and data["resultLabel"] == "Chai nhựa" and data["status"] == "completed"
    assert data["confirmation"] is None and data["resultItem"]["code"] == "bottle"
    assert "confidence" not in data and "imageUrl" not in data
    assert client.get("/v1/scans/" + data["id"], headers=bob).status_code == 404
    assert client.get("/v1/scans/" + data["id"]).status_code == 401
    assert client.get("/v1/scans/" + data["id"], headers=alice).json() == data
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0
        assert db.execute(text("select count(*) from app_private.sorting_actions")).scalar_one() == 0


def test_scan_creation_transport_and_image_dedup(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    alice = users["alice"]["headers"]
    body = {"inputKind": "camera", "clientImageId": str(uuid4())}
    headers = {**alice, "Idempotency-Key": str(uuid4())}
    first = client.post("/v1/scans", headers=headers, json=body)
    assert first.status_code == 201
    assert client.post("/v1/scans", headers=headers, json=body).json() == first.json()
    assert create(client, alice, **body).json()["id"] == first.json()["id"]
    assert create(client, alice, **{**body, "inputKind": "library"}).status_code == 409
    assert client.post("/v1/scans", headers=headers, json={**body, "clientImageId": str(uuid4())}).status_code == 409
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.scans")).scalar_one() == 1


def test_confirmation_exactly_once_and_snapshot_survives_reload(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
) -> None:
    alice = users["alice"]["headers"]
    scan = create(client, alice).json()
    key = str(uuid4())
    result = confirm(client, alice, scan, key)
    assert result.status_code == 201, result.text
    assert result.json()["evidenceStatus"] == "user_confirmed"
    assert result.json()["award"]["points"] == "5"
    assert confirm(client, alice, scan, key).json() == result.json()
    assert confirm(client, alice, scan).status_code == 409
    saved = client.get("/v1/scans/" + scan["id"], headers=alice).json()
    assert saved["confirmation"] == result.json()
    assert create(client, alice).json()["id"] != scan["id"]
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 1
        assert db.execute(text("select count(*) from app_private.sorting_actions")).scalar_one() == 1


def test_fixed_scan_cannot_confirm_another_item_or_owner(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    scan = create(client, alice).json()
    assert confirm(client, bob, scan).status_code == 404
    response = client.post(
        "/v1/sorting-actions",
        headers={**alice, "Idempotency-Key": str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": str(fixture_id("waste", "paper"))},
    )
    assert response.status_code == 409 and response.json()["error"]["code"] == "SCAN_ITEM_MISMATCH"
    assert confirm(client, alice, scan).status_code == 201


def test_unpublished_catalog_keeps_fixed_label_without_fabricated_reward(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
) -> None:
    alice = users["alice"]["headers"]
    with owner.begin() as db:
        db.execute(text("update app_private.waste_items set synthetic=true where code='bottle'"))
    scan = create(client, alice).json()
    assert scan["resultLabel"] == "Chai nhựa" and scan["resultItem"] is None
    response = client.post(
        "/v1/sorting-actions",
        headers={**alice, "Idempotency-Key": str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": str(fixture_id("waste", "paper"))},
    )
    assert response.status_code == 409 and response.json()["error"]["code"] == "SCAN_CATALOG_UNAVAILABLE"
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0


def test_concurrent_confirm_and_validation(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    alice = users["alice"]["headers"]
    scan = create(client, alice).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: confirm(client, alice, scan), range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    assert create(client, alice, imageUrl="https://example.com/private.jpg").status_code == 422
    assert create(client, alice, resultLabel="Giấy").status_code == 422
    body = {"inputKind": "camera", "clientImageId": str(uuid4())}
    assert client.post("/v1/scans", headers=alice, json=body).status_code == 400
    assert client.post("/v1/scans", json=body).status_code == 401
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.scans")).scalar_one() == 1
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 1
