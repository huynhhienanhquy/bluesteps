import base64
import io
import math
import struct
import wave
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import av
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from .test_composer import start, upload

pytestmark = pytest.mark.postgres


def audio_bytes(seconds: float = 0.5) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(16000)
        target.writeframes(
            b"".join(
                struct.pack("<h", int(5000 * math.sin(i * 2 * math.pi * 440 / 16000)))
                for i in range(int(seconds * 16000))
            )
        )
    return output.getvalue()


def conversation(client: TestClient, users: dict[str, Any]) -> str:
    result = client.post(
        "/v1/conversations", headers=users["alice"]["headers"], json={"recipientId": users["bob"]["id"]}
    )
    assert result.status_code == 201, result.text
    return str(result.json()["id"])


def test_message_files_are_atomic_idempotent_private_and_revoked_by_block(
    client: TestClient,
    users: dict[str, Any],
    owner: Engine,
) -> None:
    alice, bob, eve = (users[n] for n in ("alice", "bob", "eve"))
    id = conversation(client, users)
    image = upload(client, alice)
    file = upload(client, alice, b"Private chat attachment", "file")
    foreign = upload(client, eve)
    url = f"/v1/media-assets/{image['id']}/content"
    assert client.get(url, headers=bob["headers"]).status_code == 404
    request = {"clientMessageId": str(uuid4()), "text": "", "mediaIds": [image["id"], file["id"]]}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: client.post(f"/v1/conversations/{id}/messages", headers=alice["headers"], json=request),
                range(2),
            )
        )
    assert all(r.status_code == 201 for r in results), [r.text for r in results]
    assert results[0].json() == results[1].json()
    assert [a["id"] for a in results[0].json()["media"]] == request["mediaIds"]
    assert client.get(url, headers=bob["headers"]).status_code == 200
    assert client.get(url, headers=eve["headers"]).status_code == 404
    assert client.get(url).status_code == 404
    assert client.delete(f"/v1/media-assets/{file['id']}", headers=alice["headers"]).status_code == 409
    library = client.get("/v1/me/media-assets", headers=alice["headers"]).json()["items"]
    assert all(a["inUse"] for a in library)
    assert (
        client.post(
            f"/v1/conversations/{id}/messages",
            headers=alice["headers"],
            json={**request, "mediaIds": list(reversed(request["mediaIds"]))},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/v1/conversations/{id}/messages",
            headers=alice["headers"],
            json={"clientMessageId": str(uuid4()), "mediaIds": [foreign["id"]]},
        ).status_code
        == 404
    )
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.messages")).scalar_one() == 1
        assert db.execute(text("select count(*) from app_private.message_media")).scalar_one() == 2
        assert db.execute(text("select last_sequence from app_private.conversations")).scalar_one() == 1
    client.put(f"/v1/me/blocks/{alice['id']}", headers=bob["headers"])
    assert client.get(url, headers=bob["headers"]).status_code == 404
    assert client.get(f"/v1/conversations/{id}/messages", headers=bob["headers"]).status_code == 404
    assert client.get(url, headers=alice["headers"]).status_code == 200


def test_audio_normalizes_real_samples_and_is_readable_only_after_send(
    client: TestClient,
    users: dict[str, Any],
) -> None:
    alice, bob = users["alice"], users["bob"]
    id = conversation(client, users)
    asset = upload(client, alice, audio_bytes(), "audio")
    assert asset["durationMs"] == 500 and asset["mimeType"] == "audio/wav"
    response = client.post(
        f"/v1/conversations/{id}/messages",
        headers=alice["headers"],
        json={"clientMessageId": str(uuid4()), "mediaIds": [asset["id"]]},
    )
    assert response.status_code == 201, response.text
    data = client.get(f"/v1/media-assets/{asset['id']}/content", headers=bob["headers"])
    assert data.status_code == 200 and data.headers["content-type"] == "audio/wav"
    with wave.open(io.BytesIO(data.content)) as recording:
        assert recording.getnframes() == 8000 and recording.getframerate() == 16000
        assert recording.getnchannels() == 1 and recording.readframes(8000) != bytes(16000)


@pytest.mark.parametrize("format,codec,rate", [("ipod", "aac", 16000), ("webm", "libopus", 48000)])
def test_recording_formats_decode_and_strip_metadata(
    client: TestClient, users: dict[str, Any], format: str, codec: str, rate: int
) -> None:
    output = io.BytesIO()
    with av.open(io.BytesIO(audio_bytes()), "r", format="wav") as source:
        with av.open(output, "w", format=format) as target:
            target.metadata["title"] = "private microphone metadata"
            stream = target.add_stream(codec, rate=rate)
            stream.layout = "mono"
            for frame in source.decode(audio=0):
                for packet in stream.encode(frame):
                    target.mux(packet)
            for packet in stream.encode(None):
                target.mux(packet)
    asset = upload(client, users["alice"], output.getvalue(), "audio")
    assert 400 <= asset["durationMs"] <= 600
    response = client.get(f"/v1/media-assets/{asset['id']}/content", headers=users["alice"]["headers"])
    assert b"private microphone metadata" not in response.content
    with wave.open(io.BytesIO(response.content)) as recording:
        assert recording.getnchannels() == 1 and recording.getframerate() == 16000


@pytest.mark.parametrize("data", [b"not audio", audio_bytes(0), audio_bytes(120.1)])
def test_audio_rejects_invalid_empty_and_overlong_files(client: TestClient, users: dict[str, Any], data: bytes) -> None:
    alice = users["alice"]
    id = start(client, alice, data, "audio")
    from bluesteps_api.media import PART_SIZE

    for part, offset in enumerate(range(0, len(data), PART_SIZE)):
        assert (
            client.put(
                f"/v1/media-assets/{id}/parts/{part}",
                headers=alice["headers"],
                json={"data": base64.b64encode(data[offset : offset + PART_SIZE]).decode()},
            ).status_code
            == 200
        )
    assert client.post(f"/v1/media-assets/{id}/complete", headers=alice["headers"]).status_code == 422


def test_latest_history_and_incremental_messages_do_not_skip_or_duplicate(
    client: TestClient,
    users: dict[str, Any],
) -> None:
    id = conversation(client, users)
    headers = users["alice"]["headers"]
    for i in range(5):
        assert (
            client.post(
                f"/v1/conversations/{id}/messages",
                headers=headers,
                json={"clientMessageId": str(uuid4()), "text": f"message {i}"},
            ).status_code
            == 201
        )
    base = f"/v1/conversations/{id}/messages"
    latest = client.get(base + "?before_sequence=9223372036854775807&limit=2", headers=headers).json()
    assert [m["sequence"] for m in latest["items"]] == [4, 5]
    assert latest["hasMore"] and latest["nextSequence"] == 4
    older = client.get(base + "?before_sequence=4&limit=2", headers=headers).json()
    assert [m["sequence"] for m in older["items"]] == [2, 3]
    new = client.get(base + "?after_sequence=3&limit=2", headers=headers).json()
    assert [m["sequence"] for m in new["items"]] == [4, 5] and not new["hasMore"]
    assert client.post(base, headers=headers, json={"clientMessageId": str(uuid4()), "text": "  "}).status_code == 422
