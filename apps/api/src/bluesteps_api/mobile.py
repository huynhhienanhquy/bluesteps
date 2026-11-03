"""Application reads and commands used by the live mobile screens."""

import base64
import hashlib
import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from .catalog import EVENT_SELECT, Cursor, Limit, article_get, event_get
from .collection import route_read
from .common import idempotent, not_found, outbox, page, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .media import bind_attachments
from .member import Key, own_collection
from .schemas import (
    ArticleEngagement,
    ArticleTopic,
    GreenEvent,
    HandoverReceipt,
    Page,
    Post,
    PostPlace,
    PostRequest,
    PublicUser,
    RouteDetail,
    RouteSummary,
    SavedEventState,
)
from .security import Actor, current_actor, optional_actor
from .social import FEED_SELECT, visible_post
from .text_search import text_search

router = APIRouter(prefix="/v1", tags=["mobile"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
OptionalUser = Annotated[Actor | None, Depends(optional_actor)]


@router.get("/events/{id}/engagement", response_model=SavedEventState, operation_id="event_engagement_get")
def event_engagement(id: UUID, db: DB, actor: OptionalUser) -> Any:
    event_get(id, db)
    result = one(
        db,
        """select collection_id from app_private.saved_events
      where event_id=:id and user_id=cast(:uid as uuid)""",
        id=id,
        uid=actor.user_id if actor else None,
    )
    return {
        "saved": result is not None,
        "collectionId": str(result["collection_id"]) if result and result["collection_id"] else None,
    }


@router.get("/me/event-collections/{id}/events", response_model=Page[GreenEvent], operation_id="event_collection_items")
def collection_items(id: UUID, db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    own_collection(db, actor, id)
    return page(
        db,
        f"collection-events:{id}:{actor.user_id}",
        EVENT_SELECT
        + """ and id in
      (select event_id from app_private.saved_events where user_id=:uid and collection_id=:collection)""",
        {"uid": actor.user_id, "collection": id},
        cursor=cursor,
        limit=limit,
    )


class PostUpdate(PostRequest):
    expected_version: int


@router.patch("/posts/{id}", response_model=Post, operation_id="post_update")
def update_post(id: UUID, body: PostUpdate, db: DB, actor: User) -> Any:
    post = visible_post(db, id, actor)
    if post["user_id"] != actor.user_id:
        raise not_found()
    from .composer import validate_place

    place = validate_place(db, body.place) if "place" in body.model_fields_set else post["place"]
    if not one(
        db,
        """update app_private.posts set body=:body,visibility=:visibility,topic=:topic,emotion=:emotion,
          place=cast(:place as jsonb),version=version+1
      where id=:id and user_id=:uid and version=:version and deleted_at is null returning id""",
        id=id,
        uid=actor.user_id,
        body=body.body,
        visibility=body.visibility if "visibility" in body.model_fields_set else post["visibility"],
        topic=body.topic if "topic" in body.model_fields_set else post["topic"],
        emotion=body.emotion if "emotion" in body.model_fields_set else post["emotion"],
        place=place.model_dump_json(by_alias=True)
        if isinstance(place, PostPlace)
        else json.dumps(place)
        if place
        else None,
        version=body.expected_version,
    ):
        raise APIError(409, "VERSION_CONFLICT", "Bài viết đã thay đổi. Vui lòng tải lại.")
    if "media_ids" in body.model_fields_set:
        bind_attachments(db, actor, id, body.media_ids)
    return wire(visible_post(db, id, actor))


@router.put("/me/saved-posts/{id}", status_code=204, operation_id="saved_post_put")
def save_post(id: UUID, db: DB, actor: User) -> Response:
    visible_post(db, id, actor)
    run(
        db,
        "insert into app_private.saved_posts(user_id,post_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.delete("/me/saved-posts/{id}", status_code=204, operation_id="saved_post_delete")
def unsave_post(id: UUID, db: DB, actor: User) -> Response:
    run(db, "delete from app_private.saved_posts where user_id=:uid and post_id=:id", uid=actor.user_id, id=id)
    return Response(status_code=204)


@router.get("/me/saved-posts", response_model=Page[Post], operation_id="saved_posts_list")
def saved_posts(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return page(
        db,
        f"saved-posts:{actor.user_id}",
        FEED_SELECT
        + """ and p.id in
      (select post_id from app_private.saved_posts where user_id=:viewer)""",
        {"viewer": actor.user_id},
        cursor=cursor,
        limit=limit,
    )


@router.get("/articles/{id}/engagement", response_model=ArticleEngagement, operation_id="article_engagement_get")
def article_engagement(id: UUID, db: DB, actor: OptionalUser) -> Any:
    article_get(id, db)
    return wire(
        one(
            db,
            """select
      (select count(*) from app_private.article_reactions where article_id=:id) as likes,
      exists(select 1 from app_private.article_reactions where article_id=:id and user_id=cast(:uid as uuid)) as liked,
      exists(select 1 from app_private.saved_articles where article_id=:id and user_id=cast(:uid as uuid)) as saved""",
            id=id,
            uid=actor.user_id if actor else None,
        )
    )


@router.put("/articles/{id}/reaction", response_model=ArticleEngagement, operation_id="article_reaction_put")
def like_article(id: UUID, db: DB, actor: User) -> Any:
    article_get(id, db)
    run(
        db,
        "insert into app_private.article_reactions(user_id,article_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    return article_engagement(id, db, actor)


@router.delete("/articles/{id}/reaction", response_model=ArticleEngagement, operation_id="article_reaction_delete")
def unlike_article(id: UUID, db: DB, actor: User) -> Any:
    article_get(id, db)
    run(db, "delete from app_private.article_reactions where user_id=:uid and article_id=:id", uid=actor.user_id, id=id)
    return article_engagement(id, db, actor)


@router.get("/article-topics", response_model=Page[ArticleTopic], operation_id="article_topics_list")
def topics(db: DB, actor: OptionalUser) -> Any:
    return {
        "items": wire(
            rows(
                db,
                """select topic as id,topic as name,count(*) as article_count,
      exists(select 1 from app_private.followed_topics f where f.topic=a.topic
        and f.user_id=cast(:uid as uuid)) as followed from app_private.articles a
      where published and not synthetic group by topic order by topic""",
                uid=actor.user_id if actor else None,
            )
        ),
        "nextCursor": None,
    }


@router.put("/me/followed-topics/{topic}", status_code=204, operation_id="topic_follow")
def follow_topic(topic: str, db: DB, actor: User) -> Response:
    if not one(
        db, "select 1 from app_private.articles where topic=:topic and published and not synthetic", topic=topic
    ):
        raise not_found()
    run(
        db,
        "insert into app_private.followed_topics values (:uid,:topic) on conflict do nothing",
        uid=actor.user_id,
        topic=topic,
    )
    return Response(status_code=204)


@router.delete("/me/followed-topics/{topic}", status_code=204, operation_id="topic_unfollow")
def unfollow_topic(topic: str, db: DB, actor: User) -> Response:
    run(
        db,
        "delete from app_private.followed_topics where user_id=:uid and topic=:topic",
        uid=actor.user_id,
        topic=topic,
    )
    return Response(status_code=204)


@router.get("/users", response_model=Page[PublicUser], operation_id="users_search")
def users(
    db: DB,
    actor: User,
    q: str = Query(default="", min_length=2, max_length=100),
    cursor: Cursor = None,
    limit: Limit = 20,
) -> Any:
    condition, search = text_search(q, ("p.display_name",))
    scope = hashlib.sha256(json.dumps([str(actor.user_id), q], ensure_ascii=False).encode()).hexdigest()
    after_name, after_id = None, None
    if cursor:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
            if decoded["scope"] != scope or not isinstance(decoded["name"], str) or not isinstance(decoded["id"], str):
                raise ValueError("Cursor scope mismatch")
            after_name, after_id = decoded["name"], UUID(decoded["id"])
        except (ValueError, KeyError, TypeError, UnicodeDecodeError) as exc:
            raise APIError(400, "INVALID_CURSOR", "Con trỏ phân trang không hợp lệ.") from exc
    result = rows(
        db,
        f"""select u.id,p.display_name,p.bio from app_private.users u
      join app_private.profiles p on p.user_id=u.id where u.status='active' and u.id<>:uid
      and {condition} and not exists(select 1 from app_private.blocks b where
        (b.user_id=:uid and b.blocked_user_id=u.id) or (b.user_id=u.id and b.blocked_user_id=:uid))
      and (cast(:after_name as text) is null or
        (p.display_name,u.id)>(cast(:after_name as text),cast(:after_id as uuid)))
      order by p.display_name,u.id limit :page_limit""",
        uid=actor.user_id,
        **search,
        after_name=after_name,
        after_id=after_id,
        page_limit=limit + 1,
    )
    next_cursor = None
    if len(result) > limit:
        tail = result[limit - 1]
        next_cursor = (
            base64.urlsafe_b64encode(
                json.dumps(
                    {"scope": scope, "name": tail["display_name"], "id": str(tail["id"])},
                    ensure_ascii=False,
                ).encode()
            )
            .decode()
            .rstrip("=")
        )
    return {"items": wire(result[:limit]), "nextCursor": next_cursor}


@router.get("/me/routes", response_model=Page[RouteSummary], operation_id="routes_list")
def routes(db: DB, actor: User) -> Any:
    return {
        "items": wire(
            rows(
                db,
                """select id,mode,status,version,created_at from app_private.routes
                where user_id=:uid order by created_at desc limit 100""",
                uid=actor.user_id,
            )
        ),
        "nextCursor": None,
    }


@router.post("/routes/{id}/stops/{stop_id}/arrive", response_model=RouteDetail, operation_id="route_stop_arrive")
def arrive(id: UUID, stop_id: UUID, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["status"] != "active":
        raise APIError(409, "INVALID_STATE", "Hãy bắt đầu hành trình trước khi xác nhận đến điểm.")
    if not one(
        db,
        """update app_private.route_stops set status='arrived'
      where id=:stop and route_id=:id and status in ('pending','arrived') returning id""",
        id=id,
        stop=stop_id,
    ):
        raise not_found()
    return route_read(db, actor, id)


@router.post(
    "/routes/{id}/stops/{stop_id}/handover", response_model=HandoverReceipt, operation_id="route_stop_handover"
)
def handover(id: UUID, stop_id: UUID, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        route = route_read(db, actor, id, lock=True)
        existing = one(
            db,
            """select h.id,h.evidence_status,h.created_at from app_private.handovers h
            join app_private.route_stops s on s.id=h.stop_id
            where h.stop_id=:stop and h.user_id=:uid and s.route_id=:id""",
            id=id,
            stop=stop_id,
            uid=actor.user_id,
        )
        if existing:
            return {"handover": dict(existing), "award": {"points": "0", "reason": "POLICY_NOT_ENABLED"}}
        if route["status"] != "active":
            raise APIError(409, "INVALID_STATE", "Hành trình không hoạt động.")
        stop = one(
            db,
            "select id,status from app_private.route_stops where id=:stop and route_id=:id for update",
            id=id,
            stop=stop_id,
        )
        if not stop:
            raise not_found()
        if stop["status"] == "pending":
            raise APIError(409, "ARRIVAL_REQUIRED", "Xác nhận đã đến điểm trước khi bàn giao.")
        record = one(
            db, "select id,evidence_status,created_at from app_private.handovers where stop_id=:stop", stop=stop_id
        )
        if record:
            return {"handover": dict(record), "award": {"points": "0", "reason": "POLICY_NOT_ENABLED"}}
        record = one(
            db,
            """insert into app_private.handovers(user_id,stop_id) values (:uid,:stop)
          returning id,evidence_status,created_at""",
            uid=actor.user_id,
            stop=stop_id,
        )
        assert record is not None
        run(db, "update app_private.route_stops set status='self_reported' where id=:stop", stop=stop_id)
        run(
            db,
            """update app_private.routes set plan=null,version=version+1,
          status=case when not exists(select 1 from app_private.route_stops
          where route_id=:id and status<>'self_reported')
          then 'completed' else status end where id=:id""",
            id=id,
        )
        outbox(db, record["id"], "handover.recorded", {"userId": actor.user_id})
        return {"handover": dict(record), "award": {"points": "0", "reason": "POLICY_NOT_ENABLED"}}

    return idempotent(db, actor.user_id, f"handover:{id}:{stop_id}", key, {}, effect)


@router.get("/games", operation_id="games_list")
def games() -> Any:
    raise APIError(503, "POLICY_NOT_ENABLED", "Trò chơi chưa được mở trên hệ thống.")
