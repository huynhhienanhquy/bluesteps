"""Insert three sample rows into every app_private table, without replacing existing data.

Run from apps/api: .venv/Scripts/python.exe scripts/seed_sample.py --allow-remote
Use --dry-run to validate all constraints and roll back. Never called by app startup.
"""

import argparse
import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

import psycopg
from argon2 import PasswordHasher
from dotenv import dotenv_values
from psycopg import sql
from psycopg.types.json import Jsonb
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[3]
SCHEMA = "app_private"
PREFIX = "bluesteps:sample:v1"
ANCHOR = datetime(2026, 11, 2, tzinfo=UTC)


def sample_id(table: str, index: int) -> UUID:
    return uuid5(NAMESPACE_URL, f"{PREFIX}:{table}:{index}")


def build_rows() -> dict[str, list[dict[str, Any]]]:
    tables: dict[str, list[dict[str, Any]]] = {}
    hasher = PasswordHasher()

    def add(table: str, **values: Any) -> None:
        tables.setdefault(table, []).append(values)

    for i in range(1, 4):
        uid = sample_id("users", i)
        post = sample_id("posts", i)
        article = sample_id("articles", i)
        point = sample_id("collection_points", i)
        material = sample_id("waste_materials", i)
        item = sample_id("waste_items", i)
        reward = sample_id("rewards", i)
        event = sample_id("events", i)
        conversation = sample_id("conversations", i)
        outbox = sample_id("outbox_events", i)
        cost = i * 100
        name = ("An", "Bình", "Chi")[i - 1]
        category_name = ("Nhựa tái chế", "Giấy tái chế", "Kim loại tái chế")[i - 1]
        material_name = ("Nhựa PET", "Giấy carton", "Nhôm")[i - 1]
        item_name = ("Chai nhựa", "Thùng giấy", "Lon nhôm")[i - 1]
        topic = ("sorting", "reduce", "community")[i - 1]
        # Each inaccessible account has an independently generated, discarded password.
        add(
            "users",
            id=uid,
            email_normalized=f"sample.{i}@bluesteps.example.invalid",
            password_hash=hasher.hash(secrets.token_urlsafe(48)),
            status="locked",
            email_verified_at=ANCHOR - timedelta(days=2),
            created_at=ANCHOR - timedelta(days=30),
        )
        add(
            "profiles",
            user_id=uid,
            display_name=f"{name}",
            country_code="VN",
            bio="Tài khoản bị khóa, dùng để minh họa dữ liệu.",
        )
        add(
            "user_preferences",
            user_id=uid,
            theme=("system", "light", "dark")[i - 1],
            locale="vi",
            interests=["sorting", "collection"],
            goal=topic,
        )
        add(
            "consent_records",
            id=sample_id("consent_records", i),
            user_id=uid,
            purpose="terms",
            policy_version="sample-v1",
            accepted_at=ANCHOR - timedelta(days=30),
        )
        add(
            "sessions",
            id=sample_id("sessions", i),
            user_id=uid,
            device_label="Phiên đã thu hồi",
            created_at=ANCHOR - timedelta(days=2),
            expires_at=ANCHOR - timedelta(days=1),
            revoked_at=ANCHOR - timedelta(days=1),
        )
        add(
            "refresh_tokens",
            id=sample_id("refresh_tokens", i),
            session_id=sample_id("sessions", i),
            token_hash=secrets.token_hex(32),
            issued_at=ANCHOR - timedelta(days=2),
            expires_at=ANCHOR - timedelta(days=1),
            consumed_at=ANCHOR - timedelta(days=1),
        )
        recipient = hashlib.sha256(f"{PREFIX}:recipient:{i}".encode()).hexdigest()
        add(
            "auth_challenges",
            id=sample_id("auth_challenges", i),
            user_id=uid,
            recipient_hash=recipient,
            purpose="verify_email",
            code_hmac=secrets.token_hex(32),
            expires_at=ANCHOR - timedelta(days=1),
            consumed_at=ANCHOR - timedelta(days=1),
        )
        add("auth_recipient_cooldowns", recipient_hash=recipient, next_allowed_at=ANCHOR - timedelta(days=1))
        add("rate_limits", scope="sample-v1", subject_hash=recipient, bucket=0, attempts=i)
        add("user_roles", user_id=uid, role="editor")
        add(
            "audit_logs",
            id=sample_id("audit_logs", i),
            actor_id=uid,
            action="sample.created",
            target_id=post,
            reason="Dữ liệu",
            request_id=f"sample-v1-{i}",
        )
        add(
            "outbox_events",
            id=outbox,
            aggregate_id=sample_id("point_proposals", i),
            event_type="moderation.decided",
            payload={"userId": str(uid), "sample": True},
            occurred_at=ANCHOR,
            available_at=ANCHOR,
            published_at=ANCHOR,
            attempt_count=1,
        )
        add("consumer_receipts", consumer="inbox-v1", event_id=outbox, processed_at=ANCHOR)
        add(
            "idempotency_records",
            actor_id=uid,
            operation="sample.preview",
            key=f"sample-v1-{i}",
            request_hash=recipient,
            response_safe={"sample": True, "id": str(post)},
        )
        add(
            "waste_categories",
            id=sample_id("waste_categories", i),
            code=f"sample-category-{i}",
            name=f"{category_name}",
            sort_order=100 + i,
        )
        add("waste_materials", id=material, code=f"sample-material-{i}", name=f"{material_name}")
        add(
            "waste_items",
            id=item,
            code=f"sample-item-{i}",
            name=f"{item_name}",
            category_id=sample_id("waste_categories", i),
            material_id=material,
            steps=["Phân loại riêng.", "Làm sạch và để khô.", "Mang đến điểm thu gom phù hợp."],
            sources=[{"title": "Nội dung, cần xác minh trước khi áp dụng"}],
            synthetic=True,
            published=True,
        )
        add("scans", id=sample_id("scans", i), user_id=uid, status="completed")
        add(
            "sorting_actions",
            id=sample_id("sorting_actions", i),
            user_id=uid,
            item_id=item,
            scan_id=sample_id("scans", i),
            source="scan",
            evidence_status="user_confirmed",
        )
        # Snapshot of an account with 1,000 historical opening points and one recent debit.
        # The sample deliberately covers only three recent ledger entries, not full history.
        add("wallets", user_id=uid, balance=1000 - cost, lifetime_earned=1000)
        add(
            "point_ledger",
            id=sample_id("point_ledger", i),
            user_id=uid,
            delta=-cost,
            balance_after=1000 - cost,
            entry_kind="spend",
            source_type="redemption",
            source_id=sample_id("redemptions", i),
        )
        add(
            "rewards",
            id=reward,
            code=f"sample-reward-{i}",
            name=f"{('Túi vải', 'Bình nước', 'Hộp đựng tái sử dụng')[i - 1]}",
            description="Phần thưởng minh họa, không phải ưu đãi hoặc hàng tồn thực tế.",
            category="Đồ dùng xanh",
            cost_points=cost,
            state="published",
            synthetic=True,
        )
        add("reward_inventory", reward_id=reward, on_hand=10, reserved=1)
        add(
            "redemptions",
            id=sample_id("redemptions", i),
            user_id=uid,
            reward_id=reward,
            quantity=1,
            unit_cost_snapshot=cost,
            total_cost=cost,
            status="reserved",
            original_debit_id=sample_id("point_ledger", i),
        )
        add(
            "collection_points",
            id=point,
            code=f"sample-point-{i}",
            name=f"Điểm thu gom {i}",
            address=f"Địa chỉ minh họa {i}, không phải điểm tiếp nhận thực tế",
            area="Đà Nẵng",
            latitude=16.05 + i * 0.01,
            longitude=108.20 + i * 0.01,
            hours="08:00–17:00 (minh họa)",
            published=True,
            synthetic=True,
        )
        add("point_materials", point_id=point, material_id=material)
        add(
            "point_reviews",
            id=sample_id("point_reviews", i),
            point_id=point,
            user_id=uid,
            rating=i + 2,
            body=f"Đánh giá điểm thu gom {i}.",
            state="published",
        )
        add(
            "point_proposals",
            id=sample_id("point_proposals", i),
            submitted_by=uid,
            name=f"Đề xuất điểm {i}",
            address="Địa chỉ minh họa",
            latitude=16.10 + i * 0.01,
            longitude=108.20,
            material_ids=[str(material)],
            state="submitted",
        )
        add(
            "point_reports",
            id=sample_id("point_reports", i),
            point_id=point,
            submitted_by=uid,
            issue_types=["other"],
            description="Cần kiểm tra giờ tiếp nhận.",
            observed_at=ANCHOR,
        )
        add(
            "routes",
            id=sample_id("routes", i),
            user_id=uid,
            mode=("walking", "cycling", "driving")[i - 1],
            status="completed",
        )
        add(
            "route_stops",
            id=sample_id("route_stops", i),
            route_id=sample_id("routes", i),
            point_id=point,
            position=0,
            status="self_reported",
        )
        add("handovers", id=sample_id("handovers", i), user_id=uid, stop_id=sample_id("route_stops", i))
        add(
            "events",
            id=event,
            code=f"sample-event-{i}",
            title=f"{('Ngày hội phân loại rác', 'Đổi giấy lấy cây', 'Làm sạch khu phố')[i - 1]}",
            description="Sự kiện minh họa, không mở đăng ký thực tế.",
            location="Địa điểm, Đà Nẵng",
            topic=topic,
            starts_at=ANCHOR + timedelta(days=7 + i, hours=1),
            ends_at=ANCHOR + timedelta(days=7 + i, hours=4),
            capacity=50,
            details={"sample": True},
            published=True,
            synthetic=True,
        )
        add("event_collections", id=sample_id("event_collections", i), user_id=uid, name=f"Sự kiện của {name}")
        add("saved_events", user_id=uid, event_id=event, collection_id=sample_id("event_collections", i))
        add(
            "articles",
            id=article,
            code=f"sample-article-{i}",
            title=f"Cách phân loại {item_name.lower()}",
            summary="Bài viết minh họa cho dữ liệu BlueSteps.",
            topic=topic,
            blocks=[{"type": "paragraph", "text": "Nội dung: phân loại riêng, làm sạch và để khô."}],
            sources=[{"title": "Nội dung minh họa"}],
            published=True,
            synthetic=True,
        )
        add("saved_articles", user_id=uid, article_id=article)
        add("article_reactions", user_id=uid, article_id=article)
        add("followed_topics", user_id=uid, topic=topic)
        add(
            "posts",
            id=post,
            user_id=uid,
            body=f"{name} vừa phân loại {item_name.lower()} hôm nay.",
            visibility="public",
        )
        add("blocks", user_id=uid, blocked_user_id=sample_id("users", i % 3 + 1))
        add("reactions", user_id=uid, post_id=post)
        add("saved_posts", user_id=uid, post_id=post)
        add(
            "comments",
            id=sample_id("comments", i),
            user_id=uid,
            post_id=post,
            body="Cùng duy trì thói quen phân loại mỗi ngày!",
        )
        # One-member preview conversations keep the exact three-row-per-table contract.
        # These are isolated samples, not real two-person direct conversations.
        add("conversations", id=conversation, direct_key=f"sample-v1:preview:{i}", last_sequence=1)
        add("conversation_members", conversation_id=conversation, user_id=uid, last_read_sequence=1)
        add(
            "messages",
            id=sample_id("messages", i),
            conversation_id=conversation,
            user_id=uid,
            client_message_id=sample_id("client_messages", i),
            sequence=1,
            body="Tin nhắn xem trước dữ liệu.",
        )
        add(
            "notifications",
            id=sample_id("notifications", i),
            user_id=uid,
            event_id=outbox,
            title="Thông báo BlueSteps",
            body="Thông báo minh họa, không phát sinh email hay push.",
        )
    return tables


