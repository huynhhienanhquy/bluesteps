from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from .test_participation import event

pytestmark = pytest.mark.postgres


def test_reading_progress_is_monotonic_owned_and_saved_list_can_resume(
    client: TestClient, users: dict[str, Any]
) -> None:
    id = client.get("/v1/articles").json()["items"][0]["id"]
    headers = users["alice"]["headers"]
    assert client.put(f"/v1/me/saved-articles/{id}", headers=headers).status_code == 204
    assert client.get("/v1/me/reading-summary", headers=headers).json()["unread"] == 1
    for progress in [40, 10]:
        response = client.put(f"/v1/me/article-reading/{id}", headers=headers, json={"progress": progress})
        assert response.status_code == 200, response.text
        assert response.json()["progress"] == 40
    saved = client.get("/v1/me/reading-list?state=reading", headers=headers).json()["items"]
    assert len(saved) == 1 and saved[0]["progress"] == 40 and saved[0]["lastReadAt"]
    assert client.get(f"/v1/me/article-reading/{id}", headers=users["bob"]["headers"]).json()["progress"] == 0
    assert client.get("/v1/me/reading-list", headers=users["bob"]["headers"]).json()["items"] == []
    assert client.put(f"/v1/me/article-reading/{id}", headers=headers, json={"progress": 100}).status_code == 200
    assert client.get("/v1/me/reading-summary", headers=headers).json() == {
        "total": 1,
        "unread": 0,
        "reading": 0,
        "completed": 1,
    }
    assert client.put(f"/v1/me/article-reading/{id}", headers=headers, json={"progress": 101}).status_code == 422
    client.delete(f"/v1/me/saved-articles/{id}", headers=headers)
    assert client.get("/v1/me/reading-list", headers=headers).json()["items"] == []


def test_search_history_is_bounded_case_insensitive_and_private(client: TestClient, users: dict[str, Any]) -> None:
    headers = users["alice"]["headers"]
    for index in range(12):
        response = client.post("/v1/me/article-searches", headers=headers, json={"term": f"Tìm {index}"})
        assert response.status_code == 200, response.text
    recent = client.post("/v1/me/article-searches", headers=headers, json={"term": "  tìm   11  "}).json()
    assert len(recent) == 10 and recent[0]["term"] == "tìm 11"
    assert client.get("/v1/me/article-searches", headers=users["bob"]["headers"]).json() == []
    assert (
        client.delete(f"/v1/me/article-searches/{recent[0]['id']}", headers=users["bob"]["headers"]).status_code == 204
    )
    assert len(client.get("/v1/me/article-searches", headers=headers).json()) == 10
    assert client.post("/v1/me/article-searches", headers=headers, json={"term": "   "}).status_code == 422
    assert client.delete("/v1/me/article-searches", headers=headers).status_code == 204
    assert client.get("/v1/me/article-searches", headers=headers).json() == []


def test_news_calendar_filters_by_local_month_and_validates_input(client: TestClient, owner: Engine) -> None:
    id = event(owner)
    with owner.begin() as db:
        db.execute(
            text("""update app_private.events set starts_at='2031-01-31T18:00:00Z',
            ends_at='2031-01-31T20:00:00Z' where id=:id"""),
            {"id": id},
        )
    february = client.get("/v1/news-calendar?month=2031-02&timezone=Asia/Ho_Chi_Minh")
    assert february.status_code == 200, february.text
    assert [item["id"] for item in february.json()["items"]] == [id]
    assert client.get("/v1/news-calendar?month=2031-02&timezone=UTC").json()["items"] == []
    assert client.get("/v1/news-calendar?month=2031-13").status_code == 422
    assert client.get("/v1/news-calendar?month=2031-02&timezone=Unknown/Zone").status_code == 422


def test_briefs_are_dated_and_search_filters_summary_and_cursor_scope(client: TestClient, owner: Engine) -> None:
    ids = [str(uuid4()), str(uuid4())]
    with owner.begin() as db:
        for index, id in enumerate(ids):
            db.execute(
                text("""insert into app_private.articles(id,code,title,summary,topic,blocks,published,created_at)
                values (:id,:code,:title,'Từ khóa đặc biệt','Chủ đề mới','[]',true,:created)"""),
                {
                    "id": id,
                    "code": id,
                    "title": f"Bản tin {index}",
                    "created": datetime(2026, 1, 31, 18 + index, tzinfo=UTC),
                },
            )
    digest = client.get("/v1/article-briefs?day=2026-02-01&timezone=Asia/Ho_Chi_Minh")
    assert digest.status_code == 200, digest.text
    assert {item["id"] for item in digest.json()["items"]} == set(ids)
    assert client.get("/v1/article-briefs?day=2026-02-01&timezone=UTC").json()["items"] == []
    result = client.get("/v1/articles?q=đặc%20biệt&limit=1").json()
    assert len(result["items"]) == 1 and result["nextCursor"]
    assert client.get("/v1/articles", params={"q": "khác", "cursor": result["nextCursor"]}).status_code == 400
    assert client.get("/v1/articles?q=đặc%20biệt&days=1").json()["items"] == []


def test_comment_reactions_are_idempotent_and_respect_deleted_blocked_and_private_parents(
    client: TestClient, users: dict[str, Any]
) -> None:
    article = client.get("/v1/articles").json()["items"][0]["id"]
    alice = users["alice"]["headers"]
    bob = users["bob"]["headers"]
    response = client.post(
        f"/v1/articles/{article}/comments",
        json={"body": "Bình luận có ích"},
        headers={**alice, "Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 201, response.text
    id = response.json()["id"]
    for _ in range(2):
        result = client.put(f"/v1/comments/{id}/reaction", headers=bob)
        assert result.status_code == 200 and result.json() == {"likes": 1, "liked": True}
    assert client.get(f"/v1/articles/{article}/comments", headers=bob).json()["items"][0]["liked"] is True
    client.put(f"/v1/me/blocks/{users['bob']['id']}", headers=alice)
    assert client.put(f"/v1/comments/{id}/reaction", headers=bob).status_code == 404
    client.delete(f"/v1/me/blocks/{users['bob']['id']}", headers=alice)
    assert client.delete(f"/v1/comments/{id}/reaction", headers=bob).json() == {"likes": 0, "liked": False}
    client.delete(f"/v1/comments/{id}", headers=alice)
    assert client.put(f"/v1/comments/{id}/reaction", headers=bob).status_code == 404
    post = client.post(
        "/v1/posts",
        json={"body": "Chỉ mình tôi", "visibility": "private"},
        headers={**alice, "Idempotency-Key": str(uuid4())},
    )
    assert post.status_code == 201, post.text
    comment = client.post(
        f"/v1/posts/{post.json()['id']}/comments",
        json={"body": "Riêng tư"},
        headers={**alice, "Idempotency-Key": str(uuid4())},
    ).json()
    assert client.put(f"/v1/comments/{comment['id']}/reaction", headers=bob).status_code == 404
