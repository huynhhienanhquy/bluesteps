import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from psycopg import OperationalError as PsycopgOperationalError
from pydantic import SecretStr
from sqlalchemy import Engine, text
from sqlalchemy.exc import DBAPIError, OperationalError

from bluesteps_api.config import Settings
from bluesteps_api.security import mail_cipher
from bluesteps_api.seed import fixture_id
from bluesteps_api.worker import process_one

from .test_foundation import assert_pinned

pytestmark = pytest.mark.postgres


def email_code(owner: Engine, settings: Settings, id: str) -> str:
    with owner.connect() as conn:
        payload = conn.execute(
            text("select payload from app_private.outbox_events where aggregate_id=:id"), {"id": id}
        ).scalar_one()
    return str(json.loads(mail_cipher(settings).decrypt(payload["encrypted"].encode()))["code"])


@pytest.mark.parametrize("environment", ["test", "development"])
def test_registration_verification_and_password_reset(
    client: TestClient, owner: Engine, settings: Settings, tmp_path: Any, environment: str
) -> None:
    client.app.state.settings = client.app.state.settings.model_copy(
        update={
            "environment": environment,
            "registration_enabled": True,
            "local_mail_directory": str(tmp_path / "mail"),
        }
    )
    response = client.post(
        "/v1/auth/register",
        json={"name": "Mai", "email": "mai@example.com", "password": "first-password", "consentVersion": "2026-10-31"},
    )
    assert response.status_code == 202, response.text
    challenge_id = response.json()["challengeId"]
    assert "code" not in response.json()
    assert (
        client.post("/v1/auth/login", json={"email": "mai@example.com", "password": "first-password"}).status_code
        == 401
    )
    code = email_code(owner, settings, challenge_id)
    if environment == "development":
        assert code == "123456"
    wrong = "000000" if code != "000000" else "111111"
    assert (
        client.post("/v1/auth/email-verification/verify", json={"challengeId": challenge_id, "code": wrong}).status_code
        == 422
    )
    with owner.begin() as conn:
        conn.execute(text("delete from app_private.rate_limits"))
        conn.execute(text("delete from app_private.auth_recipient_cooldowns"))
    resent = client.post("/v1/auth/email-verification/request", json={"email": "mai@example.com"})
    assert resent.status_code == 202, resent.text
    assert (
        client.post("/v1/auth/email-verification/verify", json={"challengeId": challenge_id, "code": code}).status_code
        == 422
    )
    challenge_id = resent.json()["challengeId"]
    code = email_code(owner, settings, challenge_id)
    if environment == "development":
        assert code == "123456"
    verify = client.post("/v1/auth/email-verification/verify", json={"challengeId": challenge_id, "code": code})
    assert verify.status_code == 204, verify.text
    assert (
        client.post("/v1/auth/email-verification/verify", json={"challengeId": challenge_id, "code": code}).status_code
        == 422
    )
    login = client.post("/v1/auth/login", json={"email": "mai@example.com", "password": "first-password"})
    assert login.status_code == 200, login.text
    headers = {"Authorization": "Bearer " + login.json()["accessToken"]}
    assert client.get("/v1/me/wallet", headers=headers).json()["balance"] == "0"
    # Move the rate-limit bucket out of the way; cooldown itself is tested separately.
    with owner.begin() as conn:
        conn.execute(text("delete from app_private.rate_limits"))
        conn.execute(text("delete from app_private.auth_recipient_cooldowns"))
    reset = client.post("/v1/auth/password-reset/request", json={"email": "mai@example.com"})
    assert reset.status_code == 202, reset.text
    reset_id = reset.json()["challengeId"]
    reset_code = email_code(owner, settings, reset_id)
    if environment == "development":
        assert reset_code == "123456"
    # A reset code cannot verify an email challenge, even if both code strings match.
    assert (
        client.post(
            "/v1/auth/email-verification/verify", json={"challengeId": reset_id, "code": reset_code}
        ).status_code
        == 422
    )
    reset_token = client.post("/v1/auth/password-reset/verify", json={"challengeId": reset_id, "code": reset_code})
    assert reset_token.status_code == 200, reset_token.text
    complete = {"resetToken": reset_token.json()["resetToken"], "newPassword": "second-password"}
    assert client.post("/v1/auth/password-reset/complete", json=complete).status_code == 204
    assert client.post("/v1/auth/password-reset/complete", json=complete).status_code == 422
    assert client.get("/v1/me", headers=headers).status_code == 401
    assert (
        client.post("/v1/auth/login", json={"email": "mai@example.com", "password": "first-password"}).status_code
        == 401
    )
    assert (
        client.post("/v1/auth/login", json={"email": "mai@example.com", "password": "second-password"}).status_code
        == 200
    )


