import json
import unicodedata
from datetime import date, datetime, time, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from .common import not_found, page, wire
from .db import db_session, one, rows
from .errors import APIError
from .schemas import Article, CollectionPoint, EventFilterOptions, GreenEvent, Page, PointComparison, Reward, WasteItem
from .text_search import text_search

router = APIRouter(prefix="/v1", tags=["catalog"])
DB = Annotated[Session, Depends(db_session, scope="function")]
Limit = Annotated[int, Query(ge=1, le=100)]
Cursor = Annotated[str | None, Query(max_length=1000)]

WASTE_SELECT = """select w.id,w.code,w.name,w.icon,w.steps,w.sources,w.revision,w.synthetic,
  w.handbook_kind,c.handbook_key as category_key,
  c.name as category,m.name as material,m.hazardous,w.created_at
  from app_private.waste_items w join app_private.waste_categories c on c.id=w.category_id
  join app_private.waste_materials m on m.id=w.material_id where w.published and not w.synthetic"""
POINT_OPEN_STATE = """case when p.status_expires_at>now() and p.capacity_state='closed'
  then false else app_private.point_open_at(p.id,now()) end"""
POINT_SELECT = f"""select p.id,p.code,p.name,p.address,p.area,p.latitude,p.longitude,p.hours,
  p.entrance_label,p.handover_instructions,p.contact_phone,p.website_url,
  p.timezone,p.version,p.synthetic,p.created_at,
  coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name))
    from app_private.point_materials pm join app_private.waste_materials m on m.id=pm.material_id
    where pm.point_id=p.id),'[]') as materials,
  case when p.status_expires_at>now() then p.capacity_state else 'unknown' end as capacity_state,
  p.status_observed_at,p.status_expires_at,p.staffed,p.always_open,
  reviews.average_rating,reviews.review_count,
  {POINT_OPEN_STATE} as open_now,null::double precision as distance_m
  from app_private.collection_points p
  left join lateral (
    select avg(r.rating)::double precision as average_rating,count(*) as review_count
    from app_private.point_reviews r
    join app_private.profiles author on author.user_id=r.user_id
    where r.point_id=p.id and r.state='published'
  ) reviews on true
  where p.published and not p.synthetic"""
EVENT_SELECT = """select id,code,title,description,location,topic,starts_at,ends_at,timezone,
  capacity,reserved_count,capacity-reserved_count as available,details,version,synthetic,created_at
  from app_private.events where published and not synthetic"""
ARTICLE_SELECT = """select id,code,title,summary,topic,blocks,sources,synthetic,created_at
  from app_private.articles where published and not synthetic"""
REWARD_SELECT = """select r.id,r.code,r.name,r.description,r.category,r.cost_points::text,
  r.version,r.synthetic,r.created_at,coalesce(i.on_hand-i.reserved,0) as available,
  coalesce((select enabled from app_private.reward_program where id),false) as redemption_enabled
  from app_private.rewards r
  left join app_private.reward_inventory i on i.reward_id=r.id where r.state='published' and not r.synthetic"""


@router.get("/bootstrap", operation_id="bootstrap")
def bootstrap(request: Request) -> dict[str, Any]:
    return {
        "apiVersion": "v1",
        "termsVersion": request.app.state.settings.terms_version,
        "identity": "python",
        "features": {
            "recognition": False,
            "fixedScanResult": True,
            "redemption": True,
            "dailyClaims": True,
            "eventRegistration": True,
            "routingProvider": False,
            "assistant": False,
            "push": False,
            "friendsVisibility": True,
            "postMedia": True,
        },
    }


@router.get("/waste-categories", operation_id="waste_categories_list")
def categories(db: DB) -> dict[str, Any]:
    return {
        "items": wire(
            rows(
                db,
                """select c.id,c.code,c.name,c.handbook_key from app_private.waste_categories c where exists
(select 1 from app_private.waste_items w where w.category_id=c.id and w.published and not w.synthetic)
order by c.sort_order,c.code""",
            )
        ),
        "nextCursor": None,
    }


