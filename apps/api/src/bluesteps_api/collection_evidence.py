"""Image evidence for moderation and consented public collection point photos."""

from typing import Any, Literal
from uuid import UUID

from sqlalchemy.orm import Session

from .db import rows, run
from .errors import APIError
from .media import ASSET_COLUMNS, asset_summary, owned_asset
from .security import Actor

Kind = Literal["proposal", "report"]


def evidence(db: Session, kind: Kind, id: UUID) -> dict[str, Any]:
    assets = rows(
        db,
        f"""select {ASSET_COLUMNS} from app_private.point_{kind}_media m
      join app_private.media_assets a on a.id=m.asset_id where m.{kind}_id=:id order by m.position""",
        id=id,
    )
    return {"media_ids": [a["id"] for a in assets], "media": [asset_summary(a) for a in assets]}


def public_point_photos(db: Session, point_id: UUID) -> list[dict[str, Any]]:
    assets = rows(
        db,
        f"""select {ASSET_COLUMNS} from app_private.point_proposals p
        join app_private.point_proposal_media m on m.proposal_id=p.id
        join app_private.media_assets a on a.id=m.asset_id
        join app_private.users owner on owner.id=a.user_id and owner.status='active'
        where p.published_point_id=:id and p.state='approved' and p.publish_photos
          and a.kind='image' and a.completed_at is not null
        order by m.position,a.id""",
        id=point_id,
    )
    return [asset_summary(asset) for asset in assets]


def bind_evidence(db: Session, actor: Actor, kind: Kind, id: UUID, ids: list[UUID]) -> None:
    if len(ids) > 5 or len(set(ids)) != len(ids):
        raise APIError(422, "INVALID_EVIDENCE", "Chọn tối đa 5 ảnh khác nhau.")
    for asset_id in sorted(ids, key=str):
        asset = owned_asset(asset_id, db, actor)
        if asset["kind"] != "image" or not asset["completed_at"]:
            raise APIError(422, "INVALID_EVIDENCE", "Bằng chứng phải là ảnh đã tải lên hoàn tất.")
    run(db, f"delete from app_private.point_{kind}_media where {kind}_id=:id", id=id)
    for position, asset_id in enumerate(ids):
        run(
            db,
            f"""insert into app_private.point_{kind}_media({kind}_id,asset_id,position)
          values (:id,:asset,:position)""",
            id=id,
            asset=asset_id,
            position=position,
        )
