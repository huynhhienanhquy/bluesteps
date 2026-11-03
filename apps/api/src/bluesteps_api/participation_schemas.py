from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from .schemas import GreenEvent, Model


class EventRegistrationRequest(Model):
    full_name: str = Field(min_length=2, max_length=100)
    attendee_count: int = Field(ge=1, le=20)
    volunteer_role: str = Field(min_length=1, max_length=200)
    phone: str = Field(pattern=r"^\+?[\d ()-]{6,24}$")
    email: EmailStr = Field(max_length=254)
    safety_consent: Literal[True]
    contact_consent: Literal[True]

    @field_validator("full_name", "volunteer_role")
    @classmethod
    def trim_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Required")
        return value


class EventRegistration(Model):
    id: UUID
    user_id: UUID
    event_id: UUID
    full_name: str
    attendee_count: int
    volunteer_role: str
    phone: str
    email: str
    safety_consent: bool
    contact_consent: bool
    status: Literal["registered", "cancelled"]
    ticket_revision: int
    checked_in_at: datetime | None
    checked_in_by: UUID | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime


class EventTicket(Model):
    registration: EventRegistration
    event: GreenEvent
    ticket_code: str
    qr_payload: str
    qr_image: str
    can_check_in: bool


class CheckInRequest(Model):
    ticket: str = Field(min_length=20, max_length=512)
    event_id: UUID | None = None


class EventFeedbackRequest(Model):
    rating: int = Field(ge=1, le=5)
    tags: list[Literal["well_organized", "learned_something", "needs_materials"]] = Field(
        default_factory=list, max_length=3
    )
    body: str = Field(default="", max_length=2000)


class EventFeedback(EventFeedbackRequest):
    id: UUID
    registration_id: UUID
    event_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class EventSummary(Model):
    event: GreenEvent
    registration: EventRegistration | None
    feedback: EventFeedback | None
    can_review: bool
    participant_count: int
    checked_in_count: int
    average_rating: float | None
    verified_results: dict[str, int | float]
    album_url: str | None