@pytest.mark.parametrize("environment", ["test", "development"])
def test_register_again_resumes_pending_verification(
    client: TestClient, owner: Engine, settings: Settings, tmp_path: Any, environment: str
) -> None:
    client.app.state.settings = client.app.state.settings.model_copy(
        update={
            "environment": environment,
            "registration_enabled": True,
            "local_mail_directory": str(tmp_path / "mail"),
        }
    )
    body = {
        "name": "Mai",
        "email": "retry@example.com",
        "password": "original-password",
        "consentVersion": "2026-10-31",
    }
    first = client.post("/v1/auth/register", json=body)
    assert first.status_code == 202, first.text
    first_id = first.json()["challengeId"]
    # A later registration must work even after the first challenge expires.
    with owner.begin() as conn:
        conn.execute(text("update app_private.auth_challenges set expires_at=now()-interval '1 second'"))
        conn.execute(text("delete from app_private.rate_limits"))
        conn.execute(text("delete from app_private.auth_recipient_cooldowns"))
    retry = client.post("/v1/auth/register", json={**body, "password": "different-password"})
    assert retry.status_code == 202, retry.text
    retry_id = retry.json()["challengeId"]
    assert retry_id != first_id
    code = email_code(owner, settings, retry_id)
    if environment == "development":
        assert code == "123456"
    assert (
        client.post("/v1/auth/email-verification/verify", json={"challengeId": retry_id, "code": code}).status_code
        == 204
    )
    assert scalar(owner, "select count(*) from app_private.users where email_normalized='retry@example.com'") == 1
    assert scalar(owner, "select count(*) from app_private.wallets") == 1
    assert (
        client.post("/v1/auth/login", json={"email": body["email"], "password": "different-password"}).status_code
        == 401
    )
    assert client.post("/v1/auth/login", json={"email": body["email"], "password": body["password"]}).status_code == 200
    # Registering an active email keeps the generic response and never reopens verification.
    with owner.begin() as conn:
        conn.execute(text("delete from app_private.rate_limits"))
        conn.execute(text("delete from app_private.auth_recipient_cooldowns"))
    active_retry = client.post("/v1/auth/register", json=body)
    assert active_retry.status_code == 202
    assert (
        client.post(
            "/v1/auth/email-verification/verify",
            json={"challengeId": active_retry.json()["challengeId"], "code": code},
        ).status_code
        == 422
    )