def counts_query(tables: dict[str, list[dict[str, Any]]], keys: dict[str, list[str]]) -> tuple[sql.Composed, list[Any]]:
    parts = []
    params: list[Any] = []
    for table, records in tables.items():
        predicates = []
        for record in records:
            predicates.append(
                sql.SQL("({})").format(
                    sql.SQL(" AND ").join(sql.SQL("{} = %s").format(sql.Identifier(key)) for key in keys[table])
                )
            )
            params.extend(record[key] for key in keys[table])
        parts.append(
            sql.SQL("SELECT {} AS name, count(*) AS total, count(*) FILTER (WHERE {}) AS samples FROM {}.{}").format(
                sql.Literal(table), sql.SQL(" OR ").join(predicates), sql.Identifier(SCHEMA), sql.Identifier(table)
            )
        )
    return sql.SQL(" UNION ALL ").join(parts), params


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = dotenv_values(ROOT / "apps/api/.env")
    if config.get("BLUESTEPS_ENVIRONMENT") not in ("development", "test"):
        raise ValueError("Sample data requires development or test configuration")
    url = make_url(config["BLUESTEPS_MIGRATION_DATABASE_URL"] or "")
    if url.host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        raise ValueError("Remote sample insertion requires --allow-remote")
    tables = build_rows()
    connection_args: dict[str, Any] = dict(url.query)
    connection_args.update(
        host=url.host,
        port=url.port or 5432,
        dbname=url.database,
        user=url.username,
        password=url.password,
        connect_timeout=10,
        prepare_threshold=None,
    )
    with psycopg.connect(**connection_args) as conn:
        conn.execute("SET LOCAL lock_timeout = '10s'")
        conn.execute("SET LOCAL statement_timeout = '30s'")
        conn.execute("SELECT pg_advisory_xact_lock(72192620261102)")
        keys: dict[str, list[str]] = {}
        for table, column in conn.execute("""
            SELECT c.relname, a.attname FROM pg_index i
            JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
            WHERE n.nspname='app_private' AND i.indisprimary ORDER BY c.relname,k.ord
        """):
            keys.setdefault(table, []).append(column)
        actual = {row[0] for row in conn.execute("SELECT tablename FROM pg_tables WHERE schemaname='app_private'")}
        if actual != set(tables) or set(keys) != actual or any(len(records) != 3 for records in tables.values()):
            raise ValueError("Sample definitions must cover every application table with exactly three rows")
        query, params = counts_query(tables, keys)
        before = {name: (total, samples) for name, total, samples in conn.execute(query, params)}
        inserted: dict[str, int] = {}
        for table, records in tables.items():
            columns = list(records[0])
            placeholders = sql.SQL("({})").format(sql.SQL(", ").join(sql.Placeholder() for _ in columns))
            statement = sql.SQL("INSERT INTO {}.{} ({}) VALUES {} ON CONFLICT ({}) DO NOTHING").format(
                sql.Identifier(SCHEMA),
                sql.Identifier(table),
                sql.SQL(", ").join(map(sql.Identifier, columns)),
                sql.SQL(", ").join(placeholders for _ in records),
                sql.SQL(", ").join(map(sql.Identifier, keys[table])),
            )
            values = [
                Jsonb(row[col]) if isinstance(row[col], (dict, list)) else row[col]
                for row in records
                for col in columns
            ]
            inserted[table] = conn.execute(statement, values).rowcount
        conn.execute("SET CONSTRAINTS ALL IMMEDIATE")
        after = {name: (total, samples) for name, total, samples in conn.execute(query, params)}
        if any(samples != 3 for _, samples in after.values()):
            raise ValueError("Every table must contain exactly three sample identities")
        if args.dry_run:
            conn.rollback()
            print(f"Dry run passed: {len(tables)} tables, {sum(inserted.values())} inserts rolled back.")
            return
        conn.commit()
        # Read back after commit, rather than reporting only uncommitted writes.
        persisted = {name: (total, samples) for name, total, samples in conn.execute(query, params)}
        if any(samples != 3 for _, samples in persisted.values()):
            raise ValueError("Post-commit verification failed")
    report = {
        "verified_at": datetime.now(UTC).isoformat(),
        "schema": SCHEMA,
        "table_count": len(tables),
        "sample_rows": len(tables) * 3,
        "inserted_this_run": sum(inserted.values()),
        "tables": {
            table: {
                "before_total": before[table][0],
                "inserted": inserted[table],
                "after_total": persisted[table][0],
                "sample_rows": persisted[table][1],
            }
            for table in sorted(tables)
        },
    }
    report_path = ROOT / "docs/sample-data-verification.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(tables)} tables, {len(tables) * 3} sample rows; inserted {sum(inserted.values())} this run.")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    try:
        main()
    except (psycopg.Error, ValueError) as exc:
        # Do not print connection strings, hashes or payloads in tracebacks.
        print(f"Sample seed failed: {type(exc).__name__}; SQLSTATE={getattr(exc, 'sqlstate', None)}")
        raise SystemExit(1) from None
