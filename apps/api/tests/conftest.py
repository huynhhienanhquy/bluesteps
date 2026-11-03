import json
import os
import secrets
from collections.abc import Iterator
from typing import Any
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from bluesteps_api.cli import ROOT, migrate
from bluesteps_api.config import Settings
from bluesteps_api.db import run
from bluesteps_api.handbook import HandbookGuide
from bluesteps_api.main import create_app
from bluesteps_api.security import passwords
from bluesteps_api.seed import fixture_id, seed_data


@pytest.fixture(scope="session")
def settings() -> Settings:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    public = (
        key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    return Settings(
        _env_file=None,
        environment="test",
        jwt_private_key=SecretStr(private),
        jwt_public_key=public,
        jwt_key_id="test-key",
        otp_pepper=SecretStr(secrets.token_hex(32)),
    )


@pytest.fixture(scope="session")
def database() -> Iterator[tuple[Engine, Engine, str]]:
    base_url = os.environ.get("BLUESTEPS_TEST_ADMIN_URL")
    if not base_url:
        pytest.skip("Set BLUESTEPS_TEST_ADMIN_URL to a local disposable PostgreSQL/PostGIS instance")
    base = make_url(base_url)
    if base.host not in ("localhost", "127.0.0.1", "::1"):
        pytest.fail("Integration tests refuse remote PostgreSQL")
    name, login, password = (
        "bluesteps_test_" + uuid4().hex,
        "bs_test_" + uuid4().hex,
        secrets.token_hex(24),
    )
    admin = create_engine(
        base_url, isolation_level="AUTOCOMMIT", hide_parameters=True, connect_args={"connect_timeout": 5}
    )
    with admin.connect() as conn:
        conn.exec_driver_sql(f'CREATE DATABASE "{name}"')
        # Names are generated internally from hex UUIDs, not supplied by test callers.
        conn.exec_driver_sql(f"CREATE ROLE {login} LOGIN PASSWORD '{password}' NOSUPERUSER NOBYPASSRLS")
        for role in ["anon", "authenticated"]:
            if not conn.execute(text("select 1 from pg_roles where rolname=:name"), {"name": role}).first():
                conn.exec_driver_sql(f"CREATE ROLE {role} NOLOGIN")
    owner_url = base.set(database=name).render_as_string(hide_password=False)
    runtime_url = base.set(database=name, username=login, password=password).render_as_string(hide_password=False)
    owner = create_engine(owner_url, hide_parameters=True)
    runtime = create_engine(runtime_url, hide_parameters=True, pool_size=10)
    try:
        migrate(owner_url)
        migrate(owner_url)  # Reapplying must be a no-op with matching checksums.
        with admin.connect() as conn:
            conn.exec_driver_sql(f"GRANT bluesteps_runtime TO {login}")
        yield owner, runtime, runtime_url
    finally:
        runtime.dispose()
        owner.dispose()
        with admin.connect() as conn:
            conn.exec_driver_sql(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
            conn.exec_driver_sql(f"DROP ROLE IF EXISTS {login}")
        admin.dispose()


@pytest.fixture
def owner(database: tuple[Engine, Engine, str]) -> Engine:
    owner = database[0]
    with owner.begin() as conn:
        names = conn.execute(text("select tablename from pg_tables where schemaname='app_private'")).scalars()
        quoted = ",".join('app_private."' + name.replace('"', '""') + '"' for name in names)
        conn.exec_driver_sql(f"TRUNCATE {quoted} CASCADE")
    with Session(owner) as db, db.begin():
        seed_data(db)
        for content in json.loads((ROOT / "apps/api/content/handbook.json").read_text(encoding="utf-8")):
            reference = HandbookGuide.model_validate(content)
            run(
                db,
                """insert into app_private.handbook_guides(section,code,content,published)
                values (:section,:code,cast(:content as jsonb),true)""",
                section=reference.section,
                code=reference.code,
                content=reference.model_dump_json(by_alias=True),
            )
        # The per-test truncate also clears migration-owned program configuration.
        run(
            db,
            """insert into app_private.reward_program
            (id,version,daily_points,sorting_points,level_thresholds)
            values (true,'test-v1','[2,2,3,5,3,5,10]',
            cast(:sorting as jsonb),'[100,200,350,500,700]')""",
            sorting='{"recycle":5,"inorganic":2,"organic":3}',
        )
        # Test-only approved records; production synthetic seeds remain hidden.
        for table in ("waste_items", "collection_points", "events", "articles", "rewards"):
            run(db, f"update app_private.{table} set synthetic=false")
    return owner


@pytest.fixture
def client(database: tuple[Engine, Engine, str], owner: Engine, settings: Settings) -> Iterator[TestClient]:
    config = settings.model_copy(update={"database_url": SecretStr(database[2])})
    with TestClient(create_app(config, engine=database[1])) as client:
        yield client


@pytest.fixture(scope="session")
def hashed_password() -> str:
    return passwords.hash("fixture-password")


@pytest.fixture
def users(client: TestClient, owner: Engine, hashed_password: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    with Session(owner) as db, db.begin():
        for name in ("alice", "bob", "eve"):
            id = fixture_id("user", name)
            run(
                db,
                """insert into app_private.users(id,email_normalized,password_hash,status,email_verified_at)
              values (:id,:email,:hash,'active',now())""",
                id=id,
                email=f"{name}@example.com",
                hash=hashed_password,
            )
            run(
                db,
                "insert into app_private.profiles(user_id,display_name) values (:id,:name)",
                id=id,
                name=name,
            )
            run(db, "insert into app_private.wallets(user_id) values (:id)", id=id)
            run(db, "insert into app_private.user_preferences(user_id) values (:id)", id=id)
            result[name] = {"id": str(id)}
    for name in result:
        response = client.post("/v1/auth/login", json={"email": f"{name}@example.com", "password": "fixture-password"})
        assert response.status_code == 200, response.text
        result[name].update(response.json())
        result[name]["headers"] = {"Authorization": "Bearer " + response.json()["accessToken"]}
    return result
