"""Synthetic frontend fixtures only. Never invoked by application startup or migrations."""

import json
import re
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from .cli import ROOT
from .db import run


def fixture_id(kind: str, code: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"bluesteps:synthetic:{kind}:{code}")


def seed_data(db: Session) -> None:
    fixtures: dict[str, Any] = json.loads((ROOT / "apps/api/fixtures/mobile-demo.json").read_text(encoding="utf-8"))
    for order, name in enumerate(dict.fromkeys(item["category"] for item in fixtures["wasteItems"])):
        run(
            db,
            """insert into app_private.waste_categories(id,code,name,sort_order,handbook_key)
          values (:id,:code,:name,:order,:key) on conflict do nothing""",
            id=fixture_id("category", name),
            code=f"category-{order}",
            name=name,
            order=order,
            key={"Tái chế": "recycle", "Hữu cơ": "organic", "Vô cơ": "inorganic"}.get(name),
        )
    materials = list(dict.fromkeys(item["material"] for item in fixtures["wasteItems"]))
    for order, material in enumerate(materials):
        hazardous = any(item.get("hazardous", False) for item in fixtures["wasteItems"] if item["material"] == material)
        run(
            db,
            """insert into app_private.waste_materials(id,code,name,hazardous)
          values (:id,:code,:name,:hazardous) on conflict do nothing""",
            id=fixture_id("material", material),
            code=f"material-{order}",
            name=material,
            hazardous=hazardous,
        )
    # Fixed ordering timestamp guarantees reproducible cursor pagination tests.
    anchor = datetime(2026, 10, 31, 0, 0, tzinfo=UTC)
    for index, item in enumerate(fixtures["wasteItems"]):
        run(
            db,
            """insert into app_private.waste_items
          (id,code,name,category_id,material_id,icon,steps,synthetic,published,created_at,handbook_kind)
          values (:id,:code,:name,:category,:material,:icon,cast(:steps as jsonb),true,true,:created,:kind)
          on conflict do nothing""",
            id=fixture_id("waste", item["id"]),
            code=item["id"],
            name=item["name"],
            category=fixture_id("category", item["category"]),
            material=fixture_id("material", item["material"]),
            icon=item["icon"],
            steps=json.dumps(item["steps"]),
            created=anchor - timedelta(seconds=index),
            kind={
                "Nhựa": "plastic",
                "Giấy": "paper",
                "Pin": "battery",
                "Thủy tinh": "glass",
                "Kim loại": "metal",
                "Ni lông": "bag",
                "Y tế": "medical",
                "Vải": "textile",
            }.get(item["material"]),
        )
    for index, point in enumerate(fixtures["collectionPoints"]):
        id = fixture_id("point", point["id"])
        run(
            db,
            """insert into app_private.collection_points
          (id,code,name,address,area,latitude,longitude,hours,synthetic,published,created_at)
          values (:id,:code,:name,:address,:area,:lat,:lng,:hours,true,true,:created)
          on conflict do nothing""",
            id=id,
            code=point["id"],
            name=point["name"],
            address=point["address"],
            area=point["area"],
            lat=16.07 + index * 0.01,
            lng=108.22,
            hours=point["hours"],
            created=anchor - timedelta(seconds=index),
        )
        for material in point["materials"]:
            if material in materials:
                run(
                    db,
                    "insert into app_private.point_materials values (:id,:material) on conflict do nothing",
                    id=id,
                    material=fixture_id("material", material),
                )
    for index, event in enumerate(fixtures["events"]):
        times = re.findall(r"\d{2}:\d{2}", event["time"])
        starts = datetime.fromisoformat(f"{event['date']}T{times[0]}").replace(tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))
        ends = datetime.fromisoformat(f"{event['date']}T{times[1]}").replace(tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))
        run(
            db,
            """insert into app_private.events
          (id,code,title,description,location,topic,starts_at,ends_at,capacity,synthetic,published,created_at)
          values (:id,:code,:title,:description,:location,:topic,:starts,:ends,100,true,true,:created)
          on conflict do nothing""",
            id=fixture_id("event", event["id"]),
            code=event["id"],
            title=event["title"],
            description=event["description"],
            location=event["area"],
            topic=event["category"],
            starts=starts,
            ends=ends,
            created=anchor - timedelta(seconds=index),
        )
    for index, article in enumerate(fixtures["articles"]):
        run(
            db,
            """insert into app_private.articles(id,code,title,summary,topic,blocks,synthetic,published,created_at)
          values (:id,:code,:title,:summary,:topic,cast(:blocks as jsonb),true,true,:created)
          on conflict do nothing""",
            id=fixture_id("article", article["id"]),
            code=article["id"],
            title=article["title"],
            summary=article["body"][:200],
            topic=article["tag"],
            blocks=json.dumps([{"type": "paragraph", "text": p} for p in article["body"].split("\n\n")]),
            created=anchor - timedelta(seconds=index),
        )
    for index, reward in enumerate(fixtures["rewards"]):
        id = fixture_id("reward", reward["id"])
        run(
            db,
            """insert into app_private.rewards(id,code,name,description,category,cost_points,state,synthetic,created_at)
          values (:id,:code,:name,:description,:category,:cost,'published',true,:created) on conflict do nothing""",
            id=id,
            code=reward["id"],
            name=reward["title"],
            description=reward["description"],
            category=reward["category"],
            cost=reward["cost"],
            created=anchor - timedelta(seconds=index),
        )
        run(
            db,
            "insert into app_private.reward_inventory(reward_id,on_hand) values (:id,10) on conflict do nothing",
            id=id,
        )


def seed(url: str) -> None:
    if make_url(url).host not in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("Synthetic seed is restricted to localhost")
    engine = create_engine(url, hide_parameters=True)
    try:
        with Session(engine) as db, db.begin():
            seed_data(db)
    finally:
        engine.dispose()
    print("Seeded synthetic catalog data; no users, credentials, wallet points or real stock created.")
