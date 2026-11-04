from datetime import date
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import Field, model_validator
from sqlalchemy.orm import Session

from .catalog import WASTE_SELECT
from .common import not_found, wire
from .db import db_session, one
from .schemas import Model, Source, WasteItem

router = APIRouter(prefix="/v1", tags=["handbook"])
DB = Annotated[Session, Depends(db_session, scope="function")]
CategoryKey = Literal["recycle", "organic", "inorganic"]
MaterialKind = Literal[
    "plastic", "paper", "glass", "metal", "textile", "rubber", "ceramic", "medical", "bag", "battery"
]


class Decomposition(Model):
    label: str = Field(min_length=1, max_length=500)
    minimum_years: float | None = Field(default=None, ge=0)
    maximum_years: float | None = Field(default=None, ge=0)
    conditions: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def paired_range(self) -> "Decomposition":
        if (self.minimum_years is None) != (self.maximum_years is None):
            raise ValueError("Both range ends are required")
        if (
            self.minimum_years is not None
            and self.maximum_years is not None
            and self.minimum_years > self.maximum_years
        ):
            raise ValueError("Range ends must be ordered")
        if self.minimum_years is not None and not self.conditions:
            raise ValueError("A numeric range needs measurement conditions")
        return self


class HandbookEntry(Model):
    code: str = Field(pattern=r"^[a-z0-9-]{1,60}$")
    title: str = Field(min_length=1, max_length=120)
    composition: str = Field(default="", max_length=200)
    examples: list[str] = Field(default_factory=list, max_length=20)
    handling: list[str] = Field(default_factory=list, max_length=20)
    decomposition: Decomposition | None = None
    item_query: str = Field(default="", max_length=100)
    illustration: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,60}$")


class HandbookGuide(Model):
    section: Literal["category", "material"]
    code: str = Field(pattern=r"^[a-z0-9-]{1,60}$")
    title: str = Field(min_length=1, max_length=150)
    summary: str = Field(min_length=1, max_length=1500)
    handling: list[str] = Field(default_factory=list, max_length=30)
    example: str | None = Field(default=None, max_length=1000)
    warning: str | None = Field(default=None, max_length=1000)
    entries: list[HandbookEntry] = Field(default_factory=list, max_length=30)
    sources: list[Source] = Field(min_length=1, max_length=20)
    related_kinds: list[MaterialKind] = Field(default_factory=list, max_length=10)
    item_donts: list[str] = Field(default_factory=list, max_length=20)
    item_tips: list[str] = Field(default_factory=list, max_length=20)
    revision: int = Field(ge=1)
    reviewed_on: date


class WasteGuideDetails(Model):
    dos: list[str] = Field(default_factory=list, max_length=30)
    donts: list[str] = Field(default_factory=list, max_length=30)
    tips: list[str] = Field(default_factory=list, max_length=20)
    related_kinds: list[MaterialKind] = Field(default_factory=list, max_length=10)
    decomposition: Decomposition | None = None


class WasteGuide(Model):
    item: WasteItem
    details: WasteGuideDetails
    sources: list[Source]


def guide(db: Session, section: str, code: str) -> Any:
    row = one(
        db,
        "select content from app_private.handbook_guides where section=:section and code=:code and published",
        section=section,
        code=code,
    )
    if not row:
        raise not_found()
    return row["content"]


@router.get("/handbook/categories/{code}", response_model=HandbookGuide, operation_id="handbook_category_get")
def category_guide(code: CategoryKey, db: DB) -> Any:
    return guide(db, "category", code)


@router.get("/handbook/materials/{code}", response_model=HandbookGuide, operation_id="handbook_material_get")
def material_guide(code: MaterialKind, db: DB) -> Any:
    return guide(db, "material", code)


@router.get("/waste-items/{id}/guide", response_model=WasteGuide, operation_id="waste_guide_get")
def item_guide(id: UUID, db: DB) -> Any:
    row = one(
        db,
        f"""select item.*,w.guide_details,reference.content as guide_reference
        from ({WASTE_SELECT} and w.id=:id) item
        join app_private.waste_items w on w.id=item.id
        left join lateral (
          select content from app_private.handbook_guides
          where published and ((section='material' and code=item.handbook_kind)
            or (section='category' and code=item.category_key))
          order by case when section='material' then 0 else 1 end limit 1
        ) reference on true""",
        id=id,
    )
    if row is None:
        raise not_found()
    item_data = dict(row)
    details = WasteGuideDetails.model_validate(item_data.pop("guide_details"))
    reference = item_data.pop("guide_reference")
    item = wire(item_data)
    if not details.dos:
        details.dos = item["steps"]
    if not details.related_kinds and item.get("handbookKind"):
        details.related_kinds = [item["handbookKind"]]
    sources = list(item["sources"])
    if reference is not None:
        approved = HandbookGuide.model_validate(reference)
        if not details.donts:
            details.donts = approved.item_donts
        if not details.tips:
            details.tips = approved.item_tips
        sources.extend(wire([source.model_dump() for source in approved.sources]))
    unique_sources = {source.get("url") or source["title"]: source for source in sources}
    return {"item": item, "details": wire(details.model_dump()), "sources": list(unique_sources.values())}