@router.get("/waste-materials", operation_id="waste_materials_list")
def materials(db: DB) -> dict[str, Any]:
    return {
        "items": wire(
            rows(
                db,
                """select m.id,m.code,m.name,m.hazardous from app_private.waste_materials m where exists
(select 1 from app_private.waste_items w where w.material_id=m.id and w.published and not w.synthetic)
order by m.code""",
            )
        ),
        "nextCursor": None,
    }


@router.get("/waste-items", response_model=Page[WasteItem], operation_id="waste_items_list")
def waste_list(
    db: DB,
    q: str = "",
    category: UUID | None = None,
    cursor: Cursor = None,
    limit: Limit = 20,
    category_key: Literal["recycle", "organic", "inorganic"] | None = None,
    kind: Literal["plastic", "paper", "glass", "metal", "textile", "rubber", "ceramic", "medical", "bag", "battery"]
    | None = None,
) -> dict[str, Any]:
    condition, search = text_search(q[:200], ("w.name", "m.name"))
    return page(
        db,
        f"waste-items:{q[:200]}:{category}:{category_key}:{kind}",
        WASTE_SELECT
        + f""" and {condition}
      and (cast(:category as uuid) is null or w.category_id=:category)
      and (cast(:category_key as text) is null or c.handbook_key=:category_key)
      and (cast(:kind as text) is null or w.handbook_kind=:kind)""",
        {**search, "category": category, "category_key": category_key, "kind": kind},
        cursor=cursor,
        limit=limit,
    )


@router.get("/waste-items/{id}", response_model=WasteItem, operation_id="waste_item_get")
def waste_get(id: UUID, db: DB) -> Any:
    result = one(db, WASTE_SELECT + " and w.id=:id", id=id)
    if not result:
        raise not_found()
    return wire(result)


@router.get("/waste-items/{id}/instructions", response_model=WasteItem, operation_id="waste_instructions_get")
def instructions(id: UUID, db: DB) -> Any:
    return waste_get(id, db)


@router.get("/collection-points", response_model=Page[CollectionPoint], operation_id="collection_points_list")
def points(
    db: DB,
    q: str = "",
    material_ids: Annotated[list[UUID] | None, Query()] = None,
    match_mode: str = Query(default="all", pattern="^(all|any)$"),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_m: int = Query(default=5000, ge=1, le=100000),
    only_open: bool = False,
    open_24h: bool = False,
    available_only: bool = False,
    staffed_only: bool = False,
    cursor: Cursor = None,
    limit: Limit = 20,
) -> dict[str, Any]:
    from .errors import APIError

    if (lat is None) != (lng is None):
        raise APIError(422, "LOCATION_PAIR_REQUIRED", "Cần cả lat và lng.")
    if material_ids and len(material_ids) > 20:
        raise APIError(422, "TOO_MANY_MATERIALS", "Tối đa 20 vật liệu.")
    ids = list(set(material_ids or []))
    sql = POINT_SELECT + " and (p.name ilike :q or p.address ilike :q)"
    params: dict[str, Any] = {"q": f"%{q[:200]}%"}
    if only_open:
        sql += f" and ({POINT_OPEN_STATE}) is true"
    if open_24h:
        sql += " and p.always_open is true"
    if available_only:
        sql += " and p.capacity_state in ('available','limited') and p.status_expires_at>now()"
    if staffed_only:
        sql += " and p.staffed is true"
    if ids:
        sql += """ and (select count(distinct pm.material_id) from app_private.point_materials pm
          where pm.point_id=p.id and pm.material_id=any(cast(:materials as uuid[]))) >= :required"""
        params.update(materials=ids, required=len(ids) if match_mode == "all" else 1)
    if lat is not None:
        # PostGIS extension schema is resolved from pg_extension, never from request input.
        ext = one(
            db,
            """select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace
          where e.extname='postgis'""",
        )
        assert ext is not None
        schema = '"' + ext["nspname"].replace('"', '""') + '"'
        sql = sql.replace(
            "null::double precision as distance_m",
            f"{schema}.ST_Distance(p.location,"
            f"{schema}.ST_SetSRID({schema}.ST_MakePoint(:lng,:lat),4326)::{schema}.geography) as distance_m",
        )
        sql += f""" and {schema}.ST_DWithin(p.location,
          {schema}.ST_SetSRID({schema}.ST_MakePoint(:lng,:lat),4326)::{schema}.geography,:radius)"""
        params.update(lat=lat, lng=lng, radius=radius_m)
    return page(db, "collection-points", sql, params, cursor=cursor, limit=limit)


