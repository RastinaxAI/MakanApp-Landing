"""One publication predicate for metadata and partitioned crawl manifests."""

from urllib.parse import quote, urlsplit

from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session

from app.models import Page, PageRevision
from app.services import cms, site_settings

RESERVED_PAGE_SLUGS = ("home", "admin", "api", "design-system", "sitemaps", "robots", "sitemap")
LEARNING_KINDS = ("article", "video", "blog", "series")
SHARD_SIZE = 1000


def origin(session: Session) -> str | None:
    value = site_settings.read(session).general.site_url
    if not value:
        return None
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
    ):
        return None
    return value.rstrip("/")


def published():
    return (
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == cms.effective_id(cms.now_utc()))
        .where(
            Page.is_archived.is_(False),
            PageRevision.content_json["visibility"].as_boolean().is_(True),
        )
    )


def path_for(page: Page) -> str | None:
    slug = page.slug.split(":", 1)[-1]
    segment = quote(slug, safe="-_")
    if page.page_type == "home" and slug == "home":
        return "/"
    if page.page_type == "page" and slug not in RESERVED_PAGE_SLUGS:
        return "/" + segment
    prefix = {
        "feature": "/features/",
        "audience": "/solutions/",
        "article": "/learn/articles/",
        "video": "/learn/videos/",
        "blog": "/blog/",
        "series": "/learn/series/",
    }.get(page.page_type)
    return prefix + segment if prefix else None


def eligible(group: str | None = None):
    # Libraries without published entries and legal drafts have no indexable representation.
    child = Page.__table__.alias("child_page")
    revision = PageRevision.__table__.alias("child_revision")
    from sqlalchemy import case

    effective = case(
        (
            child.c.scheduled_revision_id.is_not(None) & (child.c.scheduled_at <= cms.now_utc()),
            child.c.scheduled_revision_id,
        ),
        else_=child.c.published_revision_id,
    )
    has_learn = exists(
        select(child.c.id)
        .join(revision, revision.c.id == effective)
        .where(
            child.c.is_archived.is_(False),
            revision.c.content_json["visibility"].as_boolean().is_(True),
            child.c.page_type.in_(LEARNING_KINDS[:2] + ("series",)),
        )
    )
    has_blog = exists(
        select(child.c.id)
        .join(revision, revision.c.id == effective)
        .where(
            child.c.is_archived.is_(False),
            revision.c.content_json["visibility"].as_boolean().is_(True),
            child.c.page_type == "blog",
        )
    )
    statement = published().where(
        PageRevision.indexable.is_(True),
        func.coalesce(PageRevision.content_json["payload"]["legal_draft"].as_boolean(), False).is_(
            False
        ),
        or_(
            Page.page_type.in_(("feature", "audience", *LEARNING_KINDS)),
            (Page.page_type == "home") & (Page.slug == "home:home"),
            (Page.page_type == "page")
            & Page.slug.not_in(["page:" + s for s in RESERVED_PAGE_SLUGS]),
        ),
        or_(Page.slug != "page:learn", has_learn),
        or_(Page.slug != "page:blog", has_blog),
    )
    if group:
        statement = statement.where(
            Page.page_type.in_(LEARNING_KINDS)
            if group == "learning"
            else Page.page_type.not_in(LEARNING_KINDS)
        )
    return statement


def counts(session: Session):
    return {
        group: session.scalar(select(func.count()).select_from(eligible(group).subquery()))
        for group in ("pages", "learning")
    }


def is_indexable(session: Session, path: str) -> bool:
    # The number of eligible marketing templates is bounded. Learning slug queries are selective.
    from urllib.parse import unquote

    decoded = unquote(path)
    slug = decoded.rstrip("/").split("/")[-1] if decoded != "/" else "home"
    rows = session.execute(
        eligible().where(
            Page.slug.in_(
                [
                    cms.key(kind, slug)
                    for kind in ("home", "page", "feature", "audience", *LEARNING_KINDS)
                ]
            )
        )
    )
    normalized = quote(decoded, safe="/-_")
    return any(path_for(page) == normalized for page, _ in rows)
