from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine, text

from . import (
    auth,
    catalog,
    collection,
    community,
    composer,
    friends,
    games,
    handbook,
    insights,
    loyalty,
    media,
    member,
    mobile,
    news,
    notifications,
    participation,
    reminders,
    scans,
    social,
    web_auth,
)
from .config import Settings, get_settings
from .db import make_engine
from .errors import APIError, install_errors
from .routing import Valhalla
from .schemas import Error, Liveness


def create_app(settings: Settings | None = None, *, engine: Engine | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        config = settings or get_settings()
        config.validate_runtime()
        app.state.settings = config
        app.state.engine = engine or make_engine(config)
        app.state.routing = Valhalla()
        try:
            yield
        finally:
            if engine is None:
                app.state.engine.dispose()

    app = FastAPI(
        title="BlueSteps API",
        version="0.1.0",
        lifespan=lifespan,
        responses={
            code: {"model": Error, "description": "Error envelope"} for code in (400, 401, 403, 404, 409, 422, 429, 503)
        },
        description="Python Identity; private PostgreSQL/Supabase domain API. "
        "Disabled provider/product commands return explicit 503 errors.",
    )
    install_errors(app)
    app.add_middleware(media.MediaBodyLimit)

    @app.middleware("http")
    async def request_context(request: Request, call_next: Callable[..., Any]) -> Response:
        request.state.request_id = str(uuid4())
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        if request.headers.get("authorization") or request.url.path.startswith("/v1/auth"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    # Read env lazily for schema export/import; CORS origins never use wildcard with credentials.
    origins = (settings or get_settings()).cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    @app.get("/health/live", response_model=Liveness, operation_id="health_live", tags=["health"])
    def live() -> Liveness:
        return Liveness()

    @app.get("/health/ready", operation_id="health_ready", tags=["health"])
    def ready(request: Request) -> dict[str, str]:
        try:
            with request.app.state.engine.connect() as connection:
                # Query a migration-owned table rather than just checking TCP reachability.
                connection.execute(text("select 1 from app_private.users limit 1"))
                # Parse the newest collection/route fields even when the tables are
                # empty, so an outdated database cannot pass the launcher's gate.
                connection.execute(
                    text("""select p.website_url,proposal.publish_photos,r.prefer_no_tolls
                    from app_private.collection_points p
                    cross join app_private.point_proposals proposal
                    cross join app_private.routes r limit 0""")
                )
                connection.execute(text("select lease_token from app_private.outbox_events limit 1"))
                connection.execute(text("select 1 from app_private.auth_recipient_cooldowns limit 1"))
                connection.execute(text("select interests,goal from app_private.user_preferences limit 1"))
                connection.execute(text("select 1 from app_private.saved_posts limit 1"))
                # Both reminder dispatchers run on every worker poll. Validate their
                # schema without scanning data before the connected launcher starts it.
                connection.execute(
                    text("""select j.id,j.status,j.scheduled_for,p.enabled,p.version,t.event_id,
                    n.daily_reminder,n.daily_time,n.timezone,d.reminder_date,c.claimed_on,
                    inbox.category,inbox.target_path,inbox.details
                    from app_private.event_reminder_jobs j
                    cross join app_private.event_reminder_preferences p
                    cross join app_private.event_reminder_targets t
                    cross join app_private.notification_preferences n
                    cross join app_private.daily_reminder_deliveries d
                    cross join app_private.daily_claims c
                    cross join app_private.notifications inbox limit 0""")
                )
                role = (
                    connection.execute(
                        text("""select r.rolsuper,r.rolbypassrls,
                  pg_has_role(current_user,'bluesteps_runtime','member') as runtime_member,
                  n.nspowner=r.oid as schema_owner from pg_roles r cross join pg_namespace n
                  where r.rolname=current_user and n.nspname='app_private'""")
                    )
                    .mappings()
                    .one()
                )
                if role["rolsuper"] or role["rolbypassrls"] or role["schema_owner"] or not role["runtime_member"]:
                    raise ValueError("API must use a non-owner runtime login")
        except Exception as exc:
            raise APIError(
                503, "NOT_READY", "Database chưa sẵn sàng. Kiểm tra kết nối, migration và role runtime."
            ) from exc
        return {"status": "ready"}

    for router in [
        auth.router,
        web_auth.router,
        catalog.router,
        handbook.router,
        news.router,
        insights.router,
        scans.router,
        member.router,
        social.router,
        community.router,
        composer.router,
        friends.router,
        media.router,
        collection.router,
        mobile.router,
        games.router,
        participation.router,
        reminders.router,
        loyalty.router,
        notifications.router,
    ]:
        app.include_router(router)
    return app


app = create_app()
