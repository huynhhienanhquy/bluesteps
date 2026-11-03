import base64
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from cryptography.fernet import Fernet
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import Settings
from .db import db_session, one, run
from .errors import APIError

passwords = PasswordHasher()
bearer = HTTPBearer(auto_error=False)
# A real Argon2 hash prevents a fast missing-account path during login.
dummy_hash = passwords.hash(secrets.token_urlsafe(32))


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def private_hash(settings: Settings, value: str) -> str:
    return hmac.new(settings.otp_pepper.get_secret_value().encode(), value.encode(), hashlib.sha256).hexdigest()


def mail_cipher(settings: Settings) -> Fernet:
    key = hashlib.sha256(("mail-v1:" + settings.otp_pepper.get_secret_value()).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def verify_password(value: str, hashed: str) -> bool:
    try:
        return passwords.verify(hashed, value)
    except (VerificationError, InvalidHashError):
        return False


def limit(db: Session, settings: Settings, scope: str, subject: str, *, maximum: int, seconds: int) -> None:
    result = one(
        db,
        """insert into app_private.rate_limits(scope,subject_hash,bucket,attempts)
      values (:scope,:subject,:bucket,1) on conflict(scope,subject_hash,bucket)
      do update set attempts=rate_limits.attempts+1 returning attempts""",
        scope=scope,
        subject=private_hash(settings, subject),
        bucket=int(time.time()) // seconds,
    )
    assert result is not None
    if result["attempts"] > maximum:
        raise APIError(429, "RATE_LIMITED", "Vui lòng thử lại sau.", commit=True)


@dataclass(frozen=True)
class Actor:
    user_id: UUID
    session_id: UUID


def authenticate(request: Request, db: Session, credentials: HTTPAuthorizationCredentials | None) -> Actor:
    if credentials is None:
        raise APIError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập.")
    settings: Settings = request.app.state.settings
    try:
        header = jwt.get_unverified_header(credentials.credentials)
        if header.get("kid") != settings.jwt_key_id:
            raise ValueError("Unknown signing key")
        claims = jwt.decode(
            credentials.credentials,
            settings.jwt_public_key,
            algorithms=["RS256"],
            issuer="bluesteps-python-api",
            audience="bluesteps-mobile",
            options={"require": ["sub", "sid", "jti", "iss", "aud", "iat", "exp"]},
        )
        actor = Actor(UUID(claims["sub"]), UUID(claims["sid"]))
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError) as exc:
        raise APIError(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ.") from exc
    session = one(
        db,
        """select s.id from app_private.sessions s
      join app_private.users u on u.id=s.user_id
      where s.id=:sid and s.user_id=:uid and s.revoked_at is null
      and s.expires_at>now() and u.status='active'""",
        sid=actor.session_id,
        uid=actor.user_id,
    )
    if not session:
        raise APIError(401, "SESSION_REVOKED", "Phiên đăng nhập đã kết thúc.")
    return actor


def current_actor(
    request: Request,
    db: Annotated[Session, Depends(db_session, scope="function")],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Actor:
    return authenticate(request, db, credentials)


def optional_actor(
    request: Request,
    db: Annotated[Session, Depends(db_session, scope="function")],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Actor | None:
    return None if credentials is None else authenticate(request, db, credentials)


def issue_pair(
    db: Session, settings: Settings, user_id: UUID, session_id: UUID, parent_id: UUID | None = None
) -> dict[str, Any]:
    now = datetime.now(UTC)
    refresh = secrets.token_urlsafe(48)
    run(
        db,
        """insert into app_private.refresh_tokens(session_id,token_hash,parent_token_id,expires_at)
      values (:sid,:hash,:parent,:expires)""",
        sid=session_id,
        hash=token_hash(refresh),
        parent=parent_id,
        expires=now + timedelta(seconds=settings.refresh_ttl_seconds),
    )
    access = jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "jti": str(uuid4()),
            "iss": "bluesteps-python-api",
            "aud": "bluesteps-mobile",
            "iat": now,
            "exp": now + timedelta(seconds=settings.access_ttl_seconds),
        },
        settings.jwt_private_key.get_secret_value(),
        algorithm="RS256",
        headers={"kid": settings.jwt_key_id},
    )
    return {
        "accessToken": access,
        "refreshToken": refresh,
        "tokenType": "Bearer",
        "expiresIn": settings.access_ttl_seconds,
        "sessionId": str(session_id),
    }


def require_role(db: Session, actor: Actor, role: str) -> None:
    if not one(
        db,
        "select 1 from app_private.user_roles where user_id=:uid and role=:role",
        uid=actor.user_id,
        role=role,
    ):
        raise APIError(403, "FORBIDDEN", "Không có quyền thực hiện thao tác này.")
