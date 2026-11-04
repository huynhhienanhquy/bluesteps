import json
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Response
from pydantic import Field, field_validator, model_validator
from sqlalchemy.orm import Session

from .catalog import Cursor, Limit
from .common import idempotent, not_found, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .member import Key, wallet
from .schemas import Model, Page, Preferences, Wallet
from .security import Actor, current_actor

router = APIRouter(prefix="/v1", tags=["insights"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
Metric = Literal["sorting_actions", "reported_weight_kg", "event_checkins"]


class Breakdown(Model):
    id: UUID
    code: str
    name: str
    actions: int
    weighed_actions: int
    reported_weight_kg: str | None


class DailyFrequency(Model):
    date: date
    actions: int
    categories: dict[str, int]


class TargetInput(Model):
    title: str = Field(min_length=1, max_length=80)
    metric: Metric
    target: Decimal = Field(gt=0, le=1000000, max_digits=12, decimal_places=3)
    starts_on: date
    ends_on: date
    timezone: str = "Asia/Ho_Chi_Minh"

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value: str) -> str:
        return Preferences.valid_timezone(value)

    @model_validator(mode="after")
    def valid_target(self) -> "TargetInput":
        if not self.title.strip() or not 0 <= (self.ends_on - self.starts_on).days <= 365:
            raise ValueError("Choose a title and a date range of at most 366 days")
        if self.metric != "reported_weight_kg" and self.target != self.target.to_integral():
            raise ValueError("Action/event targets must be whole numbers")
        return self


class TargetUpdate(TargetInput):
    expected_version: int = Field(ge=1)


class PersonalTarget(TargetInput):
    id: UUID
    version: int
    created_at: datetime
    progress: str
    completed: bool


class Insights(Model):
    timezone: str
    starts_on: date
    ends_on: date
    sorting_actions: int
    period_actions: int
    weighed_actions: int
    reported_weight_kg: str | None
    verified_kg: None = None
    categories: list[Breakdown]
    materials: list[Breakdown]
    frequency: list[DailyFrequency]
    targets: list[PersonalTarget]
    wallet: Wallet


def user_zone(db: Session, actor: Actor) -> str:
    return str(
        (one(db, "select timezone from app_private.users where id=:id", id=actor.user_id) or {}).get(
            "timezone", "Asia/Ho_Chi_Minh"
        )
    )


def boundaries(start: date, end: date, timezone: str) -> tuple[datetime, datetime]:
    zone = ZoneInfo(timezone)
    return datetime.combine(start, time(), zone), datetime.combine(end + timedelta(days=1), time(), zone)


def target_progress(db: Session, actor: Actor, target: Any) -> Decimal:
    start, end = boundaries(target["starts_on"], target["ends_on"], target["timezone"])
    if target["metric"] == "event_checkins":
        value = one(
            db,
            """select count(*) as value from app_private.event_registrations where user_id=:uid
            and status='registered' and checked_in_at>=:start and checked_in_at<:end""",
            uid=actor.user_id,
            start=start,
            end=end,
        )
    else:
        expression = "count(*)" if target["metric"] == "sorting_actions" else "coalesce(sum(reported_weight_kg),0)"
        value = one(
            db,
            f"""select {expression} as value from app_private.sorting_actions
            where user_id=:uid and created_at>=:start and created_at<:end""",
            uid=actor.user_id,
            start=start,
            end=end,
        )
    return Decimal(value["value"] if value else 0)


def target_result(db: Session, actor: Actor, target: Any, *, progress: Decimal | None = None) -> dict[str, Any]:
    if progress is None:
        progress = target_progress(db, actor, target)
    return {
        **{key: value for key, value in target.items() if key not in ("user_id", "archived_at")},
        "progress": str(progress),
        "completed": progress >= target["target"],
    }


@router.get("/me/targets", response_model=list[PersonalTarget], operation_id="targets_list")
def targets(db: DB, actor: User) -> Any:
    items = rows(
        db,
        """select * from app_private.personal_targets
        where user_id=:uid and archived_at is null order by created_at desc,id desc""",
        uid=actor.user_id,
    )
    if not items:
        return []
    # Keep ZoneInfo's boundary handling, including DST, while fetching all progress
    # in one round trip rather than one query for every personal target.
    periods = []
    for item in items:
        start, stop = boundaries(item["starts_on"], item["ends_on"], item["timezone"])
        periods.append(
            {"id": str(item["id"]), "metric": item["metric"], "start": start.isoformat(), "stop": stop.isoformat()}
        )
    progress = {
        item["id"]: Decimal(item["progress"])
        for item in rows(
            db,
            """select t.id,case when t.metric='event_checkins' then
              (select count(*) from app_private.event_registrations r where r.user_id=:uid
                and r.status='registered' and r.checked_in_at>=t.start and r.checked_in_at<t.stop)
            else
              (select case when t.metric='sorting_actions' then count(*)
                else coalesce(sum(a.reported_weight_kg),0) end
               from app_private.sorting_actions a where a.user_id=:uid
                and a.created_at>=t.start and a.created_at<t.stop)
            end as progress
            from jsonb_to_recordset(cast(:periods as jsonb))
              as t(id uuid,metric text,start timestamptz,stop timestamptz)""",
            uid=actor.user_id,
            periods=json.dumps(periods),
        )
    }
    return wire([target_result(db, actor, item, progress=progress[item["id"]]) for item in items])


@router.post("/me/targets", response_model=PersonalTarget, status_code=201, operation_id="target_create")
def create_target(body: TargetInput, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"target:{actor.user_id}")
        count = one(
            db,
            "select count(*) as count from app_private.personal_targets where user_id=:uid and archived_at is null",
            uid=actor.user_id,
        )
        if count and count["count"] >= 20:
            raise APIError(409, "TARGET_LIMIT", "Bạn có thể giữ tối đa 20 mục tiêu. Hãy lưu trữ mục tiêu cũ trước.")
        item = one(
            db,
            """insert into app_private.personal_targets(user_id,title,metric,target,starts_on,ends_on,timezone)
            values (:uid,:title,:metric,:target,:start,:end,:zone) returning *""",
            uid=actor.user_id,
            title=body.title.strip(),
            metric=body.metric,
            target=body.target,
            start=body.starts_on,
            end=body.ends_on,
            zone=body.timezone,
        )
        assert item is not None
        return target_result(db, actor, item)

    return idempotent(db, actor.user_id, "target_create", key, body.model_dump(mode="json"), effect)


@router.put("/me/targets/{id}", response_model=PersonalTarget, operation_id="target_update")
def update_target(id: UUID, body: TargetUpdate, db: DB, actor: User) -> Any:
    item = one(
        db,
        "select * from app_private.personal_targets where id=:id and user_id=:uid and archived_at is null for update",
        id=id,
        uid=actor.user_id,
    )
    if not item:
        raise not_found()
    if item["version"] != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Mục tiêu đã thay đổi. Vui lòng tải lại.")
    updated = one(
        db,
        """update app_private.personal_targets set title=:title,metric=:metric,target=:target,
        starts_on=:start,ends_on=:end,timezone=:zone,version=version+1 where id=:id returning *""",
        id=id,
        title=body.title.strip(),
        metric=body.metric,
        target=body.target,
        start=body.starts_on,
        end=body.ends_on,
        zone=body.timezone,
    )
    return wire(target_result(db, actor, updated))


@router.delete("/me/targets/{id}", status_code=204, operation_id="target_archive")
def archive_target(id: UUID, db: DB, actor: User) -> Response:
    if not one(
        db,
        """update app_private.personal_targets set archived_at=coalesce(archived_at,now()),version=version+1
        where id=:id and user_id=:uid returning id""",
        id=id,
        uid=actor.user_id,
    ):
        raise not_found()
    return Response(status_code=204)


@router.get("/me/insights", response_model=Insights, operation_id="insights_get")
def insights(db: DB, actor: User, days: Annotated[int, Query(ge=7, le=90)] = 7, end: date | None = None) -> Any:
    timezone = user_zone(db, actor)
    ends_on = end or datetime.now(ZoneInfo(timezone)).date()
    try:
        starts_on = ends_on - timedelta(days=days - 1)
        start, stop = boundaries(starts_on, ends_on, timezone)
    except (OverflowError, ValueError) as exc:
        raise APIError(422, "INVALID_PERIOD", "Khoảng thời gian thống kê không hợp lệ.") from exc
    params = {"uid": actor.user_id, "start": start, "stop": stop}
    summary = (
        one(
            db,
            """select count(*) as actions,count(reported_weight_kg) as weighed,
        sum(reported_weight_kg)::text as weight from app_private.sorting_actions
        where user_id=:uid and created_at>=:start and created_at<:stop""",
            **params,
        )
        or {}
    )
    total = one(db, "select count(*) as count from app_private.sorting_actions where user_id=:uid", uid=actor.user_id)
    categories = rows(
        db,
        """select c.id,c.code,c.name,count(*) as actions,count(a.reported_weight_kg) as weighed_actions,
        sum(a.reported_weight_kg)::text as reported_weight_kg from app_private.sorting_actions a
        join app_private.waste_items w on w.id=a.item_id join app_private.waste_categories c on c.id=w.category_id
        where a.user_id=:uid and a.created_at>=:start and a.created_at<:stop
        group by c.id order by actions desc,c.code""",
        **params,
    )
    materials = rows(
        db,
        """select m.id,m.code,m.name,count(*) as actions,count(a.reported_weight_kg) as weighed_actions,
        sum(a.reported_weight_kg)::text as reported_weight_kg from app_private.sorting_actions a
        join app_private.waste_items w on w.id=a.item_id join app_private.waste_materials m on m.id=w.material_id
        where a.user_id=:uid and a.created_at>=:start and a.created_at<:stop
        group by m.id order by actions desc,m.code""",
        **params,
    )
    grouped = rows(
        db,
        """select (a.created_at at time zone :zone)::date as day,c.code,count(*) as actions
        from app_private.sorting_actions a join app_private.waste_items w on w.id=a.item_id
        join app_private.waste_categories c on c.id=w.category_id
        where a.user_id=:uid and a.created_at>=:start and a.created_at<:stop group by day,c.code""",
        **params,
        zone=timezone,
    )
    frequency = []
    for offset in range(days):
        day = starts_on + timedelta(days=offset)
        counts = {item["code"]: item["actions"] for item in grouped if item["day"] == day}
        frequency.append({"date": day, "actions": sum(counts.values()), "categories": counts})
    return {
        "timezone": timezone,
        "startsOn": starts_on,
        "endsOn": ends_on,
        "sortingActions": total["count"] if total else 0,
        "periodActions": summary.get("actions", 0),
        "weighedActions": summary.get("weighed", 0),
        "reportedWeightKg": summary.get("weight"),
        "verifiedKg": None,
        "categories": wire(categories),
        "materials": wire(materials),
        "frequency": frequency,
        "targets": targets(db, actor),
        "wallet": wallet(db, actor),
    }


class Milestone(Model):
    code: str
    title: str
    progress: int
    target: int
    earned: bool
    earned_at: datetime | None


@router.get("/me/badges", response_model=list[Milestone], operation_id="badges_list")
def milestones(db: DB, actor: User) -> Any:
    action_total = one(
        db, "select count(*) as count from app_private.sorting_actions where user_id=:uid", uid=actor.user_id
    )
    actions = rows(
        db,
        "select created_at from app_private.sorting_actions where user_id=:uid order by created_at,id limit 10",
        uid=actor.user_id,
    )
    checked = one(
        db,
        """select count(*) as count,min(checked_in_at) as earned from app_private.event_registrations where user_id=:uid
        and checked_in_at is not null and status='registered'""",
        uid=actor.user_id,
    )
    streak = one(
        db,
        "select coalesce(max(streak),0) as count from app_private.daily_claims where user_id=:uid",
        uid=actor.user_id,
    )
    seven = one(
        db,
        """select min(created_at) as earned from app_private.daily_claims
        where user_id=:uid and streak>=7""",
        uid=actor.user_id,
    )
    definitions = [
        (
            "first-sort",
            "Bước đầu phân loại",
            action_total["count"] if action_total else 0,
            1,
            actions[0]["created_at"] if actions else None,
        ),
        (
            "ten-sorts",
            "Mười hành động xanh",
            action_total["count"] if action_total else 0,
            10,
            actions[9]["created_at"] if len(actions) >= 10 else None,
        ),
        (
            "first-event",
            "Góp sức cùng cộng đồng",
            checked["count"] if checked else 0,
            1,
            checked["earned"] if checked else None,
        ),
        (
            "seven-days",
            "Điểm danh bảy ngày liên tiếp",
            streak["count"] if streak else 0,
            7,
            seven["earned"] if seven else None,
        ),
    ]
    return [
        {
            "code": code,
            "title": title,
            "progress": progress,
            "target": target,
            "earned": progress >= target,
            "earnedAt": earned,
        }
        for code, title, progress, target, earned in definitions
    ]


class LeaderboardEntry(Model):
    id: UUID
    display_name: str
    points: str
    rank: int


class LeaderboardPreference(Model):
    opted_in: bool
    version: int


class LeaderboardUpdate(Model):
    opted_in: bool
    expected_version: int = Field(ge=0)


class AchievementSummary(Model):
    lifetime_earned: str
    level: int
    next_threshold: str | None
    rank: int | None
    leaderboard: LeaderboardPreference


LEADERBOARD = """select u.id,p.display_name,w.lifetime_earned::text as points,
    row_number() over(order by w.lifetime_earned desc,u.created_at,u.id) as rank
    from app_private.users u join app_private.profiles p on p.user_id=u.id
    join app_private.wallets w on w.user_id=u.id join app_private.leaderboard_preferences l on l.user_id=u.id
    where u.status='active' and l.opted_in and not exists(select 1 from app_private.blocks b where
      (b.user_id=:uid and b.blocked_user_id=u.id) or (b.user_id=u.id and b.blocked_user_id=:uid))"""


@router.get(
    "/me/leaderboard-preference", response_model=LeaderboardPreference, operation_id="leaderboard_preference_get"
)
def leaderboard_preference(db: DB, actor: User) -> Any:
    return wire(
        one(
            db, "select opted_in,version from app_private.leaderboard_preferences where user_id=:uid", uid=actor.user_id
        )
        or {"optedIn": False, "version": 0}
    )


@router.put(
    "/me/leaderboard-preference", response_model=LeaderboardPreference, operation_id="leaderboard_preference_put"
)
def leaderboard_join(body: LeaderboardUpdate, db: DB, actor: User) -> Any:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"leaderboard:{actor.user_id}")
    current = leaderboard_preference(db, actor)
    if current["version"] != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Cài đặt bảng xếp hạng đã thay đổi. Vui lòng tải lại.")
    run(
        db,
        """insert into app_private.leaderboard_preferences(user_id,opted_in,version) values (:uid,:opted,:version)
        on conflict(user_id) do update set opted_in=excluded.opted_in,version=excluded.version,updated_at=now()""",
        uid=actor.user_id,
        opted=body.opted_in,
        version=current["version"] + 1,
    )
    return leaderboard_preference(db, actor)


