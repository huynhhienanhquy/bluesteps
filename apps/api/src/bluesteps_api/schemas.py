from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator, model_validator
from pydantic.alias_generators import to_camel


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Liveness(Model):
    status: Literal["ok"] = "ok"


class LoginRequest(Model):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)
    device_label: str = Field(default="BlueSteps", min_length=1, max_length=100)


class RegisterRequest(LoginRequest):
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    consent_version: str = Field(min_length=1, max_length=100)


class RefreshRequest(Model):
    refresh_token: str = Field(min_length=32, max_length=1024)


class TokenPair(Model):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int
    session_id: UUID


class SessionInfo(Model):
    id: UUID
    device_label: str | None
    is_current: bool
    created_at: datetime
    last_seen_at: datetime | None


class SessionList(Model):
    items: list[SessionInfo]


class Profile(Model):
    id: UUID
    display_name: str
    email: str
    birth_date: date | None
    country_code: str | None
    bio: str
    timezone: str
    version: int


class ProfileUpdate(Model):
    display_name: str = Field(min_length=1, max_length=100)
    birth_date: date | None = None
    country_code: str | None = Field(default=None, pattern="^[A-Z]{2}$")
    bio: str = Field(default="", max_length=500)
    expected_version: int = Field(ge=1)


class Preferences(Model):
    theme: Literal["system", "light", "dark"] = "system"
    sound: bool = True
    haptics: bool = True
    timezone: str = "Asia/Ho_Chi_Minh"
    locale: Literal["vi", "en"] = "vi"
    version: int = 1
    interests: list[Literal["sorting", "activities", "collection", "news"]] = Field(default_factory=list, max_length=4)
    goal: Literal["sorting", "reduce", "community"] | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return value


class PreferencesUpdate(Preferences):
    expected_version: int = Field(ge=1)


class Page[T](Model):
    items: list[T]
    next_cursor: str | None = None


class FieldError(Model):
    field: str = Field(min_length=1)
    message: str = Field(min_length=1)


class ErrorDetail(Model):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)
    retryable: bool
    request_id: str = Field(min_length=1)
    field_errors: list[FieldError] | None = None


class Error(Model):
    error: ErrorDetail


class Source(Model):
    title: str
    url: str | None = None


class CatalogItem(Model):
    id: UUID
    code: str
    created_at: datetime
    synthetic: bool


class WasteItem(CatalogItem):
    name: str
    icon: str
    steps: list[str]
    sources: list[Source]
    revision: int
    category: str
    material: str
    hazardous: bool
    handbook_kind: str | None = None
    category_key: Literal["recycle", "organic", "inorganic"] | None = None


class MaterialRef(Model):
    id: UUID
    name: str


class CollectionPoint(CatalogItem):
    entrance_label: str | None = None
    handover_instructions: str | None = None
    contact_phone: str | None = None
    website_url: str | None = None
    average_rating: float | None = None
    review_count: int = 0
    name: str
    address: str
    area: str
    latitude: float
    longitude: float
    hours: str
    timezone: str
    version: int
    materials: list[MaterialRef]
    capacity_state: Literal["unknown", "available", "limited", "full", "closed"]
    status_observed_at: datetime | None
    status_expires_at: datetime | None = None
    staffed: bool | None = None
    always_open: bool | None = None
    open_now: bool | None = None
    distance_m: float | None = None


class PointComparison(Model):
    items: list[CollectionPoint]
    recommended_id: UUID | None = None
    recommendation_reason: str


class GreenEvent(CatalogItem):
    title: str
    description: str
    location: str
    topic: str
    starts_at: datetime
    ends_at: datetime
    timezone: str
    capacity: int
    reserved_count: int
    available: int
    details: dict[str, Any]
    version: int


class EventFilterOptions(Model):
    locations: list[str]
    topics: list[str]


class ArticleImage(Model):
    url: str = Field(pattern=r"^https?://[^\s]+$", max_length=2048)
    alt: str = Field(default="", max_length=500)
    caption: str = Field(default="", max_length=1000)


class ContentBlock(Model):
    type: Literal["paragraph", "heading", "gallery"]
    text: str
    images: list[ArticleImage] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def validate_images(self) -> "ContentBlock":
        if self.type == "gallery" and not self.images:
            raise ValueError("Gallery needs at least one image")
        if self.type != "gallery" and self.images:
            raise ValueError("Images are only supported in gallery blocks")
        return self


class Article(CatalogItem):
    title: str
    summary: str
    topic: str
    blocks: list[ContentBlock]
    sources: list[Source]


