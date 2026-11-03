from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Response

from .catalog import Cursor, Limit
from .common import not_found, page
from .community import MEMBER_SELECT, CommunityMember, member_get
from .db import one, run
from .errors import APIError
from .schemas import Page
from .social import DB, User, lock_relationship

router = APIRouter(prefix="/v1/me", tags=["friends"])


@router.get("/friends", response_model=Page[CommunityMember], operation_id="friends_list")
def friends_list(
    db: DB,
    actor: User,
    state: Literal["friends", "incoming", "outgoing"] = "friends",
    cursor: Cursor = None,
    limit: Limit = 20,
) -> Any:
    condition = {
        "friends": "f.accepted_at is not null",
        "incoming": "f.accepted_at is null and f.recipient_id=:viewer",
        "outgoing": "f.accepted_at is null and f.requester_id=:viewer",
    }[state]
    return page(
        db,
        f"friends:{actor.user_id}:{state}",
        MEMBER_SELECT
        + f""" and exists(
      select 1 from app_private.friendships f where {condition} and
      ((f.requester_id=:viewer and f.recipient_id=u.id) or (f.recipient_id=:viewer and f.requester_id=u.id)))""",
        {"viewer": actor.user_id},
        cursor=cursor,
        limit=limit,
    )


@router.put("/friend-requests/{id}", response_model=CommunityMember, operation_id="friend_request_put")
def request_friend(id: UUID, db: DB, actor: User) -> Any:
    if id == actor.user_id:
        raise APIError(422, "SELF_FRIEND", "Không thể kết bạn với chính mình.")
    lock_relationship(db, actor.user_id, id)
    member_get(id, db, actor)
    run(
        db,
        """insert into app_private.friendships(requester_id,recipient_id) values (:uid,:id)
      on conflict do nothing""",
        uid=actor.user_id,
        id=id,
    )
    return member_get(id, db, actor)


@router.put("/friends/{id}", response_model=CommunityMember, operation_id="friend_accept")
def accept_friend(id: UUID, db: DB, actor: User) -> Any:
    lock_relationship(db, actor.user_id, id)
    member_get(id, db, actor)
    if not one(
        db,
        """update app_private.friendships set accepted_at=coalesce(accepted_at,now())
      where requester_id=:id and recipient_id=:uid returning requester_id""",
        uid=actor.user_id,
        id=id,
    ):
        raise not_found()
    return member_get(id, db, actor)


@router.delete("/friends/{id}", status_code=204, operation_id="friend_remove")
def remove_friend(id: UUID, db: DB, actor: User) -> Response:
    lock_relationship(db, actor.user_id, id)
    run(
        db,
        """delete from app_private.friendships where
      (requester_id=:uid and recipient_id=:id) or (requester_id=:id and recipient_id=:uid)""",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)
