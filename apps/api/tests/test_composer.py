import base64
import io
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import Engine, text

from bluesteps_api.media import MAX_SIZE, PART_SIZE

from .media_fixture import video_bytes
from .test_community import post

pytestmark = pytest.mark.postgres


@pytest.mark.parametrize("format", ["webm", "mp4"])
def test_video_decodes_real_frames_and_removes_metadata(client: TestClient, users: dict[str, Any], format: str) -> None:
    import av

    alice = users["alice"]
    asset = upload(client, alice, video_bytes(format), "video")
    assert (asset["width"], asset["height"]) == (160, 120)
    response = client.get(f"/v1/media-assets/{asset['id']}/content", headers=alice["headers"])
    with av.open(io.BytesIO(response.content)) as video:
        assert video.metadata.get("title") is None
        assert len(list(video.decode(video=0))) == 5


def picture() -> bytes:
    stream = io.BytesIO()
    image = Image.new("RGB", (16, 12), "green")
    exif = Image.Exif()
    exif[315] = "private camera metadata"
    image.save(stream, format="JPEG", exif=exif)
    return stream.getvalue()


def start(client: TestClient, user: dict[str, Any], data: bytes, kind: str = "image") -> str:
    response = client.post(
        "/v1/media-assets",
        headers=user["headers"],
        json={
            "clientUploadId": str(uuid4()),
            "fileName": "photo.jpg",
            "kind": kind,
            "mimeType": "image/jpeg",
            "size": len(data),
        },
    )
    assert response.status_code == 200, response.text
    return str(response.json()["id"])


def upload(client: TestClient, user: dict[str, Any], data: bytes | None = None, kind: str = "image") -> dict[str, Any]:
    data = data if data is not None else picture()
    id = start(client, user, data, kind)
    for part, offset in enumerate(range(0, len(data), PART_SIZE)):
        response = client.put(
            f"/v1/media-assets/{id}/parts/{part}",
            headers=user["headers"],
            json={"data": base64.b64encode(data[offset : offset + PART_SIZE]).decode()},
        )
        assert response.status_code == 200, response.text
    result = client.post(f"/v1/media-assets/{id}/complete", headers=user["headers"])
    assert result.status_code == 200, result.text
    return dict(result.json())


