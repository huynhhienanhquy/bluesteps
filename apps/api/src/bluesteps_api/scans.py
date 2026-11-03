from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .catalog import WASTE_SELECT
from .common import idempotent, not_found, wire
from .db import db_session, one, run
from .errors import APIError
from .member import Key
from .schemas import Model, SortingResponse, WasteItem
from .security import Actor, current_actor

router = APIRouter(prefix="/v1", tags=["scans"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class ScanCreateRequest(Model):
    input_kind: Literal["camera", "library"]
    client_image_id: UUID


class ScanResult(Model):
    id: UUID
    status: Literal["completed"]
    result_mode: Literal["fixed"]
    result_label: Literal["Chai nhựa"] = "Chai nhựa"
    input_kind: Literal["camera", "library"]
    created_at: datetime
    result_item: WasteItem | None
    confirmation: SortingResponse | None


def read_scan(db: Session, user_id: UUID, id: UUID) -> Any:
    record = one(
        db,
        "select * from app_private.scans where id=:id and user_id=:uid and result_mode='fixed'",
        id=id,
        uid=user_id,
    )
    if not record:
        raise not_found()
    item = one(db, WASTE_SELECT + " and w.id=:id", id=record["result_item_id"]) if record["result_item_id"] else None
    return wire(
        {
            "id": record["id"],
            "status": record["status"],
            "result_mode": "fixed",
            "result_label": "Chai nhựa",
            "input_kind": record["input_kind"],
            "created_at": record["created_at"],
            "result_item": item,
            "confirmation": record["confirmation_snapshot"],
        }
    )


@router.post("/scans", response_model=ScanResult, status_code=201, operation_id="scan_create")
def create_scan(body: ScanCreateRequest, request: Request, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        # One selection remains one scan even if a retry uses another transport key.
        run(
            db,
            "select pg_advisory_xact_lock(hashtextextended(:key,0))",
            key=f"scan:{actor.user_id}:{body.client_image_id}",
        )
        existing = one(
            db,
            "select id,input_kind from app_private.scans where user_id=:uid and client_image_id=:image",
            uid=actor.user_id,
            image=body.client_image_id,
        )
        if existing:
            if existing["input_kind"] != body.input_kind:
                raise APIError(409, "SCAN_INPUT_CONFLICT", "Ảnh này đã được ghi nhận với cách chọn khác.")
            return dict(read_scan(db, actor.user_id, existing["id"]))
        item = one(
            db,
            """select w.id from app_private.waste_items w
            join app_private.waste_materials m on m.id=w.material_id
            where w.code=:code and w.name ilike :prefix
            and w.published and not w.synthetic and not m.hazardous""",
            code=request.app.state.settings.fixed_scan_item_code,
            prefix="Chai nhựa%",
        )
        record = one(
            db,
            """insert into app_private.scans(user_id,status,result_mode,input_kind,client_image_id,result_item_id)
            values (:uid,'completed','fixed',:kind,:image,:item) returning id""",
            uid=actor.user_id,
            kind=body.input_kind,
            image=body.client_image_id,
            item=item["id"] if item else None,
        )
        assert record is not None
        return dict(read_scan(db, actor.user_id, record["id"]))

    return idempotent(db, actor.user_id, "scan_create", key, body.model_dump(), effect)


@router.get("/scans/{id}", response_model=ScanResult, operation_id="scan_get")
def scan_get(id: UUID, db: DB, actor: User) -> Any:
    return read_scan(db, actor.user_id, id)
