import base64
import io
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import Engine, text

from bluesteps_api import scans
from bluesteps_api.cli import ROOT
from bluesteps_api.errors import APIError
from bluesteps_api.waste_inference import CLASS_LABELS
from bluesteps_api.waste_inference import predict as real_predict

pytestmark = pytest.mark.postgres


def image_data() -> str:
    stream = io.BytesIO()
    Image.new("RGB", (32, 32), "green").save(stream, format="PNG")
    return base64.b64encode(stream.getvalue()).decode()


@pytest.fixture(autouse=True)
def inference(owner: Engine, monkeypatch: pytest.MonkeyPatch) -> None:
    # Truncation in the shared fixture removes migration-owned reference entries.
    source = (ROOT / "supabase/migrations/202611030023_waste_model_scans.sql").read_text(encoding="utf-8")
    with owner.begin() as db:
        db.exec_driver_sql(source[source.index("insert into app_private.waste_categories") :])
    monkeypatch.setattr(scans, "predict", lambda image, directory: ("plastic", 0.93))


def recognize(client: TestClient, **extra: Any) -> Any:
    return client.post(
        "/v1/scans/recognize",
        json={
            "inputKind": "library",
            "clientImageId": str(uuid4()),
            "imageBase64": image_data(),
            **extra,
        },
    )


def selection(client: TestClient, **extra: Any) -> dict[str, Any]:
    body = {"inputKind": "library", "clientImageId": str(uuid4()), **extra}
    result = recognize(client, **body)
    assert result.status_code == 200, result.text
    return {**body, "predictionToken": result.json()["predictionToken"]}


def create(client: TestClient, headers: dict[str, str], **extra: Any) -> Any:
    return client.post(
        "/v1/scans", headers={**headers, "Idempotency-Key": str(uuid4())}, json=selection(client, **extra)
    )


