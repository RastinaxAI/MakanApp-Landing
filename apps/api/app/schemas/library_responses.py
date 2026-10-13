from pydantic import Field

from app.schemas.cms import PublicContent
from app.schemas.common import StrictSchema
from app.schemas.learning import Taxonomy


class LibraryContent(PublicContent):
    qualified_views: int = Field(default=0, ge=0)
    categories: list[Taxonomy] = Field(default_factory=list)
    tags: list[Taxonomy] = Field(default_factory=list)


class LibraryDetail(LibraryContent):
    related: list[LibraryContent] = Field(default_factory=list)
    items: list[LibraryContent] = Field(default_factory=list)
    series: list[LibraryContent] = Field(default_factory=list)
    previous: LibraryContent | None = None
    next: LibraryContent | None = None
    active_series: str | None = None


class ViewTicket(StrictSchema):
    ticket: str


class ViewResult(StrictSchema):
    counted: bool