class Reward(CatalogItem):
    name: str
    description: str
    category: str
    cost_points: str
    version: int
    available: int
    redemption_enabled: bool


class Wallet(Model):
    balance: str
    lifetime_earned: str
    version: int


class PointTransaction(Model):
    id: UUID
    delta: str
    balance_after: str
    entry_kind: Literal["earn", "spend", "refund", "reversal"]
    source_type: str
    source_id: UUID
    created_at: datetime
    source_label: str | None = None
    target_path: str | None = None


class HistorySummary(Model):
    timezone: str
    as_of: date
    week_starts_on: date
    month_starts_on: date
    weekly_earned: str
    monthly_earned: str


class MediaAsset(Model):
    id: UUID
    kind: Literal["image", "video", "audio", "file"]
    file_name: str
    mime_type: str
    size: int
    width: int | None = None
    height: int | None = None
    duration_ms: int | None = None


class PostPlace(Model):
    name: str = Field(min_length=1, max_length=180)
    address: str = Field(default="", max_length=300)
    point_id: UUID | None = None

    @field_validator("name", "address", mode="before")
    @classmethod
    def trim_place(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


Emotion = Literal[
    "happy",
    "surprised",
    "joyful",
    "loving",
    "worried",
    "cute",
    "confused",
    "chill",
    "cool",
    "great",
    "interested",
    "sarcastic",
    "sad",
    "funny",
    "hurt",
]


class Post(Model):
    id: UUID
    user_id: UUID
    body: str
    visibility: Literal["public", "friends", "private"]
    version: int
    created_at: datetime
    author_name: str
    likes: int
    liked: bool = False
    saved: bool = False
    hidden: bool = False
    comments: int = 0
    topic: str | None = None
    emotion: Emotion | None = None
    place: PostPlace | None = None
    media: list[MediaAsset] = []


class PublicMember(Model):
    id: UUID
    display_name: str


class Conversation(Model):
    id: UUID
    last_sequence: int
    created_at: datetime
    members: list[PublicMember]


class Message(Model):
    id: UUID
    user_id: UUID
    client_message_id: UUID
    sequence: int
    text: str
    created_at: datetime
    media: list[MediaAsset] = []


class MessageList(Model):
    items: list[Message]
    has_more: bool
    next_sequence: int


class Notification(Model):
    id: UUID
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime
    category: Literal["activity", "offers", "community", "news"] = "activity"
    target_path: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class EventCollection(Model):
    id: UUID
    name: str
    version: int
    created_at: datetime


class Comment(Model):
    id: UUID
    user_id: UUID
    parent_id: UUID | None
    body: str
    created_at: datetime


class ListedComment(Comment):
    deleted_at: datetime | None
    author_name: str
    likes: int = 0
    liked: bool = False


class CommentsPage(Page[ListedComment]):
    total_count: int


class CommentEngagement(Model):
    likes: int
    liked: bool


class ConversationSummary(Conversation):
    last_read_sequence: int
    unread_count: int
    updated_at: datetime | None = None
    last_message: Message | None = None


class Activity(Model):
    id: UUID
    item_id: UUID
    source: Literal["manual", "scan"]
    evidence_status: Literal["self_reported", "user_confirmed"]
    created_at: datetime
    scan_id: UUID | None = None
    item_name: str | None = None


class Redemption(Model):
    id: UUID
    reward_id: UUID
    quantity: int
    unit_cost_snapshot: str
    total_cost: str
    status: str
    created_at: datetime
    reward_name: str | None = None


class PointReview(Model):
    id: UUID
    rating: int
    body: str
    created_at: datetime
    author_name: str


class ArticleEngagement(Model):
    likes: int
    liked: bool
    saved: bool


class SavedEventState(Model):
    saved: bool
    collection_id: UUID | None


class PublicUser(PublicMember):
    bio: str


class ArticleTopic(Model):
    id: str
    name: str
    article_count: int
    followed: bool


RouteMode = Literal["walking", "cycling", "motorcycling", "driving"]


class Coordinate(Model):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


class RouteManeuver(Model):
    instruction: str
    original_instruction: str
    type: int
    distance_m: int
    duration_s: int
    begin_index: int
    end_index: int


class RouteLeg(Model):
    stop_id: UUID | None = None
    point_id: UUID
    distance_m: int
    duration_s: int
    geometry: list[Coordinate]
    maneuvers: list[RouteManeuver]


class RoutePlan(Model):
    provider: Literal["Valhalla"] = "Valhalla"
    attribution: str = "© OpenStreetMap contributors · Routing: Valhalla"
    computed_at: datetime
    origin: Coordinate
    mode: RouteMode
    prefer_no_tolls: bool
    stop_ids: list[UUID]
    total_distance_m: int
    total_duration_s: int
    legs: list[RouteLeg]


class RouteSummary(Model):
    id: UUID
    mode: RouteMode
    status: Literal["draft", "active", "cancelled", "completed"]
    version: int
    created_at: datetime


class RouteStop(Model):
    entrance_label: str | None = None
    handover_instructions: str | None = None
    contact_phone: str | None = None
    id: UUID
    point_id: UUID
    position: int
    status: Literal["pending", "arrived", "self_reported"]
    name: str
    address: str
    latitude: float
    longitude: float
    hours: str
    materials: list[MaterialRef] = Field(default_factory=list)


class RouteDetail(RouteSummary):
    prefer_no_tolls: bool = False
    material_ids: list[UUID] = Field(default_factory=list)
    stops: list[RouteStop]
    provider: str | None
    polyline: str | None
    total_distance_m: int | None
    total_duration_s: int | None
    plan: RoutePlan | None = None


class SelfReportedHandover(Model):
    id: UUID
    evidence_status: Literal["self_reported"]
    created_at: datetime


class HandoverAward(Model):
    points: Literal["0"]
    reason: Literal["POLICY_NOT_ENABLED"]


class HandoverReceipt(Model):
    handover: SelfReportedHandover
    award: HandoverAward


class Statistics(Model):
    sorting_actions: int
    evidence_status: Literal["self_reported"]
    verified_kg: None
    wallet: Wallet


class ManualSortingRequest(Model):
    source: Literal["manual"]
    item_id: UUID
    reported_weight_kg: Decimal | None = Field(default=None, gt=0, le=10000, max_digits=10, decimal_places=3)


class ScanSortingRequest(Model):
    source: Literal["scan"]
    scan_id: UUID
    item_id: UUID
    reported_weight_kg: Decimal | None = Field(default=None, gt=0, le=10000, max_digits=10, decimal_places=3)


SortingRequest = Annotated[ManualSortingRequest | ScanSortingRequest, Field(discriminator="source")]


class NoAward(Model):
    status: Literal["not_awarded", "awarded"] = "not_awarded"
    points: str = Field(default="0", pattern=r"^\d+$")
    rule_version: str | None = None
    reason: Literal["POLICY_NOT_ENABLED", "DAILY_LIMIT_REACHED", "UNKNOWN_CATEGORY"] | None = "POLICY_NOT_ENABLED"


class SortingResponse(Model):
    action_id: UUID
    item_id: UUID
    evidence_status: Literal["self_reported", "user_confirmed"]
    award: NoAward
    wallet_balance: str


class NameRequest(Model):
    name: str = Field(min_length=1, max_length=100)


class VersionedNameRequest(NameRequest):
    expected_version: int = Field(ge=1)


class SavedEventRequest(Model):
    collection_id: UUID | None = None


class MoveEventsRequest(Model):
    event_ids: list[UUID] = Field(min_length=1, max_length=100)
    target_collection_id: UUID | None


class PostDraftContent(Model):
    body: str = Field(default="", max_length=5000)
    visibility: Literal["public", "friends", "private"] = "public"
    topic: str | None = Field(default=None, min_length=1, max_length=80)
    emotion: Emotion | None = None
    place: PostPlace | None = None
    media_ids: list[UUID] = Field(default_factory=list, max_length=10)

    @field_validator("topic", mode="before")
    @classmethod
    def normalize_topic(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @field_validator("media_ids")
    @classmethod
    def unique_media(cls, value: list[UUID]) -> list[UUID]:
        if len(value) != len(set(value)):
            raise ValueError("Tệp đính kèm bị trùng.")
        return value


class PostRequest(PostDraftContent):
    draft_version: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def require_content(self) -> "PostRequest":
        self.body = self.body.strip()
        if not self.body and not self.media_ids:
            raise ValueError("Cần nội dung hoặc tệp đính kèm.")
        return self


class CommentRequest(Model):
    body: str = Field(min_length=1, max_length=500)
    parent_id: UUID | None = None


class ConversationRequest(Model):
    recipient_id: UUID


class MessageRequest(Model):
    client_message_id: UUID
    text: str = Field(default="", max_length=4000)
    media_ids: list[UUID] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def valid_message(self) -> "MessageRequest":
        if not self.text.strip() and not self.media_ids:
            raise ValueError("Cần nội dung hoặc tệp đính kèm.")
        if len(set(self.media_ids)) != len(self.media_ids):
            raise ValueError("Tệp đính kèm không được lặp lại.")
        return self


class ReadRequest(Model):
    last_read_sequence: int = Field(ge=0)


class NotificationUpdate(Model):
    read: Literal[True]


class CutoffRequest(Model):
    cutoff: datetime


class PointReviewRequest(Model):
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=1, max_length=1000)


class ReportRequest(Model):
    issue_types: list[Literal["closed", "full", "wrong_address", "unsupported_material", "unsafe", "other"]] = Field(
        min_length=1, max_length=6
    )
    description: str = Field(min_length=1, max_length=2000)
    observed_at: datetime
    media_ids: list[UUID] = Field(default_factory=list, max_length=5)


class ProposalRequest(Model):
    name: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    material_ids: list[UUID] = Field(min_length=1, max_length=20)
    hours: str = Field(default="", max_length=500)
    media_ids: list[UUID] = Field(default_factory=list, max_length=5)
    publish_photos: bool = False


class ProposalUpdate(ProposalRequest):
    expected_version: int = Field(ge=1)


class ProposalSubmit(Model):
    expected_version: int = Field(ge=1)
    acknowledged: Literal[True]


class ProposalDetail(ProposalRequest):
    id: UUID
    state: Literal["draft", "submitted", "approved", "rejected"]
    version: int
    review_reason: str | None = None
    published_point_id: UUID | None = None
    submitted_at: datetime | None = None
    created_at: datetime
    media: list[MediaAsset] = Field(default_factory=list)


class ReportDetail(ReportRequest):
    id: UUID
    point_id: UUID
    state: Literal["submitted", "approved", "rejected"]
    version: int
    review_reason: str | None = None
    created_at: datetime
    media: list[MediaAsset] = Field(default_factory=list)


class ReviewDecision(Model):
    decision: Literal["approve", "reject"]
    reason: str = Field(min_length=1, max_length=2000)
    expected_version: int = Field(ge=1)


class ReviewResult(Model):
    id: UUID
    status: Literal["approved", "rejected"]
    version: int
    reviewed_at: datetime


class RouteRequest(Model):
    stop_ids: list[UUID] = Field(min_length=1, max_length=10)
    mode: RouteMode = "walking"
    material_ids: list[UUID] = Field(default_factory=list, max_length=30)


class RoutePreviewRequest(RouteRequest):
    origin: Coordinate
    prefer_no_tolls: bool = False


class RoutePlanRequest(Model):
    origin: Coordinate
    prefer_no_tolls: bool = False
    expected_version: int = Field(ge=1)


class RouteUpdate(Model):
    stop_ids: list[UUID] = Field(min_length=1, max_length=10)
    mode: RouteMode = "walking"
    material_ids: list[UUID] | None = Field(default=None, max_length=30)
    expected_version: int = Field(ge=1)


class StopReplacement(Model):
    point_id: UUID
    expected_version: int = Field(ge=1)


class OpeningWindow(Model):
    weekday: int = Field(ge=0, le=6)
    start_min: int = Field(ge=0, le=1439)
    end_min: int = Field(ge=1, le=2879)

    @model_validator(mode="after")
    def valid_window(self) -> "OpeningWindow":
        if not self.start_min < self.end_min <= self.start_min + 1440:
            raise ValueError("Giờ đóng cửa phải sau giờ mở cửa, tối đa 24 giờ.")
        return self


class PointHandoverUpdate(Model):
    entrance_label: str | None = Field(default=None, min_length=1, max_length=120)
    handover_instructions: str | None = Field(default=None, min_length=1, max_length=600)
    contact_phone: str | None = Field(default=None, pattern=r"^\+?[0-9]{7,15}$")
    website_url: str | None = Field(default=None, max_length=2048)
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator("website_url")
    @classmethod
    def valid_website(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = HttpUrl(value)
        normalized = str(url)
        if url.username or url.password or len(normalized) > 2048:
            raise ValueError("Website cần là liên kết HTTP hoặc HTTPS công khai, tối đa 2048 ký tự.")
        return normalized


class PointOperationUpdate(PointHandoverUpdate):
    staffed: bool | None = None
    always_open: bool | None = None
    opening_hours: list[OpeningWindow] | None = Field(default=None, max_length=28)
    capacity_state: Literal["unknown", "available", "limited", "full", "closed"] = "unknown"
    status_observed_at: datetime | None = None
    status_expires_at: datetime | None = None