@router.get("/collection-points/compare", response_model=PointComparison, operation_id="collection_points_compare")
def compare_points(
    db: DB,
    ids: Annotated[list[UUID], Query(min_length=2, max_length=5)],
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
) -> Any:
    from .errors import APIError

    if len(set(ids)) != len(ids) or (lat is None) != (lng is None):
        raise APIError(422, "INVALID_COMPARISON", "Chọn 2–5 điểm khác nhau và cung cấp đủ cặp tọa độ nếu dùng vị trí.")
    sql = POINT_SELECT + " and p.id=any(cast(:ids as uuid[]))"
    params: dict[str, Any] = {"ids": ids}
    if lat is not None:
        ext = one(
            db,
            "select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace "
            "where e.extname='postgis'",
        )
        assert ext is not None
        schema = '"' + ext["nspname"].replace('"', '""') + '"'
        sql = sql.replace(
            "null::double precision as distance_m",
            f"{schema}.ST_Distance(p.location,"
            f"{schema}.ST_SetSRID({schema}.ST_MakePoint(:lng,:lat),4326)::{schema}.geography) as distance_m",
        )
        params.update(lat=lat, lng=lng)
    result = rows(db, sql, **params)
    if len(result) != len(ids):
        raise not_found()
    ordered = sorted(result, key=lambda p: ids.index(p["id"]))
    eligible = [
        p
        for p in result
        if p["open_now"] is True and p["capacity_state"] in ("available", "limited") and p["distance_m"] is not None
    ]
    recommended = min(eligible, key=lambda p: p["distance_m"])["id"] if eligible else None
    return wire(
        {
            "items": ordered,
            "recommended_id": recommended,
            "recommendation_reason": "Gần nhất trong các điểm so sánh đang mở và còn chỗ."
            if recommended
            else "Dùng vị trí hiện tại để gợi ý theo khoảng cách."
            if lat is None
            else "Chưa có điểm đang mở và còn chỗ được xác nhận để gợi ý.",
        }
    )


@router.get("/collection-points/{id}", response_model=CollectionPoint, operation_id="collection_point_get")
def point_get(id: UUID, db: DB) -> Any:
    result = one(db, POINT_SELECT + " and p.id=:id", id=id)
    if not result:
        raise not_found()
    return wire(result)


def event_filters(
    q: str,
    topic: str | None,
    location: str | None,
    on_date: date | None,
    week_of: date | None,
    timezone: str,
) -> tuple[str, dict[str, Any], str]:
    try:
        zone = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise APIError(422, "INVALID_TIMEZONE", "Múi giờ không hợp lệ.") from exc
    params: dict[str, Any] = {
        "q": f"%{q[:200]}%",
        "topic": topic,
        "location": location,
        "q_folded": "%"
        + "".join(
            char for char in unicodedata.normalize("NFD", q[:200].lower()) if not unicodedata.combining(char)
        ).replace("đ", "d")
        + "%",
        "combining_marks": "[\u0300-\u036f]",
    }
    condition = """ and (title ilike :q or location ilike :q
      or translate(regexp_replace(normalize(lower(title),NFD),:combining_marks,'','g'),'đ','d') like :q_folded
      or translate(regexp_replace(normalize(lower(location),NFD),:combining_marks,'','g'),'đ','d') like :q_folded)
      and (cast(:topic as text) is null or topic=:topic)
      and (cast(:location as text) is null or location=:location)"""
    windows = []
    if on_date:
        windows.append((on_date, on_date + timedelta(days=1)))
    if week_of:
        monday = week_of - timedelta(days=week_of.weekday())
        windows.append((monday, monday + timedelta(days=7)))
    if windows:
        lower = datetime.combine(max(item[0] for item in windows), time(), zone)
        upper = datetime.combine(min(item[1] for item in windows), time(), zone)
        params.update(window_start=lower, window_end=upper)
        condition += """ and :window_start<:window_end
          and starts_at<:window_end and ends_at>:window_start"""
    scope = json.dumps([q[:200], topic, location, str(on_date), str(week_of), timezone], ensure_ascii=False)
    return condition, params, scope


