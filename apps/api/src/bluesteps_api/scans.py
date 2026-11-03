from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, Request, Response
from pydantic import Field
from sqlalchemy.orm import Session

from .catalog import WASTE_SELECT
from .common import idempotent, not_found, wire
from .config import Settings
from .db import db_session, one, run
from .errors import APIError
from .member import Key
from .schemas import Model, SortingResponse, WasteItem
from .security import Actor, current_actor, limit
from .waste_inference import CLASS_LABELS, MAX_IMAGE_BASE64, MODEL_NAME, decode_image, predict

router = APIRouter(prefix="/v1", tags=["scans"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]


class ScanInput(Model):
    input_kind: Literal["camera", "library"]
    client_image_id: UUID


class ScanRecognizeRequest(ScanInput):
    image_base64: str = Field(min_length=4, max_length=MAX_IMAGE_BASE64, repr=False)


class ScanCreateRequest(ScanInput):
    prediction_token: str = Field(min_length=1, max_length=4096, repr=False)


class ScanPrediction(Model):
    status: Literal["completed", "unrecognized"]
    predicted_class: str
    result_label: str
    confidence: float = Field(ge=0, le=1)
    model_name: str
    result_item: WasteItem | None
    prediction_token: str


class ScanResult(Model):
    id: UUID
    status: Literal["completed", "unrecognized"]
    result_mode: Literal["fixed", "model"]
    result_label: str
    predicted_class: str | None = None
    confidence: float | None = None
    model_name: str | None = None
    input_kind: Literal["camera", "library"]
    created_at: datetime
    result_item: WasteItem | None
    confirmation: SortingResponse | None


def catalog_item(db: Session, predicted_class: str) -> Any:
    # Group entries never pretend a material classifier identifies a specific subtype.
    return one(db, WASTE_SELECT + " and w.code=:code", code="scan-" + predicted_class)


def prediction_claims(settings: Settings, body: ScanCreateRequest) -> dict[str, Any]:
    try:
        claims = jwt.decode(
            body.prediction_token,
            settings.jwt_public_key,
            algorithms=["RS256"],
            audience="bluesteps-scan",
            issuer="bluesteps-waste-model",
            options={"require": ["exp", "iat", "image", "kind", "class", "confidence", "model", "status"]},
        )
        if (
            claims["image"] != str(body.client_image_id)
            or claims["kind"] != body.input_kind
            or claims["class"] not in CLASS_LABELS
            or claims["model"] != MODEL_NAME
            or claims["status"] not in ("completed", "unrecognized")
            or not 0 <= float(claims["confidence"]) <= 1
        ):
            raise ValueError("Prediction does not match selection")
        return dict(claims)
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise APIError(
            422, "SCAN_PREDICTION_INVALID", "Kết quả nhận diện không hợp lệ hoặc đã hết hạn. Hãy quét lại."
        ) from exc


@router.post("/scans/prediction", response_model=ScanPrediction, operation_id="scan_prediction")
def restore_prediction(body: ScanCreateRequest, request: Request, response: Response, db: DB) -> Any:
    response.headers["Cache-Control"] = "no-store"
    claims = prediction_claims(request.app.state.settings, body)
    return wire(
        {
            "status": claims["status"],
            "predicted_class": claims["class"],
            "result_label": CLASS_LABELS[claims["class"]],
            "confidence": claims["confidence"],
            "model_name": claims["model"],
            "result_item": catalog_item(db, claims["class"]) if claims["status"] == "completed" else None,
            "prediction_token": body.prediction_token,
        }
    )


@router.post("/scans/recognize", response_model=ScanPrediction, operation_id="scan_recognize")
def recognize(body: ScanRecognizeRequest, request: Request, response: Response, db: DB) -> Any:
    settings: Settings = request.app.state.settings
    response.headers["Cache-Control"] = "no-store"
    limit(db, settings, "scan-recognize", request.client.host if request.client else "unknown", maximum=30, seconds=60)
    image = decode_image(body.image_base64)
    try:
        predicted_class, confidence = predict(image, settings.scan_model_directory)
    finally:
        image.close()
    status = "completed" if confidence >= settings.scan_confidence_threshold else "unrecognized"
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "iss": "bluesteps-waste-model",
            "aud": "bluesteps-scan",
            "iat": now,
            "exp": now + timedelta(hours=24),
            "image": str(body.client_image_id),
            "kind": body.input_kind,
            "class": predicted_class,
            "confidence": confidence,
            "model": MODEL_NAME,
            "status": status,
        },
        settings.jwt_private_key.get_secret_value(),
        algorithm="RS256",
    )
    return wire(
        {
            "status": status,
            "predicted_class": predicted_class,
            "result_label": CLASS_LABELS[predicted_class],
            "confidence": confidence,
            "model_name": MODEL_NAME,
            "result_item": catalog_item(db, predicted_class) if status == "completed" else None,
            "prediction_token": token,
        }
    )


def read_scan(db: Session, user_id: UUID, id: UUID) -> Any:
    record = one(
        db,
        "select * from app_private.scans where id=:id and user_id=:uid and result_mode in ('fixed','model')",
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
            "result_mode": record["result_mode"],
            "result_label": CLASS_LABELS[record["predicted_class"]] if record["predicted_class"] else "Chai nhựa",
            "predicted_class": record["predicted_class"],
            "confidence": record["confidence"],
            "model_name": record["model_name"],
            "input_kind": record["input_kind"],
            "created_at": record["created_at"],
            "result_item": item,
            "confirmation": record["confirmation_snapshot"],
        }
    )


@router.post("/scans", response_model=ScanResult, status_code=201, operation_id="scan_create")
def create_scan(body: ScanCreateRequest, request: Request, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
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
        claims = prediction_claims(request.app.state.settings, body)
        item = catalog_item(db, claims["class"]) if claims["status"] == "completed" else None
        record = one(
            db,
            """insert into app_private.scans
            (user_id,status,result_mode,input_kind,client_image_id,result_item_id,predicted_class,confidence,model_name)
            values (:uid,:status,'model',:kind,:image,:item,:class,:confidence,:model) returning id""",
            uid=actor.user_id,
            status=claims["status"],
            kind=body.input_kind,
            image=body.client_image_id,
            item=item["id"] if item else None,
            **{"class": claims["class"], "confidence": claims["confidence"], "model": claims["model"]},
        )
        assert record is not None
        return dict(read_scan(db, actor.user_id, record["id"]))

    return idempotent(db, actor.user_id, "scan_create", key, body.model_dump(), effect)


@router.get("/scans/{id}", response_model=ScanResult, operation_id="scan_get")
def scan_get(id: UUID, db: DB, actor: User) -> Any:
    return read_scan(db, actor.user_id, id)
