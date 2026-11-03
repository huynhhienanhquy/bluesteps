"""Real browser -> HTTP -> runtime DB role. No HTTP interception or frontend fixtures."""

import json
import os
import socket
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from bluesteps_api.cli import ROOT
from bluesteps_api.config import Settings
from bluesteps_api.db import run
from bluesteps_api.security import passwords
from bluesteps_api.seed import fixture_id

from .media_fixture import video_bytes

pytestmark = [pytest.mark.postgres, pytest.mark.mobile_e2e]


@pytest.mark.skipif(os.environ.get("BLUESTEPS_RUN_MOBILE_E2E") != "1", reason="Opt in to the real browser suite")
def test_browser_api_database(
    database: tuple[Engine, Engine, str], owner: Engine, settings: Settings, tmp_path: Path
) -> None:
    scope = os.environ.get("BLUESTEPS_E2E_SCOPE", "all")
    assert scope in (
        "all",
        "scan",
        "handbook",
        "community",
        "composer",
        "social",
        "chat",
        "collection",
        "collection_forms",
        "routing",
    ), "Unknown browser acceptance scope"
    run_id = uuid4().hex[:12]
    if scope in ("all", "composer", "social"):
        (tmp_path / "clip.webm").write_bytes(video_bytes())
    password = "test-" + uuid4().hex
    ids = {
        kind: str(uuid4())
        for kind in ("alice", "bob", "article", "event", "overlap", "waste", "bottle", "point", "reward")
    }
    names = {
        "alice": "Người dùng A " + run_id,
        "bob": "Người dùng B " + run_id,
        "article": "Bài đọc hệ thống " + run_id,
        "event": "Hoạt động hệ thống " + run_id,
        "overlap": "Hoạt động trùng lịch " + run_id,
        "waste": "Vật phẩm hệ thống " + run_id,
        "point": "Điểm tiếp nhận " + run_id,
        "reward": "Phần quà hệ thống " + run_id,
    }
    if scope in ("all", "collection", "routing"):
        for key, name in [("point_far", "Điểm xa "), ("point_full", "Điểm đầy ")]:
            ids[key] = str(uuid4())
            names[key] = name + run_id
    with Session(owner) as db, db.begin():
        for table in ["waste_items", "collection_points", "events", "articles", "rewards"]:
            run(db, f"update app_private.{table} set synthetic=true")
        if scope in ("all", "scan"):
            source = (ROOT / "supabase/migrations/202611030023_waste_model_scans.sql").read_text(encoding="utf-8")
            db.connection().exec_driver_sql(source[source.index("insert into app_private.waste_categories") :])
        hashed = passwords.hash(password)
        for name in ("alice", "bob"):
            run(
                db,
                """insert into app_private.users(id,email_normalized,password_hash,status,email_verified_at)
              values (:id,:email,:hash,'active',now())""",
                id=ids[name],
                email=f"{name}-{run_id}@example.com",
                hash=hashed,
            )
            run(
                db,
                "insert into app_private.profiles(user_id,display_name) values (:id,:name)",
                id=ids[name],
                name=names[name],
            )
            run(db, "insert into app_private.wallets(user_id) values (:id)", id=ids[name])
            run(db, "insert into app_private.user_preferences(user_id) values (:id)", id=ids[name])
        if scope in ("all", "collection_forms", "routing"):
            run(db, "insert into app_private.user_roles(user_id,role) values (:id,'moderator')", id=ids["bob"])
        run(
            db,
            """insert into app_private.articles(id,code,title,summary,topic,blocks,published)
          values (:id,:code,:title,'Nội dung lấy trực tiếp từ PostgreSQL','Kết nối',cast(:blocks as jsonb),true)""",
            id=ids["article"],
            code="live-" + run_id,
            title=names["article"],
            blocks=json.dumps(
                [{"type": "paragraph", "text": "Nội dung bài đọc từ cơ sở dữ liệu " + run_id}]
                + [
                    {
                        "type": "paragraph",
                        "text": f"Đoạn đọc {index}. Nội dung kiểm tra tiến độ đọc được lưu qua API. "
                        "Bạn có thể quay lại để đọc tiếp đúng vị trí trong bài viết.",
                    }
                    for index in range(1, 16)
                ]
            ),
        )
        run(
            db,
            """insert into app_private.rewards(id,code,name,description,category,cost_points,state)
          values (:id,:code,:name,'Quà công bố từ PostgreSQL','recycled',40,'published')""",
            id=ids["reward"],
            code="live-" + run_id,
            name=names["reward"],
        )
        run(db, "insert into app_private.reward_inventory(reward_id,on_hand) values (:id,7)", id=ids["reward"])
        starts = (datetime.now(UTC) + timedelta(days=2)).replace(hour=2, minute=0, second=0, microsecond=0)
        run(
            db,
            """insert into app_private.events
            (id,code,title,description,location,topic,starts_at,ends_at,capacity,published)
            values (:id,:code,:title,'Thông tin hoạt động trên hệ thống',
            'Địa điểm đã công bố','Kết nối',:start,:end,10,true)""",
            id=ids["event"],
            code="live-" + run_id,
            title=names["event"],
            start=starts,
            end=starts + timedelta(hours=1),
        )
        run(
            db,
            """insert into app_private.waste_items(id,code,name,category_id,material_id,steps,published)
          values (:id,:code,:name,:category,:material,cast(:steps as jsonb),true)""",
            id=ids["waste"],
            code="live-" + run_id,
            name=names["waste"],
            category=fixture_id("category", "Tái chế"),
            material=fixture_id("material", "Nhựa"),
            steps=json.dumps(["Hướng dẫn từ dữ liệu đã công bố."]),
        )
        run(
            db,
            """insert into app_private.events
            (id,code,title,description,location,topic,starts_at,ends_at,capacity,published)
            values (:id,:code,:title,'Hoạt động thứ hai có thời gian trùng thực tế',
            'Địa điểm thứ hai','Kết nối',:start,:end,10,true)""",
            id=ids["overlap"],
            code="overlap-" + run_id,
            title=names["overlap"],
            start=starts + timedelta(minutes=30),
            end=starts + timedelta(minutes=90),
        )
        run(
            db,
            """insert into app_private.waste_items(id,code,name,category_id,material_id,steps,published)
            values (:id,:code,:name,:category,:material,cast(:steps as jsonb),true)""",
            id=ids["bottle"],
            code="bottle-" + run_id,
            name="Chai nhựa " + run_id,
            category=fixture_id("category", "Tái chế"),
            material=fixture_id("material", "Nhựa"),
            steps=json.dumps(
                ["Đổ hết chất lỏng.", "Làm sạch và để khô.", "Kiểm tra loại nhựa được điểm thu gom tiếp nhận."]
            ),
        )
        run(
            db,
            """insert into app_private.collection_points(id,code,name,address,latitude,longitude,published)
          values (:id,:code,:name,'Địa chỉ trên cơ sở dữ liệu',16.07,108.22,true)""",
            id=ids["point"],
            code="live-" + run_id,
            name=names["point"],
        )
        run(
            db,
            "insert into app_private.point_materials values (:id,:material)",
            id=ids["point"],
            material=fixture_id("material", "Nhựa"),
        )
        if scope in ("all", "collection", "routing"):
            run(
                db,
                """update app_private.collection_points set always_open=true,staffed=true,capacity_state='available',
                status_observed_at=now(),status_expires_at=now()+interval '1 hour',hours='24/7' where id=:id""",
                id=ids["point"],
            )
            for key, lat, capacity in [("point_far", 16.27, "available"), ("point_full", 16.071, "full")]:
                run(
                    db,
                    """insert into app_private.collection_points(id,code,name,address,latitude,longitude,published,
                    always_open,staffed,capacity_state,status_observed_at,status_expires_at,hours)
                    values (:id,:code,:name,'Collection QA',:lat,108.22,true,true,true,:capacity,
                      now(),now()+interval '1 hour','24/7')""",
                    id=ids[key],
                    code=key + "-" + run_id,
                    name=names[key],
                    lat=lat,
                    capacity=capacity,
                )
        run(
            db,
            """update app_private.waste_items set handbook_kind='plastic',
            guide_details=cast(:details as jsonb) where id in (:waste,:bottle)""",
            details=json.dumps(
                {
                    "donts": ["Không trộn pin vào vật phẩm tái chế."],
                    "tips": ["Kiểm tra điểm tiếp nhận."],
                    "relatedKinds": ["plastic"],
                }
            ),
            waste=ids["waste"],
            bottle=ids["bottle"],
        )
        run(
            db,
            "update app_private.waste_items set name=:name where id=:id",
            name="Chai nhựa PET " + run_id,
            id=ids["bottle"],
        )
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    api_url = f"http://127.0.0.1:{port}"
    env = os.environ.copy()
    env.update(
        {
            "BLUESTEPS_ENVIRONMENT": "test",
            "BLUESTEPS_ROUTING_URL": "https://valhalla1.openstreetmap.de" if scope in ("all", "routing") else "",
            "BLUESTEPS_DATABASE_URL": database[2],
            "BLUESTEPS_JWT_PRIVATE_KEY": settings.jwt_private_key.get_secret_value(),
            "BLUESTEPS_JWT_PUBLIC_KEY": settings.jwt_public_key,
            "BLUESTEPS_JWT_KEY_ID": settings.jwt_key_id,
            "BLUESTEPS_OTP_PEPPER": settings.otp_pepper.get_secret_value(),
            "BLUESTEPS_REGISTRATION_ENABLED": "true",
            "BLUESTEPS_FIXED_SCAN_ITEM_CODE": "bottle-" + run_id,
            "BLUESTEPS_LOCAL_MAIL_DIRECTORY": str(tmp_path / "mail"),
            "BLUESTEPS_CORS_ORIGINS": json.dumps(["http://127.0.0.1:4173"]),
            "EXPO_PUBLIC_API_URL": api_url,
            "BLUESTEPS_E2E_API_URL": api_url,
            "BLUESTEPS_E2E_PASSWORD": password,
            "BLUESTEPS_E2E_RUN": run_id,
            "BLUESTEPS_E2E_ALICE_EMAIL": f"alice-{run_id}@example.com",
            "BLUESTEPS_E2E_BOB_EMAIL": f"bob-{run_id}@example.com",
            "BLUESTEPS_E2E_MAIL_DIR": str(tmp_path / "mail"),
            "BLUESTEPS_E2E_VIDEO_PATH": str(tmp_path / "clip.webm"),
        }
    )
    if scope == "routing":
        env.setdefault("BLUESTEPS_AUDIT_OUTPUT", str(ROOT / "docs/figma-completion/routing-runtime"))
    for kind in ids:
        env[f"BLUESTEPS_E2E_{kind.upper()}_ID"] = ids[kind]
        env[f"BLUESTEPS_E2E_{kind.upper()}_NAME"] = names.get(kind, "")
    if sys.platform == "win32" and not env.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE"):
        chrome = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
        if chrome.exists():
            env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"] = str(chrome)
    commands: list[list[str]] = [
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
        [sys.executable, "-m", "bluesteps_api.worker"],
    ]
    processes: list[subprocess.Popen[Any]] = []
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    pnpm = ["cmd.exe", "/d", "/c", "pnpm"] if sys.platform == "win32" else ["pnpm"]
    try:
        with (tmp_path / "services.log").open("w", encoding="utf-8") as log:
            for command in commands:
                processes.append(
                    subprocess.Popen(
                        command, cwd=ROOT / "apps/api", env=env, stdout=log, stderr=log, creationflags=flags
                    )
                )
            with httpx.Client(timeout=5) as client:
                for _ in range(100):
                    try:
                        if client.get(api_url + "/health/ready").status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    time.sleep(0.1)
                else:
                    pytest.fail("Isolated backend did not become ready")
            browser = pnpm + ["--filter", "@bluesteps/mobile", "test:e2e:live"]
            if scope == "scan":
                browser += ["--grep", "a chosen photo follows model recognition"]
            elif scope == "handbook":
                browser += ["--grep", "handbook category handling"]
            elif scope == "community":
                browser += ["--grep", "community discovery follows"]
            elif scope == "composer":
                browser += ["--grep", "composer media draft"]
            elif scope == "social":
                browser += ["--grep", "community writes|community discovery follows|composer media draft"]
            elif scope == "chat":
                browser += ["--grep", "messages and inbox|chat emoji media"]
            elif scope == "collection":
                browser += ["--grep", "collection GPS filters comparison"]
            elif scope == "collection_forms":
                browser += ["--grep", "collection proposals photos"]
            elif scope == "routing":
                browser += [
                    "--grep",
                    "collection GPS filters comparison|collection proposals photos|routing preview navigation|journey planner drag",
                ]
            for command in (pnpm + ["build"], browser):
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    env=env,
                    creationflags=flags,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                )
                output = result.stdout.replace(password, "[redacted]")
                (tmp_path / "browser-output.log").write_text(output, encoding="utf-8")
                display = "\n".join(output.splitlines()[-45:])
                encoding = sys.stdout.encoding or "utf-8"
                print(display.encode(encoding, errors="backslashreplace").decode(encoding), flush=True)
                result.check_returncode()
            # Assert committed state independently of both UI text and API responses.
            with Session(owner) as db:
                checks = {
                    "sorting_actions": 9,
                    "point_ledger": 12,
                    "scans": 1,
                    "daily_claims": 1,
                    "redemptions": 1,
                    "article_reading": 1,
                    "article_searches": 0,
                    "comment_reactions": 0,
                    "followed_topics": 1,
                    "personal_targets": 2,
                    "leaderboard_preferences": 2,
                    "posts": 3,
                    "media_assets": 7,
                    "media_chunks": 0,
                    "post_media": 3,
                    "message_media": 2,
                    "post_drafts": 0,
                    "friendships": 0,
                    "member_follows": 0,
                    "hidden_posts": 0,
                    "saved_posts": 0,
                    "messages": 4,
                    "handovers": 2,
                    "saved_articles": 1,
                    "article_reactions": 1,
                    "event_registrations": 1,
                }
                if scope == "scan":
                    checks = {"scans": 1, "sorting_actions": 1, "point_ledger": 1}
                elif scope == "handbook":
                    checks = {"sorting_actions": 0, "point_ledger": 0}
                elif scope == "community":
                    checks = {
                        "posts": 1,
                        "member_follows": 0,
                        "hidden_posts": 0,
                        "saved_posts": 0,
                        "sorting_actions": 0,
                        "point_ledger": 0,
                    }
                elif scope == "composer":
                    checks = {
                        "posts": 1,
                        "media_assets": 3,
                        "media_chunks": 0,
                        "post_media": 3,
                        "post_drafts": 0,
                        "friendships": 0,
                        "sorting_actions": 0,
                        "point_ledger": 0,
                    }
                elif scope == "social":
                    checks = {
                        "posts": 3,
                        "media_assets": 3,
                        "media_chunks": 0,
                        "post_media": 3,
                        "post_drafts": 0,
                        "friendships": 0,
                        "member_follows": 0,
                        "hidden_posts": 0,
                        "saved_posts": 0,
                        "sorting_actions": 0,
                        "point_ledger": 0,
                    }
                elif scope == "chat":
                    checks = {
                        "messages": 4,
                        "media_assets": 2,
                        "message_media": 2,
                        "media_chunks": 0,
                        "post_media": 0,
                        "point_ledger": 0,
                    }
                elif scope == "collection":
                    checks = {
                        "routes": 1,
                        "route_stops": 1,
                        "route_stop_replacements": 1,
                        "handovers": 0,
                        "sorting_actions": 0,
                        "point_ledger": 0,
                    }
                elif scope in ("collection_forms", "routing"):
                    checks = {
                        "point_proposals": 1,
                        "point_proposal_media": 1,
                        "point_reports": 1,
                        "point_report_media": 1,
                        "media_assets": 2,
                        "media_chunks": 0,
                        "point_ledger": 0,
                    }
                    if scope == "routing":
                        checks.update(routes=3, route_stops=3, route_stop_replacements=1, handovers=1)
                        planner = (
                            db.connection()
                            .execute(
                                text("""select r.mode,r.status,r.version,r.material_ids,r.plan,
                          s.point_id from app_private.routes r join app_private.route_stops s on s.route_id=r.id
                          where cardinality(r.material_ids)>0""")
                            )
                            .one()
                        )
                        assert planner.mode == "cycling" and planner.status == "active" and planner.version == 3
                        assert planner.material_ids == [fixture_id("material", "Nhựa")]
                        assert str(planner.point_id) == ids["point_far"]
                        assert planner.plan["provider"] == "Valhalla" and len(planner.plan["legs"]) == 1
                        finished = (
                            db.connection()
                            .execute(text("select plan,status,mode from app_private.routes where status='completed'"))
                            .one()
                        )
                        assert finished.plan is None and finished.mode == "motorcycling"
                    proposal = (
                        db.connection()
                        .execute(
                            text(
                                "select state,version,published_point_id,latitude,hours "
                                "from app_private.point_proposals"
                            )
                        )
                        .one()
                    )
                    assert proposal.state == "approved" and proposal.version == 5 and proposal.published_point_id
                    assert proposal.latitude != 16.07 and proposal.hours == "Thứ Bảy 08:00–17:00"
                    published = (
                        db.connection()
                        .execute(
                            text("select published,synthetic from app_private.collection_points where id=:id"),
                            {"id": proposal.published_point_id},
                        )
                        .one()
                    )
                    assert published.published and not published.synthetic
                    assert (
                        db.connection()
                        .execute(
                            text("select count(*) from app_private.audit_logs where action='point_proposals.approved'")
                        )
                        .scalar_one()
                        == 1
                    )
                for table, expected in checks.items():
                    assert (
                        db.connection().exec_driver_sql(f"select count(*) from app_private.{table}").scalar_one()
                        == expected
                    )
                if scope in (
                    "handbook",
                    "community",
                    "composer",
                    "social",
                    "chat",
                    "collection",
                    "collection_forms",
                    "routing",
                ):
                    return
                confirmed_scan = (
                    db.connection()
                    .execute(
                        text(
                            """select s.confirmation_snapshot->'award'->>'points' as points,
                    a.evidence_status,a.reported_weight_kg from app_private.scans s
                    join app_private.sorting_actions a on a.scan_id=s.id where s.user_id=:uid"""
                        ),
                        {"uid": ids["bob"]},
                    )
                    .one()
                )
                assert confirmed_scan.points == "5" and confirmed_scan.evidence_status == "user_confirmed"
                assert str(confirmed_scan.reported_weight_kg) == "0.250"
                if scope == "scan":
                    return
                saved_event = (
                    db.connection()
                    .execute(
                        text("select collection_id from app_private.saved_events where event_id=:id"),
                        {"id": ids["event"]},
                    )
                    .scalar_one()
                )
                assert saved_event is not None
                assert (
                    db.connection().exec_driver_sql("select count(*) from app_private.saved_events").scalar_one() == 2
                )
    finally:
        for process in processes:
            process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
