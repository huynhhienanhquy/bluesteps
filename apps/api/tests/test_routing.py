import copy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from bluesteps_api.config import Settings
from bluesteps_api.errors import APIError
from bluesteps_api.routing import Valhalla, decode_shape
from bluesteps_api.schemas import Coordinate, RouteLeg, RouteManeuver, RoutePlan


def shape(points: list[tuple[float, float]]) -> str:
    last = [0, 0]
    output = ""
    for point in points:
        for i, value in enumerate(point):
            scaled = round(value * 1e6)
            delta = scaled - last[i]
            last[i] = scaled
            encoded = ~(delta << 1) if delta < 0 else delta << 1
            while encoded >= 32:
                output += chr((32 | (encoded & 31)) + 63)
                encoded >>= 5
            output += chr(encoded + 63)
    return output


def response() -> dict[str, Any]:
    return {
        "trip": {
            "status": 0,
            "units": "kilometers",
            "legs": [
                {
                    "shape": shape([(16.07, 108.22), (16.075, 108.225)]),
                    "summary": {"length": 1.061, "time": 753},
                    "maneuvers": [
                        {
                            "type": 10,
                            "instruction": "Turn right onto Test Road.",
                            "street_names": ["Test Road"],
                            "begin_shape_index": 0,
                            "end_shape_index": 1,
                            "length": 1.061,
                            "time": 753,
                        }
                    ],
                }
            ],
        }
    }


@pytest.mark.parametrize(
    ("mode", "costing"),
    [("walking", "pedestrian"), ("cycling", "bicycle"), ("motorcycling", "motor_scooter"), ("driving", "auto")],
)
def test_adapter_uses_correct_profile_and_real_metrics(
    monkeypatch: pytest.MonkeyPatch, mode: Any, costing: str
) -> None:
    calls = []
    original = httpx.Client

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        calls.append(json.loads(request.content))
        assert request.headers["X-Client-Id"] == "test-routing" and request.headers["User-Agent"].startswith(
            "BlueSteps/"
        )
        assert "Authorization" not in request.headers
        return httpx.Response(200, json=response())

    monkeypatch.setattr(httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    plan = Valhalla().plan(
        Settings(
            _env_file=None, environment="test", routing_url="https://routing.example", routing_client_id="test-routing"
        ),
        Coordinate(latitude=16.07, longitude=108.22),
        [{"point_id": uuid4(), "latitude": 16.075, "longitude": 108.225}],
        mode,
        True,
    )
    assert calls[0]["costing"] == costing and calls[0]["costing_options"][costing]["use_tolls"] == 0
    assert (plan.total_distance_m, plan.total_duration_s) == (1061, 753)
    assert plan.legs[0].geometry[-1].latitude == 16.075
    assert plan.legs[0].maneuvers[0].instruction == "Rẽ phải · Test Road"
    assert calls[0]["locations"][0]["lat"] == 16.07


@pytest.mark.parametrize("status", [429, 500, 302, 400])
def test_provider_failure_never_generates_metrics(monkeypatch: pytest.MonkeyPatch, status: int) -> None:
    original = httpx.Client
    monkeypatch.setattr(
        httpx,
        "Client",
        lambda **kwargs: original(
            transport=httpx.MockTransport(lambda _: httpx.Response(status, json={"error": "no route"})), **kwargs
        ),
    )
    with pytest.raises(APIError) as error:
        Valhalla().plan(
            Settings(_env_file=None, environment="test", routing_url="https://routing.example"),
            Coordinate(latitude=16, longitude=108),
            [{"point_id": uuid4(), "latitude": 16.1, "longitude": 108.1}],
            "walking",
            False,
        )
    assert error.value.status == (422 if status == 400 else 503)


@pytest.mark.parametrize("bad", ["shape", "metric", "index", "leg_count", "trip_type"])
def test_malformed_provider_response_is_rejected(monkeypatch: pytest.MonkeyPatch, bad: str) -> None:
    data = copy.deepcopy(response())
    leg = data["trip"]["legs"][0]
    if bad == "shape":
        leg["shape"] = "broken"
    elif bad == "metric":
        leg["summary"]["time"] = -1
    elif bad == "index":
        leg["maneuvers"][0]["end_shape_index"] = 999
    elif bad == "leg_count":
        data["trip"]["legs"] = []
    else:
        data["trip"] = []
    original = httpx.Client
    monkeypatch.setattr(
        httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=data)), **kwargs),
    )
    with pytest.raises(APIError) as error:
        Valhalla().plan(
            Settings(_env_file=None, environment="test", routing_url="https://routing.example"),
            Coordinate(latitude=16, longitude=108),
            [{"point_id": uuid4(), "latitude": 16.1, "longitude": 108.1}],
            "walking",
            False,
        )
    assert error.value.status == 503


def test_shape_roundtrip_and_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    assert [(p.latitude, p.longitude) for p in decode_shape(shape([(-16.1, -108.2), (16.1, 108.2)]))] == [
        (-16.1, -108.2),
        (16.1, 108.2),
    ]
    provider = Valhalla()
    provider._last_started = __import__("time").monotonic()
    with pytest.raises(APIError) as error:
        provider.plan(
            Settings(_env_file=None, environment="test", routing_url="https://routing.example"),
            Coordinate(latitude=16, longitude=108),
            [],
            "walking",
            False,
        )
    assert error.value.status == 429


