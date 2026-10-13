from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import StrictSchema


class SeoStatus(StrictSchema):
    origin: str | None
    enabled: bool
    shard_size: int
    counts: dict[str, int]


class SeoPage(StrictSchema):
    indexable: bool


class CrawlEntry(StrictSchema):
    path: str
    updated_at: datetime


class CrawlManifest(StrictSchema):
    items: list[CrawlEntry]


class CrawlQuery(StrictSchema):
    group: Literal["pages", "learning"] = "pages"
    shard: int = Field(default=0, ge=0, le=100000)
