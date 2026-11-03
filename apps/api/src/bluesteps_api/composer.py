from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query, Response
from pydantic import Field
from sqlalchemy.orm import Session

from .catalog import DB
from .common import not_found
from .db import one, run
from .errors import APIError
from .media import User, asset_summary, owned_asset, validate_attachments
from .schemas import MediaAsset, Model, PostDraftContent, PostPlace

router = APIRouter(prefix="/v1/me/post-draft", tags=["composer"])


class PostDraft(Model):
    content: PostDraftContent
    media: list[MediaAsset]
    version: int
    updated_at: datetime | None


class DraftSave(Model):
    content: PostDraftContent
    expected_version: int = Field(ge=0)


def validate_place(db: Session, place: PostPlace | None) -> PostPlace | None:
    if place and place.point_id:
        point = one(
            db,
            """select name,address from app_private.collection_points
          where id=:id and published and not synthetic""",
            id=place.point_id,
        )
        if point is None:
            raise not_found()
        return PostPlace(name=point["name"], address=point["address"], point_id=place.point_id)
    return place


@router.get("", response_model=PostDraft, operation_id="post_draft_get")
def draft_get(db: DB, actor: User) -> Any:
    record = one(
        db, "select content,version,updated_at from app_private.post_drafts where user_id=:uid", uid=actor.user_id
    )
    if record is None:
        return PostDraft(content=PostDraftContent(), media=[], version=0, updated_at=None)
    content = PostDraftContent.model_validate(record["content"])
    return PostDraft(
        content=content,
        version=record["version"],
        updated_at=record["updated_at"],
        media=[asset_summary(owned_asset(id, db, actor)) for id in content.media_ids],
    )


@router.put("", response_model=PostDraft, operation_id="post_draft_save")
def draft_save(body: DraftSave, db: DB, actor: User) -> Any:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key="post-draft:" + str(actor.user_id))
    current = one(db, "select version from app_private.post_drafts where user_id=:uid", uid=actor.user_id)
    if (current["version"] if current else 0) != body.expected_version:
        raise APIError(
            409, "VERSION_CONFLICT", "Bản nháp đã thay đổi trên thiết bị khác. Tải lại để xem phiên bản mới."
        )
    body.content.place = validate_place(db, body.content.place)
    validate_attachments(db, actor, body.content.media_ids)
    run(
        db,
        """insert into app_private.post_drafts(user_id,content) values (:uid,cast(:content as jsonb))
      on conflict(user_id) do update set content=excluded.content,
        version=excluded.version,updated_at=now()""",
        uid=actor.user_id,
        content=body.content.model_dump_json(by_alias=True),
    )
    return draft_get(db, actor)


@router.delete("", status_code=204, operation_id="post_draft_delete")
def draft_delete(db: DB, actor: User, expected_version: int = Query(ge=1)) -> Response:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key="post-draft:" + str(actor.user_id))
    record = one(db, "select version from app_private.post_drafts where user_id=:uid for update", uid=actor.user_id)
    if record and record["version"] != expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Bản nháp đã thay đổi. Tải lại trước khi xóa.")
    run(
        db,
        "delete from app_private.post_drafts where user_id=:uid and version=:version",
        uid=actor.user_id,
        version=expected_version,
    )
    return Response(status_code=204)
