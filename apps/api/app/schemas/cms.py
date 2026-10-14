from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import EmailStr, Field, TypeAdapter, field_validator, model_validator

from app.schemas.builder import VisualDocument
from app.schemas.common import PaginationQuery, StrictSchema
from app.schemas.learning import LearningPayload
from app.services.html_safety import clean_html, safe_link

Short = Annotated[str, Field(max_length=180)]
Text = Annotated[str, Field(max_length=4000)]
Slug = Annotated[str, Field(min_length=1, max_length=160, pattern=r"^[\w]+(?:-[\w]+)*$")]
Kind = Literal["home", "page", "feature", "audience", "faq", "article", "video", "blog", "series"]


class Block(StrictSchema):
    title: Short
    description: Text
    href: str | None = Field(default=None, max_length=500)
    media_id: UUID | None = None

    @field_validator("href")
    @classmethod
    def link(cls, value):
        return safe_link(value) if value else value


class Section(StrictSchema):
    type: Literal[
        "hero",
        "challenge",
        "features",
        "audiences",
        "product-experience",
        "experience",
        "trust",
        "benefits",
        "onboarding",
        "faq",
        "final-cta",
        "rich-text",
        "cards",
        "gallery",
    ]
    schema_version: Literal[1] = 1
    title: Short = ""
    accent: Short = ""
    kicker: Short = ""
    description: Text = ""
    body_html: str = Field(default="", max_length=64000)
    items: list[Block] = Field(default_factory=list, max_length=24)
    media_id: UUID | None = None
    cta_label: Short = ""
    cta_href: str = Field(default="/demo", max_length=500)
    faq_slugs: list[Slug] = Field(default_factory=list, max_length=24)

    _html = field_validator("body_html")(clean_html)
    _link = field_validator("cta_href")(safe_link)


class LandingPayload(StrictSchema):
    kind: Literal["home", "page"]
    eyebrow: Short = ""
    headline: Short
    summary: Text
    sections: list[Section] = Field(default_factory=list, max_length=24)
    legal_draft: bool = False
    document: VisualDocument | None = None

    @model_validator(mode="after")
    def unique_home_sections(self):
        if self.document is not None:
            return self
        if self.kind == "home":
            types = [section.type for section in self.sections]
            if types.count("hero") != 1:
                raise ValueError("Home requires exactly one hero")
        elif any(section.type == "hero" for section in self.sections):
            raise ValueError("Pages use their headline as the only H1")
        return self


class FeaturePayload(StrictSchema):
    kind: Literal["feature"]
    title: Short
    eyebrow: Short
    headline: Short
    summary: Text
    readiness: Literal["available", "partial", "roadmap"]
    benefits: list[Block] = Field(max_length=24)
    workflow: list[Block] = Field(max_length=24)
    boundary: Text
    audience: Slug
    icon: Literal["messenger", "school", "reports", "ai"] = "school"
    evidence_reference: str = Field(default="", max_length=500)
    image_media_id: UUID | None = None
    body_html: str = Field(default="", max_length=64000)
    _html = field_validator("body_html")(clean_html)


class AudiencePayload(StrictSchema):
    kind: Literal["audience"]
    title: Short
    eyebrow: Short
    headline: Short
    summary: Text
    pains: list[Text] = Field(max_length=24)
    benefits: list[Block] = Field(max_length=24)
    journey: list[Block] = Field(max_length=24)
    related: list[Slug] = Field(max_length=24)
    cta: Short
    cta_href: str = Field(default="/features", max_length=500)
    boundary: Text
    body_html: str = Field(default="", max_length=64000)
    _html = field_validator("body_html")(clean_html)
    _link = field_validator("cta_href")(safe_link)


class FaqPayload(StrictSchema):
    kind: Literal["faq"]
    question: Short
    answer: Text
    answer_html: str = Field(default="", max_length=64000)
    _html = field_validator("answer_html")(clean_html)


Payload = Annotated[
    LandingPayload | FeaturePayload | AudiencePayload | FaqPayload | LearningPayload,
    Field(discriminator="kind"),
]
payload_adapter = TypeAdapter(Payload)


