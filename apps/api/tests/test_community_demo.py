from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.community_demo import MEMBERS, POSTS, demo_id, seed_community_demo, seed_personal_community_demo

pytestmark = pytest.mark.postgres


def test_demo_is_public_with_topics_comments_and_reactions(client: TestClient, owner: Engine) -> None:
    with owner.begin() as conn:
        assert seed_community_demo(conn) == {"users": 3, "profiles": 3, "posts": 4, "comments": 8, "reactions": 8}
    response = client.get("/v1/posts")
    assert response.status_code == 200, response.text
    feed = {entry["id"]: entry for entry in response.json()["items"]}
    for key, _, topic, *_ in POSTS:
        pid = str(demo_id("post", key))
        assert feed[pid]["topic"] == topic
        assert feed[pid]["likes"] == 2 and feed[pid]["comments"] == 2
        assert client.get(f"/v1/posts/{pid}").status_code == 200
        comments = client.get(f"/v1/posts/{pid}/comments").json()
        assert comments["totalCount"] == 2
        assert any(comment["parentId"] for comment in comments["items"])
        assert client.get("/v1/posts", params={"topic": topic}).json()["items"][0]["id"] == pid
    topics = client.get("/v1/community/topics").json()["items"]
    assert {entry["name"] for entry in topics} == {post[2] for post in POSTS}
    for key, name, _ in MEMBERS:
        member = client.get(f"/v1/community/members/{demo_id('member', key)}")
        assert member.status_code == 200
        assert member.json()["displayName"] == name
    with owner.connect() as conn:
        assert conn.execute(text("select count(*) from app_private.sessions")).scalar_one() == 0
        assert conn.execute(text("select count(*) from app_private.user_roles")).scalar_one() == 0
        assert (
            conn.execute(
                text("select count(*) from app_private.users where email_verified_at is not null")
            ).scalar_one()
            == 0
        )


def test_rerunning_demo_does_not_duplicate_or_overwrite_content(owner: Engine) -> None:
    pid = demo_id("post", POSTS[0][0])
    with owner.begin() as conn:
        seed_community_demo(conn)
        conn.execute(text("update app_private.posts set body='Nội dung đã chỉnh' where id=:id"), {"id": pid})
        assert all(count == 0 for count in seed_community_demo(conn).values())
        assert (
            conn.execute(text("select body from app_private.posts where id=:id"), {"id": pid}).scalar_one()
            == "Nội dung đã chỉnh"
        )


def test_personal_demo_populates_all_five_views_for_only_the_selected_account(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    viewer = UUID(users["alice"]["id"])
    with owner.begin() as conn:
        seed_community_demo(conn)
        counts = seed_personal_community_demo(conn, viewer)
        assert all(count == 1 for count in counts.values())
        assert all(count == 0 for count in seed_personal_community_demo(conn, viewer).values())
    paths = {
        "/v1/posts?feed=following": demo_id("post", "goc-phan-loai"),
        "/v1/me/saved-posts": demo_id("post", "binh-nuoc"),
        "/v1/me/hidden-posts": demo_id("post", "chau-cay"),
        "/v1/me/blocked-members": demo_id("member", "tuan-phong"),
        "/v1/me/friends": demo_id("member", "mai-anh"),
    }
    for path, expected in paths.items():
        result = client.get(path, headers=users["alice"]["headers"])
        assert result.status_code == 200, result.text
        assert [entry["id"] for entry in result.json()["items"]] == [str(expected)]
        assert client.get(path, headers=users["bob"]["headers"]).json()["items"] == []
    feed = client.get("/v1/posts", headers=users["alice"]["headers"]).json()["items"]
    assert str(demo_id("post", "chau-cay")) not in {post["id"] for post in feed}
    assert (
        client.get(
            f"/v1/community/members/{demo_id('member', 'tuan-phong')}", headers=users["alice"]["headers"]
        ).status_code
        == 404
    )
    # Normal UI actions can undo the demo state without special handling.
    assert (
        client.delete(
            f"/v1/me/hidden-posts/{demo_id('post', 'chau-cay')}", headers=users["alice"]["headers"]
        ).status_code
        == 204
    )
    assert (
        client.delete(f"/v1/me/blocks/{demo_id('member', 'tuan-phong')}", headers=users["alice"]["headers"]).status_code
        == 204
    )
    assert (
        client.delete(f"/v1/me/friends/{demo_id('member', 'mai-anh')}", headers=users["alice"]["headers"]).status_code
        == 204
    )


def test_personal_demo_preserves_existing_blocks(owner: Engine, users: dict[str, Any]) -> None:
    viewer = UUID(users["alice"]["id"])
    with owner.begin() as conn:
        seed_community_demo(conn)
        conn.execute(
            text("insert into app_private.blocks(user_id,blocked_user_id) values (:viewer,:peer)"),
            {"viewer": viewer, "peer": demo_id("member", "minh-khang")},
        )
        with pytest.raises(ValueError, match="Existing blocks"):
            seed_personal_community_demo(conn, viewer)
        assert (
            conn.execute(
                text("select count(*) from app_private.blocks where user_id=:viewer"), {"viewer": viewer}
            ).scalar_one()
            == 1
        )
