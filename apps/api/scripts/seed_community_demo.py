"""Add a few community posts explicitly, without seeding other app data."""

import argparse
import json
from pathlib import Path
from uuid import UUID

from dotenv import dotenv_values
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

from bluesteps_api.community_demo import seed_community_demo, seed_personal_community_demo


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--user-id", type=UUID, help="Add personal demo views for this explicit account only")
    args = parser.parse_args()
    config = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
    if config.get("BLUESTEPS_ENVIRONMENT") not in ("development", "test"):
        raise ValueError("Community demo requires development/test")
    raw = config.get("BLUESTEPS_MIGRATION_DATABASE_URL") or ""
    url = make_url(raw)
    if url.host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        raise ValueError("Remote writes require --allow-remote")
    engine = create_engine(raw, hide_parameters=True, connect_args={"connect_timeout": 10, "prepare_threshold": None})
    try:
        with engine.begin() as conn:
            conn.exec_driver_sql("SET LOCAL lock_timeout='10s'")
            conn.exec_driver_sql("SET LOCAL statement_timeout='30s'")
            inserted = seed_community_demo(conn)
            personal = seed_personal_community_demo(conn, args.user_id) if args.user_id else None
            if args.dry_run:
                conn.rollback()
        print(
            json.dumps(
                {"dry_run": args.dry_run, "inserted": inserted, "personal_inserted": personal}, ensure_ascii=False
            )
        )
    finally:
        engine.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Database exception text can include credentials or content parameters.
        print(f"Community demo failed: {type(exc).__name__}")
        raise SystemExit(1) from None