class Seo(StrictSchema):
    title: str = Field(default="", max_length=180)
    description: str = Field(default="", max_length=500)
    og_media_id: UUID | None = None
    indexable: bool = False


class ContentInput(StrictSchema):
    slug: Slug
    title: Annotated[str, Field(min_length=1, max_length=180)]
    payload: Payload
    seo: Seo = Field(default_factory=Seo)
    visibility: bool = True
    sort_order: int = Field(default=0, ge=0, le=10000)
    category_id: UUID | None = None

    @field_validator("title")
    @classmethod
    def meaningful_title(cls, value):
        if not value.strip():
            raise ValueError("A non-blank title is required")
        return value.strip()

    @model_validator(mode="after")
    def routable_page(self):
        if self.payload.kind == "page" and self.slug.lower() in {
            "home",
            "admin",
            "api",
            "design-system",
            "robots",
            "sitemap",
        }:
            raise ValueError("This page slug is reserved")
        return self


class RevisionAction(StrictSchema):
    revision_id: UUID


class ScheduleAction(RevisionAction):
    publish_at: datetime

    @field_validator("publish_at")
    @classmethod
    def timezone_required(cls, value):
        if value.tzinfo is None:
            raise ValueError("Timezone is required")
        return value


class ContentQuery(PaginationQuery):
    kind: Kind | None = None
    status: Literal["draft", "published", "scheduled", "archived"] | None = None
    q: str = Field(default="", max_length=100)
    category_id: UUID | None = None


class ImageRef(StrictSchema):
    id: UUID
    width: int
    height: int
    alt_text: str


class PublicContent(StrictSchema):
    id: UUID
    slug: str
    kind: Kind
    title: str
    revision_id: UUID
    revision_no: int
    payload: dict
    seo: Seo
    visibility: bool
    sort_order: int
    category_id: UUID | None
    published_at: datetime | None
    reviewed_at: datetime | None
    updated_at: datetime
    media: list[ImageRef] = Field(default_factory=list)


class AdminContent(PublicContent):
    publication_state: Literal["draft", "published", "scheduled", "archived"]
    row_version: int
    working_revision_id: UUID | None
    published_revision_id: UUID | None
    scheduled_revision_id: UUID | None
    scheduled_at: datetime | None
    is_archived: bool


class RevisionInfo(StrictSchema):
    id: UUID
    revision_no: int
    title: str
    created_at: datetime
    created_by: UUID | None
    published_at: datetime | None


class CategoryInput(StrictSchema):
    slug: Slug
    title: Annotated[str, Field(min_length=1, max_length=180)]
    sort_order: int = Field(default=0, ge=0, le=10000)


class Category(CategoryInput):
    id: UUID


class GeneralSettings(StrictSchema):
    brand_name: str = Field(default="ماکان", min_length=1, max_length=100)
    tagline: str = Field(default="ارتباط و مدیریت آموزش، در یک فضای یکپارچه", max_length=300)
    app_url: str | None = Field(default=None, max_length=500)
    site_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=30, pattern=r"^\+?[0-9][0-9 ()-]{5,24}$")
    email: EmailStr | None = None
    logo_media_id: UUID | None = None
    logo_approved: bool = False

    @field_validator("app_url", "site_url")
    @classmethod
    def https(cls, value):
        if value and not value.startswith("https://"):
            raise ValueError("HTTPS required")
        return safe_link(value) if value else value

    @model_validator(mode="after")
    def approved_logo(self):
        if self.logo_media_id and not self.logo_approved:
            raise ValueError("Official logo approval is required")
        return self


class SeoSettings(StrictSchema):
    default_title: str = Field(default="ماکان | ارتباط و مدیریت آموزش", max_length=180)
    default_description: str = Field(default="", max_length=500)
    og_media_id: UUID | None = None


class SettingsInput(StrictSchema):
    general: GeneralSettings
    seo: SeoSettings


class SettingsOutput(SettingsInput):
    row_version: int


class MediaInfo(StrictSchema):
    id: UUID
    original_filename: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    alt_text: str
    visibility: Literal["private", "public"]
    created_at: datetime


class MediaUpdate(StrictSchema):
    alt_text: str = Field(min_length=1, max_length=500)
    make_public: bool = False
