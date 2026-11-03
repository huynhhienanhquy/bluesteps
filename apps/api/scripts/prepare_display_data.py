"""Publish labelled sample catalogs and add display data for one explicitly selected member."""

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

import psycopg
from dotenv import dotenv_values
from psycopg import sql
from psycopg.types.json import Jsonb
from seed_sample import build_rows, sample_id
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[3]


def display_id(kind: str, key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"bluesteps:display:v1:{kind}:{key}")


def put(conn: psycopg.Connection[Any], table: str, values: dict[str, Any], *, update: bool = False) -> bool:
    columns = list(values)
    composite_keys = {
        "point_materials": ["point_id", "material_id"],
        "saved_events": ["user_id", "event_id"],
        "saved_articles": ["user_id", "article_id"],
        "article_reactions": ["user_id", "article_id"],
        "followed_topics": ["user_id", "topic"],
        "saved_posts": ["user_id", "post_id"],
        "reactions": ["user_id", "post_id"],
        "conversation_members": ["conversation_id", "user_id"],
        "reward_inventory": ["reward_id"],
    }
    keys = ["id"] if "id" in values else composite_keys.get(table, ["user_id"])
    conflict: sql.Composable = sql.SQL("ON CONFLICT ({}) DO NOTHING").format(
        sql.SQL(", ").join(map(sql.Identifier, keys))
    )
    if update:
        conflict = sql.SQL("ON CONFLICT (id) DO UPDATE SET {} ").format(
            sql.SQL(", ").join(
                sql.SQL("{}=excluded.{}").format(sql.Identifier(col), sql.Identifier(col))
                for col in columns
                if col != "id"
            )
        )
    query = sql.SQL("INSERT INTO app_private.{} ({}) VALUES ({}) {}").format(
        sql.Identifier(table),
        sql.SQL(", ").join(map(sql.Identifier, columns)),
        sql.SQL(", ").join(sql.Placeholder() for _ in columns),
        conflict,
    )
    params = [Jsonb(v) if isinstance(v, (dict, list)) else v for v in values.values()]
    return conn.execute(query, params).rowcount > 0


