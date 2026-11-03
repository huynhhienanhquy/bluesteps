"""Start an isolated loopback API, exercise real HTTP + DB + local mail, then stop it."""

import json
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy import create_engine

from bluesteps_api.config import get_settings
from bluesteps_api.worker import process_one

settings = get_settings()
settings.validate_runtime()
if not settings.local_mail_directory or settings.environment == "production":
    raise ValueError("Smoke requires an explicit development mail sink")
with socket.socket() as probe:
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
process = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "uvicorn",
        "bluesteps_api.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--no-access-log",
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    creationflags=flags,
)
engine = create_engine(settings.database_url.get_secret_value(), hide_parameters=True)
try:
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as client:
        for _ in range(50):
            try:
                if client.get("/health/live").status_code == 200:
                    break
            except httpx.TransportError:
                pass
            time.sleep(0.1)
        ready = client.get("/health/ready")
        assert ready.status_code == 200, ready.text
        assert len(client.get("/v1/waste-items").json()["items"]) == 10
        email, password = f"smoke-{uuid4().hex}@example.com", secrets.token_urlsafe(24)
        registered = client.post(
            "/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "name": "Local smoke",
                "consentVersion": settings.terms_version,
            },
        )
        assert registered.status_code == 202, registered.text
        challenge_id = registered.json()["challengeId"]
        for _ in range(100):
            if not process_one(engine, settings):
                break
        mail = next(
            json.loads(path.read_text(encoding="utf-8"))
            for path in Path(settings.local_mail_directory).glob("*.json")
            if json.loads(path.read_text(encoding="utf-8")).get("challengeId") == challenge_id
        )
        assert (
            client.post(
                "/v1/auth/email-verification/verify", json={"challengeId": challenge_id, "code": mail["code"]}
            ).status_code
            == 204
        )
        login = client.post("/v1/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        headers = {"Authorization": "Bearer " + login.json()["accessToken"]}
        assert client.get("/v1/me/wallet", headers=headers).json()["balance"] == "0"
        refreshed = client.post("/v1/auth/refresh", json={"refreshToken": login.json()["refreshToken"]})
        assert refreshed.status_code == 200
        headers = {"Authorization": "Bearer " + refreshed.json()["accessToken"]}
        assert client.post("/v1/auth/logout", headers=headers).status_code == 204
        assert client.get("/v1/me", headers=headers).status_code == 401
        print(
            "HTTP smoke passed: live, ready, catalog, register, mail, verify, login, wallet, refresh, logout, revoke."
        )
finally:
    engine.dispose()
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
