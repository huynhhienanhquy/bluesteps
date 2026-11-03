from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.postgres


def test_follow_cannot_survive_a_concurrent_block(client: TestClient, users: dict[str, Any], owner: Engine) -> None:
    alice, bob = users["alice"], users["bob"]
    with ThreadPoolExecutor(max_workers=2) as pool:
        following = pool.submit(client.put, f"/v1/me/followed-members/{bob['id']}", headers=alice["headers"])
        blocking = pool.submit(client.put, f"/v1/me/blocks/{alice['id']}", headers=bob["headers"])
        assert blocking.result().status_code == 204
        assert following.result().status_code in (200, 404)
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.member_follows")).scalar_one() == 0


def post(client: TestClient, user: dict[str, Any], **values: Any) -> dict[str, Any]:
    result = client.post(
        "/v1/posts",
        headers={**user["headers"], "Idempotency-Key": str(uuid4())},
        json={"body": "Phân loại mỗi ngày", **values},
    )
    assert result.status_code == 201, result.text
    return dict(result.json())


def test_member_profile_has_only_public_counts_and_no_identity_secrets(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"], users["bob"]
    post(client, bob, topic="Tái chế")
    post(client, bob, visibility="private")
    public = client.get(f"/v1/community/members/{bob['id']}")
    assert public.status_code == 200, public.text
    assert public.json()["postCount"] == 1
    assert set(public.json()) == {
        "id",
        "displayName",
        "bio",
        "createdAt",
        "postCount",
        "followerCount",
        "followingCount",
        "following",
        "friendship",
    }
    assert client.get(f"/v1/community/members/{bob['id']}", headers=bob["headers"]).json()["postCount"] == 2
    assert client.get("/v1/community/members?q=bob", headers=alice["headers"]).json()["items"][0]["id"] == bob["id"]


def test_follows_are_idempotent_private_and_drive_the_feed(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob, eve = (users[name] for name in ("alice", "bob", "eve"))
    visible = post(client, bob)
    post(client, bob, visibility="private")
    post(client, eve)
    path = f"/v1/me/followed-members/{bob['id']}"
    for _ in range(2):
        followed = client.put(path, headers=alice["headers"])
        assert followed.status_code == 200, followed.text
        assert followed.json()["following"] is True and followed.json()["followerCount"] == 1
    assert client.get(path).status_code == 405
    assert client.get("/v1/posts?feed=following").status_code == 401
    assert client.get("/v1/community/members?following=true").status_code == 401
    feed = client.get("/v1/posts?feed=following", headers=alice["headers"]).json()["items"]
    assert [row["id"] for row in feed] == [visible["id"]]
    assert client.get("/v1/posts?feed=following", headers=eve["headers"]).json()["items"] == []
    assert (
        client.get("/v1/community/members?following=true", headers=alice["headers"]).json()["items"][0]["id"]
        == bob["id"]
    )
    assert client.put(f"/v1/me/followed-members/{alice['id']}", headers=alice["headers"]).status_code == 422
    assert client.put(f"/v1/me/followed-members/{uuid4()}", headers=alice["headers"]).status_code == 404
    for _ in range(2):
        assert client.delete(path, headers=alice["headers"]).status_code == 204
    assert client.get("/v1/posts?feed=following", headers=alice["headers"]).json()["items"] == []


def test_block_removes_both_follows_and_hides_member_posts_topics(client: TestClient, users: dict[str, Any]) -> None:
    alice, bob = users["alice"], users["bob"]
    entry = post(client, bob, topic="Chủ đề riêng của Bob")
    client.put(f"/v1/me/followed-members/{bob['id']}", headers=alice["headers"])
    client.put(f"/v1/me/followed-members/{alice['id']}", headers=bob["headers"])
    assert client.put(f"/v1/me/blocks/{bob['id']}", headers=alice["headers"]).status_code == 204
    for viewer, target in [(alice, bob), (bob, alice)]:
        assert client.get(f"/v1/community/members/{target['id']}", headers=viewer["headers"]).status_code == 404
        assert client.put(f"/v1/me/followed-members/{target['id']}", headers=viewer["headers"]).status_code == 404
        assert client.get("/v1/community/members?following=true", headers=viewer["headers"]).json()["items"] == []
    assert client.get(f"/v1/posts/{entry['id']}", headers=alice["headers"]).status_code == 404
    assert client.get("/v1/community/topics", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/community/members?q=bob", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/me/blocked-members", headers=alice["headers"]).json()["items"][0]["id"] == bob["id"]
    assert client.get("/v1/me/blocked-members", headers=bob["headers"]).json()["items"] == []
    client.delete(f"/v1/me/blocks/{bob['id']}", headers=alice["headers"])
    assert client.get(f"/v1/community/members/{bob['id']}", headers=alice["headers"]).json()["following"] is False


def test_hidden_posts_are_personal_reloadable_restorable_and_not_awarded(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    entry = post(client, bob, topic="Tái chế")
    path = f"/v1/me/hidden-posts/{entry['id']}"
    client.put(f"/v1/me/saved-posts/{entry['id']}", headers=alice["headers"])
    for _ in range(2):
        assert client.put(path, headers=alice["headers"]).status_code == 204
    assert client.get("/v1/posts", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/me/saved-posts", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/community/topics", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/me/hidden-posts", headers=bob["headers"]).json()["items"] == []
    assert client.get(f"/v1/posts/{entry['id']}", headers=alice["headers"]).json()["hidden"] is True
    assert len(client.get("/v1/me/hidden-posts", headers=alice["headers"]).json()["items"]) == 1
    for _ in range(2):
        assert client.delete(path, headers=alice["headers"]).status_code == 204
    assert client.get("/v1/me/hidden-posts", headers=alice["headers"]).json()["items"] == []
    assert client.get("/v1/me/saved-posts", headers=alice["headers"]).json()["items"][0]["id"] == entry["id"]
    private = post(client, bob, visibility="private")
    assert client.put(f"/v1/me/hidden-posts/{private['id']}", headers=alice["headers"]).status_code == 404
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0


def test_search_topic_author_filters_apply_before_pagination_with_bound_cursors(
    client: TestClient, users: dict[str, Any]
) -> None:
    alice, bob = users["alice"], users["bob"]
    first = post(client, bob, topic="  Tái chế  ")
    second = post(client, bob, body="Chai nhựa", topic="Tái chế")
    post(client, alice, body="Bài khác", topic="Hoạt động")
    assert first["topic"] == "Tái chế"
    selected = client.get("/v1/posts", params={"topic": "Tái chế", "author_id": bob["id"], "limit": 1}).json()
    assert selected["items"][0]["id"] == second["id"] and selected["nextCursor"]
    next_page = client.get(
        "/v1/posts", params={"topic": "Tái chế", "author_id": bob["id"], "limit": 1, "cursor": selected["nextCursor"]}
    )
    assert [entry["id"] for entry in next_page.json()["items"]] == [first["id"]]
    assert client.get("/v1/posts", params={"topic": "Hoạt động", "cursor": selected["nextCursor"]}).status_code == 400
    assert client.get("/v1/posts?q=Chai").json()["items"][0]["id"] == second["id"]
    topics = client.get("/v1/community/topics?q=Tái").json()["items"]
    assert len(topics) == 1 and topics[0]["postCount"] == 2
    assert post(client, bob, visibility="private", topic="Chỉ tôi")["topic"] == "Chỉ tôi"
    assert client.get("/v1/community/topics?q=Chỉ").json()["items"] == []
    assert client.post("/v1/posts", json={"body": "test", "topic": "  "}, headers=bob["headers"]).status_code == 422
    cursor = client.get("/v1/community/members?limit=1").json()["nextCursor"]
    assert client.get("/v1/community/members", params={"q": "bob", "cursor": cursor}).status_code == 400


def test_topic_update_and_comment_count_respect_blocking_and_inactive_authors(
    client: TestClient, users: dict[str, Any], owner: Engine
) -> None:
    alice, bob = users["alice"], users["bob"]
    entry = post(client, alice, topic="Cũ")
    changed = client.patch(
        f"/v1/posts/{entry['id']}", headers=alice["headers"], json={"body": "Mới", "topic": "Mới", "expectedVersion": 1}
    )
    assert changed.status_code == 200 and changed.json()["topic"] == "Mới"
    comment = client.post(
        f"/v1/posts/{entry['id']}/comments",
        headers={**bob["headers"], "Idempotency-Key": str(uuid4())},
        json={"body": "Chào"},
    )
    assert comment.status_code == 201, comment.text
    assert client.get(f"/v1/posts/{entry['id']}", headers=alice["headers"]).json()["comments"] == 1
    client.put(f"/v1/me/blocks/{bob['id']}", headers=alice["headers"])
    assert client.get(f"/v1/posts/{entry['id']}", headers=alice["headers"]).json()["comments"] == 0
    with owner.begin() as db:
        db.execute(text("update app_private.users set status='locked' where id=:id"), {"id": alice["id"]})
    assert client.get(f"/v1/posts/{entry['id']}").status_code == 404
    assert client.get(f"/v1/community/members/{alice['id']}").status_code == 404