def prepare_public(conn: psycopg.Connection[Any], now: datetime) -> dict[str, list[str]]:
    base = build_rows()
    for table in ("users", "profiles", "user_preferences", "wallets"):
        for row in base[table]:
            put(conn, table, row)
    for i, name in enumerate(("Rác tái chế", "Rác hữu cơ", "Rác vô cơ"), 1):
        put(
            conn,
            "waste_categories",
            {
                "id": sample_id("waste_categories", i),
                "code": f"sample-category-{i}",
                "name": name,
                "sort_order": i,
                "handbook_key": ("recycle", "organic", "inorganic")[i - 1],
            },
            update=True,
        )
    materials = [
        ("Nhựa PET", False),
        ("Giấy carton", False),
        ("Nhôm", False),
        ("Hữu cơ", False),
        ("Túi ni lông", False),
        ("Pin", True),
        ("Dụng cụ y tế", True),
    ]
    for i, (name, hazardous) in enumerate(materials, 1):
        put(
            conn,
            "waste_materials",
            {
                "id": sample_id("waste_materials", i),
                "code": f"sample-material-{i}",
                "name": name,
                "hazardous": hazardous,
            },
            update=True,
        )
    items = [
        ("Chai nhựa", 1, 1, "water-outline"),
        ("Giấy và hộp carton", 1, 2, "document-outline"),
        ("Lon nhôm", 1, 3, "cafe-outline"),
        ("Vỏ rau củ", 2, 4, "leaf-outline"),
        ("Lá khô", 2, 4, "leaf-outline"),
        ("Bã cà phê", 2, 4, "cafe-outline"),
        ("Túi ni lông", 3, 5, "bag-outline"),
        ("Pin đã qua sử dụng", 3, 6, "battery-half-outline"),
        ("Khẩu trang đã dùng", 3, 7, "medical-outline"),
    ]
    for i, (name, category, material, icon) in enumerate(items, 1):
        steps = [
            "Tách riêng khỏi các vật liệu khác.",
            "Kiểm tra hướng dẫn tiếp nhận của đơn vị thu gom.",
            "Dùng điểm thu gom phù hợp với vật liệu.",
        ]
        if i == 1:
            steps = ["Đổ hết chất lỏng còn lại.", "Súc sạch chai và để ráo.", "Ép gọn và chuyển đến điểm thu gom nhựa."]
        if material in (6, 7):
            steps = [
                "Giữ riêng và không trộn với vật liệu tái chế thông thường.",
                "Liên hệ đơn vị tiếp nhận chuyên biệt để biết cách đóng gói.",
                "Không tự tháo hoặc xử lý vật phẩm.",
            ]
        put(
            conn,
            "waste_items",
            {
                "id": sample_id("waste_items", i),
                "code": f"sample-item-{i}",
                "name": f"{name}",
                "category_id": sample_id("waste_categories", category),
                "material_id": sample_id("waste_materials", material),
                "handbook_kind": {1: "plastic", 2: "paper", 3: "metal", 5: "bag", 6: "battery", 7: "medical"}.get(
                    material
                ),
                "icon": icon,
                "steps": steps,
                "sources": [{"title": "Hướng dẫn minh họa trong BlueSteps"}],
                "synthetic": False,
                "published": True,
            },
            update=True,
        )
    article_titles = [
        "Bắt đầu phân loại rác tại nhà",
        "Giảm nhựa dùng một lần mỗi ngày",
        "Tái sử dụng trước khi thải bỏ",
    ]
    article_paragraphs = [
        [
            "Chuẩn bị các ngăn chứa riêng để dễ nhận biết vật liệu.",
            "Giữ vật liệu tái chế sạch, khô và tách khỏi thức ăn thừa.",
            "Tra sổ tay BlueSteps để tìm hướng dẫn và điểm thu gom phù hợp.",
        ],
        [
            "Mang theo bình nước và túi dùng nhiều lần khi ra ngoài.",
            "Chọn sản phẩm có thể nạp lại và giảm bao bì không cần thiết.",
            "Bắt đầu bằng một thay đổi nhỏ, rồi ghi nhận thói quen đã duy trì.",
        ],
        [
            "Hộp, lọ và túi còn tốt có thể tiếp tục phục vụ nhu cầu phù hợp.",
            "Chia sẻ đồ dùng còn sử dụng được thay vì bỏ ngay vào thùng rác.",
            "Khi vật dụng không còn dùng được, phân loại theo vật liệu và hướng dẫn địa phương.",
        ],
    ]
    topics = ["Phân loại rác", "Sống xanh", "Tái chế"]
    event_titles = ["Ngày hội phân loại rác", "Đổi giấy lấy cây", "Cùng làm sạch khu phố"]
    reward_names = ["Túi vải tái sử dụng", "Chậu cây từ chai nhựa", "Ly tái sử dụng"]
    for i in range(1, 4):
        put(
            conn,
            "collection_points",
            {
                "id": sample_id("collection_points", i),
                "code": f"sample-point-{i}",
                "name": f"Điểm thu gom {('Hải Châu', 'Thanh Khê', 'Sơn Trà')[i - 1]}",
                "address": f"Địa chỉ minh họa {i}, Đà Nẵng — không phải điểm tiếp nhận thực tế",
                "area": "Đà Nẵng",
                "latitude": 16.05 + i * 0.01,
                "longitude": 108.20 + i * 0.01,
                "hours": "08:00–17:00 (minh họa)",
                "synthetic": False,
                "published": True,
            },
            update=True,
        )
        for material in range(1, 4):
            put(
                conn,
                "point_materials",
                {"point_id": sample_id("collection_points", i), "material_id": sample_id("waste_materials", material)},
            )
        start = now.replace(hour=2, minute=0, second=0, microsecond=0) + timedelta(days=i)
        put(
            conn,
            "events",
            {
                "id": sample_id("events", i),
                "code": f"sample-event-{i}",
                "title": f"{event_titles[i - 1]}",
                "description": "\n\n".join(
                    [
                        "Hoạt động minh họa để khám phá các tính năng của BlueSteps; không mở đăng ký thực tế.",
                        "Cùng tìm hiểu cách phân loại, chia sẻ vật liệu và xây dựng thói quen sống xanh.",
                        "Lịch trình: gặp mặt, giới thiệu hoạt động, thực hành phân loại và chia sẻ cuối buổi.",
                    ]
                ),
                "location": f"Địa điểm minh họa {i}, Đà Nẵng",
                "topic": topics[i - 1],
                "starts_at": start,
                "ends_at": start + timedelta(hours=3),
                "capacity": 50,
                "reserved_count": 0,
                "published": True,
                "synthetic": False,
                "details": {
                    "sample": True,
                    "imageUrl": f"sample-event-{i}",
                    "gallery": [f"sample-event-{i}", "sample-article-1"],
                    "minAge": 16,
                    "maxAge": 65,
                    "introductionTitle": "Cùng thực hành sống xanh",
                    "volunteerRoles": ["Phân loại", "Hỗ trợ thu gom"],
                    "preparation": "Mang bình nước, nón và đồ dùng cá nhân. Đây là hoạt động minh họa.",
                },
            },
            update=True,
        )
        put(
            conn,
            "articles",
            {
                "id": sample_id("articles", i),
                "code": f"sample-article-{i}",
                "title": f"{article_titles[i - 1]}",
                "summary": article_paragraphs[i - 1][0],
                "topic": topics[i - 1],
                "blocks": [
                    {"type": "heading", "text": article_titles[i - 1]},
                    *[{"type": "paragraph", "text": p} for p in article_paragraphs[i - 1]],
                ],
                "sources": [{"title": "Nội dung BlueSteps"}],
                "published": True,
                "synthetic": False,
            },
            update=True,
        )
        put(
            conn,
            "rewards",
            {
                "id": sample_id("rewards", i),
                "code": f"sample-reward-{i}",
                "name": f"{reward_names[i - 1]}",
                "description": "Quà minh họa cho lối sống xanh, không giao hàng thực tế.",
                "category": "recycled",
                "cost_points": i * 100,
                "state": "published",
                "synthetic": False,
            },
            update=True,
        )
        put(conn, "reward_inventory", {"reward_id": sample_id("rewards", i), "on_hand": 30, "reserved": 0})
        put(
            conn,
            "posts",
            {
                "id": sample_id("posts", i),
                "user_id": sample_id("users", i),
                "body": f"{article_paragraphs[i - 1][0]} Cùng chia sẻ một thói quen xanh hôm nay nhé!",
                "visibility": "public",
            },
            update=True,
        )
    for table in ("comments", "point_reviews", "reactions"):
        for row in base[table]:
            put(conn, table, row)
    for i in range(1, 4):
        put(
            conn,
            "comments",
            {
                "id": display_id("article-comment", str(i)),
                "user_id": sample_id("users", i),
                "article_id": sample_id("articles", i),
                "body": "Một gợi ý nhỏ để bắt đầu thói quen sống xanh hôm nay.",
            },
        )
    return {
        table: [str(sample_id(table, i)) for i in range(1, count + 1)]
        for table, count in [
            ("waste_items", 9),
            ("collection_points", 3),
            ("events", 3),
            ("articles", 3),
            ("rewards", 3),
        ]
    }


