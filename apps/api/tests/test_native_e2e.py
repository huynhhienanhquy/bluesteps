"""Opt-in native -> HTTP -> isolated local database acceptance.

Requires the dedicated emulator, compatible Expo Go, completed guest onboarding,
and Metro on 8092 with EXPO_PUBLIC_API_URL=http://10.0.2.2:8093. Never uses cloud.
"""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.cli import ROOT
from bluesteps_api.config import Settings

pytestmark = [pytest.mark.postgres, pytest.mark.mobile_e2e]


@pytest.mark.skipif(os.environ.get("BLUESTEPS_RUN_NATIVE_E2E") != "1", reason="Opt in to native acceptance")
def test_native_insights_and_session(
    database: tuple[Engine, Engine, str],
    owner: Engine,
    settings: Settings,
    client: TestClient,
    users: dict[str, Any],
    tmp_path: Path,
) -> None:
    scope = os.environ.get("BLUESTEPS_NATIVE_QA_SCOPE", "scan")
    assert scope in ("scan", "handbook", "community", "composer", "chat", "routing", "planner")
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 8093))  # Refuse an occupied port before making any HTTP call.
    headers = users["alice"]["headers"]
    point = client.get("/v1/collection-points").json()["items"][0]
    second = client.get("/v1/collection-points").json()["items"][1]
    conversation_id = ""
    route_id = ""
    if scope in ("routing", "planner"):
        response = client.post(
            "/v1/routes",
            headers={**headers, "Idempotency-Key": str(uuid4())},
            json={"stopIds": [point["id"], second["id"]] if scope == "planner" else [point["id"]], "mode": "walking"},
        )
        assert response.status_code == 201
        route_id = response.json()["id"]
    if scope == "chat":
        response = client.post("/v1/conversations", headers=headers, json={"recipientId": users["bob"]["id"]})
        assert response.status_code == 201
        conversation_id = response.json()["id"]
        response = client.post(
            f"/v1/conversations/{conversation_id}/messages",
            headers=users["bob"]["headers"],
            json={"clientMessageId": str(uuid4()), "text": "Native incoming chat"},
        )
        assert response.status_code == 201
    if scope == "community":
        response = client.post(
            "/v1/posts",
            headers={**users["bob"]["headers"], "Idempotency-Key": str(uuid4())},
            json={"body": "Native community post", "topic": "Native recycling"},
        )
        assert response.status_code == 201
    item = client.get("/v1/waste-items").json()["items"][0]["id"]
    for weight in ["1.250", None]:
        response = client.post(
            "/v1/sorting-actions",
            headers={**headers, "Idempotency-Key": str(uuid4())},
            json={"source": "manual", "itemId": item, **({"reportedWeightKg": weight} if weight else {})},
        )
        assert response.status_code == 201
    prefs = client.get("/v1/me/preferences", headers=headers).json()
    assert (
        client.patch(
            "/v1/me/preferences",
            headers=headers,
            json={**prefs, "sound": False, "haptics": False, "expectedVersion": prefs["version"]},
        ).status_code
        == 200
    )
    env = os.environ.copy()
    env.update(
        {
            "BLUESTEPS_ENVIRONMENT": "test",
            "BLUESTEPS_DATABASE_URL": database[2],
            "BLUESTEPS_JWT_PRIVATE_KEY": settings.jwt_private_key.get_secret_value(),
            "BLUESTEPS_JWT_PUBLIC_KEY": settings.jwt_public_key,
            "BLUESTEPS_JWT_KEY_ID": settings.jwt_key_id,
            "BLUESTEPS_OTP_PEPPER": settings.otp_pepper.get_secret_value(),
            "BLUESTEPS_REGISTRATION_ENABLED": "false",
            "BLUESTEPS_NATIVE_QA_EMAIL": "alice@example.com",
            "BLUESTEPS_NATIVE_QA_PASSWORD": "fixture-password",
            "BLUESTEPS_NATIVE_QA_MEMBER_ID": users["bob"]["id"],
            "BLUESTEPS_NATIVE_QA_POINT_NAME": point["name"],
            "BLUESTEPS_NATIVE_QA_SECOND_POINT_NAME": second["name"],
            "BLUESTEPS_NATIVE_QA_CONVERSATION_ID": conversation_id,
            "BLUESTEPS_NATIVE_QA_ROUTE_ID": route_id,
            "BLUESTEPS_ROUTING_URL": "https://valhalla1.openstreetmap.de" if scope in ("routing", "planner") else "",
            "BLUESTEPS_NATIVE_QA_OUTPUT": str(ROOT / f"docs/figma-completion/{scope}-native-runtime"),
        }
    )
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    process = None
    try:
        with (tmp_path / "native-api.log").open("w", encoding="utf-8") as log:
            process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "bluesteps_api.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8093",
                    "--no-access-log",
                ],
                cwd=ROOT / "apps/api",
                env=env,
                stdout=log,
                stderr=log,
                creationflags=flags,
            )
            with httpx.Client(timeout=2) as transport:
                for _ in range(100):
                    assert process.poll() is None, "QA backend exited before readiness"
                    try:
                        if transport.get("http://127.0.0.1:8093/health/ready").status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    time.sleep(0.1)
                else:
                    pytest.fail("QA backend readiness timed out")
            output_parts = []

            def native(action: str) -> None:
                result = subprocess.run(
                    ["node", "apps/mobile/scripts/android-qa.cjs", action],
                    cwd=ROOT,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    creationflags=flags,
                    timeout=600 if action in ("composer", "chat") else 420,
                )
                output = result.stdout.replace("fixture-password", "[redacted]")
                output_parts.append(output)
                (ROOT / f"docs/figma-completion/{scope}-native-actions.log").write_text(
                    "\n".join(output_parts), encoding="utf-8"
                )
                encoding = sys.stdout.encoding or "utf-8"
                print(output.encode(encoding, errors="backslashreplace").decode(encoding), flush=True)
                result.check_returncode()

            if scope not in ("community", "composer", "chat", "routing", "planner"):
                native("integration")
            native(scope)
            # Independent committed state, not UI labels or intercepted responses.
            with owner.connect() as db:
                if scope in ("routing", "planner"):
                    route = db.execute(text("select status,mode,plan,material_ids from app_private.routes")).one()
                    assert route.status == "active" and route.mode == "motorcycling"
                    assert route.plan["provider"] == "Valhalla"
                    assert route.plan["totalDistanceM"] > 0 and route.plan["totalDurationS"] > 0
                    assert len(route.plan["legs"]) == (2 if scope == "planner" else 1)
                    assert len(route.plan["legs"][0]["geometry"]) > 1
                    if scope == "planner":
                        order = (
                            db.execute(text("select point_id from app_private.route_stops order by position"))
                            .scalars()
                            .all()
                        )
                        assert [str(id) for id in order] == [second["id"], point["id"]]
                        assert len(route.material_ids) == 1
                    assert db.exec_driver_sql("select count(*) from app_private.handovers").scalar_one() == 0
                    return
                if scope == "chat":
                    for table, count in [
                        ("messages", 3),
                        ("message_media", 1),
                        ("media_assets", 1),
                        ("media_chunks", 0),
                        ("posts", 0),
                        ("point_ledger", 2),
                    ]:
                        assert db.exec_driver_sql(f"select count(*) from app_private.{table}").scalar_one() == count
                    asset = db.execute(
                        text(
                            "select kind,width,height,size,octet_length(content) as bytes from app_private.media_assets"
                        )
                    ).one()
                    assert asset.kind == "image" and asset.width > 0 and asset.height > 0 and asset.size == asset.bytes
                    assert (
                        db.execute(text("select body from app_private.messages where sequence=2")).scalar_one() == "💚"
                    )
                    return
                if scope == "composer":
                    for table, count in [
                        ("posts", 1),
                        ("media_assets", 1),
                        ("post_media", 1),
                        ("media_chunks", 0),
                        ("post_drafts", 0),
                        ("friendships", 0),
                        ("scans", 0),
                        ("sorting_actions", 2),
                        ("point_ledger", 2),
                    ]:
                        assert db.exec_driver_sql(f"select count(*) from app_private.{table}").scalar_one() == count
                    post = db.execute(text("select body,visibility,emotion,place from app_private.posts")).one()
                    assert (
                        post.body == "Native composer post" and post.visibility == "friends" and post.emotion == "happy"
                    )
                    assert post.place["pointId"] == point["id"]
                    media = db.execute(
                        text(
                            """select kind,width,height,completed_at,size,octet_length(content) as bytes
                            from app_private.media_assets"""
                        )
                    ).one()
                    assert media.kind == "image" and media.width > 0 and media.height > 0
                    assert media.completed_at and media.size == media.bytes and media.size > 100
                    return
                if scope == "community":
                    for table, count in [
                        ("posts", 1),
                        ("member_follows", 0),
                        ("hidden_posts", 0),
                        ("saved_posts", 0),
                        ("blocks", 0),
                        ("scans", 0),
                        ("sorting_actions", 2),
                        ("point_ledger", 2),
                    ]:
                        assert db.exec_driver_sql(f"select count(*) from app_private.{table}").scalar_one() == count
                    return
                goal = db.execute(
                    text("select title,target,metric from app_private.personal_targets where user_id=:id"),
                    {"id": users["alice"]["id"]},
                ).one()
                assert goal.title == "Native target" and goal.target == 10 and goal.metric == "sorting_actions"
                assert (
                    db.execute(
                        text("select opted_in from app_private.leaderboard_preferences where user_id=:id"),
                        {"id": users["alice"]["id"]},
                    ).scalar_one()
                    is True
                )
                assert db.execute(
                    text("select count(*) from app_private.sorting_actions where user_id=:id"),
                    {"id": users["alice"]["id"]},
                ).scalar_one() == (3 if scope == "scan" else 2)
                if scope == "handbook":
                    assert db.execute(text("select count(*) from app_private.scans")).scalar_one() == 0
                    assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 2
                    return
                scan = db.execute(
                    text("""select id,input_kind,confirmation_snapshot->'award'->>'points' as points
                    from app_private.scans where user_id=:uid"""),
                    {"uid": users["alice"]["id"]},
                ).one()
                assert scan.input_kind == "camera" and scan.points == "5"
                env["BLUESTEPS_NATIVE_QA_SCAN_ID"] = str(scan.id)
            native("scan-restore")
            assert client.get("/v1/me/targets", headers=headers).json()[0]["progress"] == "3"
    finally:
        if process is not None:
            process.terminate()
            process.wait(timeout=15)