@pytest.mark.postgres
def test_plan_ownership_cas_cache_and_invalidation(
    client: TestClient, users: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    points = client.get("/v1/collection-points").json()["items"][:2]
    route = client.post(
        "/v1/routes",
        headers={**a, "Idempotency-Key": "routing"},
        json={"stopIds": [p["id"] for p in points], "mode": "motorcycling"},
    ).json()
    path = "/v1/routes/" + route["id"]
    calls = []

    def calculate(
        settings: Settings, origin: Coordinate, stops: list[dict[str, Any]], mode: Any, prefer: bool
    ) -> RoutePlan:
        calls.append(stops)
        return RoutePlan(
            computed_at=datetime.now(UTC),
            origin=origin,
            mode=mode,
            prefer_no_tolls=prefer,
            stop_ids=[s["point_id"] for s in stops],
            total_distance_m=1000 * len(stops),
            total_duration_s=200 * len(stops),
            legs=[
                RouteLeg(
                    stop_id=s["id"],
                    point_id=s["point_id"],
                    distance_m=1000,
                    duration_s=200,
                    geometry=[origin, Coordinate(latitude=s["latitude"], longitude=s["longitude"])],
                    maneuvers=[
                        RouteManeuver(
                            instruction="Đi thẳng",
                            original_instruction="Continue",
                            type=8,
                            distance_m=1000,
                            duration_s=200,
                            begin_index=0,
                            end_index=1,
                        )
                    ],
                )
                for s in stops
            ],
        )

    monkeypatch.setattr(client.app.state.routing, "plan", calculate)
    body = {"origin": {"latitude": 16.07, "longitude": 108.22}, "expectedVersion": 1}
    assert client.post(path + "/plan", headers=b, json=body).status_code == 404
    assert client.post(path + "/plan", headers=a, json={**body, "expectedVersion": 99}).status_code == 409
    result = client.post(path + "/plan", headers=a, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["totalDistanceM"] == 2000 and result.json()["provider"] == "Valhalla"
    assert client.get(path, headers=a).json()["plan"] == result.json()["plan"]
    assert client.post(path + "/plan", headers=a, json=body).status_code == 200 and len(calls) == 1
    updated = client.patch(
        path, headers=a, json={"stopIds": [p["id"] for p in points][::-1], "mode": "walking", "expectedVersion": 1}
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["plan"] is None and updated.json()["totalDistanceM"] is None
    assert client.post(path + "/plan", headers=a, json={**body, "expectedVersion": 2}).status_code == 200
    started = client.post(path + "/start", headers=a)
    assert started.status_code == 200 and started.json()["plan"]
    stops = started.json()["stops"]
    for stop in stops:
        assert client.post(path + "/stops/" + stop["id"] + "/arrive", headers=a).status_code == 200
        handover = client.post(
            path + "/stops/" + stop["id"] + "/handover", headers={**a, "Idempotency-Key": stop["id"]}
        )
        assert handover.status_code == 200, handover.text
        assert handover.json()["award"]["points"] == "0"
    finished = client.get(path, headers=a).json()
    assert finished["status"] == "completed" and finished["plan"] is None
    assert (
        client.post(path + "/plan", headers=a, json={**body, "expectedVersion": finished["version"]}).status_code == 409
    )


@pytest.mark.postgres
def test_materials_and_stop_order_persist_with_version_and_ownership(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    points = [p["id"] for p in client.get("/v1/collection-points").json()["items"][:2]]
    materials = [m["id"] for m in client.get("/v1/waste-materials").json()["items"][:2]]
    body = {"stopIds": points, "materialIds": materials, "mode": "cycling"}
    headers = {**a, "Idempotency-Key": "planner-materials"}
    for invalid, status in [([str(uuid4())], 404), ([materials[0], materials[0]], 422)]:
        assert (
            client.post(
                "/v1/routes", headers={**a, "Idempotency-Key": str(uuid4())}, json={**body, "materialIds": invalid}
            ).status_code
            == status
        )
    created = client.post("/v1/routes", headers=headers, json=body)
    assert created.status_code == 201, created.text
    route = created.json()
    assert route["materialIds"] == materials
    assert client.post("/v1/routes", headers=headers, json=body).json()["id"] == route["id"]
    path = "/v1/routes/" + route["id"]
    update = {"stopIds": points[::-1], "mode": "walking", "expectedVersion": 1}
    assert client.patch(path, headers=b, json=update).status_code == 404
    saved = client.patch(path, headers=a, json=update)
    assert saved.status_code == 200, saved.text
    assert saved.json()["materialIds"] == materials  # Legacy clients cannot erase selected materials.
    assert [s["pointId"] for s in saved.json()["stops"]] == points[::-1]
    assert client.patch(path, headers=a, json={**update, "materialIds": []}).status_code == 409
    assert client.get(path, headers=a).json()["materialIds"] == materials
    assert (
        client.patch(path, headers=a, json={**update, "expectedVersion": 2, "materialIds": []}).json()["materialIds"]
        == []
    )