def prepare_personal(conn: psycopg.Connection[Any], uid: UUID, now: datetime) -> dict[str, Any]:
    def ident(kind: str, i: int = 0) -> UUID:
        return display_id(kind, f"{uid}:{i}")

    marker = ident("audit")
    if conn.execute("select 1 from app_private.audit_logs where id=%s", (marker,)).fetchone():
        return {"already_prepared": True, "user_id": str(uid)}
    wallet = conn.execute("select balance from app_private.wallets where user_id=%s for update", (uid,)).fetchone()
    if not wallet:
        raise ValueError("Selected member has no wallet")
    balance = wallet[0]
    original = balance
    put(
        conn,
        "point_ledger",
        {
            "id": ident("credit"),
            "user_id": uid,
            "delta": 600,
            "balance_after": balance + 600,
            "entry_kind": "earn",
            "source_type": "sample_credit",
            "source_id": marker,
            "created_at": now - timedelta(hours=4),
        },
    )
    balance += 600
    for i in range(1, 4):
        collection = ident("collection", i)
        put(conn, "event_collections", {"id": collection, "user_id": uid, "name": f"Bộ sưu tập xanh {i}"})
        put(conn, "saved_events", {"user_id": uid, "event_id": sample_id("events", i), "collection_id": collection})
        put(conn, "saved_articles", {"user_id": uid, "article_id": sample_id("articles", i)})
        put(conn, "article_reactions", {"user_id": uid, "article_id": sample_id("articles", i)})
        put(conn, "followed_topics", {"user_id": uid, "topic": ("Phân loại rác", "Sống xanh", "Tái chế")[i - 1]})
        put(conn, "saved_posts", {"user_id": uid, "post_id": sample_id("posts", i)})
        put(conn, "reactions", {"user_id": uid, "post_id": sample_id("posts", i)})
        put(conn, "scans", {"id": ident("scan", i), "user_id": uid, "status": "completed"})
        put(
            conn,
            "sorting_actions",
            {
                "id": ident("sorting", i),
                "user_id": uid,
                "item_id": sample_id("waste_items", i),
                "scan_id": ident("scan", i),
                "source": "scan",
                "evidence_status": "user_confirmed",
                "created_at": now - timedelta(hours=i),
            },
        )
        notification_title = ("Chào mừng đến BlueSteps", "Khám phá hoạt động xanh", "Sổ tay phân loại đã sẵn sàng")[
            i - 1
        ]
        put(
            conn,
            "notifications",
            {
                "id": ident("notification", i),
                "user_id": uid,
                "title": f"{notification_title}",
                "body": "Dữ liệu minh họa đã được chuẩn bị cho tài khoản của bạn.",
                "created_at": now - timedelta(minutes=i),
            },
        )
        peer = sample_id("users", i)
        conversation = ident("conversation", i)
        direct = ":".join(sorted([str(uid), str(peer)]))
        existing = conn.execute("select id from app_private.conversations where direct_key=%s", (direct,)).fetchone()
        if existing:
            conversation = existing[0]
        else:
            put(conn, "conversations", {"id": conversation, "direct_key": direct, "last_sequence": 3})
            for member in (uid, peer):
                put(
                    conn,
                    "conversation_members",
                    {
                        "conversation_id": conversation,
                        "user_id": member,
                        "last_read_sequence": 1 if member == uid else 3,
                    },
                )
            texts = [
                "Chào bạn! Cùng tìm hiểu cách phân loại rác nhé.",
                "Mình đã lưu hoạt động xanh và bài đọc để tham khảo.",
                "Bạn có thể xem thêm điểm thu gom và sổ tay trong ứng dụng.",
            ]
            for sequence, body in enumerate(texts, 1):
                put(
                    conn,
                    "messages",
                    {
                        "id": ident(f"message-{i}", sequence),
                        "conversation_id": conversation,
                        "user_id": uid if sequence == 2 else peer,
                        "client_message_id": ident(f"client-{i}", sequence),
                        "sequence": sequence,
                        "body": body,
                        "created_at": now - timedelta(minutes=10 - sequence),
                    },
                )
        route = ident("route", i)
        put(
            conn,
            "routes",
            {
                "id": route,
                "user_id": uid,
                "mode": ("walking", "cycling", "driving")[i - 1],
                "status": ("draft", "active", "completed")[i - 1],
                "created_at": now - timedelta(days=i - 1),
            },
        )
        for stop in range(1, 4):
            stop_id = ident(f"stop-{i}", stop)
            put(
                conn,
                "route_stops",
                {
                    "id": stop_id,
                    "route_id": route,
                    "point_id": sample_id("collection_points", stop),
                    "position": stop - 1,
                    "status": "self_reported" if i == 3 else "arrived" if i == 2 and stop == 1 else "pending",
                },
            )
            if i == 3:
                put(conn, "handovers", {"id": ident("handover", stop), "user_id": uid, "stop_id": stop_id})
        cost = i * 100
        balance -= cost
        debit = ident("debit", i)
        put(
            conn,
            "point_ledger",
            {
                "id": debit,
                "user_id": uid,
                "delta": -cost,
                "balance_after": balance,
                "entry_kind": "spend",
                "source_type": "sample_redemption",
                "source_id": ident("redemption", i),
                "created_at": now - timedelta(hours=4 - i),
            },
        )
        put(
            conn,
            "redemptions",
            {
                "id": ident("redemption", i),
                "user_id": uid,
                "reward_id": sample_id("rewards", i),
                "quantity": 1,
                "unit_cost_snapshot": cost,
                "total_cost": cost,
                "status": "fulfilled",
                "original_debit_id": debit,
            },
        )
        stock = conn.execute(
            """update app_private.reward_inventory set on_hand=on_hand-1
            where reward_id=%s and on_hand>reserved returning reward_id""",
            (sample_id("rewards", i),),
        ).fetchone()
        if not stock:
            raise ValueError("Sample inventory unavailable")
    if balance != original:
        raise ValueError("Display history must preserve the current wallet balance")
    conn.execute(
        "update app_private.wallets set lifetime_earned=lifetime_earned+600,version=version+1 where user_id=%s", (uid,)
    )
    put(
        conn,
        "audit_logs",
        {
            "id": marker,
            "actor_id": uid,
            "action": "sample.display.prepared",
            "target_id": uid,
            "reason": "User-requested display data; sample points net to zero; original balance preserved.",
            "request_id": str(marker),
        },
    )
    return {"already_prepared": False, "user_id": str(uid), "wallet_balance_preserved": str(original)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = dotenv_values(ROOT / "apps/api/.env")
    if config.get("BLUESTEPS_ENVIRONMENT") not in ("development", "test"):
        raise ValueError("Display samples require development/test")
    url = make_url(config["BLUESTEPS_MIGRATION_DATABASE_URL"] or "")
    if url.host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        raise ValueError("Remote writes require --allow-remote")
    options: dict[str, Any] = dict(url.query)
    options.update(
        host=url.host,
        port=url.port or 5432,
        dbname=url.database,
        user=url.username,
        password=url.password,
        connect_timeout=10,
        prepare_threshold=None,
    )
    now = datetime.now(UTC)
    with psycopg.connect(**options) as conn:
        conn.execute("SET LOCAL lock_timeout='10s'")
        conn.execute("SET LOCAL statement_timeout='30s'")
        conn.execute("select pg_advisory_xact_lock(72192620261103)")
        user = conn.execute(
            "select id from app_private.users where email_normalized=%s and status='active' for update",
            (args.email.strip().casefold(),),
        ).fetchone()
        if not user:
            raise ValueError("Active target member not found")
        catalogs = prepare_public(conn, now)
        personal = prepare_personal(conn, user[0], now)
        conn.execute("SET CONSTRAINTS ALL IMMEDIATE")
        if args.dry_run:
            conn.rollback()
            print("Display data dry run passed; all writes rolled back.")
            return
        conn.commit()
        counts = {}
        for table in catalogs:
            counted = conn.execute(
                sql.SQL("select count(*) from app_private.{} where not synthetic").format(sql.Identifier(table))
            ).fetchone()
            assert counted is not None
            counts[table] = counted[0]
        report = {
            "verified_at": now.isoformat(),
            "visible_catalog_counts": counts,
            "catalog_ids": catalogs,
            "personal": personal,
        }
    target = ROOT / "docs/display-data-verification.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Published sample catalogs and prepared member display data. Report:", target)


if __name__ == "__main__":
    try:
        main()
    except (psycopg.Error, ValueError) as exc:
        print(f"Display preparation failed: {type(exc).__name__}; SQLSTATE={getattr(exc, 'sqlstate', None)}")
        raise SystemExit(1) from None