def test_image_storage_is_private_durable_normalized_and_strips_metadata(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    asset = upload(client, alice)
    url = f"/v1/media-assets/{asset['id']}/content"
    assert client.get(url).status_code == 404
    assert client.get(url, headers=bob["headers"]).status_code == 404
    response = client.get(url, headers=alice["headers"])
    assert response.status_code == 200
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["content-type"] == "image/jpeg"
    with Image.open(io.BytesIO(response.content)) as image:
        assert image.size == (16, 12) and not image.getexif()
    assert client.get("/v1/me/media-assets", headers=bob["headers"]).json()["items"] == []
    library = client.get("/v1/me/media-assets", headers=alice["headers"]).json()["items"][0]
    assert library["completed"] and not library["inUse"]
    with owner.connect() as db:
        result = db.execute(
            text("select content,size,sha256 from app_private.media_assets where id=:id"), {"id": asset["id"]}
        ).one()
        assert (
            bytes(result.content) == response.content
            and result.size == len(response.content)
            and len(result.sha256) == 64
        )
        assert db.execute(text("select count(*) from app_private.media_chunks")).scalar_one() == 0


def test_resumable_chunks_are_owned_bounded_immutable_and_finalization_is_idempotent(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"], users["bob"]
    data = b"x" * (PART_SIZE + 12)
    id = start(client, alice, data, "file")
    url = f"/v1/media-assets/{id}"
    chunk = {"data": base64.b64encode(data[:PART_SIZE]).decode()}
    assert client.put(url + "/parts/0", headers=bob["headers"], json=chunk).status_code == 404
    assert client.post(url + "/complete", headers=alice["headers"]).status_code == 409
    for _ in range(2):
        assert client.put(url + "/parts/0", headers=alice["headers"], json=chunk).status_code == 200
    assert client.get(url + "/upload", headers=alice["headers"]).json()["receivedParts"] == [0]
    assert (
        client.put(
            url + "/parts/0", headers=alice["headers"], json={"data": base64.b64encode(b"y" * PART_SIZE).decode()}
        ).status_code
        == 409
    )
    assert client.put(url + "/parts/2", headers=alice["headers"], json={"data": "eA=="}).status_code == 422
    assert client.put(url + "/parts/1", headers=alice["headers"], json={"data": "eA=="}).status_code == 422
    assert (
        client.put(
            url + "/parts/1", headers=alice["headers"], json={"data": base64.b64encode(data[PART_SIZE:]).decode()}
        ).status_code
        == 200
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: client.post(url + "/complete", headers=alice["headers"]), range(2)))
    assert [r.status_code for r in results] == [200, 200] and results[0].json() == results[1].json()
    assert client.put(url + "/parts/0", headers=alice["headers"], json=chunk).status_code == 409
    assert client.get(url + "/content", headers=alice["headers"]).content == data
    assert "attachment;" in client.get(url + "/content", headers=alice["headers"]).headers["content-disposition"]
    assert client.get(url + "/content", headers={**alice["headers"], "Range": "bytes=1-5"}).content == b"xxxxx"
    assert client.get(url + "/content", headers={**alice["headers"], "Range": "bytes=-4"}).content == b"xxxx"
    assert client.get(url + "/content", headers={**alice["headers"], "Range": "bytes=99999999-"}).status_code == 416


def test_media_post_visibility_changes_apply_to_binary_urls_and_foreign_attachments_roll_back(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    asset = upload(client, alice)
    entry = post(client, alice, body="", mediaIds=[asset["id"]], visibility="public")
    url = f"/v1/media-assets/{asset['id']}/content"
    assert entry["media"][0]["id"] == asset["id"] and client.get(url).status_code == 200
    failed = client.post(
        "/v1/posts",
        headers={**bob["headers"], "Idempotency-Key": str(uuid4())},
        json={"body": "foreign", "mediaIds": [asset["id"]]},
    )
    assert failed.status_code == 404
    assert client.delete(f"/v1/media-assets/{asset['id']}", headers=alice["headers"]).status_code == 409
    changed = client.patch(
        f"/v1/posts/{entry['id']}",
        headers=alice["headers"],
        json={"body": "edited", "visibility": "private", "expectedVersion": 1},
    )
    assert changed.status_code == 200 and changed.json()["media"][0]["id"] == asset["id"]
    edited = client.patch(
        f"/v1/posts/{entry['id']}",
        headers=alice["headers"],
        json={"body": "Text edit without changing audience", "expectedVersion": 2},
    )
    assert edited.status_code == 200 and edited.json()["visibility"] == "private"
    assert client.get(url).status_code == 404 and client.get(url, headers=bob["headers"]).status_code == 404
    assert client.delete(f"/v1/posts/{entry['id']}", headers=alice["headers"]).status_code == 204
    assert client.delete(f"/v1/media-assets/{asset['id']}", headers=alice["headers"]).status_code == 204
    assert client.get(url, headers=alice["headers"]).status_code == 404
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.posts where body='foreign'")).scalar_one() == 0


def test_friends_require_explicit_acceptance_and_media_follows_the_same_acl(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob, eve = (users[name] for name in ("alice", "bob", "eve"))
    asset = upload(client, alice)
    entry = post(client, alice, visibility="friends", mediaIds=[asset["id"]])
    url = f"/v1/posts/{entry['id']}"
    content = f"/v1/media-assets/{asset['id']}/content"
    client.put(f"/v1/me/followed-members/{alice['id']}", headers=bob["headers"])
    assert client.get(url, headers=bob["headers"]).status_code == 404
    assert (
        client.put(f"/v1/me/friend-requests/{bob['id']}", headers=alice["headers"]).json()["friendship"] == "outgoing"
    )
    assert client.get("/v1/me/friends?state=incoming", headers=bob["headers"]).json()["items"][0]["id"] == alice["id"]
    # A reciprocal invitation does not silently approve the existing request.
    assert (
        client.put(f"/v1/me/friend-requests/{alice['id']}", headers=bob["headers"]).json()["friendship"] == "incoming"
    )
    assert client.get(url, headers=bob["headers"]).status_code == 404
    assert client.put(f"/v1/me/friends/{bob['id']}", headers=alice["headers"]).status_code == 404
    for _ in range(2):
        assert client.put(f"/v1/me/friends/{alice['id']}", headers=bob["headers"]).json()["friendship"] == "friends"
    assert client.get(url, headers=bob["headers"]).status_code == 200
    assert client.get(content, headers=bob["headers"]).status_code == 200
    assert client.get(content, headers=eve["headers"]).status_code == 404
    assert client.get(f"/v1/community/members/{alice['id']}", headers=bob["headers"]).json()["postCount"] == 1
    assert client.get(f"/v1/community/members/{alice['id']}").json()["postCount"] == 0
    client.put(f"/v1/me/blocks/{alice['id']}", headers=bob["headers"])
    assert client.get(content, headers=bob["headers"]).status_code == 404
    assert client.get("/v1/me/friends", headers=alice["headers"]).json()["items"] == []
    client.delete(f"/v1/me/blocks/{alice['id']}", headers=bob["headers"])
    assert client.get(url, headers=bob["headers"]).status_code == 404


def test_draft_version_ownership_publish_cleanup_and_location_source(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    asset = upload(client, alice)
    point = client.get("/v1/collection-points").json()["items"][0]
    content = {
        "body": "Nháp thật",
        "visibility": "friends",
        "emotion": "happy",
        "mediaIds": [asset["id"]],
        "place": {"name": "spoof", "pointId": point["id"]},
    }
    assert client.get("/v1/me/post-draft", headers=alice["headers"]).json()["version"] == 0
    result = client.put("/v1/me/post-draft", headers=alice["headers"], json={"content": content, "expectedVersion": 0})
    assert result.status_code == 200, result.text
    assert result.json()["content"]["place"]["name"] == point["name"]
    assert client.get("/v1/me/post-draft", headers=bob["headers"]).json()["version"] == 0
    assert (
        client.put(
            "/v1/me/post-draft", headers=alice["headers"], json={"content": content, "expectedVersion": 0}
        ).status_code
        == 409
    )
    assert client.delete(f"/v1/media-assets/{asset['id']}", headers=alice["headers"]).status_code == 409
    saved_version = result.json()["version"]
    entry = post(client, alice, **content, draftVersion=saved_version)
    assert entry["emotion"] == "happy" and entry["place"]["name"] == point["name"]
    assert client.get("/v1/me/post-draft", headers=alice["headers"]).json()["version"] == 0
    # Publishing an older tab must not erase a newer draft.
    first = client.put(
        "/v1/me/post-draft",
        headers=alice["headers"],
        json={"content": {"body": "first"}, "expectedVersion": 0},
    ).json()
    assert first["version"] > saved_version
    client.put(
        "/v1/me/post-draft",
        headers=alice["headers"],
        json={"content": {"body": "newer"}, "expectedVersion": first["version"]},
    )
    post(client, alice, body="first", draftVersion=first["version"])
    assert client.get("/v1/me/post-draft", headers=alice["headers"]).json()["content"]["body"] == "newer"
    assert (
        client.delete(
            f"/v1/me/post-draft?expected_version={first['version']}",
            headers=alice["headers"],
        ).status_code
        == 409
    )
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0


def test_recreated_draft_rejects_an_older_tab_and_old_publish_cannot_erase_it(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice = users["alice"]
    first = client.put(
        "/v1/me/post-draft",
        headers=alice["headers"],
        json={"content": {"body": "First draft"}, "expectedVersion": 0},
    ).json()
    assert (
        client.delete(
            f"/v1/me/post-draft?expected_version={first['version']}",
            headers=alice["headers"],
        ).status_code
        == 204
    )
    second = client.put(
        "/v1/me/post-draft",
        headers=alice["headers"],
        json={"content": {"body": "New draft after deletion"}, "expectedVersion": 0},
    ).json()
    assert second["version"] > first["version"]
    assert (
        client.put(
            "/v1/me/post-draft",
            headers=alice["headers"],
            json={"content": {"body": "Old tab"}, "expectedVersion": first["version"]},
        ).status_code
        == 409
    )
    assert (
        client.delete(
            f"/v1/me/post-draft?expected_version={first['version']}",
            headers=alice["headers"],
        ).status_code
        == 409
    )
    post(client, alice, body="Old tab published", draftVersion=first["version"])
    restored = client.get("/v1/me/post-draft", headers=alice["headers"]).json()
    assert restored["content"]["body"] == "New draft after deletion"
    assert restored["version"] == second["version"]


def test_invalid_images_and_incomplete_or_duplicate_attachments_are_rejected(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice = users["alice"]
    oversized = client.post(
        "/v1/media-assets", headers={**alice["headers"], "Content-Type": "application/json"}, content=b" " * 400001
    )
    assert oversized.status_code == 413 and oversized.json()["error"]["code"] == "MEDIA_REQUEST_TOO_LARGE"
    id = start(client, alice, b"<html>unsafe</html>")
    client.put(
        f"/v1/media-assets/{id}/parts/0",
        headers=alice["headers"],
        json={"data": base64.b64encode(b"<html>unsafe</html>").decode()},
    )
    assert client.post(f"/v1/media-assets/{id}/complete", headers=alice["headers"]).status_code == 422
    response = client.post(
        "/v1/posts",
        headers={**alice["headers"], "Idempotency-Key": str(uuid4())},
        json={"body": "test", "mediaIds": [id]},
    )
    assert response.status_code == 409
    assert (
        client.post("/v1/posts", headers=alice["headers"], json={"body": "x", "mediaIds": [id, id]}).status_code == 422
    )
    assert (
        client.post("/v1/posts", headers=alice["headers"], json={"body": "x", "emotion": "unknown"}).status_code == 422
    )


def test_upload_quota_is_reserved_before_bytes_and_delete_releases_it(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice = users["alice"]

    def reserve() -> Any:
        return client.post(
            "/v1/media-assets",
            headers=alice["headers"],
            json={
                "clientUploadId": str(uuid4()),
                "kind": "file",
                "fileName": "large.bin",
                "mimeType": "application/octet-stream",
                "size": MAX_SIZE,
            },
        )

    ids = [reserve().json()["id"] for _ in range(5)]
    assert reserve().status_code == 409
    assert client.delete(f"/v1/media-assets/{ids[0]}", headers=alice["headers"]).status_code == 204
    assert reserve().status_code == 200
