"""Bounded, resumable private media. PostgreSQL stores bytes durably with metadata.

Every content read rechecks post ACL; no bearer token or public bucket URL is issued.
"""

import base64
import binascii
import hashlib
import io
import re
import warnings
import wave
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

import av
from fastapi import APIRouter, Depends, Header, Response
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import Field
from sqlalchemy.orm import Session
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .catalog import DB, Cursor, Limit
from .common import not_found, page
from .conversation_access import CONVERSATION_ACCESS
from .db import one, rows, run
from .errors import APIError
from .post_access import POST_ACCESS
from .schemas import MediaAsset, Model, Page
from .security import Actor, current_actor, optional_actor

router = APIRouter(prefix="/v1", tags=["media"])
User = Annotated[Actor, Depends(current_actor)]
OptionalUser = Annotated[Actor | None, Depends(optional_actor)]
PART_SIZE = 262144
MAX_SIZE = 20971520
MAX_PIXELS = 16000000
OWNER_QUOTA = 104857600
ASSET_COLUMNS = """a.id,a.user_id,a.client_upload_id,a.kind,a.file_name,a.mime_type,a.expected_size,
  a.size,a.sha256,a.width,a.height,a.duration_ms,a.completed_at,a.created_at"""


class MediaBodyLimit:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or not scope["path"].startswith("/v1/media-assets")
            or scope["method"] not in ("POST", "PUT")
        ):
            await self.app(scope, receive, send)
            return
        messages: list[Message] = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > 400000:
                response = JSONResponse(
                    {
                        "error": {
                            "code": "MEDIA_REQUEST_TOO_LARGE",
                            "message": "Mỗi phần tải lên vượt giới hạn dữ liệu.",
                            "retryable": False,
                            "requestId": scope.get("state", {}).get("request_id", ""),
                        }
                    },
                    status_code=413,
                )
                await response(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break
        position = 0

        async def replay() -> Message:
            nonlocal position
            if position < len(messages):
                result = messages[position]
                position += 1
                return result
            return await receive()

        await self.app(scope, replay, send)


class UploadRequest(Model):
    client_upload_id: UUID
    kind: Literal["image", "video", "audio", "file"]
    file_name: str = Field(min_length=1, max_length=180)
    mime_type: str = Field(max_length=120)
    size: int = Field(ge=1, le=MAX_SIZE)


class UploadState(Model):
    id: UUID
    completed: bool
    received_parts: list[int]
    part_size: int = PART_SIZE
    asset: MediaAsset | None = None


class UploadPart(Model):
    data: str = Field(min_length=4, max_length=349528)


def owned_asset(id: UUID, db: Session, actor: Actor) -> Any:
    asset = one(
        db,
        f"select {ASSET_COLUMNS} from app_private.media_assets a where a.id=:id and a.user_id=:uid for update",
        id=id,
        uid=actor.user_id,
    )
    if not asset:
        raise not_found()
    return asset


def asset_summary(asset: Any) -> MediaAsset:
    return MediaAsset(
        id=asset["id"],
        kind=asset["kind"],
        file_name=asset["file_name"],
        mime_type=asset["mime_type"],
        size=asset["size"],
        width=asset["width"],
        height=asset["height"],
        duration_ms=asset["duration_ms"],
    )


def upload_state(asset: Any, db: Session) -> UploadState:
    return UploadState(
        id=asset["id"],
        completed=bool(asset["completed_at"]),
        received_parts=[
            part["part"]
            for part in rows(
                db, "select part from app_private.media_chunks where asset_id=:id order by part", id=asset["id"]
            )
        ],
        asset=asset_summary(asset) if asset["completed_at"] else None,
    )


@router.post("/media-assets", response_model=UploadState, operation_id="media_upload_create")
def upload_create(body: UploadRequest, db: DB, actor: User) -> Any:
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key="media-quota:" + str(actor.user_id))
    existing = one(
        db,
        "select * from app_private.media_assets where user_id=:uid and client_upload_id=:client",
        uid=actor.user_id,
        client=body.client_upload_id,
    )
    name = re.sub(r"[\x00-\x1f/\\]", "_", body.file_name).strip() or "attachment"
    if existing:
        if (existing["kind"], existing["expected_size"], existing["file_name"]) != (body.kind, body.size, name):
            raise APIError(409, "UPLOAD_CONFLICT", "Mã tải lên đã được dùng cho tệp khác.")
        return upload_state(existing, db)
    used = one(
        db,
        """select coalesce(sum(greatest(expected_size,coalesce(size,0))),0) as bytes,count(*) as count
        from app_private.media_assets where user_id=:uid""",
        uid=actor.user_id,
    )
    assert used is not None
    if used["bytes"] + body.size > OWNER_QUOTA or used["count"] >= 500:
        raise APIError(409, "MEDIA_QUOTA", "Đã đạt dung lượng tệp 100 MB. Hãy xóa tệp không còn dùng.")
    asset = one(
        db,
        """insert into app_private.media_assets(id,user_id,client_upload_id,kind,file_name,mime_type,expected_size)
      values (:id,:uid,:client,:kind,:name,:mime,:size) returning *""",
        id=uuid4(),
        uid=actor.user_id,
        client=body.client_upload_id,
        kind=body.kind,
        name=name,
        mime=body.mime_type,
        size=body.size,
    )
    return upload_state(asset, db)