@router.get("/events", response_model=Page[GreenEvent], operation_id="events_list")
def events(
    db: DB,
    q: str = "",
    topic: str | None = None,
    cursor: Cursor = None,
    limit: Limit = 20,
    location: str | None = None,
    on_date: date | None = None,
    week_of: date | None = None,
    timezone: str = "Asia/Ho_Chi_Minh",
) -> dict[str, Any]:
    condition, params, scope = event_filters(q, topic, location, on_date, week_of, timezone)
    return page(
        db,
        f"events:{scope}" if q or topic or location or on_date or week_of else "events",
        EVENT_SELECT + condition,
        params,
        cursor=cursor,
        limit=limit,
    )


@router.get("/events/filter-options", response_model=EventFilterOptions, operation_id="event_filter_options")
def event_filter_options(db: DB) -> Any:
    values = rows(db, f"select distinct location,topic from ({EVENT_SELECT}) published_events")
    return {
        "locations": sorted({item["location"] for item in values if item["location"]}),
        "topics": sorted({item["topic"] for item in values if item["topic"]}),
    }


@router.get("/events/{id}", response_model=GreenEvent, operation_id="event_get")
def event_get(id: UUID, db: DB) -> Any:
    result = one(db, EVENT_SELECT + " and id=:id", id=id)
    if not result:
        raise not_found()
    return wire(result)


@router.get("/articles", response_model=Page[Article], operation_id="articles_list")
def articles(
    db: DB,
    q: str = "",
    topic: str | None = None,
    days: Annotated[int | None, Query(ge=1, le=365)] = None,
    cursor: Cursor = None,
    limit: Limit = 20,
) -> dict[str, Any]:
    condition, search = text_search(q[:200], ("title", "summary"))
    return page(
        db,
        f"articles:{q[:200]}:{topic}:{days}",
        ARTICLE_SELECT
        + f""" and {condition}
      and (cast(:topic as text) is null or topic=:topic)
      and (cast(:days as integer) is null or created_at>=now()-make_interval(days=>:days))""",
        {**search, "topic": topic, "days": days},
        cursor=cursor,
        limit=limit,
    )


@router.get("/articles/{id}", response_model=Article, operation_id="article_get")
def article_get(id: UUID, db: DB) -> Any:
    result = one(db, ARTICLE_SELECT + " and id=:id", id=id)
    if not result:
        raise not_found()
    return wire(result)


@router.get("/rewards", response_model=Page[Reward], operation_id="rewards_list")
def rewards(
    db: DB,
    category: Literal["recycled", "voucher", "entertainment", "other"] | None = None,
    cursor: Cursor = None,
    limit: Limit = 20,
) -> dict[str, Any]:
    conditions = {
        "recycled": " and r.category in ('recycled','recycling')",
        "voucher": " and r.category='voucher'",
        "entertainment": " and r.category='entertainment'",
        "other": " and r.category not in ('recycled','recycling','voucher','entertainment')",
    }
    scope = "rewards" if category is None else f"rewards:{category}"
    condition = conditions[category] if category else ""
    return page(db, scope, REWARD_SELECT + condition, {}, cursor=cursor, limit=limit)


@router.get("/rewards/{id}", response_model=Reward, operation_id="reward_get")
def reward_get(id: UUID, db: DB) -> Any:
    result = one(db, REWARD_SELECT + " and r.id=:id", id=id)
    if not result:
        raise not_found()
    return wire(result)