@router.get("/me/leaderboard", response_model=Page[LeaderboardEntry], operation_id="leaderboard_get")
def leaderboard(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    try:
        after = int(cursor or "0")
        if after < 0 or after > 2**63 - 1:
            raise ValueError()
    except ValueError as exc:
        raise APIError(400, "INVALID_CURSOR", "Con trỏ bảng xếp hạng không hợp lệ.") from exc
    items = rows(
        db,
        "select * from (" + LEADERBOARD + ") ranked where rank>:after order by rank limit :limit",
        uid=actor.user_id,
        after=after,
        limit=limit + 1,
    )
    return {"items": wire(items[:limit]), "nextCursor": str(items[limit - 1]["rank"]) if len(items) > limit else None}


@router.get("/me/achievement-summary", response_model=AchievementSummary, operation_id="achievement_summary")
def achievement_summary(db: DB, actor: User) -> Any:
    balance = wallet(db, actor)
    rules = one(db, "select level_thresholds from app_private.reward_program where id")
    thresholds = rules["level_thresholds"] if rules else []
    earned = int(balance["lifetimeEarned"])
    rank = one(db, "select rank from (" + LEADERBOARD + ") ranked where id=:uid", uid=actor.user_id)
    return {
        "lifetimeEarned": str(earned),
        "level": 1 + sum(earned >= value for value in thresholds),
        "nextThreshold": str(next((value for value in thresholds if value > earned), "")) or None,
        "rank": rank["rank"] if rank else None,
        "leaderboard": leaderboard_preference(db, actor),
    }
