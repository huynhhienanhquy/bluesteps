import unicodedata
from datetime import UTC, datetime, time, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header
from pydantic import Field
from sqlalchemy.orm import Session

from .common import idempotent, not_found, outbox, wire
from .db import db_session, one, run
from .errors import APIError
from .schemas import Model, Redemption
from .security import Actor, current_actor, require_role

router = APIRouter(prefix="/v1", tags=["loyalty"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
Key = Annotated[str | None, Header(alias="Idempotency-Key", max_length=128)]


class RedemptionRequest(Model):
    reward_id: UUID
    quantity: int = Field(default=1, ge=1, le=20)
    expected_reward_version: int = Field(ge=1)


class RewardProgram(Model):
    enabled: bool
    version: str
    timezone: str
    daily_points: list[int]
    sorting_points: dict[str, int]
    sorting_daily_limit: int
    level_thresholds: list[int]


class DailyClaimStatus(Model):
    claimed_today: bool
    streak: int
    cycle_day: int
    daily_points: list[int]
    next_reset_at: datetime
    timezone: str


class DailyClaimResult(Model):
    claim_id: UUID
    points: str
    already_claimed: bool
    wallet_balance: str | None = None
    status: DailyClaimStatus


class RedemptionReceipt(Redemption):
    reward_name: str
    claim_code: str


def program(db: Session) -> Any:
    result = one(db, "select * from app_private.reward_program where id")
    if not result or not result["enabled"]:
        raise APIError(409, "REWARDS_PAUSED", "Chương trình điểm đang tạm dừng.")
    return result


def locked_wallet(db: Session, user_id: UUID) -> Any:
    value = one(db, "select * from app_private.wallets where user_id=:uid for update", uid=user_id)
    if not value:
        raise not_found()
    return value


def credit(
    db: Session,
    user_id: UUID,
    source_type: str,
    source_id: UUID,
    amount: int,
    *,
    entry_kind: str = "earn",
    reverses: UUID | None = None,
) -> dict[str, Any]:
    wallet = locked_wallet(db, user_id)
    existing = one(
        db,
        """select id,balance_after::text from app_private.point_ledger
        where user_id=:uid and source_type=:type and source_id=:source and entry_kind=:kind""",
        uid=user_id,
        type=source_type,
        source=source_id,
        kind=entry_kind,
    )
    if existing:
        return dict(existing)
    balance = wallet["balance"] + amount
    if balance < 0:
        raise APIError(409, "INSUFFICIENT_POINTS", "Bạn chưa có đủ điểm để đổi quà này.")
    run(
        db,
        """update app_private.wallets set balance=:balance,lifetime_earned=lifetime_earned+:earned,
        version=version+1 where user_id=:uid""",
        balance=balance,
        earned=amount if entry_kind == "earn" else 0,
        uid=user_id,
    )
    result = one(
        db,
        """insert into app_private.point_ledger
        (user_id,delta,balance_after,entry_kind,source_type,source_id,reverses_entry_id)
        values (:uid,:delta,:balance,:kind,:type,:source,:reverses) returning id,balance_after::text""",
        uid=user_id,
        delta=amount,
        balance=balance,
        kind=entry_kind,
        type=source_type,
        source=source_id,
        reverses=reverses,
    )
    return dict(result or {})


@router.get("/reward-program", response_model=RewardProgram, operation_id="reward_program_get")
def program_get(db: DB) -> Any:
    rule = program(db)
    return wire({key: value for key, value in rule.items() if key != "id"})


@router.get("/me/daily-claims", response_model=DailyClaimStatus, operation_id="daily_claim_status")
def daily_status(db: DB, actor: User) -> Any:
    rule = program(db)
    today = datetime.now(UTC).astimezone(ZoneInfo(rule["timezone"])).date()
    latest = one(
        db,
        "select * from app_private.daily_claims where user_id=:uid order by claimed_on desc limit 1",
        uid=actor.user_id,
    )
    claimed = bool(latest and latest["claimed_on"] == today)
    streak = latest["streak"] if latest and latest["claimed_on"] >= today - timedelta(days=1) else 0
    cycle_day = ((streak - 1) % 7 + 1) if claimed else (streak % 7 + 1)
    reset = datetime.combine(today + timedelta(days=1), time(), ZoneInfo(rule["timezone"]))
    return {
        "claimedToday": claimed,
        "streak": streak,
        "cycleDay": cycle_day,
        "dailyPoints": rule["daily_points"],
        "nextResetAt": reset,
        "timezone": rule["timezone"],
    }


@router.post("/me/daily-claims", response_model=DailyClaimResult, operation_id="daily_claim_create")
def daily_claim(db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        rule = program(db)
        locked_wallet(db, actor.user_id)
        today = datetime.now(UTC).astimezone(ZoneInfo(rule["timezone"])).date()
        latest = one(
            db,
            "select * from app_private.daily_claims where user_id=:uid order by claimed_on desc limit 1",
            uid=actor.user_id,
        )
        if latest and latest["claimed_on"] == today:
            return {
                "claimId": latest["id"],
                "points": str(latest["points"]),
                "alreadyClaimed": True,
                "status": daily_status(db, actor),
            }
        streak = latest["streak"] + 1 if latest and latest["claimed_on"] == today - timedelta(days=1) else 1
        amount = int(rule["daily_points"][(streak - 1) % 7])
        id = uuid4()
        run(
            db,
            """insert into app_private.daily_claims(id,user_id,claimed_on,streak,points,rule_version)
            values (:id,:uid,:day,:streak,:points,:version)""",
            id=id,
            uid=actor.user_id,
            day=today,
            streak=streak,
            points=amount,
            version=rule["version"],
        )
        awarded = credit(db, actor.user_id, "daily_claim", id, amount)
        outbox(db, id, "points.earned", {"userId": actor.user_id, "points": str(amount), "source": "daily_claim"})
        return {
            "claimId": id,
            "points": str(amount),
            "alreadyClaimed": False,
            "walletBalance": awarded["balance_after"],
            "status": daily_status(db, actor),
        }

    return idempotent(db, actor.user_id, "daily_claim", key, {}, effect)


def award_sorting(db: Session, user_id: UUID, action_id: UUID, item_id: UUID) -> dict[str, Any]:
    rule = one(db, "select * from app_private.reward_program where id")
    if not rule or not rule["enabled"]:
        return {"status": "not_awarded", "points": "0", "ruleVersion": None, "reason": "POLICY_NOT_ENABLED"}
    locked_wallet(db, user_id)
    category = one(
        db,
        """select c.name from app_private.waste_items w
        join app_private.waste_categories c on c.id=w.category_id where w.id=:id""",
        id=item_id,
    )
    normalized = "".join(
        char
        for char in unicodedata.normalize("NFD", category["name"] if category else "")
        if not unicodedata.combining(char)
    ).casefold()
    kind = (
        "recycle"
        if "tai che" in normalized
        else "organic"
        if "huu co" in normalized
        else "inorganic"
        if "vo co" in normalized
        else None
    )
    if not kind:
        return {"status": "not_awarded", "points": "0", "ruleVersion": rule["version"], "reason": "UNKNOWN_CATEGORY"}
    midnight = datetime.combine(
        datetime.now(UTC).astimezone(ZoneInfo(rule["timezone"])).date(), time(), ZoneInfo(rule["timezone"])
    )
    used = one(
        db,
        """select count(*) as count from app_private.point_ledger
        where user_id=:uid and source_type='sorting' and created_at>=:start""",
        uid=user_id,
        start=midnight,
    )
    if used and used["count"] >= rule["sorting_daily_limit"]:
        return {"status": "not_awarded", "points": "0", "ruleVersion": rule["version"], "reason": "DAILY_LIMIT_REACHED"}
    amount = int(rule["sorting_points"][kind])
    credit(db, user_id, "sorting", action_id, amount)
    outbox(db, action_id, "points.earned", {"userId": user_id, "points": str(amount), "source": "sorting"})
    return {"status": "awarded", "points": str(amount), "ruleVersion": rule["version"], "reason": None}


@router.post("/redemptions", response_model=RedemptionReceipt, operation_id="redemption_create", status_code=201)
def redeem(body: RedemptionRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        program(db)
        wallet = locked_wallet(db, actor.user_id)
        stock = one(
            db, "select * from app_private.reserve_reward_stock(:id,:qty)", id=body.reward_id, qty=body.quantity
        )
        if not stock:
            raise APIError(409, "REWARD_UNAVAILABLE", "Quà đã hết hoặc không còn mở đổi.")
        if stock["reward_version"] != body.expected_reward_version:
            raise APIError(409, "PRICE_CHANGED", "Thông tin hoặc giá quà đã thay đổi. Vui lòng tải lại và xác nhận.")
        total = int(stock["unit_cost"]) * body.quantity
        if wallet["balance"] < total:
            raise APIError(409, "INSUFFICIENT_POINTS", "Bạn chưa có đủ điểm để đổi quà này.")
        id = uuid4()
        debit = credit(db, actor.user_id, "redemption", id, -total, entry_kind="spend")
        run(
            db,
            """insert into app_private.redemptions
            (id,user_id,reward_id,quantity,unit_cost_snapshot,total_cost,status,original_debit_id)
            values (:id,:uid,:rid,:qty,:unit,:total,'reserved',:debit)""",
            id=id,
            uid=actor.user_id,
            rid=body.reward_id,
            qty=body.quantity,
            unit=stock["unit_cost"],
            total=total,
            debit=debit["id"],
        )
        outbox(db, id, "reward.redeemed", {"userId": actor.user_id, "rewardId": body.reward_id})
        return redemption_read(id, db, actor)

    return idempotent(db, actor.user_id, "redemption_create", key, body.model_dump(), effect)


@router.get("/redemptions/{id}", response_model=RedemptionReceipt, operation_id="redemption_get")
def redemption_read(id: UUID, db: DB, actor: User) -> dict[str, Any]:
    item = one(
        db,
        """select d.id,d.reward_id,d.quantity,d.unit_cost_snapshot::text,d.total_cost::text,
        d.status,d.created_at,r.name as reward_name from app_private.redemptions d
        join app_private.rewards r on r.id=d.reward_id where d.id=:id and d.user_id=:uid""",
        id=id,
        uid=actor.user_id,
    )
    if not item:
        raise not_found()
    return RedemptionReceipt.model_validate(wire({**item, "claimCode": f"BS-{str(id)[:8].upper()}"})).model_dump(
        by_alias=True, mode="json"
    )


@router.post("/redemptions/{id}/cancel", response_model=RedemptionReceipt, operation_id="redemption_cancel")
def redemption_cancel(id: UUID, db: DB, actor: User) -> Any:
    locked_wallet(db, actor.user_id)
    item = one(
        db, "select * from app_private.redemptions where id=:id and user_id=:uid for update", id=id, uid=actor.user_id
    )
    if not item:
        raise not_found()
    if item["status"] == "refunded":
        return redemption_read(id, db, actor)
    if item["status"] != "reserved":
        raise APIError(409, "CANNOT_CANCEL_REWARD", "Quà đang được xử lý hoặc đã nhận, không thể hủy.")
    released = one(
        db,
        "select app_private.release_reward_stock(:rid,:qty,false) as ok",
        rid=item["reward_id"],
        qty=item["quantity"],
    )
    if not released or not released["ok"]:
        raise APIError(409, "INVENTORY_CONFLICT", "Tồn kho đã thay đổi. Vui lòng liên hệ hỗ trợ.")
    credit(
        db,
        actor.user_id,
        "redemption_refund",
        id,
        int(item["total_cost"]),
        entry_kind="refund",
        reverses=item["original_debit_id"],
    )
    run(db, "update app_private.redemptions set status='refunded' where id=:id", id=id)
    return redemption_read(id, db, actor)


@router.post("/redemptions/{id}/fulfill", operation_id="redemption_fulfill")
def redemption_fulfill(id: UUID, db: DB, actor: User) -> Any:
    require_role(db, actor, "moderator")
    item = one(db, "select * from app_private.redemptions where id=:id for update", id=id)
    if not item:
        raise not_found()
    if item["status"] == "fulfilled":
        return {"id": id, "status": "fulfilled"}
    if item["status"] != "reserved":
        raise APIError(409, "INVALID_REDEMPTION_STATE", "Lượt đổi quà không còn ở trạng thái chờ nhận.")
    stock = one(
        db, "select app_private.release_reward_stock(:rid,:qty,true) as ok", rid=item["reward_id"], qty=item["quantity"]
    )
    if not stock or not stock["ok"]:
        raise APIError(409, "INVENTORY_CONFLICT", "Tồn kho không đủ để xác nhận giao quà.")
    run(db, "update app_private.redemptions set status='fulfilled' where id=:id", id=id)
    return {"id": id, "status": "fulfilled"}
