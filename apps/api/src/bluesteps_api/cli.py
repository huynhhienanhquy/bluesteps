"""Local tooling; no cloud resources are created by these commands."""

import argparse
import hashlib
import json
import os
import secrets
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[4]


def migrate(url: str, *, allow_remote: bool = False, migration_dir: Path | None = None) -> None:
    parsed = make_url(url)
    if parsed.get_backend_name() != "postgresql":
        raise ValueError("Migrations require PostgreSQL")
    if parsed.host not in ("localhost", "127.0.0.1", "::1") and not allow_remote:
        raise ValueError("Remote migration requires an explicit --allow-remote")
    engine = create_engine(url, hide_parameters=True, connect_args={"prepare_threshold": None})
    try:
        with engine.begin() as connection:
            connection.execute(text("select pg_advisory_xact_lock(72192620261031)"))
            connection.exec_driver_sql("create schema if not exists bluesteps_migrations")
            connection.exec_driver_sql("revoke all on schema bluesteps_migrations from public")
            connection.exec_driver_sql("""create table if not exists bluesteps_migrations.applied
              (name text primary key,checksum text not null,applied_at timestamptz not null default now())""")
            for path in sorted((migration_dir or ROOT / "supabase/migrations").glob("*.sql")):
                sql = path.read_text(encoding="utf-8")
                checksum = hashlib.sha256(sql.encode()).hexdigest()
                previous = connection.execute(
                    text("select checksum from bluesteps_migrations.applied where name=:name"),
                    {"name": path.name},
                ).scalar_one_or_none()
                if previous:
                    if previous != checksum:
                        raise ValueError(f"Applied migration was modified: {path.name}")
                    continue
                connection.exec_driver_sql(sql, execution_options={"no_parameters": True})
                connection.execute(
                    text("insert into bluesteps_migrations.applied(name,checksum) values (:name,:checksum)"),
                    {"name": path.name, "checksum": checksum},
                )
                print(f"Applied {path.name}")
    finally:
        engine.dispose()


def generate_local_env(path: Path) -> None:
    if path.exists():
        raise ValueError("Refusing to overwrite existing configuration")
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    private = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    public = (
        key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    config = {
        "BLUESTEPS_ENVIRONMENT": "development",
        "BLUESTEPS_DATABASE_URL": "postgresql+psycopg://REPLACE_RUNTIME_LOGIN:REPLACE_PASSWORD@127.0.0.1:54322/postgres",
        "BLUESTEPS_JWT_PRIVATE_KEY": private,
        "BLUESTEPS_JWT_PUBLIC_KEY": public,
        "BLUESTEPS_JWT_KEY_ID": secrets.token_hex(16),
        "BLUESTEPS_OTP_PEPPER": secrets.token_urlsafe(48),
        "BLUESTEPS_CORS_ORIGINS": '["http://localhost:8081","http://127.0.0.1:8081","http://localhost:4173","http://127.0.0.1:4173"]',
        "BLUESTEPS_REGISTRATION_ENABLED": "true",
        "BLUESTEPS_LOCAL_MAIL_DIRECTORY": ".local/mail",
    }
    # python-dotenv accepts multiline values enclosed in single quotes.
    path.write_text("\n".join(f"{name}='{value}'" for name, value in config.items()) + "\n", encoding="utf-8")
    print(f"Created local configuration at {path.name}; set the runtime database URL before starting.")


def export_openapi(path: Path) -> None:
    from .main import create_app

    schema: dict[str, Any] = create_app().openapi()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Exported {len(schema['paths'])} paths")


def main() -> None:
    load_dotenv(override=False)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    migration = commands.add_parser("migrate")
    migration.add_argument("--allow-remote", action="store_true")
    env = commands.add_parser("init-local-env")
    env.add_argument("--output", type=Path, default=Path(".env"))
    export = commands.add_parser("export-openapi")
    export.add_argument("--output", type=Path, default=ROOT / "packages/api-client/openapi.json")
    seed_parser = commands.add_parser("seed-demo")
    seed_parser.add_argument("--confirm-local", action="store_true", required=True)
    args = parser.parse_args()
    if args.command == "migrate":
        migrate(os.environ["BLUESTEPS_MIGRATION_DATABASE_URL"], allow_remote=args.allow_remote)
    elif args.command == "init-local-env":
        generate_local_env(args.output)
    elif args.command == "export-openapi":
        export_openapi(args.output)
    elif args.command == "seed-demo":
        from .seed import seed

        seed(os.environ["BLUESTEPS_MIGRATION_DATABASE_URL"])


if __name__ == "__main__":
    main()
