import base64
import hashlib
import json
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from pydantic.alias_generators import to_camel
from sqlalchemy.orm import Session

from .db import one, rows, run
from .errors import APIError


def wire(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat()
    if isinstance(value, Mapping):
        return {to_camel(str(key)): wire(item) for key, item in value.items()}
    if isinstance(value, list):
        return [wire(item) for item in value]
    return jsonable_encoder(value)


def not_found() -> APIError:
    return APIError(404, "NOT_FOUND", "Không tìm thấy tài nguyên.")


def page(
    db: Session,
    scope: str,
    sql: str,
    params: dict[str, Any],
    *,
    cursor: str | None,
    limit: int,
    order_column: Literal["created_at", "updated_at"] = "created_at",
) -> dict[str, Any]:
    # SQL and the order column come only from internal call sites.
    last_time, last_id = None, None
    if cursor:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
            if decoded["scope"] != scope:
                raise ValueError("Cursor scope mismatch")
            last_time = datetime.fromisoformat(decoded["time"])
            if last_time.tzinfo is None:
                raise ValueError("Cursor requires UTC offset")
            last_id = UUID(decoded["id"])
        except (ValueError, KeyError, TypeError, UnicodeDecodeError) as exc:
            raise APIError(400, "INVALID_CURSOR", "Con trỏ phân trang không hợp lệ.") from exc
    result = rows(
        db,
        f"""select * from ({sql}) page_rows
      where (cast(:last_time as timestamptz) is null
      or ({order_column},id)<(cast(:last_time as timestamptz),cast(:last_id as uuid)))
      order by {order_column} desc,id desc limit :page_limit""",
        **params,
        last_time=last_time,
        last_id=last_id,
        page_limit=limit + 1,
    )
    next_cursor = None
    if len(result) > limit:
        tail = result[limit - 1]
        next_cursor = (
            base64.urlsafe_b64encode(
                json.dumps({"scope": scope, "time": tail[order_column].isoformat(), "id": str(tail["id"])}).encode()
            )
            .decode()
            .rstrip("=")
        )
    return {"items": wire(result[:limit]), "nextCursor": next_cursor}


def idempotent(
    db: Session,
    actor_id: UUID,
    operation: str,
    key: str | None,
    body: Any,
    effect: Callable[[], dict[str, Any]],
) -> dict[str, Any]:
    if not key or not 1 <= len(key) <= 128:
        raise APIError(400, "IDEMPOTENCY_KEY_REQUIRED", "Cần Idempotency-Key từ 1–128 ký tự.")
    canonical = json.dumps(jsonable_encoder(body), sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode()).hexdigest()
    lock_key = f"{actor_id}:{operation}:{key}"
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key=lock_key)
    record = one(
        db,
        """select request_hash,response_safe from app_private.idempotency_records
      where actor_id=:actor and operation=:operation and key=:key""",
        actor=actor_id,
        operation=operation,
        key=key,
    )
    if record:
        if record["request_hash"] != digest:
            raise APIError(409, "IDEMPOTENCY_CONFLICT", "Khóa đã được dùng với dữ liệu khác.")
        return dict(record["response_safe"])
    result = wire(effect())
    run(
        db,
        """insert into app_private.idempotency_records
      (actor_id,operation,key,request_hash,response_safe) values
      (:actor,:operation,:key,:hash,cast(:response as jsonb))""",
        actor=actor_id,
        operation=operation,
        key=key,
        hash=digest,
        response=json.dumps(result),
    )
    return dict(result)


def outbox(db: Session, aggregate_id: UUID, event_type: str, payload: dict[str, Any]) -> None:
    run(
        db,
        """insert into app_private.outbox_events(aggregate_id,event_type,payload)
      values (:id,:type,cast(:payload as jsonb))""",
        id=aggregate_id,
        type=event_type,
        payload=json.dumps(wire(payload)),
    )
