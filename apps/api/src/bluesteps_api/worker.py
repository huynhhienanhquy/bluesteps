"""Durable outbox worker. No broker or external provider is needed for inbox delivery."""

import json
import logging
import smtplib
import ssl
import time
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import Engine
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import make_engine, one, rows, run
from .notifications import dispatch_daily_reminder
from .reminders import deliver_reminder_inbox, dispatch_due_reminder
from .security import mail_cipher

logger = logging.getLogger(__name__)


def deliver_email(settings: Settings, event: dict[str, Any]) -> None:
    mail = json.loads(mail_cipher(settings).decrypt(event["payload"]["encrypted"].encode()))
    if settings.local_mail_directory and settings.environment != "production":
        directory = Path(settings.local_mail_directory)
        directory.mkdir(parents=True, exist_ok=True)
        target = directory / f"{event['id']}.json"
        # Stable event filename makes redelivery idempotent for the development sink.
        target.write_text(json.dumps(mail, ensure_ascii=False), encoding="utf-8")
        return
    if not settings.smtp_host or not settings.mail_from:
        raise ValueError("Email provider is not configured")
    message = EmailMessage()
    message["From"], message["To"] = settings.mail_from, mail["to"]
    message["Subject"] = mail.get("subject", "Mã xác nhận BlueSteps")
    message["Message-ID"] = f"<{event['id']}@bluesteps>"
    message.set_content(
        mail["body"] if "body" in mail else f"Mã xác nhận của bạn: {mail['code']}. Mã hết hạn sau 5 phút."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        smtp.send_message(message)


def process_one(engine: Engine, settings: Settings) -> bool:
    dispatch_due_reminder(engine)
    dispatch_daily_reminder(engine)
    lease = uuid4()
    with Session(engine) as db, db.begin():
        event = one(
            db,
            """select * from app_private.outbox_events where published_at is null
          and available_at<=now() and (locked_until is null or locked_until<now())
          order by occurred_at,id for update skip locked limit 1""",
        )
        if not event:
            return False
        run(
            db,
            """update app_private.outbox_events set lease_token=:lease,
          locked_until=now()+interval '60 seconds',attempt_count=attempt_count+1 where id=:id""",
            id=event["id"],
            lease=lease,
        )
        item = dict(event)
    # Provider I/O happens after committing the claim, with no database lock held.
    try:
        if item["event_type"] == "identity.email":
            with Session(engine) as db:
                valid = one(
                    db,
                    """select 1 from app_private.auth_challenges where id=:id
                  and consumed_at is null and expires_at>now() and attempt_count<max_attempts""",
                    id=item["aggregate_id"],
                )
            if valid:
                deliver_email(settings, item)
        elif item["event_type"] == "notification.email":
            with Session(engine) as db:
                valid = one(
                    db,
                    """select 1 from app_private.event_reminder_preferences
                    where user_id=:uid and enabled and email and version=:version""",
                    uid=item["payload"]["userId"],
                    version=item["payload"]["preferencesVersion"],
                )
            if valid:
                deliver_email(settings, item)
        with Session(engine) as db, db.begin():
            claimed = one(
                db,
                "select id from app_private.outbox_events where id=:id and lease_token=:lease for update",
                id=item["id"],
                lease=lease,
            )
            if not claimed:
                return True
            receipt = one(
                db,
                """insert into app_private.consumer_receipts(consumer,event_id)
              values ('inbox-v1',:id) on conflict do nothing returning event_id""",
                id=item["id"],
            )
            if receipt and item["event_type"] == "moderation.decided":
                run(
                    db,
                    """insert into app_private.notifications(user_id,event_id,title,body,target_path)
                  values (:uid,:id,'Yêu cầu đã được xét duyệt','Mở ứng dụng để xem kết quả.',:target)
                  on conflict(event_id) do nothing""",
                    uid=item["payload"]["userId"],
                    id=item["id"],
                    target=item["payload"].get("targetPath"),
                )
            if receipt and item["event_type"] == "participation.registered":
                run(
                    db,
                    """insert into app_private.notifications(user_id,event_id,title,body,target_path)
                    values (:uid,:id,'Đăng ký hoạt động thành công',
                    'Vé tham gia đã sẵn sàng trong lịch hoạt động của bạn.',:target)
                    on conflict(event_id) do nothing""",
                    uid=item["payload"]["userId"],
                    id=item["id"],
                    target=f"/event-ticket?id={item['payload']['eventId']}",
                )
            if receipt and item["event_type"] == "reminder.due":
                deliver_reminder_inbox(db, settings, item)
            sorting_without_points = (
                item["event_type"] == "sorting.recorded"
                and item["payload"].get("awardStatus") == "not_awarded"
            )
            if receipt and (item["event_type"] in ("points.earned", "reward.redeemed") or sorting_without_points):
                is_points = item["event_type"] == "points.earned"
                sorting = None
                if sorting_without_points or (is_points and item["payload"].get("source") == "sorting"):
                    sorting = one(
                        db,
                        """select item_id,scan_id,source,created_at from app_private.sorting_actions
                        where id=:action and user_id=:uid""",
                        action=item["aggregate_id"],
                        uid=item["payload"]["userId"],
                    )
                target = "/history" if is_points else f"/rewards/redemption?id={item['aggregate_id']}"
                details = {"points": item["payload"].get("points")} if is_points else {}
                title = "Nhận điểm xanh" if is_points else "Đổi quà thành công"
                if sorting:
                    title = "Phân loại thành công!"
                    target = (
                        f"/scan?scanId={sorting['scan_id']}&reviewFrom=notifications"
                        if sorting["scan_id"]
                        else f"/handbook/{sorting['item_id']}"
                    )
                    details.update(
                        kind="sorting",
                        source=sorting["source"],
                        recordedAt=sorting["created_at"].isoformat(),
                    )
                if sorting_without_points:
                    title = "Đã ghi nhận phân loại"
                    if not sorting:
                        target = "/history"
                    details.update(points="0", awardReason=item["payload"].get("awardReason"))
                    body = "Lượt phân loại đã được lưu vào lịch sử."
                elif is_points:
                    body = f"Bạn nhận được {item['payload'].get('points', '0')} điểm."
                else:
                    body = "Quà đã được giữ. Mở biên nhận để xem thông tin nhận quà."
                run(
                    db,
                    """insert into app_private.notifications
                    (user_id,event_id,title,body,category,target_path,details)
                    values (:uid,:id,:title,:body,:category,:target,cast(:details as jsonb))
                    on conflict(event_id) do nothing""",
                    uid=item["payload"]["userId"],
                    id=item["id"],
                    title=title,
                    body=body,
                    category="activity" if is_points or sorting_without_points else "offers",
                    target=target,
                    details=json.dumps(details),
                )
            if receipt and item["event_type"] == "message.created":
                message = one(
                    db,
                    "select user_id from app_private.messages where id=:id",
                    id=item["aggregate_id"],
                )
                if message:
                    recipients = rows(
                        db,
                        """select m.user_id from app_private.conversation_members m
                      where m.conversation_id=:id and m.user_id<>:author and not exists
                      (select 1 from app_private.blocks b where
                        (b.user_id=m.user_id and b.blocked_user_id=:author)
                        or (b.user_id=:author and b.blocked_user_id=m.user_id))""",
                        id=item["payload"]["conversationId"],
                        author=message["user_id"],
                    )
                    for recipient in recipients:
                        run(
                            db,
                            """insert into app_private.notifications(user_id,event_id,title,body,category,target_path)
                          values (:uid,:id,'Tin nhắn mới','Bạn có tin nhắn mới trong BlueSteps.','community',:target)
                          on conflict(event_id) do nothing""",
                            uid=recipient["user_id"],
                            id=item["id"],
                            target=f"/conversation?id={item['payload']['conversationId']}",
                        )
            run(
                db,
                """update app_private.outbox_events set published_at=now(),locked_until=null,
              lease_token=null,last_error_code=null where id=:id and lease_token=:lease""",
                id=item["id"],
                lease=lease,
            )
    except (OperationalError, InterfaceError):
        # A failed commit has an unknown outcome. Leave the lease/receipt intact;
        # the next poll can recover through lease expiry and receipt deduplication.
        raise
    except Exception:
        with Session(engine) as db, db.begin():
            run(
                db,
                """update app_private.outbox_events set locked_until=null,lease_token=null,
              available_at=:retry,last_error_code='DELIVERY_FAILED' where id=:id and lease_token=:lease""",
                id=item["id"],
                lease=lease,
                retry=datetime.now(UTC) + timedelta(seconds=min(3600, 2 ** min(item["attempt_count"] + 1, 12))),
            )
    return True


def run_worker(engine: Engine, settings: Settings) -> None:
    retry_delay = 1
    while True:
        try:
            processed = process_one(engine, settings)
        except (OperationalError, InterfaceError):
            # pre_ping only checks checkout, not a disconnect during a transaction.
            # Each poll uses new sessions; never reuse/retry a failed transaction.
            engine.dispose()
            # Do not log exception text: it can contain SQL, payloads or credentials.
            logger.warning("Worker database unavailable; reconnecting in %s second(s).", retry_delay)
            time.sleep(retry_delay)
            retry_delay = min(30, retry_delay * 2)
            continue
        retry_delay = 1
        if not processed:
            time.sleep(1)


def main() -> None:
    settings = get_settings()
    settings.validate_runtime()
    engine = make_engine(settings)
    try:
        run_worker(engine, settings)
    except KeyboardInterrupt:
        pass
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
