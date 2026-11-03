from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


def fund(owner: Engine, user_id: str, points: int) -> None:
    with owner.begin() as db:
        db.execute(
            text("update app_private.wallets set balance=:points,lifetime_earned=:points where user_id=:uid"),
            {"points": points, "uid": user_id},
        )
        db.execute(
            text("""insert into app_private.point_ledger
            (user_id,delta,balance_after,entry_kind,source_type,source_id)
            values (:uid,:points,:points,'earn','test_funding',:source)"""),
            {"uid": user_id, "points": points, "source": str(uuid4())},
        )


def reward(owner: Engine, stock: int = 1) -> str:
    id = str(uuid4())
    with owner.begin() as db:
        db.execute(
            text("""insert into app_private.rewards(id,code,name,description,category,cost_points,state)
            values (:id,:code,'Quà thu gom','Quà có tồn kho thật','recycled',40,'published')"""),
            {"id": id, "code": "reward-" + id},
        )
        db.execute(
            text("insert into app_private.reward_inventory(reward_id,on_hand) values (:id,:stock)"),
            {"id": id, "stock": stock},
        )
    return id


def test_daily_claim_is_once_per_program_day_even_with_different_retry_keys(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    def claim(_: int) -> Any:
        return client.post(
            "/v1/me/daily-claims", json={}, headers={**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(claim, [0, 1]))
    assert all(response.status_code == 200 for response in responses)
    assert sorted(response.json()["alreadyClaimed"] for response in responses) == [False, True]
    assert client.get("/v1/me/wallet", headers=users["alice"]["headers"]).json()["balance"] == "2"
    assert client.get("/v1/me/daily-claims", headers=users["alice"]["headers"]).json()["claimedToday"]
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.daily_claims")).scalar_one() == 1
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 1


def test_sorting_award_is_idempotent_and_obeys_the_daily_limit(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    with owner.begin() as db:
        db.execute(text("update app_private.reward_program set sorting_daily_limit=1 where id"))
    body = {"source": "manual", "itemId": str(fixture_id("waste", "plastic-bottle"))}
    # Use an actual published waste item in the recycle category rather than a guessed fixture code.
    with owner.connect() as db:
        body["itemId"] = str(
            db.execute(
                text("""select w.id from app_private.waste_items w
            join app_private.waste_categories c on c.id=w.category_id where c.name='Tái chế' limit 1""")
            ).scalar_one()
        )
    headers = {**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
    first = client.post("/v1/sorting-actions", json=body, headers=headers)
    assert first.status_code == 201, first.text
    assert first.json()["award"]["points"] == "5"
    assert client.post("/v1/sorting-actions", json=body, headers=headers).json() == first.json()
    headers["Idempotency-Key"] = str(uuid4())
    second = client.post("/v1/sorting-actions", json=body, headers=headers)
    assert second.json()["award"]["reason"] == "DAILY_LIMIT_REACHED"
    assert second.json()["walletBalance"] == "5"


def test_insufficient_points_or_stale_price_does_not_reserve_stock(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = reward(owner)
    body = {"rewardId": id, "quantity": 1, "expectedRewardVersion": 1}
    headers = {**users["alice"]["headers"], "Idempotency-Key": str(uuid4())}
    response = client.post("/v1/redemptions", json=body, headers=headers)
    assert response.status_code == 409 and response.json()["error"]["code"] == "INSUFFICIENT_POINTS"
    fund(owner, users["alice"]["id"], 100)
    body["expectedRewardVersion"] = 2
    headers["Idempotency-Key"] = str(uuid4())
    response = client.post("/v1/redemptions", json=body, headers=headers)
    assert response.status_code == 409 and response.json()["error"]["code"] == "PRICE_CHANGED"
    with owner.connect() as db:
        assert (
            db.execute(
                text("select reserved from app_private.reward_inventory where reward_id=:id"), {"id": id}
            ).scalar_one()
            == 0
        )
        assert db.execute(text("select count(*) from app_private.redemptions")).scalar_one() == 0


def test_last_reward_cannot_be_oversold_and_refund_fulfillment_are_exactly_once(
    client: TestClient, owner: Engine, users: dict[str, Any]
) -> None:
    id = reward(owner)
    for name in ["alice", "bob"]:
        fund(owner, users[name]["id"], 100)
    body = {"rewardId": id, "quantity": 1, "expectedRewardVersion": 1}

    def redeem(name: str) -> Any:
        return client.post(
            "/v1/redemptions", json=body, headers={**users[name]["headers"], "Idempotency-Key": str(uuid4())}
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(redeem, ["alice", "bob"]))
    assert sorted(response.status_code for response in responses) == [201, 409]
    index = next(index for index, response in enumerate(responses) if response.status_code == 201)
    winner = users[["alice", "bob"][index]]
    loser = users[["bob", "alice"][index]]
    redemption = responses[index].json()
    rid = redemption["id"]
    assert client.get(f"/v1/redemptions/{rid}", headers=loser["headers"]).status_code == 404
    assert client.post(f"/v1/redemptions/{rid}/fulfill", headers=winner["headers"]).status_code == 403
    assert client.post(f"/v1/redemptions/{rid}/cancel", headers=winner["headers"]).json()["status"] == "refunded"
    assert client.post(f"/v1/redemptions/{rid}/cancel", headers=winner["headers"]).json()["status"] == "refunded"
    assert client.get("/v1/me/wallet", headers=winner["headers"]).json()["balance"] == "100"
    response = client.post("/v1/redemptions", json=body, headers={**winner["headers"], "Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    rid = response.json()["id"]
    with owner.begin() as db:
        db.execute(
            text("insert into app_private.user_roles(user_id,role) values (:uid,'moderator')"),
            {"uid": users["eve"]["id"]},
        )
    for _ in range(2):
        assert client.post(f"/v1/redemptions/{rid}/fulfill", headers=users["eve"]["headers"]).status_code == 200
    assert client.post(f"/v1/redemptions/{rid}/cancel", headers=winner["headers"]).status_code == 409
    with owner.connect() as db:
        assert (
            db.execute(
                text("select on_hand from app_private.reward_inventory where reward_id=:id"), {"id": id}
            ).scalar_one()
            == 0
        )
        assert (
            db.execute(text("select count(*) from app_private.point_ledger where entry_kind='refund'")).scalar_one()
            == 1
        )
