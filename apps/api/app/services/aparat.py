"""Never fetch arbitrary remote URLs or accept author-supplied embed HTML."""

import re
from urllib.parse import urlsplit


def video_id(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9]{5,24}", value):
        return value
    url = urlsplit(value)
    if (
        url.scheme != "https"
        or url.netloc not in {"aparat.com", "www.aparat.com"}
        or url.query
        or url.fragment
    ):
        raise ValueError("Use an Aparat ID or an HTTPS aparat.com/v/ID URL")
    match = re.fullmatch(r"/v/([A-Za-z0-9]{5,24})/?", url.path)
    if not match:
        raise ValueError("Invalid Aparat video path")
    return match.group(1)


def embed_url(value: str) -> str:
    return f"https://www.aparat.com/video/video/embed/videohash/{video_id(value)}/vt/frame"
