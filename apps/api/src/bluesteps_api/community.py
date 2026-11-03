"""Public community discovery; viewer-specific follows and hidden posts stay private."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Query, Response
from pydantic import Field

from .catalog import Cursor, Limit
from .common import not_found, page, wire
from .db import one, run
from .errors import APIError
from .post_access import POST_ACCESS
from .schemas import Model, Page, Post
from .social import DB, FEED_SELECT, POST_SELECT, OptionalUser, User, lock_relationship, visible_post
from .text_search import text_search

router = APIRouter(prefix="/v1", tags=["community"])


class CommunityMember(Model):
    id: UUID
    display_name: str
    bio: str
    created_at: datetime
    post_count: int
    follower_count: int
    following_count: int
    following: bool
    friendship: Literal["none", "self", "incoming", "outgoing", "friends"] = "none"


class CommunityTopic(Model):
    id: UUID
    name: str
    post_count: int = Field(ge=1)
    created_at: datetime


MEMBER_DATA = f"""select u.id,p.display_name,p.bio,u.created_at,
  (select count(*) from app_private.posts p join app_private.users author on author.id=p.user_id
    where p.user_id=u.id and {POST_ACCESS}
    and not exists(select 1 from app_private.hidden_posts h
      where h.post_id=p.id and h.user_id=cast(:viewer as uuid))) as post_count,
  (select count(*) from app_private.member_follows f join app_private.users person on person.id=f.user_id
    and person.status='active' where f.followed_user_id=u.id) as follower_count,
  (select count(*) from app_private.member_follows f join app_private.users person on person.id=f.followed_user_id
    and person.status='active' where f.user_id=u.id) as following_count,
  exists(select 1 from app_private.member_follows f
    where f.user_id=cast(:viewer as uuid) and f.followed_user_id=u.id) as following
  ,case when u.id=cast(:viewer as uuid) then 'self' else coalesce((select case
    when f.accepted_at is not null then 'friends' when f.requester_id=cast(:viewer as uuid)
    then 'outgoing' else 'incoming' end from app_private.friendships f where
    (f.requester_id=u.id and f.recipient_id=cast(:viewer as uuid))
    or (f.recipient_id=u.id and f.requester_id=cast(:viewer as uuid))), 'none') end as friendship
  from app_private.users u join app_private.profiles p on p.user_id=u.id
  where u.status='active'"""
MEMBER_SELECT = (
    MEMBER_DATA
    + """ and not exists(select 1 from app_private.blocks b where
    (b.user_id=cast(:viewer as uuid) and b.blocked_user_id=u.id)
    or (b.user_id=u.id and b.blocked_user_id=cast(:viewer as uuid)))"""
)


@router.get("/me/blocked-members", response_model=Page[CommunityMember], operation_id="community_blocked_members_list")
def blocked_members(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return page(
        db,
        f"blocked-members:{actor.user_id}",
        MEMBER_DATA
        + " and exists(select 1 from app_private.blocks b where b.user_id=:viewer and b.blocked_user_id=u.id)",
        {"viewer": actor.user_id},
        cursor=cursor,
        limit=limit,
    )


@router.get("/community/members", response_model=Page[CommunityMember], operation_id="community_members_list")
def members(
    db: DB,
    actor: OptionalUser,
    q: str = Query(default="", max_length=100),
    following: bool = False,
    cursor: Cursor = None,
    limit: Limit = 20,
) -> Any:
    if following and not actor:
        raise APIError(401, "AUTH_REQUIRED", "Đăng nhập để xem thành viên đang theo dõi.")
    condition, search = text_search(q, ("p.display_name", "p.bio"))
    select = MEMBER_SELECT + " and " + condition
    if following:
        select += """ and exists(select 1 from app_private.member_follows f
          where f.user_id=cast(:viewer as uuid) and f.followed_user_id=u.id)"""
    return page(
        db,
        f"community-members:{actor.user_id if actor else 'guest'}:{following}:{q.strip()}",
        select,
        {"viewer": actor.user_id if actor else None, **search},
        cursor=cursor,
        limit=limit,
    )


@router.get("/community/members/{id}", response_model=CommunityMember, operation_id="community_member_get")
def member_get(id: UUID, db: DB, actor: OptionalUser) -> Any:
    member = one(db, MEMBER_SELECT + " and u.id=:id", id=id, viewer=actor.user_id if actor else None)
    if member is None:
        raise not_found()
    return wire(member)


@router.put("/me/followed-members/{id}", response_model=CommunityMember, operation_id="community_member_follow")
def follow(id: UUID, db: DB, actor: User) -> Any:
    if id == actor.user_id:
        raise APIError(422, "SELF_FOLLOW", "Không thể theo dõi chính mình.")
    lock_relationship(db, actor.user_id, id)
    member_get(id, db, actor)
    run(
        db,
        """insert into app_private.member_follows(user_id,followed_user_id)
        values (:viewer,:id) on conflict do nothing""",
        viewer=actor.user_id,
        id=id,
    )
    return member_get(id, db, actor)


@router.delete("/me/followed-members/{id}", status_code=204, operation_id="community_member_unfollow")
def unfollow(id: UUID, db: DB, actor: User) -> Response:
    lock_relationship(db, actor.user_id, id)
    run(
        db,
        "delete from app_private.member_follows where user_id=:uid and followed_user_id=:id",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.get("/community/topics", response_model=Page[CommunityTopic], operation_id="community_topics_list")
def topics(
    db: DB,
    actor: OptionalUser,
    q: str = Query(default="", max_length=100),
    cursor: Cursor = None,
    limit: Limit = 20,
) -> Any:
    condition, search = text_search(q, ("topic",))
    return page(
        db,
        f"community-topics:{actor.user_id if actor else 'guest'}:{q.strip()}",
        f"""select md5(topic)::uuid as id,topic as name,count(*) as post_count,max(created_at) as created_at
        from ({FEED_SELECT}) visible where topic is not null and {condition} group by topic""",
        {"viewer": actor.user_id if actor else None, **search},
        cursor=cursor,
        limit=limit,
    )


@router.put("/me/hidden-posts/{id}", status_code=204, operation_id="post_hide")
def hide(id: UUID, db: DB, actor: User) -> Response:
    visible_post(db, id, actor)
    run(
        db,
        "insert into app_private.hidden_posts(user_id,post_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.delete("/me/hidden-posts/{id}", status_code=204, operation_id="post_unhide")
def unhide(id: UUID, db: DB, actor: User) -> Response:
    run(db, "delete from app_private.hidden_posts where user_id=:uid and post_id=:id", uid=actor.user_id, id=id)
    return Response(status_code=204)


@router.get("/me/hidden-posts", response_model=Page[Post], operation_id="hidden_posts_list")
def hidden_posts(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return page(
        db,
        f"hidden-posts:{actor.user_id}",
        POST_SELECT
        + " and exists(select 1 from app_private.hidden_posts h where h.post_id=p.id and h.user_id=:viewer)",
        {"viewer": actor.user_id},
        cursor=cursor,
        limit=limit,
    )
