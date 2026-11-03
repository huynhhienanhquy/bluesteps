import json
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Engine, text
from sqlalchemy.exc import DBAPIError

from bluesteps_api.cli import ROOT
from bluesteps_api.handbook import Decomposition, HandbookGuide
from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


def test_reference_guides_are_typed_cited_and_match_migration(client: TestClient) -> None:
    references = json.loads((ROOT / "apps/api/content/handbook.json").read_text(encoding="utf-8"))
    for reference in references:
        expected = HandbookGuide.model_validate(reference).model_dump(mode="json", by_alias=True)
        section = "categories" if expected["section"] == "category" else "materials"
        response = client.get(f"/v1/handbook/{section}/{expected['code']}")
        assert response.status_code == 200, response.text
        assert response.json() == expected
        assert all(source["url"].startswith("https://") for source in expected["sources"])
        for entry in expected["entries"]:
            if entry["decomposition"]:
                assert entry["decomposition"]["minimumYears"] is None
                assert entry["decomposition"]["maximumYears"] is None
    assert client.get("/v1/handbook/materials/paper").status_code == 404
    assert client.get("/v1/handbook/materials/unknown").status_code == 422


def test_kind_and_category_filter_apply_before_pagination_and_scope_cursor(client: TestClient, owner: Engine) -> None:
    with owner.begin() as db:
        for index in range(25):
            db.execute(
                text("""insert into app_private.waste_items(id,code,name,category_id,material_id,
                handbook_kind,published) values (:id,:code,:name,:category,:material,:kind,true)"""),
                {
                    "id": uuid4(),
                    "code": f"kind-{index}",
                    "name": f"Phân loại {index}",
                    "category": fixture_id("category", "Tái chế"),
                    "material": fixture_id("material", "Nhựa"),
                    "kind": "bag" if index % 2 else "plastic",
                },
            )
    first = client.get("/v1/waste-items?kind=bag&category_key=recycle&limit=3").json()
    assert len(first["items"]) == 3 and first["nextCursor"]
    assert all(item["handbookKind"] == "bag" and item["categoryKey"] == "recycle" for item in first["items"])
    cursor = first["nextCursor"]
    next_page = client.get(
        "/v1/waste-items", params={"kind": "bag", "category_key": "recycle", "limit": 3, "cursor": cursor}
    ).json()
    assert len(next_page["items"]) == 3
    assert not {item["id"] for item in first["items"]} & {item["id"] for item in next_page["items"]}
    assert client.get("/v1/waste-items", params={"kind": "plastic", "cursor": cursor}).status_code == 400
    assert client.get("/v1/waste-items?kind=bag&category_key=organic").json()["items"] == []
    assert client.get("/v1/waste-items?kind=bag&q=does-not-exist").json()["items"] == []
    material_match = client.get("/v1/waste-items?kind=bag&q=Nhựa").json()["items"]
    assert material_match and all(item["handbookKind"] == "bag" for item in material_match)
    assert any(item["name"].startswith("Phân loại") for item in material_match)
    assert client.get("/v1/waste-items?kind=wrong").status_code == 422


def test_details_toggle_data_and_visibility_do_not_award_points(client: TestClient, owner: Engine) -> None:
    id = fixture_id("waste", "bottle")
    details = {
        "dos": ["Làm sạch chai."],
        "donts": ["Không trộn pin."],
        "tips": ["Kiểm tra nơi nhận."],
        "relatedKinds": ["plastic"],
        "decomposition": {"label": "Chưa xác định", "conditions": "Phụ thuộc môi trường"},
    }
    with owner.begin() as db:
        db.execute(
            text("update app_private.waste_items set guide_details=cast(:details as jsonb) where id=:id"),
            {"id": id, "details": json.dumps(details)},
        )
    response = client.get(f"/v1/waste-items/{id}/guide")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["details"]["donts"] == details["donts"] and data["details"]["dos"] == details["dos"]
    assert data["details"]["decomposition"]["minimumYears"] is None
    with owner.connect() as db:
        assert db.execute(text("select count(*) from app_private.point_ledger")).scalar_one() == 0
    with owner.begin() as db:
        db.execute(text("update app_private.waste_items set synthetic=true where id=:id"), {"id": id})
    assert client.get(f"/v1/waste-items/{id}/guide").status_code == 404


def test_existing_items_keep_dos_and_receive_only_published_reference_defaults(
    client: TestClient, owner: Engine
) -> None:
    item = client.get("/v1/waste-items").json()["items"][0]
    result = client.get(f"/v1/waste-items/{item['id']}/guide").json()
    assert result["details"]["dos"] == item["steps"]
    assert result["details"]["decomposition"] is None
    assert result["sources"]
    with owner.begin() as db:
        db.execute(text("update app_private.handbook_guides set published=false"))
    result = client.get(f"/v1/waste-items/{item['id']}/guide").json()
    assert result["details"]["donts"] == [] and result["details"]["tips"] == []


def test_unpublished_guides_and_runtime_cannot_modify_reference(
    client: TestClient,
    owner: Engine,
    database: tuple[Engine, Engine, str],
) -> None:
    with owner.begin() as db:
        db.execute(text("update app_private.handbook_guides set published=false where code='plastic'"))
    assert client.get("/v1/handbook/materials/plastic").status_code == 404
    with pytest.raises(DBAPIError), database[1].begin() as db:
        db.execute(text("update app_private.handbook_guides set published=true"))


@pytest.mark.parametrize(
    "value",
    [
        {"minimumYears": 1},
        {"minimumYears": 2, "maximumYears": 1, "conditions": "x"},
        {"minimumYears": 1, "maximumYears": 2},
        {"minimumYears": -1, "maximumYears": 2, "conditions": "x"},
    ],
)
def test_decomposition_range_requires_conditions_and_order(value: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        Decomposition.model_validate({"label": "Range", **value})