def test_challenge_attempts_cooldown_and_generic_recovery(
    client: TestClient, owner: Engine, settings: Settings, users: dict[str, Any]
) -> None:
    client.app.state.settings = client.app.state.settings.model_copy(update={"registration_enabled": True})
    known = client.post("/v1/auth/password-reset/request", json={"email": "alice@example.com"})
    unknown = client.post("/v1/auth/password-reset/request", json={"email": "missing@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert set(known.json()) == set(unknown.json()) == {"status", "challengeId"}
    assert client.post("/v1/auth/password-reset/request", json={"email": "alice@example.com"}).status_code == 429
    id = known.json()["challengeId"]
    correct = email_code(owner, settings, id)
    wrong = "000000" if correct != "000000" else "111111"
    for _ in range(5):
        assert client.post("/v1/auth/password-reset/verify", json={"challengeId": id, "code": wrong}).status_code == 422
    assert scalar(owner, "select attempt_count from app_private.auth_challenges where id=:id", id=id) == 5
    assert client.post("/v1/auth/password-reset/verify", json={"challengeId": id, "code": correct}).status_code == 422


def test_local_mail_delivery_is_explicit_and_redelivery_safe(
    client: TestClient, owner: Engine, settings: Settings, tmp_path: Any, database: tuple[Engine, Engine, str]
) -> None:
    config = client.app.state.settings.model_copy(
        update={"registration_enabled": True, "local_mail_directory": str(tmp_path / "mail")}
    )
    client.app.state.settings = config
    response = client.post(
        "/v1/auth/register",
        json={
            "name": "Test",
            "email": "mail@example.com",
            "password": "fixture-password",
            "consentVersion": "2026-10-31",
        },
    )
    assert response.status_code == 202, response.text
    assert process_one(database[1], config)
    paths = list((tmp_path / "mail").glob("*.json"))
    assert len(paths) == 1
    mail = json.loads(paths[0].read_text(encoding="utf-8"))
    assert mail["to"] == "mail@example.com"
    assert mail["code"] == email_code(owner, settings, response.json()["challengeId"])
    with owner.begin() as conn:
        conn.execute(text("update app_private.outbox_events set published_at=null"))
    assert process_one(database[1], config)
    assert len(list((tmp_path / "mail").glob("*.json"))) == 1


def test_worker_does_not_deliver_expired_otp(
    client: TestClient, owner: Engine, tmp_path: Any, database: tuple[Engine, Engine, str]
) -> None:
    config = client.app.state.settings.model_copy(
        update={"registration_enabled": True, "local_mail_directory": str(tmp_path / "mail")}
    )
    client.app.state.settings = config
    registered = client.post(
        "/v1/auth/register",
        json={
            "name": "Expired",
            "email": "expired@example.com",
            "password": "fixture-password",
            "consentVersion": "2026-10-31",
        },
    )
    assert registered.status_code == 202, registered.text
    with owner.begin() as conn:
        conn.execute(text("update app_private.auth_challenges set expires_at=now()-interval '1 second'"))
    assert process_one(database[1], config)
    assert not list((tmp_path / "mail").glob("*.json"))
    assert scalar(owner, "select count(*) from app_private.outbox_events where published_at is not null") == 1


def scalar(owner: Engine, query: str, **params: Any) -> Any:
    with owner.connect() as conn:
        return conn.execute(text(query), params).scalar_one()


def test_health_and_error_contract(client: TestClient) -> None:
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").status_code == 200
    result = client.get("/missing")
    assert result.status_code == 404
    assert result.headers["X-Request-ID"] == result.json()["error"]["requestId"]
    assert_pinned("Error", result.json())
    bad = client.post("/v1/auth/login", json={"email": "bad", "password": "secret-value", "role": "admin"})
    assert bad.status_code == 422
    assert "secret-value" not in bad.text
    assert_pinned("Error", bad.json())
    assert client.get("/v1/me").status_code == 401


@pytest.mark.parametrize(
    "table,column",
    [
        ("event_reminder_jobs", None),
        ("notification_preferences", None),
        ("daily_reminder_deliveries", None),
        ("notifications", "category"),
        ("collection_points", "website_url"),
        ("point_proposals", "publish_photos"),
        ("routes", "prefer_no_tolls"),
    ],
)
def test_readiness_rejects_missing_runtime_schema(
    client: TestClient, owner: Engine, table: str, column: str | None
) -> None:
    # Only the disposable test database is changed; restore even if an assertion fails.
    rename = (
        f"alter table app_private.{table} rename column {column} to readiness_missing"
        if column
        else f"alter table app_private.{table} rename to readiness_missing"
    )
    restore = (
        f"alter table app_private.{table} rename column readiness_missing to {column}"
        if column
        else f"alter table app_private.readiness_missing rename to {table}"
    )
    with owner.begin() as conn:
        conn.exec_driver_sql(rename)
    try:
        result = client.get("/health/ready")
        assert result.status_code == 503
        assert result.json()["error"]["code"] == "NOT_READY"
        assert "migration" in result.json()["error"]["message"]
        assert client.get("/health/live").status_code == 200
    finally:
        with owner.begin() as conn:
            conn.exec_driver_sql(restore)
    assert client.get("/health/ready").status_code == 200


def test_login_refresh_reuse_revokes_new_tokens(client: TestClient, users: dict[str, Any]) -> None:
    alice = users["alice"]
    assert_pinned(
        "TokenPair",
        {k: alice[k] for k in ["accessToken", "refreshToken", "tokenType", "expiresIn", "sessionId"]},
    )
    refreshed = client.post("/v1/auth/refresh", json={"refreshToken": alice["refreshToken"]})
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["refreshToken"] != alice["refreshToken"]
    assert client.post("/v1/auth/refresh", json={"refreshToken": alice["refreshToken"]}).status_code == 401
    headers = {"Authorization": "Bearer " + refreshed.json()["accessToken"]}
    assert client.get("/v1/me", headers=headers).status_code == 401
    assert client.post("/v1/auth/refresh", json={"refreshToken": refreshed.json()["refreshToken"]}).status_code == 401


def test_refresh_race_is_single_use(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    token = users["alice"]["refreshToken"]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: client.post("/v1/auth/refresh", json={"refreshToken": token}), range(2)))
    assert sorted(r.status_code for r in results) == [200, 401]
    assert (
        scalar(
            owner,
            "select count(*) from app_private.refresh_tokens where session_id=:id",
            id=users["alice"]["sessionId"],
        )
        == 2
    )
    assert client.get("/v1/me", headers=users["alice"]["headers"]).status_code == 401


def test_session_ownership_and_logout(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"], users["bob"]
    result = client.get("/v1/me/sessions", headers=alice["headers"])
    assert_pinned("SessionList", result.json())
    assert [s["id"] for s in result.json()["items"]] == [alice["sessionId"]]
    assert client.delete(f"/v1/me/sessions/{alice['sessionId']}", headers=bob["headers"]).status_code == 404
    assert client.post("/v1/auth/logout", headers=alice["headers"]).status_code == 204
    assert client.get("/v1/me", headers=alice["headers"]).status_code == 401


def test_profile_versions_and_preferences(client: TestClient, users: dict[str, Any]) -> None:
    headers = users["alice"]["headers"]
    response = client.patch("/v1/me", headers=headers, json={"displayName": "Linh", "expectedVersion": 1})
    assert response.status_code == 200, response.text
    assert response.json()["version"] == 2
    assert client.patch("/v1/me", headers=headers, json={"displayName": "Old", "expectedVersion": 1}).status_code == 409
    assert (
        client.patch(
            "/v1/me/preferences",
            headers=headers,
            json={"timezone": "Invalid/Zone", "expectedVersion": 1},
        ).status_code
        == 422
    )
    response = client.patch(
        "/v1/me/preferences",
        headers=headers,
        json={"theme": "dark", "timezone": "Asia/Bangkok", "expectedVersion": 1},
    )
    assert response.status_code == 200, response.text
    assert response.json()["theme"] == "dark"
    assert client.get("/v1/me", headers=users["bob"]["headers"]).json()["displayName"] == "bob"


def test_catalog_pagination_and_geo(client: TestClient) -> None:
    seen: list[str] = []
    cursor = None
    while True:
        response = client.get("/v1/articles", params={"limit": 3, **({"cursor": cursor} if cursor else {})})
        assert response.status_code == 200, response.text
        body = response.json()
        seen.extend(row["id"] for row in body["items"])
        cursor = body["nextCursor"]
        if cursor is None:
            break
    assert len(seen) == len(set(seen)) == 13
    assert client.get("/v1/articles", params={"cursor": "nonsense"}).status_code == 400
    result = client.get("/v1/collection-points", params={"lat": 16.07, "lng": 108.22, "radius_m": 100})
    assert result.status_code == 200, result.text
    assert len(result.json()["items"]) == 1
    assert result.json()["items"][0]["capacityState"] == "unknown"
    assert client.get("/v1/collection-points", params={"lat": 10}).status_code == 422
    paper = str(fixture_id("material", "Giấy"))
    plastic = str(fixture_id("material", "Nhựa"))
    all_result = client.get(
        "/v1/collection-points",
        params=[("material_ids", paper), ("material_ids", plastic), ("match_mode", "all")],
    )
    any_result = client.get(
        "/v1/collection-points",
        params=[("material_ids", paper), ("material_ids", plastic), ("match_mode", "any")],
    )
    assert all_result.status_code == any_result.status_code == 200
    assert len(all_result.json()["items"]) <= len(any_result.json()["items"])
    assert not any(row["synthetic"] for row in result.json()["items"])


def test_sorting_idempotency_awards_once(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    headers = {**users["alice"]["headers"], "Idempotency-Key": "sorting-1"}
    data = {"source": "manual", "itemId": str(fixture_id("waste", "bottle"))}
    with ThreadPoolExecutor(max_workers=2) as pool:
        result = list(pool.map(lambda _: client.post("/v1/sorting-actions", headers=headers, json=data), range(2)))
    assert [r.status_code for r in result] == [201, 201], [r.text for r in result]
    assert result[0].json() == result[1].json()
    # Awarding is now enabled in the runtime contract; the archived planning
    # schema described the earlier no-award program.
    from bluesteps_api.schemas import SortingResponse

    SortingResponse.model_validate(result[0].json())
    assert result[0].json()["award"]["points"] == "5"
    assert scalar(owner, "select count(*) from app_private.sorting_actions") == 1
    assert scalar(owner, "select count(*) from app_private.point_ledger") == 1
    assert (
        scalar(
            owner,
            "select count(*) from app_private.outbox_events where event_type='sorting.recorded'",
        )
        == 1
    )
    data["itemId"] = str(fixture_id("waste", "paper"))
    assert client.post("/v1/sorting-actions", headers=headers, json=data).status_code == 409
    assert client.post("/v1/sorting-actions", headers=users["alice"]["headers"], json=data).status_code == 400
    assert client.post("/v1/sorting-actions", headers=headers, json={**data, "points": 100}).status_code == 422


def test_scan_ownership_and_business_dedup(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    id = uuid4()
    with owner.begin() as conn:
        conn.execute(
            text("insert into app_private.scans(id,user_id,status) values (:id,:uid,'completed')"),
            {"id": id, "uid": users["alice"]["id"]},
        )
    data = {"source": "scan", "scanId": str(id), "itemId": str(fixture_id("waste", "bottle"))}
    assert (
        client.post(
            "/v1/sorting-actions",
            headers={**users["bob"]["headers"], "Idempotency-Key": "x"},
            json=data,
        ).status_code
        == 404
    )
    result = client.post(
        "/v1/sorting-actions",
        headers={**users["alice"]["headers"], "Idempotency-Key": "a"},
        json=data,
    )
    assert result.status_code == 201, result.text
    assert (
        client.post(
            "/v1/sorting-actions",
            headers={**users["alice"]["headers"], "Idempotency-Key": "b"},
            json=data,
        ).status_code
        == 409
    )


def test_saved_collections_enforce_owner_and_preserve_saved(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    collection = client.post("/v1/me/event-collections", headers={**a, "Idempotency-Key": "c"}, json={"name": "Biển"})
    assert collection.status_code == 201, collection.text
    id = collection.json()["id"]
    event = str(fixture_id("event", "beach"))
    assert client.put(f"/v1/me/saved-events/{event}", headers=b, json={"collectionId": id}).status_code == 404
    assert client.put(f"/v1/me/saved-events/{event}", headers=a, json={"collectionId": id}).status_code == 200
    assert client.delete(f"/v1/me/event-collections/{id}", headers=b).status_code == 404
    assert client.delete(f"/v1/me/event-collections/{id}", headers=a).status_code == 204
    assert len(client.get("/v1/me/saved-events", headers=a).json()["items"]) == 1
    assert client.get("/v1/me/saved-events", headers=b).json()["items"] == []


def test_post_privacy_blocks_and_comment_tombstones(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    private = client.post(
        "/v1/posts",
        headers={**a, "Idempotency-Key": "private"},
        json={"body": "private text", "visibility": "private"},
    )
    assert private.status_code == 201, private.text
    assert client.get(f"/v1/posts/{private.json()['id']}", headers=b).status_code == 404
    public = client.post("/v1/posts", headers={**a, "Idempotency-Key": "public"}, json={"body": "public text"}).json()[
        "id"
    ]
    comment = client.post(
        f"/v1/posts/{public}/comments",
        headers={**b, "Idempotency-Key": "comment"},
        json={"body": "hi"},
    )
    assert comment.status_code == 201, comment.text
    reply = client.post(
        f"/v1/posts/{public}/comments",
        headers={**a, "Idempotency-Key": "reply"},
        json={"body": "reply", "parentId": comment.json()["id"]},
    )
    assert reply.status_code == 201
    assert client.delete(f"/v1/comments/{comment.json()['id']}", headers=a).status_code == 404
    assert client.delete(f"/v1/comments/{comment.json()['id']}", headers=b).status_code == 204
    listed = client.get(f"/v1/posts/{public}/comments", headers=a).json()["items"]
    assert len(listed) == 2
    assert next(c for c in listed if c["id"] == comment.json()["id"])["body"] == ""
    assert client.put(f"/v1/me/blocks/{users['bob']['id']}", headers=a).status_code == 204
    assert client.get(f"/v1/posts/{public}", headers=b).status_code == 404
    assert (
        client.post(
            f"/v1/posts/{public}/comments",
            headers={**b, "Idempotency-Key": "blocked"},
            json={"body": "no"},
        ).status_code
        == 404
    )


def test_messages_sequence_retry_membership_and_block(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    a, b, e = (users[n]["headers"] for n in ["alice", "bob", "eve"])
    response = client.post("/v1/conversations", headers=a, json={"recipientId": users["bob"]["id"]})
    assert response.status_code == 201, response.text
    id = response.json()["id"]
    assert client.get(f"/v1/conversations/{id}/messages", headers=e).status_code == 404
    data = {"clientMessageId": str(uuid4()), "text": "Xin chào"}
    with ThreadPoolExecutor(max_workers=2) as pool:
        result = list(
            pool.map(
                lambda _: client.post(f"/v1/conversations/{id}/messages", headers=a, json=data),
                range(2),
            )
        )
    assert all(r.status_code == 201 for r in result), [r.text for r in result]
    assert result[0].json() == result[1].json()
    assert scalar(owner, "select count(*) from app_private.messages") == 1
    assert (
        client.post(f"/v1/conversations/{id}/messages", headers=a, json={**data, "text": "different"}).status_code
        == 409
    )
    assert client.put(f"/v1/conversations/{id}/read", headers=b, json={"lastReadSequence": 2}).status_code == 422
    assert client.put(f"/v1/conversations/{id}/read", headers=b, json={"lastReadSequence": 1}).status_code == 204
    assert client.put(f"/v1/conversations/{id}/read", headers=b, json={"lastReadSequence": 0}).status_code == 204
    assert (
        scalar(
            owner,
            "select last_read_sequence from app_private.conversation_members "
            "where conversation_id=:id and user_id=:uid",
            id=id,
            uid=users["bob"]["id"],
        )
        == 1
    )
    client.put(f"/v1/me/blocks/{users['alice']['id']}", headers=b)
    assert client.get(f"/v1/conversations/{id}/messages", headers=a).status_code == 404


def test_route_reorder_keeps_stop_ids_and_owner(client: TestClient, users: dict[str, Any]) -> None:
    a, b = users["alice"]["headers"], users["bob"]["headers"]
    points = [p["id"] for p in client.get("/v1/collection-points").json()["items"][:2]]
    created = client.post("/v1/routes", headers={**a, "Idempotency-Key": "route"}, json={"stopIds": points})
    assert created.status_code == 201, created.text
    original = created.json()
    assert client.get(f"/v1/routes/{original['id']}", headers=b).status_code == 404
    updated = client.patch(
        f"/v1/routes/{original['id']}",
        headers=a,
        json={"stopIds": points[::-1], "expectedVersion": 1},
    )
    assert updated.status_code == 200, updated.text
    assert [s["id"] for s in updated.json()["stops"]] == [s["id"] for s in original["stops"]][::-1]
    assert updated.json()["totalDistanceM"] is None
    assert (
        client.patch(
            f"/v1/routes/{original['id']}",
            headers=a,
            json={"stopIds": points, "expectedVersion": 1},
        ).status_code
        == 409
    )


def test_moderation_scope_no_self_review_and_audit(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    point = str(fixture_id("point", "green-hub"))
    created = client.post(
        f"/v1/collection-points/{point}/reports",
        headers={**users["alice"]["headers"], "Idempotency-Key": "report"},
        json={
            "issueTypes": ["full"],
            "description": "test",
            "observedAt": datetime.now(UTC).isoformat(),
        },
    )
    assert created.status_code == 201, created.text
    id = created.json()["id"]
    path, body = (
        f"/v1/admin/point-reports/{id}/decision",
        {"decision": "approve", "reason": "checked", "expectedVersion": 1},
    )
    assert client.post(path, headers=users["bob"]["headers"], json=body).status_code == 403
    with owner.begin() as conn:
        for name in ["alice", "bob"]:
            conn.execute(
                text("insert into app_private.user_roles values (:uid,'moderator')"),
                {"uid": users[name]["id"]},
            )
    assert client.post(path, headers=users["alice"]["headers"], json=body).status_code == 403
    result = client.post(path, headers=users["bob"]["headers"], json=body)
    assert result.status_code == 200, result.text
    assert_pinned("ReviewResult", result.json())
    assert client.post(path, headers=users["bob"]["headers"], json=body).status_code == 409
    assert scalar(owner, "select count(*) from app_private.audit_logs") == 1
    assert client.get(f"/v1/collection-points/{point}").json()["capacityState"] == "unknown"


def test_worker_redelivery_and_notification_ownership(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
    database: tuple[Engine, Engine, str],
    settings: Settings,
) -> None:
    conversation = client.post(
        "/v1/conversations",
        headers=users["alice"]["headers"],
        json={"recipientId": users["bob"]["id"]},
    ).json()["id"]
    client.post(
        f"/v1/conversations/{conversation}/messages",
        headers=users["alice"]["headers"],
        json={"clientMessageId": str(uuid4()), "text": "hello"},
    )
    assert process_one(database[1], settings)
    assert scalar(owner, "select count(*) from app_private.notifications") == 1
    with owner.begin() as conn:
        conn.execute(text("update app_private.outbox_events set published_at=null"))
    assert process_one(database[1], settings)
    assert scalar(owner, "select count(*) from app_private.notifications") == 1
    inbox = client.get("/v1/me/notifications", headers=users["bob"]["headers"]).json()["items"]
    assert len(inbox) == 1
    id = inbox[0]["id"]
    assert (
        client.patch(f"/v1/me/notifications/{id}", headers=users["alice"]["headers"], json={"read": True}).status_code
        == 404
    )
    cutoff = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    assert (
        client.post(
            "/v1/me/notifications/read-all",
            headers=users["bob"]["headers"],
            json={"cutoff": cutoff},
        ).status_code
        == 204
    )
    assert scalar(owner, "select count(*) from app_private.notifications where read_at is null") == 1


@pytest.mark.parametrize("commit_number", [1, 2], ids=["claim", "publish"])
@pytest.mark.parametrize("committed", [False, True], ids=["rolled-back", "acknowledgement-lost"])
def test_worker_recovers_from_disconnect_during_commit(
    owner: Engine,
    database: tuple[Engine, Engine, str],
    settings: Settings,
    users: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
    commit_number: int,
    committed: bool,
) -> None:
    event_id = uuid4()
    with owner.begin() as conn:
        conn.execute(
            text("""insert into app_private.outbox_events(id,event_type,aggregate_id,payload)
              values (:id,'moderation.decided',:aggregate,cast(:payload as jsonb))"""),
            {"id": event_id, "aggregate": uuid4(), "payload": json.dumps({"userId": users["alice"]["id"]})},
        )

    runtime = database[1]
    original_commit = runtime.dialect.do_commit
    commits = 0

    def disconnect_on_commit(connection: Any) -> None:
        nonlocal commits
        commits += 1
        if commits == commit_number:
            if committed:
                original_commit(connection)
            connection.dbapi_connection.close()
            raise PsycopgOperationalError("server closed the connection unexpectedly")
        original_commit(connection)

    with monkeypatch.context() as patch:
        patch.setattr(runtime.dialect, "do_commit", disconnect_on_commit)
        with pytest.raises(OperationalError):
            process_one(runtime, settings)

    # Recover through the real loop with fresh connections and the durable lease.
    with owner.begin() as conn:
        conn.execute(text("update app_private.outbox_events set locked_until=now()-interval '1 second'"))
    from bluesteps_api import worker

    def stop_when_idle(seconds: float) -> None:
        raise KeyboardInterrupt

    monkeypatch.setattr(worker.time, "sleep", stop_when_idle)
    with pytest.raises(KeyboardInterrupt):
        worker.run_worker(runtime, settings)
    assert scalar(owner, "select count(*) from app_private.notifications where event_id=:id", id=event_id) == 1
    assert scalar(owner, "select count(*) from app_private.consumer_receipts where event_id=:id", id=event_id) == 1
    assert scalar(owner, "select published_at is not null from app_private.outbox_events where id=:id", id=event_id)
    assert scalar(owner, "select last_error_code from app_private.outbox_events where id=:id", id=event_id) is None


def test_database_runtime_grants_and_constraints(
    client: TestClient, users: dict[str, Any], owner: Engine, database: tuple[Engine, Engine, str]
) -> None:
    runtime = database[1]
    with runtime.connect() as conn:
        role = conn.execute(text("select rolsuper,rolbypassrls from pg_roles where rolname=current_user")).one()
        assert tuple(role) == (False, False)
    for query in [
        "update app_private.point_ledger set delta=999",
        "delete from app_private.audit_logs",
        "insert into app_private.user_roles values ('" + users["alice"]["id"] + "','admin')",
        "update app_private.rewards set cost_points=1",
    ]:
        with pytest.raises(DBAPIError), runtime.begin() as conn:
            conn.execute(text(query))
    for role in ["anon", "authenticated"]:
        with owner.connect() as conn:
            assert not conn.execute(
                text("select has_schema_privilege(:role,'app_private','USAGE')"), {"role": role}
            ).scalar_one()
            assert not conn.execute(
                text("select has_table_privilege(:role,'app_private.wallets','UPDATE')"),
                {"role": role},
            ).scalar_one()
        with pytest.raises(DBAPIError), owner.begin() as conn:
            conn.exec_driver_sql(f"SET LOCAL ROLE {role}")
            conn.execute(text("select * from app_private.wallets"))
    with pytest.raises(DBAPIError), owner.begin() as conn:
        conn.execute(text("update app_private.wallets set balance=-1"))


def test_unconfigured_assistant_never_commits_fake_success(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    client.app.state.settings = client.app.state.settings.model_copy(update={"openai_api_key": SecretStr("")})
    response = client.post(
        "/v1/assistant/conversations",
        headers=users["alice"]["headers"],
        json={"messages": [{"role": "user", "content": "Cách phân loại chai nhựa?"}]},
    )
    assert response.status_code == 503, response.text
    assert response.json()["error"]["code"] == "PROVIDER_UNAVAILABLE"
    assert scalar(owner, "select count(*) from app_private.redemptions") == 0
    assert scalar(owner, "select count(*) from app_private.point_ledger") == 0
