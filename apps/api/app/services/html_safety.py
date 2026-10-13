import re
from urllib.parse import unquote, urlsplit

import nh3

MEDIA_URL = re.compile(
    r"^/api/v1/media/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/file$"
)


def safe_link(value: str) -> str:
    decoded = unquote(value)
    if any(ord(c) < 32 for c in decoded) or "\\" in decoded:
        raise ValueError("Invalid link")
    url = urlsplit(decoded)
    if url.username or url.password:
        raise ValueError("Credentials are not allowed in links")
    if decoded.startswith("/") and not decoded.startswith("//") and not url.netloc:
        return value
    if decoded.startswith("#") and re.fullmatch(r"#[\w-]+", decoded):
        return value
    if url.scheme == "https" and url.hostname:
        return value
    raise ValueError("Only relative links or HTTPS are allowed")


def attributes(tag: str, name: str, value: str) -> str | None:
    if name == "href":
        try:
            return safe_link(value)
        except ValueError:
            return None
    if name == "src":
        return value if MEDIA_URL.fullmatch(value) else None
    return value


cleaner = nh3.Cleaner(
    tags={
        "p",
        "br",
        "h2",
        "h3",
        "h4",
        "strong",
        "em",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "img",
    },
    clean_content_tags={"script", "style", "iframe", "svg", "math", "object", "embed"},
    attributes={"a": {"href", "title"}, "img": {"src", "alt"}},
    attribute_filter=attributes,
    url_schemes={"https"},
    link_rel="noopener noreferrer",
)


def clean_html(value: str) -> str:
    return cleaner.clean(value)
