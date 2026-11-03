from datetime import UTC, datetime, time, timedelta
from typing import Annotated, Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import Field, field_validator
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from .common import not_found, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .schemas import Model, Notification, Preferences
from .security import Actor, current_actor

router = APIRouter(prefix="/v1", tags=["notifications"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class NotificationPreferences(Model):
    activity: bool = True
    offers: bool = True
    community: bool = True
    news: bool = True
    daily_reminder: bool = False
    daily_time: str = Field(default="20:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str = "Asia/Ho_Chi_Minh"
    version: int = 0

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value: str) -> str:
        return Preferences.valid_timezone(value)


class NotificationPreferencesUpdate(NotificationPreferences):
    expected_version: int = Field(ge=0)


class DeviceReminder(Model):
    id: str
    title: str
    body: str
    scheduled_for: datetime
    target_path: str
    sound: bool


@router.get("/me/device-reminders", response_model=list[DeviceReminder], operation_id="device_reminders_list")
def device_reminders(db: DB, actor: User) -> Any:
    """Return authoritative dates, including quiet hours, for the device's next seven days."""
    now = datetime.now(UTC)
    horizon = now + timedelta(days=7)
    result: list[DeviceReminder] = []
    prefs = preferences_get(db, actor)
    sound_pref = one(db, "select sound from app_private.user_preferences where user_id=:uid", uid=actor.user_id)
    sound = sound_pref["sound"] if sound_pref else True
    if prefs.activity:
        for job in rows(
            db,
            """select j.id,j.scheduled_for,e.id as event_id,e.title,p.sound from app_private.event_reminder_jobs j
            join app_private.event_reminder_preferences p on p.user_id=j.user_id and p.version=j.preferences_version
            join app_private.events e on e.id=j.event_id
            where j.user_id=:uid and j.status='pending' and p.enabled and p.in_app
              and j.scheduled_for>:now and j.scheduled_for<=:horizon and e.starts_at>j.scheduled_for
              and e.published and not e.synthetic and (exists(select 1 from app_private.saved_events s
                where s.user_id=j.user_id and s.event_id=j.event_id) or exists(select 1 from
                app_private.event_registrations r where r.user_id=j.user_id and r.event_id=j.event_id
                and r.status='registered')) order by j.scheduled_for,j.id limit 40""",
            uid=actor.user_id,
            now=now,
            horizon=horizon,
        ):
            result.append(
                DeviceReminder(
                    id=str(job["id"]),
                    title="Sắp đến giờ hoạt động xanh",
                    body=job["title"],
                    scheduled_for=job["scheduled_for"],
                    target_path=f"/events/{job['event_id']}",
                    sound=sound and job["sound"],
                )
            )
    if prefs.offers and prefs.daily_reminder:
        zone = ZoneInfo(prefs.timezone)
        local_today = now.astimezone(zone).date()
        claimed = one(
            db,
            """select 1 from app_private.daily_claims where user_id=:uid
            and claimed_on=(now() at time zone 'Asia/Ho_Chi_Minh')::date""",
            uid=actor.user_id,
        )
        for offset in range(8):
            day = local_today + timedelta(days=offset)
            scheduled = datetime.combine(day, time.fromisoformat(prefs.daily_time), zone).astimezone(UTC)
            claimed_day = (
                claimed
                and scheduled.astimezone(ZoneInfo("Asia/Ho_Chi_Minh")).date()
                == now.astimezone(ZoneInfo("Asia/Ho_Chi_Minh")).date()
            )
            if scheduled <= now or scheduled > horizon or claimed_day:
                continue
            result.append(
                DeviceReminder(
                    id=f"daily:{day}:{prefs.version}",
                    title="Điểm danh hôm nay",
                    body="Nhận điểm và tiếp tục hành trình xanh của bạn.",
                    scheduled_for=scheduled,
                    target_path="/rewards/catalog",
                    sound=sound,
                )
            )
    return sorted(result, key=lambda item: item.scheduled_for)[:47]


@router.get(
    "/me/notification-preferences", response_model=NotificationPreferences, operation_id="notification_preferences_get"
)
def preferences_get(db: DB, actor: User) -> Any:
    value = one(db, "select * from app_private.notification_preferences where user_id=:uid", uid=actor.user_id)
    if not value:
        user = one(db, "select timezone from app_private.users where id=:uid", uid=actor.user_id)
        return NotificationPreferences(timezone=user["timezone"] if user else "Asia/Ho_Chi_Minh")
    return NotificationPreferences(**{key: value for key, value in value.items() if key != "user_id"})


@router.put(
    "/me/notification-preferences", response_model=NotificationPreferences, operation_id="notification_preferences_put"
)
def preferences_put(body: NotificationPreferencesUpdate, db: DB, actor: User) -> Any:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"notifications:{actor.user_id}")
    current = one(db, "select version from app_private.notification_preferences where user_id=:uid", uid=actor.user_id)
    version = current["version"] if current else 0
    if version != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Cài đặt đã thay đổi. Vui lòng tải lại trước khi lưu.")
    run(
        db,
        """insert into app_private.notification_preferences
        (user_id,activity,offers,community,news,daily_reminder,daily_time,timezone,version)
        values (:uid,:activity,:offers,:community,:news,:daily,:time,:zone,:version)
        on conflict(user_id) do update set activity=excluded.activity,offers=excluded.offers,
          community=excluded.community,news=excluded.news,daily_reminder=excluded.daily_reminder,
          daily_time=excluded.daily_time,timezone=excluded.timezone,version=excluded.version""",
        uid=actor.user_id,
        activity=body.activity,
        offers=body.offers,
        community=body.community,
        news=body.news,
        daily=body.daily_reminder,
        time=body.daily_time,
        zone=body.timezone,
        version=version + 1,
    )
    return preferences_get(db, actor)


@router.get("/me/notifications/summary", operation_id="notification_summary")
def summary(db: DB, actor: User) -> Any:
    result = one(
        db,
        """select count(*) as total,count(*) filter(where read_at is null) as unread,
        count(*) filter(where category='activity') as activity from app_private.notifications where user_id=:uid""",
        uid=actor.user_id,
    )
    return dict(result or {})


@router.get("/me/notifications/{id}", response_model=Notification, operation_id="notification_get")
def detail(id: UUID, db: DB, actor: User) -> Any:
    value = one(db, "select * from app_private.notifications where id=:id and user_id=:uid", id=id, uid=actor.user_id)
    if not value:
        raise not_found()
    return wire({key: value for key, value in value.items() if key not in ("user_id", "event_id")})


def dispatch_daily_reminder(engine: Engine) -> bool:
    with Session(engine) as db, db.begin():
        recipient = one(
            db,
            """select p.user_id,(now() at time zone p.timezone)::date as local_date
            from app_private.notification_preferences p join app_private.users u on u.id=p.user_id
            where u.status='active' and p.daily_reminder and
              (now() at time zone p.timezone)::time>=p.daily_time::time
              and not exists(select 1 from app_private.daily_reminder_deliveries d where d.user_id=p.user_id
                and d.reminder_date=(now() at time zone p.timezone)::date)
              and not exists(select 1 from app_private.daily_claims c where c.user_id=p.user_id
                and c.claimed_on=(now() at time zone 'Asia/Ho_Chi_Minh')::date)
            order by p.user_id for update of p skip locked limit 1""",
        )
        if not recipient:
            return False
        notification = one(
            db,
            """insert into app_private.notifications(user_id,title,body,category,target_path)
            values (:uid,'Điểm danh hôm nay','Bước nhỏ mỗi ngày: nhận điểm và tiếp tục hành trình xanh.',
              'offers','/rewards/catalog') returning id""",
            uid=recipient["user_id"],
        )
        run(
            db,
            """insert into app_private.daily_reminder_deliveries(user_id,reminder_date,notification_id)
            values (:uid,:day,:nid)""",
            uid=recipient["user_id"],
            day=recipient["local_date"],
            nid=notification["id"] if notification else None,
        )
        return True