def confirm(client: TestClient, headers: dict[str, str], scan: dict[str, Any], key: str | None = None) -> Any:
    return client.post(
        "/v1/sorting-actions",
        headers={**headers, "Idempotency-Key": key or str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": scan["resultItem"]["id"]},
    )


@pytest.mark.parametrize("label", CLASS_LABELS)
def test_recognition_maps_all_classes_without_saving_or_awarding(
    client: TestClient,
    owner: Engine,
    monkeypatch: pytest.MonkeyPatch,
    label: str,
) -> None:
    monkeypatch.setattr(scans, "predict", lambda image, directory: (label, 0.93))
    response = recognize(client)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["resultLabel"] == CLASS_LABELS[label]
    assert data["predictedClass"] == label and data["confidence"] == 0.93
    assert data["resultItem"]["code"] == "scan-" + label
    assert response.headers["cache-control"] == "no-store"
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.scans")).scalar_one() == 0
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0


def test_model_scan_owner_and_no_implicit_points(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    response = create(client, alice)
    assert response.status_code == 201, response.text
    scan = response.json()
    assert scan["resultMode"] == "model" and scan["resultLabel"] == "Nhựa"
    assert scan["status"] == "completed" and scan["confidence"] == 0.93
    assert scan["confirmation"] is None and scan["resultItem"]["code"] == "scan-plastic"
    assert client.get("/v1/scans/" + scan["id"], headers=bob).status_code == 404
    assert client.get("/v1/scans/" + scan["id"]).status_code == 401
    assert client.get("/v1/scans/" + scan["id"], headers=alice).json() == scan
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0


def test_idempotency_and_image_dedup(client: TestClient, users: dict[str, Any]) -> None:
    headers = {**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
    body = selection(client, inputKind="camera")
    first = client.post("/v1/scans", headers=headers, json=body)
    assert first.status_code == 201, first.text
    assert client.post("/v1/scans", headers=headers, json=body).json() == first.json()
    assert (
        client.post("/v1/scans", headers={**headers, "Idempotency-Key": str(uuid4())}, json=body).json() == first.json()
    )
    assert client.post("/v1/scans", headers=headers, json={**body, "clientImageId": str(uuid4())}).status_code == 409
    assert create(client, users["alice"]["headers"], clientImageId=body["clientImageId"]).status_code == 409


def test_confirmation_exactly_once_and_restored_receipt(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
) -> None:
    alice = users["alice"]["headers"]
    scan = create(client, alice).json()
    key = str(uuid4())
    result = confirm(client, alice, scan, key)
    assert result.status_code == 201, result.text
    assert result.json()["evidenceStatus"] == "user_confirmed" and result.json()["award"]["points"] == "5"
    assert confirm(client, alice, scan, key).json() == result.json()
    assert confirm(client, alice, scan).status_code == 409
    assert client.get("/v1/scans/" + scan["id"], headers=alice).json()["confirmation"] == result.json()
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 1


def test_cannot_confirm_different_item_or_owner(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"]["headers"], users["bob"]["headers"]
    scan = create(client, alice).json()
    assert confirm(client, bob, scan).status_code == 404
    other = create(client, alice)
    assert other.status_code == 201
    from bluesteps_api.seed import fixture_id

    response = client.post(
        "/v1/sorting-actions",
        headers={**alice, "Idempotency-Key": str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": str(fixture_id("waste", "paper"))},
    )
    assert response.status_code == 409 and response.json()["error"]["code"] == "SCAN_ITEM_MISMATCH"


def test_missing_catalog_and_low_confidence_never_award(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    alice = users["alice"]["headers"]
    with owner.begin() as db:
        db.execute(text("update app_private.waste_items set published=false where code='scan-plastic'"))
    assert create(client, alice).json()["resultItem"] is None
    monkeypatch.setattr(scans, "predict", lambda image, directory: ("paper", 0.3))
    draft = selection(client)
    restored = client.post("/v1/scans/prediction", json=draft)
    assert restored.status_code == 200 and restored.json()["status"] == "unrecognized"
    assert restored.json()["resultItem"] is None
    scan = client.post("/v1/scans", headers={**alice, "Idempotency-Key": str(uuid4())}, json=draft).json()
    from bluesteps_api.seed import fixture_id

    response = client.post(
        "/v1/sorting-actions",
        headers={**alice, "Idempotency-Key": str(uuid4())},
        json={"source": "scan", "scanId": scan["id"], "itemId": str(fixture_id("waste", "paper"))},
    )
    assert response.status_code == 409 and response.json()["error"]["code"] == "SCAN_NOT_RECOGNIZED"


def test_prediction_signature_expiry_and_selection_binding(client: TestClient, users: dict[str, Any]) -> None:
    alice = {**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
    draft = selection(client)
    assert client.post("/v1/scans/prediction", json=draft).json()["resultLabel"] == "Nhựa"
    for change in ({"clientImageId": str(uuid4())}, {"inputKind": "camera"}, {"predictionToken": "forged"}):
        response = client.post("/v1/scans", headers=alice, json={**draft, **change})
        assert response.status_code == 422, response.text
    settings = client.app.state.settings
    claims = jwt.decode(draft["predictionToken"], options={"verify_signature": False})
    expired = jwt.encode({**claims, "exp": 1}, settings.jwt_private_key.get_secret_value(), algorithm="RS256")
    assert client.post("/v1/scans/prediction", json={**draft, "predictionToken": expired}).status_code == 422
    assert client.post("/v1/scans", json=draft).status_code == 401
    assert client.post("/v1/scans", headers=users["alice"]["headers"], json=draft).status_code == 400
    assert (
        client.post(
            "/v1/scans", headers=alice, json={k: v for k, v in draft.items() if k != "predictionToken"}
        ).status_code
        == 422
    )


def test_invalid_image_and_model_failure(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    assert recognize(client, imageBase64="%%%%").status_code == 422
    assert recognize(client, imageBase64=base64.b64encode(b"not an image").decode()).status_code == 422

    def unavailable(image: Any, directory: str) -> Any:
        raise APIError(503, "SCAN_MODEL_UNAVAILABLE", "Mô hình chưa sẵn sàng.")

    monkeypatch.setattr(scans, "predict", unavailable)
    response = recognize(client)
    assert response.status_code == 503 and response.json()["error"]["code"] == "SCAN_MODEL_UNAVAILABLE"


def test_concurrent_confirmation(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    alice = users["alice"]["headers"]
    scan = create(client, alice).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: confirm(client, alice, scan), range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 1


def test_real_checkpoint_through_http(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scans, "predict", real_predict)
    stream = io.BytesIO()
    Image.new("RGB", (32, 32), "white").save(stream, format="PNG")
    response = recognize(client, imageBase64=base64.b64encode(stream.getvalue()).decode())
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["predictedClass"] == "cardboard"
    assert result["resultItem"]["code"] == "scan-cardboard"
    assert result["confidence"] == pytest.approx(0.9725499749, abs=1e-4)


def test_oversized_request_rejected_before_json_parsing(client: TestClient) -> None:
    response = client.post("/v1/scans/recognize", content=b"x" * 11_200_001)
    assert response.status_code == 413
