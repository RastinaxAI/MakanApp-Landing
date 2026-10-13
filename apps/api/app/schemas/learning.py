from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictBool, field_validator, model_validator

from app.schemas.common import PaginationQuery, StrictSchema
from app.services.aparat import video_id
from app.services.html_safety import clean_html, safe_link

Audience = Literal["manager", "teacher", "parent", "student"]
Level = Literal["beginner", "intermediate", "advanced"]
Topic = Literal["getting-started", "messenger", "class", "assignment", "exam", "reports"]


class Source(StrictSchema):
    title: str = Field(min_length=1, max_length=180)
    href: str = Field(max_length=500)
    _href = field_validator("href")(safe_link)


class LearningPayload(StrictSchema):
    kind: Literal["article", "video", "blog", "series"]
    headline: str = Field(min_length=1, max_length=180)
    summary: str = Field(default="", max_length=4000)
    body_html: str = Field(default="", max_length=64000)
    cover_media_id: UUID | None = None
    audiences: list[Audience] = Field(default_factory=list, max_length=4)
    level: Level = "beginner"
    topic: Topic = "getting-started"
    estimated_minutes: int = Field(default=5, ge=1, le=600)
    category_ids: list[UUID] = Field(default_factory=list, max_length=20)
    tag_ids: list[UUID] = Field(default_factory=list, max_length=30)
    related_ids: list[UUID] = Field(default_factory=list, max_length=12)
    item_ids: list[UUID] = Field(default_factory=list, max_length=100)
    featured: bool = False
    aparat_id: str | None = Field(default=None, max_length=200)
    duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    video_uploaded_at: datetime | None = None
    transcript_html: str = Field(default="", max_length=64000)
    sources: list[Source] = Field(default_factory=list, max_length=20)
    cta_label: str = Field(default="مشاهده امکانات ماکان", max_length=180)
    cta_href: str = Field(default="/features", max_length=500)
    _html = field_validator("body_html", "transcript_html")(clean_html)
    _href = field_validator("cta_href")(safe_link)

    @field_validator("aparat_id")
    @classmethod
    def aparat(cls, value):
        return video_id(value) if value else None

    @field_validator("video_uploaded_at")
    @classmethod
    def timezone(cls, value):
        if value and value.tzinfo is None:
            raise ValueError("Timezone required")
        return value

    @model_validator(mode="after")
    def coherent(self):
        for name in ("category_ids", "tag_ids", "related_ids", "item_ids", "audiences"):
            values = getattr(self, name)
            if len(values) != len(set(values)):
                raise ValueError(f"Duplicate {name}")
        if not self.headline.strip():
            raise ValueError("Nonblank headline required")
        if self.kind != "series" and self.item_ids:
            raise ValueError("Only series has items")
        if self.kind != "video" and (
            self.aparat_id
            or self.duration_seconds
            or self.video_uploaded_at
            or self.transcript_html
        ):
            raise ValueError("Video metadata belongs to videos")
        return self


class LibraryQuery(PaginationQuery):
    type: Literal["article", "video"] | None = None
    audience: Audience | None = None
    level: Level | None = None
    topic: Topic | None = None
    category: str | None = Field(default=None, max_length=160)
    tag: str | None = Field(default=None, max_length=160)
    q: str = Field(default="", max_length=100)
    sort: Literal["newest", "popular"] = "newest"
    featured: bool = False


class TaxonomyInput(StrictSchema):
    slug: Annotated[str, Field(min_length=1, max_length=160, pattern=r"^[\w]+(?:-[\w]+)*$")]
    title: str = Field(min_length=1, max_length=180)
    domain: Literal["learn", "blog"] = "learn"
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("title")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Nonblank title required")
        return value.strip()


class Taxonomy(TaxonomyInput):
    id: UUID


class TaxonomyQuery(PaginationQuery):
    domain: Literal["learn", "blog"] = "learn"


class ViewInput(StrictSchema):
    ticket: str = Field(min_length=40, max_length=500)
    consent: StrictBool = False
    policy_version: Literal["analytics-2026-10-13-v1"] | None = None
