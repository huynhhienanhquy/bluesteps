"""Publish the requested reward categories in development/test, without changing existing stock."""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[3]
REWARDS = [
    (
        "voucher-supermarket",
        "voucher",
        "Voucher siêu thị 30k",
        150,
        "Phiếu mua sắm trị giá 30.000đ. Ưu đãi minh họa, chưa áp dụng tại đối tác.",
    ),
    (
        "voucher-discount",
        "voucher",
        "Voucher giảm giá 10%",
        160,
        "Ưu đãi khi mua đồ dùng xanh. Voucher minh họa, chưa áp dụng tại đối tác.",
    ),
    (
        "voucher-workshop",
        "voucher",
        "Voucher workshop tái chế nhựa",
        200,
        "Trải nghiệm làm đồ thủ công từ nhựa tái chế. Voucher minh họa, chưa mở đăng ký thực tế.",
    ),
    (
        "entertainment-cinema",
        "entertainment",
        "Vé xem phim",
        80,
        "Thư giãn cuối tuần với những bộ phim hay. Vé minh họa, chưa sử dụng tại rạp.",
    ),
    (
        "entertainment-recycling-tour",
        "entertainment",
        "Tham quan khu tái chế",
        120,
        "Khám phá hành trình tái chế vật liệu. Trải nghiệm minh họa, chưa mở đăng ký thực tế.",
    ),
    (
        "entertainment-craft",
        "entertainment",
        "Lớp sáng tạo đồ tái chế",
        180,
        "Khơi nguồn sáng tạo với đồ thủ công tái sử dụng. Lớp học minh họa, chưa mở đăng ký thực tế.",
    ),
    (
        "other-glass-bottle",
        "other",
        "Bình nước thủy tinh",
        150,
        "Bình nước cá nhân dùng nhiều lần. Quà minh họa, không giao hàng thực tế.",
    ),
    (
        "other-photo-frame",
        "other",
        "Khung ảnh mini",
        150,
        "Khung ảnh trang trí bàn học, bàn làm việc. Quà minh họa, không giao hàng thực tế.",
    ),
    (
        "other-document-box",
        "other",
        "Hộp đựng tài liệu",
        150,
        "Hộp giấy cứng tái chế giúp sắp xếp sách và hồ sơ. Quà minh họa, không giao hàng thực tế.",
    ),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = dotenv_values(ROOT / "apps/api/.env")
    if config.get("BLUESTEPS_ENVIRONMENT") not in ("development", "test"):
        raise ValueError("Reward display data requires development/test")
    raw = config.get("BLUESTEPS_MIGRATION_DATABASE_URL") or ""
    if make_url(raw).host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        raise ValueError("Remote writes require --allow-remote")
    engine = create_engine(raw, hide_parameters=True, connect_args={"connect_timeout": 10, "prepare_threshold": None})
    codes = [f"display-reward-{item[0]}" for item in REWARDS]
    query = text("""select r.id::text,r.code,r.name,r.category,r.cost_points::text,
        r.state,r.synthetic,i.on_hand,i.reserved
        from app_private.rewards r join app_private.reward_inventory i on i.reward_id=r.id
        where r.code=any(:codes) order by r.category,r.code""")
    inserted = {"rewards": 0, "reward_inventory": 0}
    try:
        with engine.begin() as conn:
            conn.exec_driver_sql("SET LOCAL lock_timeout='10s'")
            conn.exec_driver_sql("SET LOCAL statement_timeout='30s'")
            conn.execute(text("select pg_advisory_xact_lock(72192620261105)"))
            for key, category, name, cost, description in REWARDS:
                rid = uuid5(NAMESPACE_URL, f"bluesteps:reward-catalog:v1:{key}")
                result = conn.execute(
                    text("""insert into app_private.rewards
                        (id,code,name,description,category,cost_points,state,synthetic)
                        values (:id,:code,:name,:description,:category,:cost,'published',false)
                        on conflict(code) do nothing"""),
                    {
                        "id": rid,
                        "code": f"display-reward-{key}",
                        "name": name,
                        "description": description,
                        "category": category,
                        "cost": cost,
                    },
                )
                inserted["rewards"] += result.rowcount
                result = conn.execute(
                    text("""insert into app_private.reward_inventory(reward_id,on_hand,reserved)
                        values (:id,30,0) on conflict(reward_id) do nothing"""),
                    {"id": rid},
                )
                inserted["reward_inventory"] += result.rowcount
            rows = [dict(row) for row in conn.execute(query, {"codes": codes}).mappings()]
            if len(rows) != len(REWARDS) or any(row["state"] != "published" or row["synthetic"] for row in rows):
                raise ValueError("Reward publication verification failed")
            if args.dry_run:
                conn.rollback()
        # Verify committed content through a fresh transaction.
        if not args.dry_run:
            with engine.connect() as conn:
                persisted = [dict(row) for row in conn.execute(query, {"codes": codes}).mappings()]
            if persisted != rows:
                raise ValueError("Post-commit verification failed")
        report = {
            "verified_at": datetime.now(UTC).isoformat(),
            "dry_run": args.dry_run,
            "inserted": inserted,
            "rewards": rows,
        }
        if not args.dry_run:
            (ROOT / "docs/reward-catalog-verification.json").write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        print(json.dumps(report, ensure_ascii=True, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Connection errors may include credentials or SQL parameters.
        print(f"Reward catalog seed failed: {type(exc).__name__}")
        raise SystemExit(1) from None
