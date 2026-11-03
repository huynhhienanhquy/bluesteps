from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


def test_web_cookie_session_is_http_only_origin_bound_and_revocable(client: TestClient, users: dict[str, Any]) -> None:
    client.app.state.settings = client.app.state.settings.model_copy(update={"cors_origins": ["http://localhost:4173"]})
    body = {"email": "alice@example.com", "password": "fixture-password"}
    assert client.post("/v1/auth/web/login", json=body).status_code == 403
    headers = {"Origin": "http://localhost:4173"}
    login = client.post("/v1/auth/web/login", headers=headers, json=body)
    assert login.status_code == 200, login.text
    assert "refreshToken" not in login.json()
    cookie = login.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/v1/auth/web" in cookie
    assert client.post("/v1/auth/web/refresh", headers={"Origin": "https://untrusted.example"}).status_code == 403
    refreshed = client.post("/v1/auth/web/refresh", headers=headers)
    assert refreshed.status_code == 200, refreshed.text
    assert client.post("/v1/auth/web/logout", headers=headers).status_code == 204
    assert client.post("/v1/auth/web/refresh", headers=headers).status_code == 401
    assert (
        client.get("/v1/me", headers={"Authorization": "Bearer " + refreshed.json()["accessToken"]}).status_code == 401
    )


def test_synthetic_records_never_enter_live_catalog(client: TestClient, owner: Engine) -> None:
    with owner.begin() as conn:
        for table in ["waste_items", "collection_points", "articles", "events", "rewards"]:
            conn.exec_driver_sql(f"update app_private.{table} set synthetic=true")
    for path in [
        "waste-items",
        "collection-points",
        "articles",
        "events",
        "rewards",
        "waste-categories",
        "waste-materials",
        "article-topics",
    ]:
        response = client.get(f"/v1/{path}")
        assert response.status_code == 200, response.text
        assert response.json()["items"] == []
    for path, kind, code in [
        ("waste-items", "waste", "bottle"),
        ("articles", "article", "daily-waste"),
        ("collection-points", "point", "green-hub"),
        ("events", "event", "beach"),
    ]:
        assert client.get(f"/v1/{path}/{fixture_id(kind, code)}").status_code == 404


def test_preferences_and_article_engagement_are_persistent_and_owned(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    preferences = client.patch(
        "/v1/me/preferences", headers=a, json={"interests": ["sorting", "news"], "goal": "reduce", "expectedVersion": 1}
    )
    assert preferences.status_code == 200, preferences.text
    assert client.get("/v1/me/preferences", headers=a).json()["interests"] == ["sorting", "news"]
    assert client.get("/v1/me/preferences", headers=b).json()["interests"] == []
    id = fixture_id("article", "daily-waste")
    assert client.put(f"/v1/articles/{id}/reaction", headers=a).json()["likes"] == 1
    assert client.put(f"/v1/articles/{id}/reaction", headers=a).json()["likes"] == 1
    assert client.get(f"/v1/articles/{id}/engagement", headers=b).json()["liked"] is False
    assert client.put(f"/v1/me/saved-articles/{id}", headers=a).status_code == 204
    assert client.get(f"/v1/articles/{id}/engagement", headers=a).json()["saved"] is True
    assert client.delete(f"/v1/articles/{id}/reaction", headers=a).json()["likes"] == 0


def test_conversation_members_and_search_do_not_leak_private_fields(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    directory = client.get("/v1/users?q=bob", headers=a)
    assert directory.status_code == 200
    assert directory.json()["items"] == [{"id": users["bob"]["id"], "displayName": "bob", "bio": ""}]
    conversation = client.post("/v1/conversations", headers=a, json={"recipientId": users["bob"]["id"]})
    assert conversation.status_code == 201, conversation.text
    assert len(conversation.json()["members"]) == 2
    for member in conversation.json()["members"]:
        assert set(member) == {"id", "displayName"}
    assert client.get("/v1/conversations", headers=b).json()["items"][0]["unreadCount"] == 0


def test_handover_is_real_self_report_never_double_awarded(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    headers = users["alice"]["headers"]
    point = str(fixture_id("point", "green-hub"))
    created = client.post("/v1/routes", headers={**headers, "Idempotency-Key": "route"}, json={"stopIds": [point]})
    assert created.status_code == 201, created.text
    route = created.json()
    id, stop = route["id"], route["stops"][0]["id"]
    assert client.post(f"/v1/routes/{id}/start", headers=headers).status_code == 200
    assert client.post(f"/v1/routes/{id}/stops/{stop}/arrive", headers=headers).status_code == 200
    path = f"/v1/routes/{id}/stops/{stop}/handover"
    first = client.post(path, headers={**headers, "Idempotency-Key": "handover"})
    assert first.status_code == 200, first.text
    repeat = client.post(path, headers={**headers, "Idempotency-Key": "handover"})
    assert repeat.json() == first.json()
    assert first.json()["award"]["points"] == "0"
    with owner.connect() as conn:
        assert conn.execute(text("select count(*) from app_private.handovers")).scalar_one() == 1
        assert conn.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0
