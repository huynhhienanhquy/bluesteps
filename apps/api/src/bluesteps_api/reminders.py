import json
from datetime import UTC, datetime, time, timedelta
from typing import Annotated, Any
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Request
from pydantic import Field, field_validator, model_validator
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from .common import outbox, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .schemas import GreenEvent, Model
from .security import Actor, current_actor, mail_cipher

router = APIRouter(prefix="/v1", tags=["reminders"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class ReminderSettings(Model):
    enabled: bool = False
    event_ids: list[UUID] = Field(default_factory=list, max_length=100)
    offsets: list[int] = Field(default_factory=lambda: [60, 1440], min_length=1, max_length=8)
    in_app: bool = True
    email: bool = False
    sound: bool = True
    quiet_start: str = Field(default="22:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    quiet_end: str = Field(default="07:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str = "Asia/Ho_Chi_Minh"
    version: int = 0
    next_reminder: datetime | None = None

    @field_validator("offsets")
    @classmethod
    def valid_offsets(cls, value: list[int]) -> list[int]:
        if any(offset < 1 or offset > 43200 for offset in value):
            raise ValueError("Offsets must be between one minute and 30 days")
        return sorted(set(value))

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return value


class ReminderUpdate(ReminderSettings):
    expected_version: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_channels(self) -> "ReminderUpdate":
        if self.enabled and (not self.event_ids or not (self.in_app or self.email)):
            raise ValueError("Select an event and a delivery channel")
        return self


def schedule_time(starts: datetime, minutes: int, timezone: str, quiet_start: str, quiet_end: str) -> datetime:
    local = (starts - timedelta(minutes=minutes)).astimezone(ZoneInfo(timezone))
    begin, end = time.fromisoformat(quiet_start), time.fromisoformat(quiet_end)
    current = local.time().replace(tzinfo=None)
    if begin != end and (
        (begin < end and begin <= current < end) or (begin > end and (current >= begin or current < end))
    ):
        target_date = local.date() + (timedelta(days=1) if begin > end and current >= begin else timedelta())
        local = datetime.combine(target_date, end, ZoneInfo(timezone))
    return local.astimezone(UTC)


@router.get("/me/event-reminders", response_model=ReminderSettings, operation_id="event_reminders_get")
def reminder_get(db: DB, actor: User) -> Any:
    current = one(db, "select * from app_private.event_reminder_preferences where user_id=:uid", uid=actor.user_id)
    if not current:
        user = one(db, "select timezone from app_private.users where id=:uid", uid=actor.user_id)
        return ReminderSettings(timezone=user["timezone"] if user else "Asia/Ho_Chi_Minh").model_dump(by_alias=True)
    targets = rows(
        db,
        "select event_id from app_private.event_reminder_targets where user_id=:uid order by event_id",
        uid=actor.user_id,
    )
    upcoming = one(
        db,
        """select min(scheduled_for) as next from app_private.event_reminder_jobs
        where user_id=:uid and status='pending' and scheduled_for>now()""",
        uid=actor.user_id,
    )
    return ReminderSettings(
        **{key: value for key, value in current.items() if key not in ("user_id", "updated_at")},
        event_ids=[item["event_id"] for item in targets],
        next_reminder=upcoming["next"] if upcoming else None,
    ).model_dump(by_alias=True)


@router.get("/me/remindable-events", response_model=list[GreenEvent], operation_id="remindable_events_list")
def remindable_events(db: DB, actor: User) -> Any:
    from .catalog import EVENT_SELECT

    return wire(
        rows(
            db,
            EVENT_SELECT
            + """ and ends_at>now() and (id in
        (select event_id from app_private.saved_events where user_id=:uid) or id in
        (select event_id from app_private.event_registrations where user_id=:uid and status='registered'))
        order by starts_at,id""",
            uid=actor.user_id,
        )
    )


@router.put("/me/event-reminders", response_model=ReminderSettings, operation_id="event_reminders_put")
def reminder_put(body: ReminderUpdate, request: Request, db: DB, actor: User) -> Any:
    if body.email and not (request.app.state.settings.smtp_host or request.app.state.settings.local_mail_directory):
        raise APIError(
            409, "EMAIL_NOT_CONFIGURED", "Chưa cấu hình kênh email. Bạn có thể chọn thông báo trong ứng dụng."
        )
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"reminders:{actor.user_id}")
    current = one(
        db, "select version from app_private.event_reminder_preferences where user_id=:uid", uid=actor.user_id
    )
    version = current["version"] if current else 0
    if version != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Cài đặt nhắc lịch đã thay đổi. Vui lòng tải lại.")
    available = {item["id"]: item for item in remindable_events(db, actor)}
    event_ids = list(dict.fromkeys(body.event_ids))
    if any(str(event_id) not in available for event_id in event_ids):
        raise APIError(422, "EVENT_NOT_SAVED", "Chỉ chọn hoạt động sắp diễn ra đã lưu hoặc đã đăng ký.")
    run(
        db,
        """insert into app_private.event_reminder_preferences
        (user_id,enabled,offsets,in_app,email,sound,quiet_start,quiet_end,timezone,version)
        values (:uid,:enabled,cast(:offsets as jsonb),:in_app,:email,:sound,:start,:end,:timezone,:version)
        on conflict(user_id) do update set enabled=excluded.enabled,offsets=excluded.offsets,in_app=excluded.in_app,
          email=excluded.email,sound=excluded.sound,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,
          timezone=excluded.timezone,version=excluded.version,updated_at=now()""",
        uid=actor.user_id,
        enabled=body.enabled,
        offsets=json.dumps(body.offsets),
        in_app=body.in_app,
        email=body.email,
        sound=body.sound,
        start=body.quiet_start,
        end=body.quiet_end,
        timezone=body.timezone,
        version=version + 1,
    )
    run(db, "delete from app_private.event_reminder_targets where user_id=:uid", uid=actor.user_id)
    run(
        db,
        "update app_private.event_reminder_jobs set status='cancelled' where user_id=:uid and status='pending'",
        uid=actor.user_id,
    )
    now = datetime.now(UTC)
    for event_id in event_ids:
        run(db, "insert into app_private.event_reminder_targets values (:uid,:eid)", uid=actor.user_id, eid=event_id)
        if not body.enabled:
            continue
        starts = datetime.fromisoformat(str(available[str(event_id)]["startsAt"]))
        for offset in body.offsets:
            due = schedule_time(starts, offset, body.timezone, body.quiet_start, body.quiet_end)
            if now < due < starts:
                run(
                    db,
                    """insert into app_private.event_reminder_jobs
                    (user_id,event_id,offset_minutes,preferences_version,scheduled_for)
                    values (:uid,:eid,:offset,:version,:due)""",
                    uid=actor.user_id,
                    eid=event_id,
                    offset=offset,
                    version=version + 1,
                    due=due,
                )
    return reminder_get(db, actor)


def dispatch_due_reminder(engine: Engine) -> bool:
    with Session(engine) as db, db.begin():
        job = one(
            db,
            """select j.* from app_private.event_reminder_jobs j
            where j.status='pending' and j.scheduled_for<=now() order by j.scheduled_for,j.id
            for update skip locked limit 1""",
        )
        if not job:
            return False
        preferences = one(
            db, "select * from app_private.event_reminder_preferences where user_id=:uid", uid=job["user_id"]
        )
        eligible = one(
            db,
            """select e.id,e.title,e.starts_at,e.ends_at from app_private.events e
            where e.id=:eid and e.published and not e.synthetic and e.starts_at>now() and
            (exists(select 1 from app_private.saved_events where event_id=e.id and user_id=:uid) or
             exists(select 1 from app_private.event_registrations
             where event_id=e.id and user_id=:uid and status='registered'))""",
            eid=job["event_id"],
            uid=job["user_id"],
        )
        if (
            not preferences
            or not preferences["enabled"]
            or preferences["version"] != job["preferences_version"]
            or not eligible
        ):
            run(db, "update app_private.event_reminder_jobs set status='cancelled' where id=:id", id=job["id"])
            return True
        outbox(
            db,
            job["id"],
            "reminder.due",
            {
                "userId": job["user_id"],
                "eventId": job["event_id"],
                "preferencesVersion": job["preferences_version"],
                "title": eligible["title"],
                "startsAt": eligible["starts_at"],
                "offsetMinutes": job["offset_minutes"],
            },
        )
        run(
            db,
            "update app_private.event_reminder_jobs set status='dispatched',dispatched_at=now() where id=:id",
            id=job["id"],
        )
        return True


def deliver_reminder_inbox(db: Session, settings: Any, item: dict[str, Any]) -> None:
    payload = item["payload"]
    preferences = one(
        db, "select * from app_private.event_reminder_preferences where user_id=:uid", uid=payload["userId"]
    )
    if not preferences or not preferences["enabled"] or preferences["version"] != payload["preferencesVersion"]:
        return
    text = f"{payload['title']} sắp bắt đầu. Mở lịch để xem thời gian và địa điểm."
    if preferences["in_app"]:
        run(
            db,
            """insert into app_private.notifications(user_id,event_id,title,body,target_path)
            values (:uid,:id,'Nhắc lịch hoạt động',:body,:target) on conflict(event_id) do nothing""",
            uid=payload["userId"],
            id=item["id"],
            body=text,
            target=f"/events/{payload['eventId']}",
        )
    if preferences["email"]:
        user = one(
            db,
            "select email_normalized from app_private.users where id=:uid and status='active'",
            uid=payload["userId"],
        )
        if user:
            encrypted = (
                mail_cipher(settings)
                .encrypt(
                    json.dumps(
                        {"to": user["email_normalized"], "subject": "BlueSteps — Nhắc lịch hoạt động", "body": text}
                    ).encode()
                )
                .decode()
            )
            outbox(
                db,
                item["aggregate_id"],
                "notification.email",
                {
                    "encrypted": encrypted,
                    "userId": payload["userId"],
                    "preferencesVersion": payload["preferencesVersion"],
                },
            )
