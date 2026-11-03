import json
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from .catalog import Cursor, Limit, article_get
from .common import idempotent, not_found, outbox, page, wire
from .conversation_access import CONVERSATION_ACCESS, MESSAGE_MEDIA_JSON
from .db import db_session, one, rows, run
from .errors import APIError
from .media import bind_attachments, validate_attachments
from .member import Key
from .post_access import MEDIA_JSON, POST_ACCESS
from .schemas import (
    Comment,
    CommentEngagement,
    CommentRequest,
    CommentsPage,
    Conversation,
    ConversationRequest,
    ConversationSummary,
    Message,
    MessageList,
    MessageRequest,
    Page,
    Post,
    PostRequest,
    ReadRequest,
)
from .security import Actor, current_actor, optional_actor
from .text_search import text_search

router = APIRouter(prefix="/v1", tags=["social"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
OptionalUser = Annotated[Actor | None, Depends(optional_actor)]

# Friends require explicit acceptance. Block wins over all audiences.
POST_SELECT = f"""select p.id,p.user_id,p.body,p.visibility,p.version,p.created_at,p.topic,p.emotion,p.place,
  {MEDIA_JSON},
  pr.display_name as author_name,(select count(*) from app_private.reactions r where r.post_id=p.id) as likes,
  exists(select 1 from app_private.reactions r where r.post_id=p.id and r.user_id=cast(:viewer as uuid)) as liked,
  exists(select 1 from app_private.saved_posts s where s.post_id=p.id and s.user_id=cast(:viewer as uuid)) as saved,
  exists(select 1 from app_private.hidden_posts h where h.post_id=p.id and h.user_id=cast(:viewer as uuid)) as hidden,
  (select count(*) from app_private.comments c where c.post_id=p.id and c.deleted_at is null
    and not exists(select 1 from app_private.blocks b where
      (b.user_id=cast(:viewer as uuid) and b.blocked_user_id=c.user_id)
      or (b.user_id=c.user_id and b.blocked_user_id=cast(:viewer as uuid)))) as comments
  from app_private.posts p join app_private.profiles pr on pr.user_id=p.user_id
  join app_private.users author on author.id=p.user_id and author.status='active'
  where {POST_ACCESS}"""
FEED_SELECT = (
    POST_SELECT
    + """ and not exists(select 1 from app_private.hidden_posts h
  where h.post_id=p.id and h.user_id=cast(:viewer as uuid))"""
)


def lock_relationship(db: Session, first: UUID, second: UUID) -> None:
    # Follow and block serialize the same pair, including opposite directions.
    pair = ":".join(sorted([str(first), str(second)]))
    run(db, "select pg_advisory_xact_lock(hashtextextended(:pair,0))", pair="relationship:" + pair)


def visible_post(db: Session, id: UUID, actor: Actor | None) -> Any:
    result = one(db, POST_SELECT + " and p.id=:id", id=id, viewer=actor.user_id if actor else None)
    if not result:
        raise not_found()
    return result


@router.get("/posts", response_model=Page[Post], operation_id="posts_list")
def posts(
    db: DB,
    actor: OptionalUser,
    cursor: Cursor = None,
    limit: Limit = 20,
    q: str = Query(default="", max_length=100),
    topic: str | None = Query(default=None, min_length=1, max_length=80),
    author_id: UUID | None = None,
    feed: Literal["all", "following"] = "all",
) -> Any:
    if feed == "following" and actor is None:
        raise APIError(401, "AUTH_REQUIRED", "Đăng nhập để xem bài viết đang theo dõi.")
    query = q.strip()
    condition, search = text_search(query, ("p.body", "p.topic", "pr.display_name"))
    select = FEED_SELECT + " and " + condition
    params: dict[str, Any] = {"viewer": actor.user_id if actor else None, **search}
    if topic:
        select += " and p.topic=:topic"
        params["topic"] = topic
    if author_id:
        select += " and p.user_id=:author"
        params["author"] = author_id
    if feed == "following":
        select += """ and exists(select 1 from app_private.member_follows f
          where f.user_id=:viewer and f.followed_user_id=p.user_id)"""
    return page(
        db,
        json.dumps(["posts", str(actor.user_id) if actor else None, query, topic, str(author_id), feed]),
        select,
        params,
        cursor=cursor,
        limit=limit,
    )


@router.get("/posts/{id}", response_model=Post, operation_id="post_get")
def post_get(id: UUID, db: DB, actor: OptionalUser) -> Any:
    return wire(visible_post(db, id, actor))


@router.post("/posts", status_code=201, response_model=Post, operation_id="post_create")
def post_create(body: PostRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        id = uuid4()
        from .composer import validate_place

        if body.draft_version is not None:
            run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key="post-draft:" + str(actor.user_id))

        place = validate_place(db, body.place)
        run(
            db,
            """insert into app_private.posts(id,user_id,body,visibility,topic,emotion,place)
          values (:id,:uid,:body,:visibility,:topic,:emotion,cast(:place as jsonb))""",
            id=id,
            uid=actor.user_id,
            body=body.body,
            visibility=body.visibility,
            topic=body.topic,
            emotion=body.emotion,
            place=place.model_dump_json(by_alias=True) if place else None,
        )
        bind_attachments(db, actor, id, body.media_ids)
        if body.draft_version is not None:
            run(
                db,
                "delete from app_private.post_drafts where user_id=:uid and version=:version",
                uid=actor.user_id,
                version=body.draft_version,
            )
        outbox(db, id, "post.created", {"authorId": actor.user_id})
        return dict(visible_post(db, id, actor))

    return idempotent(db, actor.user_id, "post_create", key, body.model_dump(), effect)


@router.delete("/posts/{id}", status_code=204, operation_id="post_delete")
def post_delete(id: UUID, db: DB, actor: User) -> Response:
    if not one(
        db,
        """update app_private.posts set deleted_at=coalesce(deleted_at,now()),version=version+1
      where id=:id and user_id=:uid returning id""",
        id=id,
        uid=actor.user_id,
    ):
        raise not_found()
    run(db, "delete from app_private.post_media where post_id=:id", id=id)
    return Response(status_code=204)


@router.put("/posts/{id}/reaction", response_model=Post, operation_id="post_reaction_put")
def react(id: UUID, db: DB, actor: User) -> Any:
    visible_post(db, id, actor)
    run(
        db,
        "insert into app_private.reactions(user_id,post_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    return wire(visible_post(db, id, actor))


@router.delete("/posts/{id}/reaction", response_model=Post, operation_id="post_reaction_delete")
def unreact(id: UUID, db: DB, actor: User) -> Any:
    visible_post(db, id, actor)
    run(
        db,
        "delete from app_private.reactions where user_id=:uid and post_id=:id",
        uid=actor.user_id,
        id=id,
    )
    return wire(visible_post(db, id, actor))


def comments_list(db: Session, target: UUID, kind: str, cursor: str | None, limit: int, actor: Actor | None) -> Any:
    if kind == "post":
        visible_post(db, target, actor)
    else:
        article_get(target, db)
    visibility = f"""from app_private.comments c
      join app_private.profiles p on p.user_id=c.user_id where c.{kind}_id=:id
      and not exists(select 1 from app_private.blocks b where
        (b.user_id=cast(:viewer as uuid) and b.blocked_user_id=c.user_id)
        or (b.user_id=c.user_id and b.blocked_user_id=cast(:viewer as uuid)))"""
    parameters = {"id": target, "viewer": actor.user_id if actor else None}
    result = page(
        db,
        f"{kind}-comments:{target}:{actor.user_id if actor else 'guest'}",
        f"""
      select c.id,c.user_id,c.parent_id,case when c.deleted_at is null then c.body else '' end as body,
      c.deleted_at,c.created_at,p.display_name as author_name,
      case when c.deleted_at is null then (select count(*) from app_private.comment_reactions r
        where r.comment_id=c.id) else 0 end as likes,
      c.deleted_at is null and exists(select 1 from app_private.comment_reactions r
        where r.comment_id=c.id and r.user_id=cast(:viewer as uuid)) as liked {visibility}""",
        parameters,
        cursor=cursor,
        limit=limit,
    )
    count = one(db, "select count(*) as total " + visibility + " and c.deleted_at is null", **parameters)
    result["totalCount"] = count["total"] if count else 0
    return result


def comment_create(db: Session, actor: Actor, target: UUID, kind: str, body: CommentRequest, key: str | None) -> Any:
    if kind == "post":
        visible_post(db, target, actor)
    else:
        article_get(target, db)

    def effect() -> dict[str, Any]:
        if body.parent_id and not one(
            db,
            f"""select c.id from app_private.comments c where c.id=:parent
          and c.{kind}_id=:target and not exists(select 1 from app_private.blocks b where
            (b.user_id=:viewer and b.blocked_user_id=c.user_id)
            or (b.user_id=c.user_id and b.blocked_user_id=:viewer))""",
            parent=body.parent_id,
            target=target,
            viewer=actor.user_id,
        ):
            raise not_found()
        result = one(
            db,
            f"""insert into app_private.comments(user_id,{kind}_id,parent_id,body)
          values (:uid,:target,:parent,:body) returning id,user_id,parent_id,body,created_at""",
            uid=actor.user_id,
            target=target,
            parent=body.parent_id,
            body=body.body,
        )
        assert result is not None
        return dict(result)

    return idempotent(db, actor.user_id, f"comment_create:{kind}:{target}", key, body.model_dump(), effect)


@router.get("/posts/{id}/comments", response_model=CommentsPage, operation_id="post_comments_list")
def post_comments(id: UUID, db: DB, actor: OptionalUser, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return comments_list(db, id, "post", cursor, limit, actor)


@router.post("/posts/{id}/comments", status_code=201, response_model=Comment, operation_id="post_comment_create")
def post_comment(id: UUID, body: CommentRequest, db: DB, actor: User, key: Key = None) -> Any:
    return comment_create(db, actor, id, "post", body, key)


@router.get("/articles/{id}/comments", response_model=CommentsPage, operation_id="article_comments_list")
def article_comments(id: UUID, db: DB, actor: OptionalUser, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return comments_list(db, id, "article", cursor, limit, actor)


@router.post("/articles/{id}/comments", status_code=201, response_model=Comment, operation_id="article_comment_create")
def article_comment(id: UUID, body: CommentRequest, db: DB, actor: User, key: Key = None) -> Any:
    return comment_create(db, actor, id, "article", body, key)


@router.delete("/comments/{id}", status_code=204, operation_id="comment_delete")
def comment_delete(id: UUID, db: DB, actor: User) -> Response:
    if not one(
        db,
        """update app_private.comments set deleted_at=coalesce(deleted_at,now()),body='[deleted]'
      where id=:id and user_id=:uid returning id""",
        id=id,
        uid=actor.user_id,
    ):
        raise not_found()
    return Response(status_code=204)


def comment_reaction_access(id: UUID, db: Session, actor: Actor) -> None:
    comment = one(
        db,
        """select c.post_id,c.article_id from app_private.comments c
        where c.id=:id and c.deleted_at is null and not exists(select 1 from app_private.blocks b where
          (b.user_id=:uid and b.blocked_user_id=c.user_id) or (b.user_id=c.user_id and b.blocked_user_id=:uid))
        for update""",
        id=id,
        uid=actor.user_id,
    )
    if not comment:
        raise not_found()
    if comment["post_id"]:
        visible_post(db, comment["post_id"], actor)
    else:
        article_get(comment["article_id"], db)


def comment_reaction_state(id: UUID, db: Session, actor: Actor) -> Any:
    return dict(
        one(
            db,
            """select count(*) as likes,
        coalesce(bool_or(user_id=:uid),false) as liked from app_private.comment_reactions where comment_id=:id""",
            id=id,
            uid=actor.user_id,
        )
        or {}
    )


@router.put("/comments/{id}/reaction", response_model=CommentEngagement, operation_id="comment_reaction_put")
def comment_react(id: UUID, db: DB, actor: User) -> Any:
    comment_reaction_access(id, db, actor)
    run(
        db,
        "insert into app_private.comment_reactions(user_id,comment_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    return comment_reaction_state(id, db, actor)


@router.delete("/comments/{id}/reaction", response_model=CommentEngagement, operation_id="comment_reaction_delete")
def comment_unreact(id: UUID, db: DB, actor: User) -> Any:
    comment_reaction_access(id, db, actor)
    run(db, "delete from app_private.comment_reactions where user_id=:uid and comment_id=:id", uid=actor.user_id, id=id)
    return comment_reaction_state(id, db, actor)


@router.put("/me/blocks/{id}", status_code=204, operation_id="block_put")
def block(id: UUID, db: DB, actor: User) -> Response:
    if id == actor.user_id:
        raise APIError(422, "SELF_BLOCK", "Không thể chặn chính mình.")
    if not one(db, "select id from app_private.users where id=:id and status='active'", id=id):
        raise not_found()
    lock_relationship(db, actor.user_id, id)
    run(
        db,
        "insert into app_private.blocks(user_id,blocked_user_id) values (:uid,:id) on conflict do nothing",
        uid=actor.user_id,
        id=id,
    )
    run(
        db,
        """delete from app_private.member_follows where
        (user_id=:uid and followed_user_id=:id) or (user_id=:id and followed_user_id=:uid)""",
        uid=actor.user_id,
        id=id,
    )
    run(
        db,
        """delete from app_private.friendships where
      (requester_id=:uid and recipient_id=:id) or (requester_id=:id and recipient_id=:uid)""",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


@router.delete("/me/blocks/{id}", status_code=204, operation_id="block_delete")
def unblock(id: UUID, db: DB, actor: User) -> Response:
    run(
        db,
        "delete from app_private.blocks where user_id=:uid and blocked_user_id=:id",
        uid=actor.user_id,
        id=id,
    )
    return Response(status_code=204)


def conversation_access(db: Session, actor: Actor, id: UUID) -> Any:
    result = one(
        db,
        f"""select c.id,c.last_sequence,c.created_at from app_private.conversations c
      where c.id=:id and {CONVERSATION_ACCESS}""",
        id=id,
        viewer=actor.user_id,
    )
    if not result:
        raise not_found()
    output = dict(result)
    output["members"] = rows(
        db,
        """select p.user_id as id,p.display_name from app_private.profiles p
      join app_private.conversation_members m on m.user_id=p.user_id
      where m.conversation_id=:id order by p.user_id""",
        id=id,
    )
    return output


@router.post("/conversations", status_code=201, response_model=Conversation, operation_id="conversation_create")
def conversation_create(body: ConversationRequest, db: DB, actor: User) -> Any:
    if body.recipient_id == actor.user_id:
        raise APIError(422, "INVALID_RECIPIENT", "Cần một người nhận khác.")
    recipient = one(
        db,
        """select id from app_private.users where id=:id and status='active'
      and not exists(select 1 from app_private.blocks where
        (user_id=:uid and blocked_user_id=:id) or (user_id=:id and blocked_user_id=:uid))""",
        id=body.recipient_id,
        uid=actor.user_id,
    )
    if not recipient:
        raise not_found()
    direct_key = ":".join(sorted([str(actor.user_id), str(body.recipient_id)]))
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=direct_key)
    result = one(db, "select id from app_private.conversations where direct_key=:key", key=direct_key)
    if result:
        return wire(conversation_access(db, actor, result["id"]))
    id = uuid4()
    run(
        db,
        "insert into app_private.conversations(id,direct_key) values (:id,:key)",
        id=id,
        key=direct_key,
    )
    for member in [actor.user_id, body.recipient_id]:
        run(
            db,
            "insert into app_private.conversation_members(conversation_id,user_id) values (:id,:uid)",
            id=id,
            uid=member,
        )
    return wire(conversation_access(db, actor, id))


@router.get("/conversations", response_model=Page[ConversationSummary], operation_id="conversations_list")
def conversations(
    db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20, sort: Literal["created", "recent"] = "created"
) -> Any:
    sql = f"""select c.id,c.last_sequence,c.created_at,member.last_read_sequence,
      coalesce(latest.created_at,c.created_at) as updated_at,
      case when latest.id is null then null else jsonb_build_object(
        'id',latest.id,'userId',latest.user_id,'clientMessageId',latest.client_message_id,
        'sequence',latest.sequence,'text',latest.text,'createdAt',latest.created_at,
        'media',latest.media) end as last_message,
      (select count(*) from app_private.messages msg where msg.conversation_id=c.id
        and msg.sequence>member.last_read_sequence and msg.user_id<>:uid) as unread_count,
      (select jsonb_agg(jsonb_build_object('id',p.user_id,'displayName',p.display_name))
       from app_private.conversation_members members join app_private.profiles p on p.user_id=members.user_id
       where members.conversation_id=c.id) as members
      from app_private.conversations c join app_private.conversation_members member on member.conversation_id=c.id
      left join lateral (
        select m.id,m.user_id,m.client_message_id,m.sequence,m.body as text,m.created_at,{MESSAGE_MEDIA_JSON}
        from app_private.messages m where m.conversation_id=c.id order by m.sequence desc limit 1
      ) latest on true
      where member.user_id=:uid and {CONVERSATION_ACCESS}"""
    return page(
        db,
        f"conversations:{actor.user_id}" if sort == "created" else f"conversations:recent:{actor.user_id}",
        sql,
        {"uid": actor.user_id, "viewer": actor.user_id},
        cursor=cursor,
        limit=limit,
        order_column="updated_at" if sort == "recent" else "created_at",
    )


@router.get("/conversations/{id}", response_model=Conversation, operation_id="conversation_get")
def conversation_get(id: UUID, db: DB, actor: User) -> Any:
    return wire(conversation_access(db, actor, id))


@router.get("/conversations/{id}/messages", response_model=MessageList, operation_id="messages_list")
def messages(
    id: UUID,
    db: DB,
    actor: User,
    after_sequence: int = Query(default=0, ge=0, le=9223372036854775807),
    before_sequence: int | None = Query(default=None, ge=1, le=9223372036854775807),
    limit: Limit = 50,
) -> Any:
    conversation_access(db, actor, id)
    comparison, direction = ("<", "desc") if before_sequence is not None else (">", "asc")
    result = rows(
        db,
        f"""select m.id,m.user_id,m.client_message_id,m.sequence,m.body as text,m.created_at,{MESSAGE_MEDIA_JSON}
      from app_private.messages m where m.conversation_id=:id and m.sequence {comparison} :after
      order by m.sequence {direction} limit :limit""",
        id=id,
        after=before_sequence if before_sequence is not None else after_sequence,
        limit=limit + 1,
    )
    return {
        "items": wire(list(reversed(result[:limit])) if before_sequence is not None else result[:limit]),
        "hasMore": len(result) > limit,
        "nextSequence": result[min(len(result), limit) - 1]["sequence"] if result else after_sequence,
    }


@router.post("/conversations/{id}/messages", status_code=201, response_model=Message, operation_id="message_create")
def message_create(id: UUID, body: MessageRequest, db: DB, actor: User) -> Any:
    conversation_access(db, actor, id)
    run(db, "select id from app_private.conversations where id=:id for update", id=id)
    prior = one(
        db,
        f"""select m.id,m.user_id,m.client_message_id,m.sequence,m.body as text,m.created_at,{MESSAGE_MEDIA_JSON}
      from app_private.messages m where m.conversation_id=:id and m.user_id=:uid and m.client_message_id=:client""",
        id=id,
        uid=actor.user_id,
        client=body.client_message_id,
    )
    if prior:
        if prior["text"] != body.text or [str(item["id"]) for item in prior["media"]] != list(map(str, body.media_ids)):
            raise APIError(409, "IDEMPOTENCY_CONFLICT", "clientMessageId đã có nội dung khác.")
        return wire(prior)
    validate_attachments(db, actor, body.media_ids)
    seq = one(
        db,
        """update app_private.conversations set last_sequence=last_sequence+1
      where id=:id returning last_sequence""",
        id=id,
    )
    assert seq is not None
    result = one(
        db,
        """insert into app_private.messages(conversation_id,user_id,client_message_id,sequence,body)
      values (:id,:uid,:client,:seq,:body) returning id,user_id,client_message_id,sequence,body as text,created_at""",
        id=id,
        uid=actor.user_id,
        client=body.client_message_id,
        seq=seq["last_sequence"],
        body=body.text,
    )
    assert result is not None
    for position, asset_id in enumerate(body.media_ids):
        run(
            db,
            "insert into app_private.message_media(message_id,asset_id,position) values (:id,:asset,:position)",
            id=result["id"],
            asset=asset_id,
            position=position,
        )
    outbox(
        db,
        result["id"],
        "message.created",
        {"conversationId": id, "sequence": seq["last_sequence"]},
    )
    media = one(db, f"select {MESSAGE_MEDIA_JSON} from app_private.messages m where m.id=:id", id=result["id"])
    return wire({**result, "media": media["media"] if media else []})


@router.put("/conversations/{id}/read", status_code=204, operation_id="conversation_read")
def mark_read(id: UUID, body: ReadRequest, db: DB, actor: User) -> Response:
    conversation = conversation_access(db, actor, id)
    if body.last_read_sequence > conversation["last_sequence"]:
        raise APIError(422, "INVALID_SEQUENCE", "Sequence vượt quá lịch sử hội thoại.")
    run(
        db,
        """update app_private.conversation_members set last_read_sequence=greatest(last_read_sequence,:seq)
      where conversation_id=:id and user_id=:uid""",
        id=id,
        uid=actor.user_id,
        seq=body.last_read_sequence,
    )
    return Response(status_code=204)
