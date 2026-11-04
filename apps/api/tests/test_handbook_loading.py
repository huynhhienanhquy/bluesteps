import json
from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event, text
from sqlalchemy.orm import Session

from bluesteps_api.handbook import WasteGuide, item_guide
from bluesteps_api.seed import fixture_id

pytestmark = pytest.mark.postgres


@pytest.mark.parametrize(
    ("material_published", "category_published", "reference_kind"),
    [(True, True, "material"), (True, False, "material"), (False, True, "category"), (False, False, None)],
)
def test_item_guide_loads_in_one_query_with_reference_priority_and_unchanged_response(
    client: TestClient,
    owner: Engine,
    material_published: bool,
    category_published: bool,
    reference_kind: str | None,
) -> None:
    id = fixture_id("waste", "bottle")
    references = {
        "material": client.get("/v1/handbook/materials/plastic").json(),
        "category": client.get("/v1/handbook/categories/recycle").json(),
    }
    duplicate_url = references[reference_kind or "material"]["sources"][0]["url"]
    with owner.begin() as db:
        db.execute(
            text("""update app_private.waste_items set handbook_kind='plastic',guide_details='{}',
            sources=cast(:sources as jsonb) where id=:id"""),
            {
                "id": id,
                "sources": json.dumps(
                    [
                        {"title": "Item citation", "url": "https://example.com/item"},
                        {"title": "Original citation", "url": duplicate_url},
                    ]
                ),
            },
        )
        db.execute(
            text("""update app_private.handbook_guides set published=case
            when section='material' then :material else :category end"""),
            {"material": material_published, "category": category_published},
        )
    item = client.get(f"/v1/waste-items/{id}").json()
    assert item["categoryKey"] == "recycle"
    statements: list[str] = []

    def track_query(
        connection: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool
    ) -> None:
        statements.append(statement)

    event.listen(owner, "before_cursor_execute", track_query)
    try:
        with Session(owner) as session:
            result = WasteGuide.model_validate(item_guide(UUID(str(id)), session)).model_dump(
                mode="json", by_alias=True
            )
    finally:
        event.remove(owner, "before_cursor_execute", track_query)

    reference = references[reference_kind] if reference_kind else None
    sources = [*item["sources"], *(reference["sources"] if reference else [])]
    unique_sources = {source.get("url") or source["title"]: source for source in sources}
    assert len(statements) == 1
    assert result == {
        "item": item,
        "details": {
            "dos": item["steps"],
            "donts": reference["itemDonts"] if reference else [],
            "tips": reference["itemTips"] if reference else [],
            "relatedKinds": ["plastic"],
            "decomposition": None,
        },
        "sources": list(unique_sources.values()),
    }
    response = client.get(f"/v1/waste-items/{id}/guide")
    assert response.status_code == 200, response.text
    assert response.json() == result


@pytest.mark.parametrize(("published", "synthetic"), [(False, False), (True, True)])
def test_combined_guide_query_keeps_catalog_visibility(
    client: TestClient, owner: Engine, published: bool, synthetic: bool
) -> None:
    id = fixture_id("waste", "bottle")
    with owner.begin() as db:
        db.execute(
            text("update app_private.waste_items set published=:published,synthetic=:synthetic where id=:id"),
            {"id": id, "published": published, "synthetic": synthetic},
        )
    assert client.get(f"/v1/waste-items/{id}/guide").status_code == 404
