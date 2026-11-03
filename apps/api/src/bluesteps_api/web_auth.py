"""Browser sessions: refresh credentials stay in an HttpOnly cookie, never in JS storage."""

from typing import Any

from fastapi import APIRouter, Request, Response

from .auth import DB, login, refresh
from .db import one, run
from .errors import APIError
from .schemas import LoginRequest, Model, RefreshRequest
from .security import token_hash

router = APIRouter(prefix="/v1/auth/web", tags=["browser identity"])
COOKIE = "bluesteps_refresh"
COOKIE_PATH = "/v1/auth/web"


class WebSession(Model):
    access_token: str
    token_type: str
    expires_in: int
    session_id: str


def check_origin(request: Request) -> None:
    if request.headers.get("origin") not in request.app.state.settings.cors_origins:
        raise APIError(403, "ORIGIN_FORBIDDEN", "Nguồn yêu cầu không được phép.")


def set_cookie(request: Request, response: Response, pair: dict[str, Any]) -> dict[str, Any]:
    response.set_cookie(
        COOKIE,
        pair["refreshToken"],
        httponly=True,
        secure=request.app.state.settings.environment == "production",
        samesite="lax",
        path=COOKIE_PATH,
        max_age=request.app.state.settings.refresh_ttl_seconds,
    )
    return {key: value for key, value in pair.items() if key != "refreshToken"}


@router.post("/login", response_model=WebSession, operation_id="web_auth_login")
def web_login(body: LoginRequest, request: Request, response: Response, db: DB) -> Any:
    check_origin(request)
    return set_cookie(request, response, login(body, request, db))


@router.post("/refresh", response_model=WebSession, operation_id="web_auth_refresh")
def web_refresh(request: Request, response: Response, db: DB) -> Any:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    if not token:
        raise APIError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập.")
    return set_cookie(request, response, refresh(RefreshRequest(refresh_token=token), request, db))


@router.post("/logout", status_code=204, operation_id="web_auth_logout")
def web_logout(request: Request, response: Response, db: DB) -> Response:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    if token:
        row = one(
            db, "select session_id from app_private.refresh_tokens where token_hash=:hash", hash=token_hash(token)
        )
        if row:
            run(db, "update app_private.sessions set revoked_at=now() where id=:id", id=row["session_id"])
    response.delete_cookie(
        COOKIE,
        path=COOKIE_PATH,
        httponly=True,
        secure=request.app.state.settings.environment == "production",
        samesite="lax",
    )
    response.status_code = 204
    return response
