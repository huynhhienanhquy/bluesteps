import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4

import segno
from fastapi import APIRouter, Depends, Header, Request, Response
from sqlalchemy.orm import Session

from .catalog import event_get
from .common import idempotent, not_found, outbox, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .participation_schemas import (
    CheckInRequest,
    EventFeedback,
    EventFeedbackRequest,
    EventRegistration,
    EventRegistrationRequest,
    EventSummary,
    EventTicket,
)
from .security import Actor, current_actor

router = APIRouter(prefix="/v1", tags=["participation"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
Key = Annotated[str | None, Header(alias="Idempotency-Key", max_length=128)]


def own_registration(db: Session, actor: Actor, event_id: UUID) -> Any:
    result = one(
        db,
        "select * from app_private.event_registrations where event_id=:eid and user_id=:uid",
        eid=event_id,
        uid=actor.user_id,
    )
    if not result:
        raise not_found()
    return result


def event_user_lock(db: Session, event_id: UUID, user_id: UUID) -> None:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"participation:{event_id}:{user_id}")


@router.post(
    "/events/{id}/registrations",
    response_model=EventRegistration,
    operation_id="event_registration_create",
    status_code=201,
)
def register_event(id: UUID, body: EventRegistrationRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        event_user_lock(db, id, actor.user_id)
        event = event_get(id, db)
        if datetime.fromisoformat(str(event["startsAt"])) <= datetime.now(UTC):
            raise APIError(409, "EVENT_STARTED", "Hoạt động đã bắt đầu, không thể đăng ký mới.")
        role_options = event["details"].get("volunteerRoles", [])
        if role_options and body.volunteer_role not in role_options:
            raise APIError(422, "INVALID_ROLE", "Vai trò không thuộc hoạt động này.")
        existing = one(
            db,
            "select * from app_private.event_registrations where event_id=:eid and user_id=:uid",
            eid=id,
            uid=actor.user_id,
        )
        if existing and existing["status"] == "registered":
            # Never reserve a second allocation for retries with a different key.
            if any(
                existing[column] != value
                for column, value in {
                    "full_name": body.full_name,
                    "attendee_count": body.attendee_count,
                    "volunteer_role": body.volunteer_role,
                    "phone": body.phone,
                    "email": str(body.email),
                }.items()
            ):
                raise APIError(409, "ALREADY_REGISTERED", "Bạn đã đăng ký. Hủy đăng ký cũ trước khi thay đổi.")
            return dict(existing)
        reserved = one(db, "select app_private.adjust_event_seats(:id,:count) as ok", id=id, count=body.attendee_count)
        if not reserved or not reserved["ok"]:
            raise APIError(409, "EVENT_FULL", "Hoạt động không còn đủ chỗ. Vui lòng chọn số người khác.")
        registration_id = existing["id"] if existing else uuid4()
        result = one(
            db,
            """insert into app_private.event_registrations
            (id,event_id,user_id,full_name,attendee_count,volunteer_role,phone,email,safety_consent,contact_consent)
            values (:id,:eid,:uid,:name,:count,:role,:phone,:email,true,true)
            on conflict(event_id,user_id) do update set full_name=excluded.full_name,
              attendee_count=excluded.attendee_count,volunteer_role=excluded.volunteer_role,
              phone=excluded.phone,email=excluded.email,safety_consent=true,contact_consent=true,
              status='registered',cancelled_at=null,checked_in_at=null,checked_in_by=null,
              ticket_revision=app_private.event_registrations.ticket_revision+1,updated_at=now()
            returning *""",
            id=registration_id,
            eid=id,
            uid=actor.user_id,
            name=body.full_name,
            count=body.attendee_count,
            role=body.volunteer_role,
            phone=body.phone,
            email=str(body.email),
        )
        outbox(db, registration_id, "participation.registered", {"userId": actor.user_id, "eventId": id})
        return dict(result or {})

    return idempotent(db, actor.user_id, f"event_registration:{id}", key, body.model_dump(), effect)


@router.get("/events/{id}/registration", response_model=EventRegistration, operation_id="event_registration_get")
def registration_get(id: UUID, db: DB, actor: User) -> Any:
    return wire(own_registration(db, actor, id))


@router.get("/me/event-registrations", operation_id="my_event_registrations")
def registrations_list(db: DB, actor: User) -> Any:
    return {
        "items": wire(
            rows(
                db,
                """select r.*,e.title,e.starts_at,e.ends_at,e.location from
        app_private.event_registrations r join app_private.events e on e.id=r.event_id
        where r.user_id=:uid order by e.starts_at desc,r.id desc""",
                uid=actor.user_id,
            )
        ),
        "nextCursor": None,
    }


@router.delete("/events/{id}/registration", operation_id="event_registration_cancel", status_code=204)
def registration_cancel(id: UUID, db: DB, actor: User) -> Response:
    event_user_lock(db, id, actor.user_id)
    item = one(
        db,
        "select * from app_private.event_registrations where event_id=:eid and user_id=:uid for update",
        eid=id,
        uid=actor.user_id,
    )
    if not item:
        raise not_found()
    if item["status"] == "cancelled":
        return Response(status_code=204)
    event = event_get(id, db)
    if item["checked_in_at"] or datetime.fromisoformat(str(event["startsAt"])) <= datetime.now(UTC):
        raise APIError(409, "CANNOT_CANCEL", "Không thể hủy khi hoạt động đã bắt đầu hoặc bạn đã check-in.")
    released = one(db, "select app_private.adjust_event_seats(:id,:delta) as ok", id=id, delta=-item["attendee_count"])
    if not released or not released["ok"]:
        raise APIError(409, "CAPACITY_CONFLICT", "Số chỗ đã thay đổi. Vui lòng tải lại.")
    run(
        db,
        """update app_private.event_registrations set status='cancelled',cancelled_at=now(),
        updated_at=now(),ticket_revision=ticket_revision+1 where id=:id""",
        id=item["id"],
    )
    return Response(status_code=204)


def ticket_token(request: Request, item: Any) -> str:
    payload = f"bs-ticket-v1.{item['id']}.{item['ticket_revision']}"
    signature = hmac.new(
        request.app.state.settings.otp_pepper.get_secret_value().encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"


def can_check_in(db: Session, actor: Actor, event_id: UUID) -> bool:
    return bool(
        one(
            db,
            """select 1 from app_private.event_organizers where event_id=:eid and user_id=:uid
        union all select 1 from app_private.user_roles where user_id=:uid and role='moderator' limit 1""",
            eid=event_id,
            uid=actor.user_id,
        )
    )


@router.get("/events/{id}/check-in-access", operation_id="event_check_in_access")
def check_in_access(id: UUID, db: DB, actor: User) -> dict[str, bool]:
    event_get(id, db)
    return {"allowed": can_check_in(db, actor, id)}


@router.get("/events/{id}/ticket", response_model=EventTicket, operation_id="event_ticket_get")
def ticket_get(id: UUID, request: Request, db: DB, actor: User) -> Any:
    item = own_registration(db, actor, id)
    if item["status"] != "registered":
        raise APIError(409, "REGISTRATION_CANCELLED", "Đăng ký đã hủy. Vé không còn hiệu lực.")
    token = ticket_token(request, item)
    return {
        "registration": wire(item),
        "event": event_get(id, db),
        "ticketCode": "BS-" + str(item["id"])[:8].upper(),
        "qrPayload": token,
        "qrImage": segno.make(token, micro=False, error="m").png_data_uri(scale=6, dark="#147CC1"),
        "canCheckIn": can_check_in(db, actor, id),
    }


@router.post("/event-tickets/check-in", response_model=EventRegistration, operation_id="event_ticket_check_in")
def ticket_check_in(body: CheckInRequest, request: Request, db: DB, actor: User) -> Any:
    try:
        prefix, registration_id, revision, _signature = body.ticket.split(".")
        if prefix != "bs-ticket-v1":
            raise ValueError("Invalid prefix")
        id = UUID(registration_id)
        int(revision)
    except (ValueError, TypeError) as exc:
        raise APIError(422, "INVALID_TICKET", "Mã vé không hợp lệ.") from exc
    item = one(db, "select * from app_private.event_registrations where id=:id for update", id=id)
    if not item or not hmac.compare_digest(ticket_token(request, item), body.ticket):
        raise APIError(422, "INVALID_TICKET", "Mã vé không hợp lệ hoặc đã được thay thế.")
    if not can_check_in(db, actor, item["event_id"]):
        raise APIError(403, "ORGANIZER_REQUIRED", "Chỉ ban tổ chức có thể xác nhận check-in.")
    if body.event_id is not None and item["event_id"] != body.event_id:
        raise APIError(409, "WRONG_EVENT", "Vé này thuộc hoạt động khác. Hãy quét vé của hoạt động đang mở.")
    event = event_get(item["event_id"], db)
    now = datetime.now(UTC)
    starts, ends = datetime.fromisoformat(str(event["startsAt"])), datetime.fromisoformat(str(event["endsAt"]))
    if item["status"] != "registered":
        raise APIError(409, "REGISTRATION_CANCELLED", "Vé đã bị hủy.")
    if not starts - timedelta(hours=2) <= now <= ends:
        raise APIError(409, "CHECK_IN_CLOSED", "Check-in mở từ 2 giờ trước khi bắt đầu đến khi hoạt động kết thúc.")
    if not item["checked_in_at"]:
        run(
            db,
            """update app_private.event_registrations
            set checked_in_at=now(),checked_in_by=:uid,updated_at=now() where id=:id""",
            uid=actor.user_id,
            id=id,
        )
    return wire(one(db, "select * from app_private.event_registrations where id=:id", id=id))


@router.get("/events/{id}/summary", response_model=EventSummary, operation_id="event_summary_get")
def summary_get(id: UUID, db: DB, actor: User) -> Any:
    event = event_get(id, db)
    registration = one(
        db,
        "select * from app_private.event_registrations where event_id=:eid and user_id=:uid",
        eid=id,
        uid=actor.user_id,
    )
    ended = datetime.fromisoformat(str(event["endsAt"])) <= datetime.now(UTC)
    can_review = bool(
        ended and registration and registration["status"] == "registered" and registration["checked_in_at"]
    )
    feedback = one(
        db, "select * from app_private.event_feedback where event_id=:eid and user_id=:uid", eid=id, uid=actor.user_id
    )
    totals = (
        one(
            db,
            """select coalesce(sum(attendee_count),0) as participant_count,
        coalesce(sum(attendee_count) filter(where checked_in_at is not null),0) as checked_in_count
        from app_private.event_registrations where event_id=:eid and status='registered'""",
            eid=id,
        )
        or {}
    )
    average = one(db, "select avg(rating)::float as value from app_private.event_feedback where event_id=:eid", eid=id)
    verified = event["details"].get("verifiedResults", {})
    return {
        "event": event,
        "registration": wire(registration),
        "feedback": wire(feedback),
        "canReview": can_review,
        "participantCount": totals.get("participant_count", 0),
        "checkedInCount": totals.get("checked_in_count", 0),
        "averageRating": average["value"] if average else None,
        "verifiedResults": {
            key: value
            for key, value in verified.items()
            if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0
        }
        if isinstance(verified, dict)
        else {},
        "albumUrl": event["details"].get("albumUrl"),
    }


@router.put("/events/{id}/feedback", response_model=EventFeedback, operation_id="event_feedback_put")
def feedback_put(id: UUID, body: EventFeedbackRequest, db: DB, actor: User) -> Any:
    summary = summary_get(id, db, actor)
    if not summary["canReview"]:
        raise APIError(409, "PARTICIPATION_REQUIRED", "Bạn cần check-in và chờ hoạt động kết thúc trước khi đánh giá.")
    result = one(
        db,
        """insert into app_private.event_feedback(registration_id,event_id,user_id,rating,tags,body)
        values (:rid,:eid,:uid,:rating,cast(:tags as jsonb),:body)
        on conflict(registration_id) do update set rating=excluded.rating,tags=excluded.tags,
          body=excluded.body,updated_at=now() returning *""",
        rid=summary["registration"]["id"],
        eid=id,
        uid=actor.user_id,
        rating=body.rating,
        tags=json.dumps(list(dict.fromkeys(body.tags))),
        body=body.body.strip(),
    )
    return wire(result)
