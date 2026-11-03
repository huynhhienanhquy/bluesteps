import json
from datetime import date, datetime, time, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from .catalog import ARTICLE_SELECT, EVENT_SELECT, Cursor, Limit, article_get, event_filters, event_get
from .common import idempotent, not_found, outbox, page, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .loyalty import award_sorting
from .schemas import (
    Activity,
    Article,
    CutoffRequest,
    EventCollection,
    GreenEvent,
    HistorySummary,
    MoveEventsRequest,
    NameRequest,
    Notification,
    NotificationUpdate,
    Page,
    PointTransaction,
    Preferences,
    PreferencesUpdate,
    Profile,
    ProfileUpdate,
    Redemption,
    SavedEventRequest,
    SortingRequest,
    SortingResponse,
    Statistics,
    VersionedNameRequest,
    Wallet,
)
from .security import Actor, current_actor
from .text_search import text_search

router = APIRouter(prefix="/v1", tags=["member"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
Key = Annotated[str | None, Header(alias="Idempotency-Key", max_length=128)]


@router.get("/me", response_model=Profile, operation_id="me_get")
def profile(db: DB, actor: User) -> Any:
    return wire(
        one(
            db,
            """select u.id,u.email_normalized as email,u.timezone,p.display_name,
      p.birth_date,p.country_code,p.bio,p.version from app_private.users u
      join app_private.profiles p on p.user_id=u.id where u.id=:uid""",
            uid=actor.user_id,
        )
    )


@router.patch("/me", response_model=Profile, operation_id="me_update")
def update_profile(body: ProfileUpdate, db: DB, actor: User) -> Any:
    if not one(
        db,
        """update app_private.profiles set display_name=:name,birth_date=:birth,
      country_code=:country,bio=:bio,version=version+1
      where user_id=:uid and version=:version returning user_id""",
        uid=actor.user_id,
        name=body.display_name,
        birth=body.birth_date,
        country=body.country_code,
        bio=body.bio,
        version=body.expected_version,
    ):
        raise APIError(409, "VERSION_CONFLICT", "Hồ sơ đã thay đổi. Vui lòng tải lại.")
    return profile(db, actor)


@router.get("/me/preferences", response_model=Preferences, operation_id="preferences_get")
def preferences(db: DB, actor: User) -> Any:
    return wire(
        one(
            db,
            """select p.theme,p.sound,p.haptics,p.locale,p.version,p.interests,p.goal,u.timezone
      from app_private.user_preferences p join app_private.users u on u.id=p.user_id
      where p.user_id=:uid""",
            uid=actor.user_id,
        )
    )


@router.patch("/me/preferences", response_model=Preferences, operation_id="preferences_update")
def update_preferences(body: PreferencesUpdate, db: DB, actor: User) -> Any:
    if not one(
        db,
        """update app_private.user_preferences set theme=:theme,sound=:sound,
      haptics=:haptics,locale=:locale,interests=cast(:interests as jsonb),goal=:goal,
      version=version+1 where user_id=:uid and version=:version
      returning user_id""",
        uid=actor.user_id,
        theme=body.theme,
        sound=body.sound,
        haptics=body.haptics,
        locale=body.locale,
        interests=json.dumps(body.interests),
        goal=body.goal,
        version=body.expected_version,
    ):
        raise APIError(409, "VERSION_CONFLICT", "Cài đặt đã thay đổi.")
    run(
        db,
        "update app_private.users set timezone=:tz where id=:uid",
        tz=body.timezone,
        uid=actor.user_id,
    )
    return preferences(db, actor)


@router.get("/me/wallet", response_model=Wallet, operation_id="wallet_get")
def wallet(db: DB, actor: User) -> Any:
    return wire(
        one(
            db,
            """select balance::text,lifetime_earned::text,version
      from app_private.wallets where user_id=:uid""",
            uid=actor.user_id,
        )
    )


HistoryPeriod = Literal["all", "month", "week"]


def history_bounds(db: Session, actor: Actor) -> tuple[str, date, date, date, datetime]:
    account = one(db, "select timezone from app_private.users where id=:uid", uid=actor.user_id)
    timezone = str(account["timezone"] if account else "Asia/Ho_Chi_Minh")
    zone = ZoneInfo(timezone)
    today = datetime.now(zone).date()
    return (
        timezone,
        today,
        today - timedelta(days=today.weekday()),
        today.replace(day=1),
        datetime.combine(today + timedelta(days=1), time(), zone),
    )


def history_period(db: Session, actor: Actor, period: HistoryPeriod, column: str) -> tuple[str, dict[str, Any], str]:
    if period == "all":
        return "", {}, ""
    timezone, today, week, month, stop = history_bounds(db, actor)
    start = week if period == "week" else month
    return (
        f" and {column}>=:period_start and {column}<:period_stop",
        {"period_start": datetime.combine(start, time(), ZoneInfo(timezone)), "period_stop": stop},
        f":{period}:{timezone}:{today.isoformat()}",
    )


@router.get("/me/history-summary", response_model=HistorySummary, operation_id="history_summary_get")
def history_summary(db: DB, actor: User) -> Any:
    timezone, today, week, month, stop = history_bounds(db, actor)
    result = one(
        db,
        """select
      coalesce(sum(delta) filter (where created_at>=:week),0)::text as weekly_earned,
      coalesce(sum(delta) filter (where created_at>=:month),0)::text as monthly_earned
      from app_private.point_ledger where user_id=:uid and entry_kind='earn'
      and created_at>=least(:week,:month) and created_at<:stop""",
        uid=actor.user_id,
        week=datetime.combine(week, time(), ZoneInfo(timezone)),
        month=datetime.combine(month, time(), ZoneInfo(timezone)),
        stop=stop,
    )
    return {
        "timezone": timezone,
        "asOf": today,
        "weekStartsOn": week,
        "monthStartsOn": month,
        "weeklyEarned": result["weekly_earned"] if result else "0",
        "monthlyEarned": result["monthly_earned"] if result else "0",
    }


@router.get("/me/point-transactions", response_model=Page[PointTransaction], operation_id="point_transactions_list")
def transactions(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20, period: HistoryPeriod = "all") -> Any:
    clause, params, scope = history_period(db, actor, period, "l.created_at")
    return page(
        db,
        f"ledger:{actor.user_id}{scope}",
        """select l.id,l.delta::text,l.balance_after::text,
      l.entry_kind,l.source_type,l.source_id,l.created_at,
      case when w.id is not null then 'Phân loại '||w.name
        when d.id is not null and l.source_type='redemption_refund' then 'Hoàn điểm quà “'||r.name||'”'
        when d.id is not null then 'Đổi quà “'||r.name||'”'
        when l.source_type='daily_claim' then 'Điểm danh hằng ngày'
        when g.id is not null then 'Hoàn thành Sứ mệnh xanh'
        else null end as source_label,
      case when s.scan_id is not null then '/scan?scanId='||s.scan_id::text||'&reviewFrom=history'
        when w.id is not null then '/handbook/'||w.id::text
        when d.id is not null then '/rewards/redemption?id='||d.id::text
        when l.source_type='daily_claim' then '/rewards/catalog'
        when g.id is not null then '/game?room='||g.id::text
        else null end as target_path
      from app_private.point_ledger l
      left join app_private.sorting_actions s on l.source_type in ('sorting','sorting_action')
        and s.id=l.source_id and s.user_id=l.user_id
      left join app_private.waste_items w on w.id=s.item_id and w.published and not w.synthetic
      left join app_private.redemptions d on l.source_type in ('redemption','redemption_refund')
        and d.id=l.source_id and d.user_id=l.user_id
      left join app_private.rewards r on r.id=d.reward_id
      left join app_private.game_rooms g on l.source_type='green_mission' and g.id=l.source_id
        and exists(select 1 from app_private.game_room_players p where p.room_id=g.id and p.user_id=l.user_id)
      where l.user_id=:uid"""
        + clause,
        {"uid": actor.user_id, **params},
        cursor=cursor,
        limit=limit,
    )


@router.post(
    "/sorting-actions",
    response_model=SortingResponse,
    status_code=201,
    operation_id="sorting_create",
)
def sorting(body: SortingRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        if not one(
            db, "select id from app_private.waste_items where id=:id and published and not synthetic", id=body.item_id
        ):
            raise not_found()
        scan_id = getattr(body, "scan_id", None)
        if scan_id:
            scan = one(
                db,
                "select * from app_private.scans where id=:id and user_id=:uid for update",
                id=scan_id,
                uid=actor.user_id,
            )
            if not scan:
                raise not_found()
            if scan["status"] not in ("completed", "unrecognized"):
                raise APIError(409, "SCAN_NOT_READY", "Kết quả quét chưa sẵn sàng.")
            if scan["result_mode"] == "fixed":
                if not scan["result_item_id"]:
                    raise APIError(409, "SCAN_CATALOG_UNAVAILABLE", "Chưa có mục sổ tay được công bố cho kết quả này.")
                if scan["result_item_id"] != body.item_id:
                    raise APIError(409, "SCAN_ITEM_MISMATCH", "Vật phẩm không khớp kết quả của lần quét.")
            if one(db, "select id from app_private.sorting_actions where scan_id=:id", id=scan_id):
                raise APIError(409, "SCAN_ALREADY_CONFIRMED", "Lần quét đã được xác nhận.")
        action_id = uuid4()
        evidence = "user_confirmed" if scan_id else "self_reported"
        run(
            db,
            """insert into app_private.sorting_actions
          (id,user_id,item_id,scan_id,source,evidence_status,reported_weight_kg)
          values (:id,:uid,:item,:scan,:source,:evidence,:weight)""",
            id=action_id,
            uid=actor.user_id,
            item=body.item_id,
            scan=scan_id,
            source=body.source,
            evidence=evidence,
            weight=body.reported_weight_kg,
        )
        award = award_sorting(db, actor.user_id, action_id, body.item_id)
        outbox(
            db,
            action_id,
            "sorting.recorded",
            {"userId": actor.user_id, "awardStatus": award["status"], "awardReason": award["reason"]},
        )
        result = {
            "actionId": str(action_id),
            "itemId": str(body.item_id),
            "evidenceStatus": evidence,
            "award": award,
            "walletBalance": wallet(db, actor)["balance"],
        }
        if scan_id:
            run(
                db,
                "update app_private.scans set confirmation_snapshot=cast(:result as jsonb) where id=:id",
                id=scan_id,
                result=json.dumps(wire(result)),
            )
        return result

    return idempotent(db, actor.user_id, "sorting_create", key, body.model_dump(exclude_none=True), effect)


@router.get("/me/activity", response_model=Page[Activity], operation_id="activity_list")
def activity(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20, period: HistoryPeriod = "all") -> Any:
    clause, params, scope = history_period(db, actor, period, "s.created_at")
    return page(
        db,
        f"activity:{actor.user_id}{scope}",
        """select s.id,s.item_id,s.source,s.evidence_status,s.created_at,s.scan_id,w.name as item_name
      from app_private.sorting_actions s
      left join app_private.waste_items w on w.id=s.item_id and w.published and not w.synthetic
      where s.user_id=:uid"""
        + clause,
        {"uid": actor.user_id, **params},
        cursor=cursor,
        limit=limit,
    )


def own_collection(db: Session, actor: Actor, id: UUID) -> Any:
    result = one(
        db,
        "select * from app_private.event_collections where id=:id and user_id=:uid for update",
        id=id,
        uid=actor.user_id,
    )
    if not result:
        raise not_found()
    return result


@router.get("/me/event-collections", response_model=Page[EventCollection], operation_id="event_collections_list")
def collections(db: DB, actor: User) -> Any:
    return {
        "items": wire(
            rows(
                db,
                """select id,name,version,created_at from app_private.event_collections
      where user_id=:uid order by created_at,id""",
                uid=actor.user_id,
            )
        ),
        "nextCursor": None,
    }


@router.post(
    "/me/event-collections", status_code=201, response_model=EventCollection, operation_id="event_collection_create"
)
def create_collection(body: NameRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        result = one(
            db,
            """insert into app_private.event_collections(user_id,name) values (:uid,:name)
          returning id,name,version,created_at""",
            uid=actor.user_id,
            name=body.name,
        )
        assert result is not None
        return dict(result)

    return idempotent(db, actor.user_id, "event_collection_create", key, body.model_dump(), effect)


@router.patch("/me/event-collections/{id}", response_model=EventCollection, operation_id="event_collection_update")
def update_collection(id: UUID, body: VersionedNameRequest, db: DB, actor: User) -> Any:
    own_collection(db, actor, id)
    result = one(
        db,
        """update app_private.event_collections set name=:name,version=version+1
      where id=:id and user_id=:uid and version=:version returning id,name,version,created_at""",
        id=id,
        uid=actor.user_id,
        name=body.name,
        version=body.expected_version,
    )
    if not result:
        raise APIError(409, "VERSION_CONFLICT", "Bộ sưu tập đã thay đổi.")
    return wire(result)


@router.delete("/me/event-collections/{id}", status_code=204, operation_id="event_collection_delete")
def delete_collection(id: UUID, db: DB, actor: User) -> Response:
    own_collection(db, actor, id)
    run(
        db,
        "update app_private.saved_events set collection_id=null where collection_id=:id and user_id=:uid",
        id=id,
        uid=actor.user_id,
    )
    run(
        db,
        "delete from app_private.event_collections where id=:id and user_id=:uid",
        id=id,
        uid=actor.user_id,
    )
    return Response(status_code=204)


@router.put("/me/saved-events/{id}", operation_id="saved_event_put")
def save_event(id: UUID, body: SavedEventRequest, db: DB, actor: User) -> Any:
    event_get(id, db)
    if body.collection_id:
        own_collection(db, actor, body.collection_id)
    result = one(
        db,
        """insert into app_private.saved_events as saved(user_id,event_id,collection_id)
      values (:uid,:id,:collection)
      on conflict(user_id,event_id) do update set collection_id=
        case when :set_collection then excluded.collection_id else saved.collection_id end
      returning collection_id""",
        uid=actor.user_id,
        id=id,
        collection=body.collection_id,
        set_collection="collection_id" in body.model_fields_set,
    )
    assert result is not None
    return {"eventId": str(id), "saved": True, "collectionId": wire(result["collection_id"])}


@router.delete("/me/saved-events/{id}", status_code=204, operation_id="saved_event_delete")
def unsave_event(id: UUID, db: DB, actor: User) -> Response:
    run(
        db,
        "delete from app_private.saved_events where user_id=:uid and event_id=:id",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.get("/me/saved-events", response_model=Page[GreenEvent], operation_id="saved_events_list")
def saved_events(
    db: DB,
    actor: User,
    cursor: Cursor = None,
    limit: Limit = 20,
    q: str = "",
    topic: str | None = None,
    location: str | None = None,
    on_date: date | None = None,
    week_of: date | None = None,
    timezone: str = "Asia/Ho_Chi_Minh",
) -> Any:
    condition, params, scope = event_filters(q, topic, location, on_date, week_of, timezone)
    filtered = bool(q or topic or location or on_date or week_of)
    return page(
        db,
        f"saved-events:{actor.user_id}:{scope}" if filtered else f"saved-events:{actor.user_id}",
        EVENT_SELECT
        + """ and id in
      (select event_id from app_private.saved_events where user_id=:uid)"""
        + condition,
        {"uid": actor.user_id, **params},
        cursor=cursor,
        limit=limit,
    )


@router.post("/me/event-collections/{id}/move", status_code=204, operation_id="event_collection_move")
def move_events(id: UUID, body: MoveEventsRequest, db: DB, actor: User, key: Key = None) -> Response:
    def effect() -> dict[str, Any]:
        # Lock collections in UUID order to avoid opposite-direction deadlocks.
        collection_ids = {id}
        if body.target_collection_id:
            collection_ids.add(body.target_collection_id)
        for collection_id in sorted(collection_ids):
            own_collection(db, actor, collection_id)
        selected = rows(
            db,
            """select event_id from app_private.saved_events
          where user_id=:uid and collection_id=:id and event_id=any(cast(:ids as uuid[])) for update""",
            uid=actor.user_id,
            id=id,
            ids=body.event_ids,
        )
        if len(selected) != len(set(body.event_ids)):
            raise not_found()
        run(
            db,
            """update app_private.saved_events set collection_id=:target where user_id=:uid
          and collection_id=:id and event_id=any(cast(:ids as uuid[]))""",
            uid=actor.user_id,
            id=id,
            ids=body.event_ids,
            target=body.target_collection_id,
        )
        return {}

    if key:
        idempotent(db, actor.user_id, f"event_collection_move:{id}", key, body.model_dump(), effect)
    else:
        effect()
    return Response(status_code=204)


@router.get("/me/calendar", operation_id="calendar_get")
def calendar(db: DB, actor: User, start: datetime, end: datetime) -> Any:
    if not start.tzinfo or not end.tzinfo or not 0 < (end - start).total_seconds() <= 93 * 86400:
        raise APIError(422, "INVALID_DATE_WINDOW", "Khoảng thời gian tối đa 93 ngày và cần múi giờ.")
    result = rows(
        db,
        EVENT_SELECT
        + """ and starts_at<:end and ends_at>:start
      and (id in (select event_id from app_private.saved_events where user_id=:uid)
        or id in (select event_id from app_private.event_registrations where user_id=:uid and status='registered'))
      order by starts_at,id""",
        start=start,
        end=end,
        uid=actor.user_id,
    )
    overlaps = [
        {"eventIds": [str(a["id"]), str(b["id"])]}
        for i, a in enumerate(result)
        for b in result[i + 1 :]
        if a["starts_at"] < b["ends_at"] and b["starts_at"] < a["ends_at"]
    ]
    registrations = rows(
        db,
        "select event_id,checked_in_at from app_private.event_registrations where user_id=:uid and status='registered'",
        uid=actor.user_id,
    )
    return {
        "items": wire(result),
        "overlaps": overlaps,
        "relationship": "saved_or_registered",
        "registeredEventIds": [str(item["event_id"]) for item in registrations],
        "checkedInEventIds": [str(item["event_id"]) for item in registrations if item["checked_in_at"]],
    }


@router.put("/me/saved-articles/{id}", status_code=204, operation_id="saved_article_put")
def save_article(id: UUID, db: DB, actor: User) -> Response:
    article_get(id, db)
    run(
        db,
        """insert into app_private.saved_articles(user_id,article_id) values (:uid,:id)
      on conflict do nothing""",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.delete("/me/saved-articles/{id}", status_code=204, operation_id="saved_article_delete")
def unsave_article(id: UUID, db: DB, actor: User) -> Response:
    run(
        db,
        "delete from app_private.saved_articles where user_id=:uid and article_id=:id",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.get("/me/saved-articles", response_model=Page[Article], operation_id="saved_articles_list")
def saved_articles(
    db: DB,
    actor: User,
    cursor: Cursor = None,
    limit: Limit = 20,
    q: str = Query(default="", max_length=200),
    topic: str | None = Query(default=None, max_length=100),
) -> Any:
    condition, search = text_search(q, ("title", "summary"))
    scope = (
        f"saved-articles:{actor.user_id}"
        if not q.strip() and not topic
        else json.dumps(["saved-articles", str(actor.user_id), q.strip(), topic])
    )
    return page(
        db,
        scope,
        ARTICLE_SELECT
        + f""" and id in
      (select article_id from app_private.saved_articles where user_id=:uid) and {condition}
      and (cast(:topic as text) is null or topic=:topic)""",
        {"uid": actor.user_id, **search, "topic": topic},
        cursor=cursor,
        limit=limit,
    )


@router.get("/me/notifications", response_model=Page[Notification], operation_id="notifications_list")
def notifications(
    db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20, unread: bool = False, category: str | None = None
) -> Any:
    if category and category not in ("activity", "offers", "community", "news"):
        raise APIError(422, "INVALID_CATEGORY", "Nhóm thông báo không hợp lệ.")
    return page(
        db,
        f"notifications:{actor.user_id}:{unread}:{category}",
        """select id,title,body,read_at,created_at,category,target_path,details
      from app_private.notifications where user_id=:uid and (not :unread or read_at is null)
      and (cast(:category as text) is null or category=:category)""",
        {"uid": actor.user_id, "unread": unread, "category": category},
        cursor=cursor,
        limit=limit,
    )


@router.patch("/me/notifications/{id}", status_code=204, operation_id="notification_update")
def notification_read(id: UUID, body: NotificationUpdate, db: DB, actor: User) -> Response:
    if not one(
        db,
        """update app_private.notifications set read_at=coalesce(read_at,now())
      where id=:id and user_id=:uid returning id""",
        id=id,
        uid=actor.user_id,
    ):
        raise not_found()
    return Response(status_code=204)


@router.post("/me/notifications/read-all", status_code=204, operation_id="notifications_read_all")
def notification_read_all(body: CutoffRequest, db: DB, actor: User) -> Response:
    if not body.cutoff.tzinfo:
        raise APIError(422, "TIMEZONE_REQUIRED", "Thời gian cần múi giờ.")
    run(
        db,
        """update app_private.notifications set read_at=now() where user_id=:uid
      and read_at is null and created_at<=least(:cutoff,now())""",
        uid=actor.user_id,
        cutoff=body.cutoff,
    )
    return Response(status_code=204)


@router.get("/me/statistics", response_model=Statistics, operation_id="statistics_get")
def statistics(db: DB, actor: User) -> Any:
    result = one(
        db,
        "select count(*) as count from app_private.sorting_actions where user_id=:uid",
        uid=actor.user_id,
    )
    return {
        "sortingActions": result["count"] if result else 0,
        "evidenceStatus": "self_reported",
        "verifiedKg": None,
        "wallet": wallet(db, actor),
    }


@router.get("/me/redemptions", response_model=Page[Redemption], operation_id="redemptions_list")
def redemptions(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20, period: HistoryPeriod = "all") -> Any:
    clause, params, scope = history_period(db, actor, period, "d.created_at")
    return page(
        db,
        f"redemptions:{actor.user_id}{scope}",
        """select d.id,d.reward_id,d.quantity,d.unit_cost_snapshot::text,d.total_cost::text,
      d.status,d.created_at,r.name as reward_name from app_private.redemptions d
      left join app_private.rewards r on r.id=d.reward_id where d.user_id=:uid"""
        + clause,
        {"uid": actor.user_id, **params},
        cursor=cursor,
        limit=limit,
    )
