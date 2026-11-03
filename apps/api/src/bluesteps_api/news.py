from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Response
from pydantic import Field
from sqlalchemy.orm import Session

from .catalog import ARTICLE_SELECT, EVENT_SELECT, Cursor, Limit, article_get
from .common import page, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .schemas import Article, GreenEvent, Model, Page, Preferences
from .security import Actor, current_actor

router = APIRouter(prefix="/v1", tags=["news"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class ReadingProgress(Model):
    article_id: UUID
    progress: int
    updated_at: datetime | None = None


class ReadingUpdate(Model):
    progress: int = Field(ge=0, le=100)


class ReadingArticle(Article):
    saved_at: datetime
    progress: int
    last_read_at: datetime | None


class SearchTerm(Model):
    term: str = Field(min_length=1, max_length=100)


class RecentSearch(Model):
    id: UUID
    term: str
    created_at: datetime


class NewsCalendar(Model):
    month: str
    timezone: str
    upcoming: int
    items: list[GreenEvent]


class DailyBriefs(Model):
    date: date
    timezone: str
    items: list[Article]


def checked_zone(value: str) -> ZoneInfo:
    try:
        return ZoneInfo(Preferences.valid_timezone(value))
    except ValueError as exc:
        raise APIError(422, "INVALID_TIMEZONE", "Múi giờ không hợp lệ.") from exc


@router.get("/news-calendar", response_model=NewsCalendar, operation_id="news_calendar")
def calendar(db: DB, month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")], timezone: str = "Asia/Ho_Chi_Minh") -> Any:
    zone = checked_zone(timezone)
    try:
        start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=zone)
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    except ValueError as exc:
        raise APIError(422, "INVALID_MONTH", "Tháng không hợp lệ.") from exc
    items = rows(
        db, EVENT_SELECT + " and starts_at<:end and ends_at>:start order by starts_at,id", start=start, end=end
    )
    return {
        "month": month,
        "timezone": timezone,
        "upcoming": sum(item["starts_at"] > datetime.now(UTC) for item in items),
        "items": wire(items),
    }


@router.get("/article-briefs", response_model=DailyBriefs, operation_id="article_briefs")
def briefs(db: DB, day: date | None = None, timezone: str = "Asia/Ho_Chi_Minh") -> Any:
    zone = checked_zone(timezone)
    if day is None:
        latest = one(
            db,
            """select max((created_at at time zone :zone)::date) as day
            from app_private.articles where published and not synthetic and created_at<=now()""",
            zone=timezone,
        )
        day = latest["day"] if latest and latest["day"] else datetime.now(zone).date()
    start = datetime.combine(day, time(), zone)
    end = datetime.combine(day + timedelta(days=1), time(), zone)
    items = rows(
        db,
        ARTICLE_SELECT + " and created_at>=:start and created_at<:end order by created_at desc,id desc",
        start=start,
        end=end,
    )
    return {"date": day, "timezone": timezone, "items": wire(items)}


@router.get("/me/article-reading/{id}", response_model=ReadingProgress, operation_id="article_reading_get")
def reading_get(id: UUID, db: DB, actor: User) -> Any:
    article_get(id, db)
    return wire(
        one(
            db,
            """select article_id,progress,updated_at from app_private.article_reading
        where user_id=:uid and article_id=:id""",
            uid=actor.user_id,
            id=id,
        )
        or {"articleId": str(id), "progress": 0}
    )


@router.put("/me/article-reading/{id}", response_model=ReadingProgress, operation_id="article_reading_put")
def reading_put(id: UUID, body: ReadingUpdate, db: DB, actor: User) -> Any:
    article_get(id, db)
    run(
        db,
        """insert into app_private.article_reading(user_id,article_id,progress) values (:uid,:id,:progress)
        on conflict(user_id,article_id) do update set progress=greatest(article_reading.progress,excluded.progress),
        updated_at=case when excluded.progress>=article_reading.progress
          then now() else article_reading.updated_at end""",
        uid=actor.user_id,
        id=id,
        progress=body.progress,
    )
    return reading_get(id, db, actor)


@router.get("/me/reading-list", response_model=Page[ReadingArticle], operation_id="reading_list")
def reading_list(
    db: DB,
    actor: User,
    state: Literal["all", "unread", "reading", "completed"] = "all",
    cursor: Cursor = None,
    limit: Limit = 20,
) -> Any:
    bounds = {"all": (0, 100), "unread": (0, 0), "reading": (1, 99), "completed": (100, 100)}[state]
    return page(
        db,
        f"reading:{actor.user_id}:{state}",
        """select a.*,s.created_at as saved_at,coalesce(r.progress,0) as progress,r.updated_at as last_read_at
        from ("""
        + ARTICLE_SELECT
        + """) a join app_private.saved_articles s on s.article_id=a.id and s.user_id=:uid
        left join app_private.article_reading r on r.article_id=a.id and r.user_id=:uid
        where coalesce(r.progress,0) between :minimum and :maximum""",
        {"uid": actor.user_id, "minimum": bounds[0], "maximum": bounds[1]},
        cursor=cursor,
        limit=limit,
    )


@router.get("/me/reading-summary", operation_id="reading_summary")
def reading_summary(db: DB, actor: User) -> Any:
    return dict(
        one(
            db,
            """select count(*) as total,
        count(*) filter(where coalesce(r.progress,0)=0) as unread,
        count(*) filter(where r.progress between 1 and 99) as reading,
        count(*) filter(where r.progress=100) as completed
        from app_private.saved_articles s join app_private.articles a on a.id=s.article_id
        left join app_private.article_reading r on r.article_id=a.id and r.user_id=s.user_id
        where s.user_id=:uid and a.published and not a.synthetic""",
            uid=actor.user_id,
        )
        or {}
    )


@router.get("/me/article-searches", response_model=list[RecentSearch], operation_id="article_searches_get")
def searches(db: DB, actor: User) -> Any:
    return wire(
        rows(
            db,
            """select id,term,created_at from app_private.article_searches
        where user_id=:uid order by created_at desc,id desc limit 10""",
            uid=actor.user_id,
        )
    )


@router.post("/me/article-searches", response_model=list[RecentSearch], operation_id="article_searches_add")
def search_add(body: SearchTerm, db: DB, actor: User) -> Any:
    term = " ".join(body.term.split())
    if not term:
        raise APIError(422, "EMPTY_SEARCH", "Nhập từ khóa cần tìm.")
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"article-search:{actor.user_id}")
    run(
        db,
        """insert into app_private.article_searches(user_id,term) values (:uid,:term)
        on conflict(user_id,lower(term)) do update set term=excluded.term,created_at=now()""",
        uid=actor.user_id,
        term=term,
    )
    run(
        db,
        """delete from app_private.article_searches where user_id=:uid and id not in
        (select id from app_private.article_searches where user_id=:uid order by created_at desc,id desc limit 10)""",
        uid=actor.user_id,
    )
    return searches(db, actor)


@router.delete("/me/article-searches", status_code=204, operation_id="article_searches_clear")
def search_clear(db: DB, actor: User) -> Response:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"article-search:{actor.user_id}")
    run(db, "delete from app_private.article_searches where user_id=:uid", uid=actor.user_id)
    return Response(status_code=204)


@router.delete("/me/article-searches/{id}", status_code=204, operation_id="article_search_delete")
def search_delete(id: UUID, db: DB, actor: User) -> Response:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=f"article-search:{actor.user_id}")
    run(db, "delete from app_private.article_searches where user_id=:uid and id=:id", uid=actor.user_id, id=id)
    return Response(status_code=204)
