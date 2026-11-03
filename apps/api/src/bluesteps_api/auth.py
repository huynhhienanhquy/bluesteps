import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from pydantic import EmailStr, Field
from sqlalchemy.orm import Session

from .config import Settings
from .db import db_session, one, rows, run
from .errors import APIError
from .schemas import LoginRequest, Model, RefreshRequest, RegisterRequest, SessionList, TokenPair
from .security import (
    Actor,
    current_actor,
    dummy_hash,
    issue_pair,
    limit,
    mail_cipher,
    passwords,
    private_hash,
    token_hash,
    verify_password,
)

router = APIRouter(prefix="/v1", tags=["identity"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class ChallengeResult(Model):
    status: str = "accepted"
    challenge_id: UUID


class ChallengeVerify(Model):
    challenge_id: UUID
    code: str = Field(pattern=r"^[0-9]{6}$")


class ResetRequest(Model):
    email: EmailStr = Field(max_length=254)


class ResetComplete(Model):
    reset_token: str = Field(min_length=32, max_length=1024)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordUpdate(Model):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


def settings_for(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


def challenge(db: Session, settings: Settings, user_id: UUID, email: str, purpose: str) -> UUID:
    challenge_id, code = uuid4(), f"{secrets.randbelow(1000000):06d}"
    if settings.environment == "development" and purpose in ("verify_email", "password_reset"):
        code = "123456"
    run(
        db,
        """update app_private.auth_challenges set consumed_at=now()
      where user_id=:uid and purpose=:purpose and consumed_at is null""",
        uid=user_id,
        purpose=purpose,
    )
    run(
        db,
        """insert into app_private.auth_challenges
      (id,user_id,recipient_hash,purpose,code_hmac,expires_at)
      values (:id,:uid,:recipient,:purpose,:hash,:expires)""",
        id=challenge_id,
        uid=user_id,
        recipient=private_hash(settings, email),
        purpose=purpose,
        hash=private_hash(settings, f"{challenge_id}:{purpose}:{code}"),
        expires=datetime.now(UTC) + timedelta(seconds=300),
    )
    encrypted = mail_cipher(settings).encrypt(
        json.dumps({"to": email, "code": code, "purpose": purpose, "challengeId": str(challenge_id)}).encode()
    )
    run(
        db,
        """insert into app_private.outbox_events(aggregate_id,event_type,payload)
      values (:id,'identity.email',cast(:payload as jsonb))""",
        id=challenge_id,
        payload=json.dumps({"encrypted": encrypted.decode()}),
    )
    return challenge_id


def challenge_limits(db: Session, settings: Settings, request: Request, email: str) -> None:
    cooldown = one(
        db,
        """insert into app_private.auth_recipient_cooldowns(recipient_hash,next_allowed_at)
      values (:recipient,now()+interval '60 seconds') on conflict(recipient_hash) do update
      set next_allowed_at=excluded.next_allowed_at where auth_recipient_cooldowns.next_allowed_at<=now()
      returning recipient_hash""",
        recipient=private_hash(settings, email),
    )
    if cooldown is None:
        raise APIError(429, "RATE_LIMITED", "Vui lòng đợi ít nhất 60 giây trước khi gửi lại mã.", commit=True)
    limit(db, settings, "email-minute", email, maximum=1, seconds=60)
    limit(db, settings, "email-hour", email, maximum=5, seconds=3600)
    limit(
        db,
        settings,
        "challenge-ip",
        request.client.host if request.client else "unknown",
        maximum=30,
        seconds=3600,
    )


def verify_challenge(db: Session, settings: Settings, body: ChallengeVerify, purpose: str) -> Any:
    row = one(
        db,
        "select * from app_private.auth_challenges where id=:id for update",
        id=body.challenge_id,
    )
    if (
        not row
        or row["purpose"] != purpose
        or row["consumed_at"]
        or row["expires_at"] <= datetime.now(UTC)
        or row["attempt_count"] >= row["max_attempts"]
    ):
        raise APIError(422, "CHALLENGE_INVALID", "Mã xác nhận hết hạn hoặc không hợp lệ.")
    import hmac

    expected = private_hash(settings, f"{body.challenge_id}:{purpose}:{body.code}")
    if not hmac.compare_digest(row["code_hmac"], expected):
        run(
            db,
            "update app_private.auth_challenges set attempt_count=attempt_count+1 where id=:id",
            id=body.challenge_id,
        )
        raise APIError(422, "CHALLENGE_INVALID", "Mã xác nhận không hợp lệ.", commit=True)
    return row


@router.post("/auth/register", response_model=ChallengeResult, status_code=202, operation_id="auth_register")
def register(body: RegisterRequest, request: Request, db: DB) -> Any:
    settings = settings_for(request)
    if not settings.registration_enabled:
        raise APIError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Chưa cấu hình dịch vụ xác minh email.")
    if body.consent_version != settings.terms_version:
        raise APIError(422, "CONSENT_VERSION_INVALID", "Vui lòng chấp thuận điều khoản hiện hành.")
    email = str(body.email).casefold()
    challenge_limits(db, settings, request, email)
    # Serialize register attempts without exposing existence through a conflict response.
    run(db, "select pg_advisory_xact_lock(hashtextextended(:email,0))", email=email)
    user = one(db, "select id,status from app_private.users where email_normalized=:email", email=email)
    hashed = passwords.hash(body.password)
    if user:
        return {
            "challengeId": challenge(db, settings, user["id"], email, "verify_email")
            if user["status"] == "pending"
            else uuid4(),
            "status": "accepted",
        }
    uid = uuid4()
    run(
        db,
        """insert into app_private.users(id,email_normalized,password_hash,status)
      values (:id,:email,:hash,'pending')""",
        id=uid,
        email=email,
        hash=hashed,
    )
    run(
        db,
        "insert into app_private.profiles(user_id,display_name) values (:id,:name)",
        id=uid,
        name=body.name,
    )
    run(db, "insert into app_private.user_preferences(user_id) values (:id)", id=uid)
    run(db, "insert into app_private.wallets(user_id) values (:id)", id=uid)
    run(
        db,
        """insert into app_private.consent_records(user_id,purpose,policy_version)
      values (:id,'terms',:version)""",
        id=uid,
        version=body.consent_version,
    )
    return {
        "challengeId": challenge(db, settings, uid, email, "verify_email"),
        "status": "accepted",
    }


@router.post(
    "/auth/email-verification/request",
    response_model=ChallengeResult,
    status_code=202,
    operation_id="auth_email_verification_request",
)
def resend(body: ResetRequest, request: Request, db: DB) -> Any:
    settings = settings_for(request)
    if not settings.registration_enabled:
        raise APIError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Chưa cấu hình dịch vụ email.")
    email = str(body.email).casefold()
    challenge_limits(db, settings, request, email)
    user = one(
        db,
        "select id from app_private.users where email_normalized=:email and status='pending'",
        email=email,
    )
    return {
        "challengeId": challenge(db, settings, user["id"], email, "verify_email") if user else uuid4(),
        "status": "accepted",
    }


@router.post(
    "/auth/email-verification/verify",
    status_code=204,
    operation_id="auth_email_verification_verify",
)
def verify_email(body: ChallengeVerify, request: Request, db: DB) -> Response:
    row = verify_challenge(db, settings_for(request), body, "verify_email")
    run(db, "update app_private.auth_challenges set consumed_at=now() where id=:id", id=row["id"])
    run(
        db,
        """update app_private.users set status='active',email_verified_at=now()
      where id=:id and status='pending'""",
        id=row["user_id"],
    )
    return Response(status_code=204)


@router.post("/auth/login", response_model=TokenPair, operation_id="auth_login")
def login(body: LoginRequest, request: Request, db: DB) -> Any:
    settings = settings_for(request)
    email = str(body.email).casefold()
    limit(db, settings, "login-email", email, maximum=10, seconds=300)
    limit(
        db,
        settings,
        "login-ip",
        request.client.host if request.client else "unknown",
        maximum=100,
        seconds=300,
    )
    user = one(db, "select * from app_private.users where email_normalized=:email for update", email=email)
    valid = verify_password(body.password, user["password_hash"] if user else dummy_hash)
    if not user or not valid or user["status"] != "active" or not user["email_verified_at"]:
        raise APIError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không hợp lệ.", commit=True)
    if passwords.check_needs_rehash(user["password_hash"]):
        run(
            db,
            "update app_private.users set password_hash=:hash where id=:id",
            hash=passwords.hash(body.password),
            id=user["id"],
        )
    session_id = uuid4()
    run(
        db,
        """insert into app_private.sessions(id,user_id,device_label,expires_at)
      values (:id,:uid,:label,:expires)""",
        id=session_id,
        uid=user["id"],
        label=body.device_label,
        expires=datetime.now(UTC) + timedelta(seconds=settings.refresh_ttl_seconds),
    )
    return issue_pair(db, settings, user["id"], session_id)


@router.post("/auth/refresh", response_model=TokenPair, operation_id="auth_refresh")
def refresh(body: RefreshRequest, request: Request, db: DB) -> Any:
    hashed = token_hash(body.refresh_token)
    initial = one(db, "select session_id from app_private.refresh_tokens where token_hash=:hash", hash=hashed)
    if not initial:
        raise APIError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ.")
    session = one(db, "select * from app_private.sessions where id=:id for update", id=initial["session_id"])
    token = one(
        db,
        "select * from app_private.refresh_tokens where token_hash=:hash for update",
        hash=hashed,
    )
    assert session is not None and token is not None
    if token["consumed_at"]:
        run(db, "update app_private.sessions set revoked_at=now() where id=:id", id=session["id"])
        raise APIError(401, "REFRESH_TOKEN_REUSED", "Phiên đăng nhập đã bị thu hồi.", commit=True)
    active = one(
        db,
        "select 1 from app_private.users where id=:id and status='active'",
        id=session["user_id"],
    )
    now = datetime.now(UTC)
    if not active or session["revoked_at"] or session["expires_at"] <= now or token["expires_at"] <= now:
        raise APIError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã kết thúc.")
    run(db, "update app_private.refresh_tokens set consumed_at=now() where id=:id", id=token["id"])
    run(db, "update app_private.sessions set last_seen_at=now() where id=:id", id=session["id"])
    return issue_pair(db, settings_for(request), session["user_id"], session["id"], token["id"])


@router.post("/auth/logout", status_code=204, operation_id="auth_logout")
def logout(db: DB, actor: User) -> Response:
    run(db, "update app_private.sessions set revoked_at=now() where id=:id", id=actor.session_id)
    return Response(status_code=204)


@router.get("/me/sessions", response_model=SessionList, operation_id="auth_list_sessions")
def sessions(db: DB, actor: User) -> Any:
    return {
        "items": rows(
            db,
            """select id,device_label as "deviceLabel",created_at as "createdAt",
      last_seen_at as "lastSeenAt",id=:sid as "isCurrent" from app_private.sessions
      where user_id=:uid and revoked_at is null and expires_at>now() order by created_at desc,id""",
            uid=actor.user_id,
            sid=actor.session_id,
        )
    }


@router.delete("/me/sessions/{id}", status_code=204, operation_id="auth_revoke_session")
def revoke(id: UUID, db: DB, actor: User) -> Response:
    if not one(
        db,
        """update app_private.sessions set revoked_at=now()
      where id=:id and user_id=:uid returning id""",
        id=id,
        uid=actor.user_id,
    ):
        raise APIError(404, "NOT_FOUND", "Không tìm thấy phiên đăng nhập.")
    return Response(status_code=204)


@router.post(
    "/auth/password-reset/request",
    response_model=ChallengeResult,
    status_code=202,
    operation_id="auth_password_reset_request",
)
def reset_request(body: ResetRequest, request: Request, db: DB) -> Any:
    settings = settings_for(request)
    if not settings.registration_enabled:
        raise APIError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Chưa cấu hình dịch vụ email.")
    email = str(body.email).casefold()
    challenge_limits(db, settings, request, email)
    user = one(
        db,
        "select id from app_private.users where email_normalized=:email and status='active'",
        email=email,
    )
    return {
        "challengeId": challenge(db, settings, user["id"], email, "password_reset") if user else uuid4(),
        "status": "accepted",
    }


@router.post("/auth/password-reset/verify", operation_id="auth_password_reset_verify")
def reset_verify(body: ChallengeVerify, request: Request, db: DB) -> dict[str, str]:
    row = verify_challenge(db, settings_for(request), body, "password_reset")
    if row["reset_token_hash"]:
        raise APIError(422, "CHALLENGE_INVALID", "Mã xác nhận đã được sử dụng.")
    reset = secrets.token_urlsafe(48)
    run(
        db,
        "update app_private.auth_challenges set reset_token_hash=:hash where id=:id",
        hash=token_hash(reset),
        id=row["id"],
    )
    return {"resetToken": reset}


@router.post("/auth/password-reset/complete", status_code=204, operation_id="auth_password_reset_complete")
def reset_complete(body: ResetComplete, db: DB) -> Response:
    row = one(
        db,
        """select * from app_private.auth_challenges
      where reset_token_hash=:hash for update""",
        hash=token_hash(body.reset_token),
    )
    if not row or row["consumed_at"] or row["purpose"] != "password_reset" or row["expires_at"] <= datetime.now(UTC):
        raise APIError(422, "RESET_TOKEN_INVALID", "Yêu cầu đặt lại mật khẩu không hợp lệ.")
    run(db, "update app_private.auth_challenges set consumed_at=now() where id=:id", id=row["id"])
    run(
        db,
        "update app_private.users set password_hash=:hash where id=:id",
        hash=passwords.hash(body.new_password),
        id=row["user_id"],
    )
    run(db, "update app_private.sessions set revoked_at=now() where user_id=:id", id=row["user_id"])
    return Response(status_code=204)


@router.post("/me/password", status_code=204, operation_id="me_change_password")
def password_update(body: PasswordUpdate, db: DB, actor: User) -> Response:
    user = one(db, "select password_hash from app_private.users where id=:id for update", id=actor.user_id)
    assert user is not None
    if not verify_password(body.current_password, user["password_hash"]):
        raise APIError(401, "INVALID_CREDENTIALS", "Mật khẩu hiện tại không hợp lệ.")
    run(
        db,
        "update app_private.users set password_hash=:hash where id=:id",
        hash=passwords.hash(body.new_password),
        id=actor.user_id,
    )
    run(db, "update app_private.sessions set revoked_at=now() where user_id=:id", id=actor.user_id)
    return Response(status_code=204)