@router.get("/media-assets/{id}/upload", response_model=UploadState, operation_id="media_upload_get")
def upload_get(id: UUID, db: DB, actor: User) -> Any:
    return upload_state(owned_asset(id, db, actor), db)


@router.put("/media-assets/{id}/parts/{part}", response_model=UploadState, operation_id="media_upload_part")
def upload_part(id: UUID, part: int, body: UploadPart, db: DB, actor: User) -> Any:
    asset = owned_asset(id, db, actor)
    if asset["completed_at"]:
        raise APIError(409, "UPLOAD_COMPLETE", "Tệp đã hoàn tất, không thể thay nội dung.")
    if not 0 <= part < (asset["expected_size"] + PART_SIZE - 1) // PART_SIZE:
        raise APIError(422, "UPLOAD_PART", "Số thứ tự phần tải lên không hợp lệ.")
    try:
        data = base64.b64decode(body.data, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise APIError(422, "UPLOAD_DATA", "Dữ liệu tải lên không hợp lệ.") from exc
    expected = min(PART_SIZE, asset["expected_size"] - part * PART_SIZE)
    if len(data) != expected:
        raise APIError(422, "UPLOAD_SIZE", "Kích thước phần tải lên không khớp.")
    prior = one(db, "select content from app_private.media_chunks where asset_id=:id and part=:part", id=id, part=part)
    if prior:
        if bytes(prior["content"]) != data:
            raise APIError(409, "UPLOAD_PART_CONFLICT", "Phần này đã có dữ liệu khác.")
    else:
        run(
            db,
            "insert into app_private.media_chunks(asset_id,part,content) values (:id,:part,:data)",
            id=id,
            part=part,
            data=data,
        )
    return upload_state(asset, db)


def normalize_image(data: bytes) -> tuple[bytes, str, int, int]:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.width * source.height > MAX_PIXELS or source.format not in ("JPEG", "PNG", "WEBP", "GIF"):
                    raise ValueError("Image dimensions/format")
                source.verify()
            with Image.open(io.BytesIO(data)) as source:
                image = ImageOps.exif_transpose(source)
                width, height = image.size
                output = io.BytesIO()
                # Fresh pixels remove EXIF, GPS and embedded metadata. Animated images use frame 1.
                if "A" in image.getbands() or "transparency" in source.info:
                    clean = Image.new("RGBA", image.size)
                    clean.paste(image.convert("RGBA"))
                    clean.save(output, format="PNG")
                    mime = "image/png"
                else:
                    clean = Image.new("RGB", image.size)
                    clean.paste(image.convert("RGB"))
                    clean.save(output, format="JPEG", quality=90)
                    mime = "image/jpeg"
                return output.getvalue(), mime, width, height
    except (
        OSError,
        ValueError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise APIError(
            422, "INVALID_IMAGE", "Ảnh không hợp lệ hoặc vượt 16 triệu điểm ảnh. Dùng JPEG, PNG, WebP hoặc GIF."
        ) from exc


def normalize_video(data: bytes) -> tuple[bytes, str, int, int]:
    if len(data) >= 16 and data[4:8] == b"ftyp":
        format = "mov"
        output_format = "mov" if data[8:12] == b"qt  " else "mp4"
        mime = "video/quicktime" if output_format == "mov" else "video/mp4"
    elif data.startswith(b"\x1a\x45\xdf\xa3"):
        format, output_format, mime = "matroska", "webm", "video/webm"
    else:
        raise APIError(422, "INVALID_VIDEO", "Dùng video MP4, MOV hoặc WebM hợp lệ.")
    options = {"enable_drefs": "0", "protocol_whitelist": "pipe"}
    try:
        with av.open(io.BytesIO(data), mode="r", format=format, options=options) as container:
            if not container.streams.video:
                raise ValueError("No video stream")
            stream = container.streams.video[0]
            if not stream.width or not stream.height or stream.width * stream.height > MAX_PIXELS:
                raise ValueError("Video dimensions")
            frame = next(container.decode(video=0))
            width, height, rotation = frame.width, frame.height, frame.rotation
        output = io.BytesIO()
        with av.open(io.BytesIO(data), mode="r", format=format, options=options) as source:
            with av.open(output, "w", format=output_format) as target:
                # Keep one video/audio pair and orientation, without location/camera metadata or other tracks.
                mapping: dict[int, Any] = {}
                for item in [source.streams.video[0], *list(source.streams.audio[:1])]:
                    copied = target.add_stream_from_template(item)
                    copied.metadata.clear()
                    if isinstance(copied, av.video.stream.VideoStream) and rotation:
                        copied.set_display_rotation(rotation)
                    mapping[item.index] = copied
                for packet in source.demux():
                    if packet.dts is None or packet.stream.index not in mapping:
                        continue
                    packet.stream = mapping[packet.stream.index]
                    target.mux(packet)
        return output.getvalue(), mime, width, height
    except (av.error.FFmpegError, ValueError, OSError, StopIteration, OverflowError) as exc:
        raise APIError(
            422, "INVALID_VIDEO", "Video không đọc được hoặc vượt 16 triệu điểm ảnh. Dùng MP4, MOV hoặc WebM hợp lệ."
        ) from exc


def normalize_audio(data: bytes) -> tuple[bytes, int]:
    """Decode bounded real samples, discard metadata, normalize to 16 kHz mono PCM WAV."""
    if data.startswith(b"RIFF") and data[8:12] == b"WAVE":
        format = "wav"
    elif len(data) >= 16 and data[4:8] == b"ftyp":
        format = "mov"
    elif data.startswith(b"\x1a\x45\xdf\xa3"):
        format = "matroska"
    elif data.startswith(b"OggS"):
        format = "ogg"
    elif data.startswith(b"ID3") or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        format = "mp3"
    else:
        raise APIError(422, "INVALID_AUDIO", "Dùng bản ghi WAV, M4A, WebM, Ogg hoặc MP3 hợp lệ.")
    try:
        samples, chunks = 0, []
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        with av.open(
            io.BytesIO(data), "r", format=format, options={"protocol_whitelist": "pipe", "enable_drefs": "0"}
        ) as source:
            if not source.streams.audio or source.streams.video:
                raise ValueError("Expected an audio-only recording")
            for frame in source.decode(audio=0):
                for converted in resampler.resample(frame):
                    samples += converted.samples
                    if samples > 1920000:
                        raise ValueError("Recording exceeds 120 seconds")
                    chunks.append(bytes(converted.planes[0])[: converted.samples * 2])
            for converted in resampler.resample(None):
                samples += converted.samples
                chunks.append(bytes(converted.planes[0])[: converted.samples * 2])
        if not 0 < samples <= 1920000:
            raise ValueError("Empty or overlong recording")
        output = io.BytesIO()
        with wave.open(output, "wb") as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(16000)
            target.writeframes(b"".join(chunks))
        return output.getvalue(), max(1, (samples * 1000 + 15999) // 16000)
    except (av.error.FFmpegError, ValueError, OSError, OverflowError) as exc:
        raise APIError(422, "INVALID_AUDIO", "Bản ghi không đọc được hoặc vượt 2 phút.") from exc


@router.post("/media-assets/{id}/complete", response_model=MediaAsset, operation_id="media_upload_complete")
def upload_complete(id: UUID, db: DB, actor: User) -> Any:
    asset = owned_asset(id, db, actor)
    if asset["completed_at"]:
        return asset_summary(asset)
    parts = rows(db, "select part,content from app_private.media_chunks where asset_id=:id order by part", id=id)
    count = (asset["expected_size"] + PART_SIZE - 1) // PART_SIZE
    if [entry["part"] for entry in parts] != list(range(count)):
        raise APIError(409, "UPLOAD_INCOMPLETE", "Chưa tải đủ các phần của tệp.")
    data = b"".join(bytes(entry["content"]) for entry in parts)
    width, height, duration_ms = None, None, None
    mime = "application/octet-stream"
    if asset["kind"] == "image":
        data, mime, width, height = normalize_image(data)
    elif asset["kind"] == "video":
        data, mime, width, height = normalize_video(data)
    elif asset["kind"] == "audio":
        data, duration_ms = normalize_audio(data)
        mime = "audio/wav"
    if len(data) > MAX_SIZE:
        raise APIError(422, "MEDIA_TOO_LARGE", "Tệp sau xử lý vượt giới hạn 20 MB.")
    run(db, "select pg_advisory_xact_lock(hashtextextended(:key,0))", key="media-quota:" + str(actor.user_id))
    used = one(
        db,
        """select coalesce(sum(greatest(expected_size,coalesce(size,0))),0) as bytes
      from app_private.media_assets where user_id=:uid and id<>:id""",
        uid=actor.user_id,
        id=id,
    )
    assert used is not None
    if used["bytes"] + max(len(data), asset["expected_size"]) > OWNER_QUOTA:
        raise APIError(409, "MEDIA_QUOTA", "Tệp sau xử lý vượt dung lượng còn lại. Xóa tệp không còn dùng rồi thử lại.")
    completed = one(
        db,
        """update app_private.media_assets set content=:data,size=:size,mime_type=:mime,
      width=:width,height=:height,duration_ms=:duration,sha256=:sha,completed_at=now() where id=:id returning *""",
        data=data,
        size=len(data),
        mime=mime,
        width=width,
        height=height,
        duration=duration_ms,
        sha=hashlib.sha256(data).hexdigest(),
        id=id,
    )
    run(db, "delete from app_private.media_chunks where asset_id=:id", id=id)
    return asset_summary(completed)


def readable_asset(id: UUID, db: Session, actor: Actor | None, *, include_content: bool = False) -> Any:
    result = one(
        db,
        f"""select {ASSET_COLUMNS}{",a.content" if include_content else ""}
        from app_private.media_assets a join app_private.users owner
      on owner.id=a.user_id and owner.status='active' where a.id=:id and a.completed_at is not null and
      (a.user_id=cast(:viewer as uuid) or exists(select 1 from app_private.post_media pm
        join app_private.posts p on p.id=pm.post_id join app_private.users author on author.id=p.user_id
        where pm.asset_id=a.id and {POST_ACCESS}) or exists(
        select 1 from app_private.message_media mm join app_private.messages m on m.id=mm.message_id
        join app_private.conversations c on c.id=m.conversation_id
        where mm.asset_id=a.id and {CONVERSATION_ACCESS}) or exists(
        select 1 from app_private.point_proposal_media pm
        join app_private.point_proposals proposal on proposal.id=pm.proposal_id
        join app_private.collection_points published_point on published_point.id=proposal.published_point_id
        where pm.asset_id=a.id and a.kind='image' and proposal.state='approved'
          and proposal.publish_photos and published_point.published and not published_point.synthetic) or (
        exists(select 1 from app_private.user_roles r where r.user_id=cast(:viewer as uuid) and r.role='moderator')
        and (exists(select 1 from app_private.point_proposal_media pm join app_private.point_proposals p
          on p.id=pm.proposal_id where pm.asset_id=a.id and p.state<>'draft')
          or exists(select 1 from app_private.point_report_media rm where rm.asset_id=a.id))))""",
        id=id,
        viewer=actor.user_id if actor else None,
    )
    if not result:
        raise not_found()
    return result


@router.get("/media-assets/{id}", response_model=MediaAsset, operation_id="media_asset_get")
def media_get(id: UUID, db: DB, actor: OptionalUser) -> Any:
    return asset_summary(readable_asset(id, db, actor))


@router.get(
    "/media-assets/{id}/content",
    operation_id="media_content_get",
    response_class=Response,
    responses={200: {"content": {"application/octet-stream": {}}}, 206: {"description": "Byte range"}},
)
def content_get(
    id: UUID,
    db: DB,
    actor: OptionalUser,
    byte_range: Annotated[str | None, Header(alias="Range", max_length=100)] = None,
) -> Response:
    asset = readable_asset(id, db, actor, include_content=True)
    data = bytes(asset["content"])
    headers = {
        "Cache-Control": "private, no-store",
        "Vary": "Authorization",
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
    }
    if asset["kind"] == "file":
        from urllib.parse import quote

        headers["Content-Disposition"] = "attachment; filename*=UTF-8''" + quote(asset["file_name"], safe="")
    status = 200
    if byte_range:
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", byte_range)
        if not match or not any(match.groups()):
            raise APIError(416, "INVALID_RANGE", "Khoảng đọc tệp không hợp lệ.")
        first, last = match.groups()
        start = int(first) if first else max(0, len(data) - int(last))
        end = min(int(last), len(data) - 1) if first and last else len(data) - 1
        if start > end or start >= len(data):
            raise APIError(416, "INVALID_RANGE", "Khoảng đọc tệp không hợp lệ.")
        headers["Content-Range"] = f"bytes {start}-{end}/{len(data)}"
        data, status = data[start : end + 1], 206
    return Response(content=data, status_code=status, media_type=asset["mime_type"], headers=headers)


def validate_attachments(db: Session, actor: Actor, ids: list[UUID]) -> None:
    for id in sorted(ids, key=str):
        asset = owned_asset(id, db, actor)
        if not asset["completed_at"]:
            raise APIError(409, "UPLOAD_INCOMPLETE", "Tệp đính kèm chưa tải xong.")


def bind_attachments(db: Session, actor: Actor, post_id: UUID, ids: list[UUID]) -> None:
    validate_attachments(db, actor, ids)
    run(db, "delete from app_private.post_media where post_id=:id", id=post_id)
    for position, id in enumerate(ids):
        run(
            db,
            "insert into app_private.post_media(post_id,asset_id,position) values (:post,:asset,:position)",
            post=post_id,
            asset=id,
            position=position,
        )


@router.delete("/media-assets/{id}", status_code=204, operation_id="media_asset_delete")
def media_delete(id: UUID, db: DB, actor: User) -> Response:
    owned_asset(id, db, actor)
    if one(
        db,
        """select 1 from app_private.post_media where asset_id=:id union all
      select 1 from app_private.message_media where asset_id=:id union all
      select 1 from app_private.point_proposal_media where asset_id=:id union all
      select 1 from app_private.point_report_media where asset_id=:id union all
      select 1 from app_private.post_drafts where user_id=:uid
        and content->'mediaIds' @> cast(:ids as jsonb) limit 1""",
        id=id,
        uid=actor.user_id,
        ids='["' + str(id) + '"]',
    ):
        raise APIError(409, "MEDIA_IN_USE", "Tệp đang được dùng trong nội dung, bản nháp hoặc bằng chứng thu gom.")
    run(db, "delete from app_private.media_assets where id=:id and user_id=:uid", id=id, uid=actor.user_id)
    return Response(status_code=204)


class MediaLibraryItem(MediaAsset):
    completed: bool
    in_use: bool
    created_at: datetime


@router.get("/me/media-assets", response_model=Page[MediaLibraryItem], operation_id="media_library_list")
def media_library(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    return page(
        db,
        f"media-library:{actor.user_id}",
        """select a.id,a.kind,a.file_name,a.mime_type,
      coalesce(a.size,a.expected_size) as size,a.width,a.height,a.duration_ms,a.completed_at is not null as completed,
      a.created_at,(exists(select 1 from app_private.post_media pm where pm.asset_id=a.id) or
      exists(select 1 from app_private.message_media mm where mm.asset_id=a.id) or
      exists(select 1 from app_private.point_proposal_media pm where pm.asset_id=a.id) or
      exists(select 1 from app_private.point_report_media rm where rm.asset_id=a.id) or
      exists(select 1 from app_private.post_drafts d where d.user_id=:uid and d.content->'mediaIds'
      @> jsonb_build_array(a.id::text))) as in_use from app_private.media_assets a where a.user_id=:uid""",
        {"uid": actor.user_id},
        cursor=cursor,
        limit=limit,
    )
