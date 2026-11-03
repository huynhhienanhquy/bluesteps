"""Read back the display dataset through the real API; use a temporary, revocable QA session."""

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from bluesteps_api.config import Settings
from bluesteps_api.security import issue_pair

ROOT = Path(__file__).resolve().parents[3]
SESSION_FILE = ROOT / "apps/api/.local/display-qa-session.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email")
    parser.add_argument("--revoke", action="store_true")
    parser.add_argument("--session-only", action="store_true")
    args = parser.parse_args()
    settings = Settings()
    if settings.environment not in ("development", "test"):
        raise ValueError("QA session requires development/test configuration")
    config = dotenv_values(ROOT / "apps/api/.env")
    engine = create_engine(
        config["BLUESTEPS_MIGRATION_DATABASE_URL"] or "",
        hide_parameters=True,
        connect_args={"connect_timeout": 10, "prepare_threshold": None},
    )
    if args.revoke:
        if SESSION_FILE.exists():
            saved = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
            with engine.begin() as conn:
                conn.execute(
                    text("update app_private.sessions set revoked_at=now() where id=:id"), {"id": saved["sessionId"]}
                )
            SESSION_FILE.unlink()
        engine.dispose()
        print("Temporary display QA session revoked.")
        return
    if not args.email:
        parser.error("--email is required")
    if SESSION_FILE.exists():
        raise ValueError("Revoke the previous QA session before creating another")
    session_id = uuid4()
    with Session(engine) as db, db.begin():
        uid = db.execute(
            text("select id from app_private.users where email_normalized=:email and status='active'"),
            {"email": args.email.casefold()},
        ).scalar_one()
        db.execute(
            text("""insert into app_private.sessions(id,user_id,device_label,expires_at)
                        values (:id,:uid,'[QA] Display verification',:expires)"""),
            {"id": session_id, "uid": uid, "expires": datetime.now(UTC) + timedelta(hours=1)},
        )
        pair = issue_pair(db, settings, uid, session_id)
    # Credentials stay in the ignored .local directory, never in the evidence report.
    SESSION_FILE.write_text(json.dumps(pair), encoding="utf-8")
    if args.session_only:
        engine.dispose()
        print("Temporary browser QA session ready.")
        return
    results: list[dict[str, Any]] = []
    with httpx.Client(
        base_url="http://127.0.0.1:8000", timeout=40, headers={"Authorization": "Bearer " + pair["accessToken"]}
    ) as client:

        def get(path: str, minimum: int | None = None) -> Any:
            response = client.get(path)
            if response.status_code != 200:
                raise ValueError(f"API failed at {path}: {response.status_code}")
            body = response.json()
            count = len(body.get("items", [])) if isinstance(body, dict) and "items" in body else None
            if minimum is not None and (count is None or count < minimum):
                raise ValueError(f"Missing display data at {path}")
            results.append({"path": path, "status": 200, "items": count})
            return body

        get("/health/ready")
        for resource, minimum in [
            ("waste-items", 9),
            ("waste-categories", 3),
            ("waste-materials", 7),
            ("collection-points", 3),
            ("articles", 3),
            ("events", 3),
            ("rewards", 3),
        ]:
            body = get(f"/v1/{resource}", minimum)
            if resource == "waste-categories":
                for category in body["items"]:
                    get(f"/v1/waste-items?category={category['id']}", 3)
            if resource not in ("waste-categories", "waste-materials"):
                for item in body["items"]:
                    get(f"/v1/{resource}/{item['id']}")
                    if resource == "collection-points":
                        get(f"/v1/{resource}/{item['id']}/reviews", 1)
                    if resource == "articles":
                        get(f"/v1/{resource}/{item['id']}/comments", 1)
        for resource, minimum in [
            ("saved-events", 3),
            ("saved-articles", 3),
            ("saved-posts", 3),
            ("activity", 3),
            ("notifications", 3),
            ("point-transactions", 4),
            ("redemptions", 3),
        ]:
            get(f"/v1/me/{resource}", minimum)
        get("/v1/me")
        wallet = get("/v1/me/wallet")
        statistics = get("/v1/me/statistics")
        if statistics["sortingActions"] < 3:
            raise ValueError("Sorting statistics not populated")
        collections = get("/v1/me/event-collections", 3)
        for collection in collections["items"]:
            get(f"/v1/me/event-collections/{collection['id']}/events", 1)
        for route in get("/v1/me/routes", 3)["items"]:
            route_detail = get(f"/v1/routes/{route['id']}")
            if len(route_detail["stops"]) < 3:
                raise ValueError("Route stops missing")
        for conversation in get("/v1/conversations", 3)["items"]:
            if len(conversation["members"]) < 2:
                raise ValueError("Conversation membership missing")
            get(f"/v1/conversations/{conversation['id']}/messages", 3)
        now = datetime.now(UTC)
        start, end = now.date().isoformat(), (now + timedelta(days=30)).date().isoformat()
        get(f"/v1/me/calendar?start={start}T00:00:00Z&end={end}T00:00:00Z", 3)
        get("/v1/posts", 3)
        get("/v1/article-topics", 3)
    engine.dispose()
    report = {
        "verified_at": datetime.now(UTC).isoformat(),
        "requests_passed": len(results),
        "wallet_balance": wallet["balance"],
        "sorting_actions": statistics["sortingActions"],
        "results": results,
    }
    (ROOT / "docs/display-api-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Real API verification passed: {len(results)} requests; temporary browser QA session ready.")


if __name__ == "__main__":
    main()
