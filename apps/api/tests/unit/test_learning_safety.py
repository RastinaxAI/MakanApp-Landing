from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.learning import LearningPayload
from app.services.aparat import embed_url, video_id
from app.services.html_safety import clean_html
from app.services.learning_html import decorate


@pytest.mark.parametrize(
    "value", ["abc12", "https://aparat.com/v/abc12", "https://www.aparat.com/v/abc12/"]
)
def test_aparat_allowlist_normalization(value):
    assert video_id(value) == "abc12"
    assert embed_url(value) == "https://www.aparat.com/video/video/embed/videohash/abc12/vt/frame"


@pytest.mark.parametrize(
    "value",
    [
        "http://aparat.com/v/abc12",
        "https://aparat.com.evil.test/v/abc12",
        "https://evil.test/v/abc12",
        "https://aparat.com@evil.test/v/abc12",
        "https://aparat.com:443/v/abc12",
        "https://aparat.com/v/%61bc12",
        "https://aparat.com/v/abc12?autoplay=1",
        "https://aparat.com/v/abc12#x",
        "//aparat.com/v/abc12",
        "<iframe></iframe>",
        "x",
        "../abc12",
    ],
)
def test_aparat_rejects_unsafe_or_ambiguous_input(value):
    with pytest.raises(ValueError):
        video_id(value)


def test_html_toc_images_escape_and_missing_source():
    media_id = str(uuid4())
    html = clean_html(
        '<h2 id="evil">First &amp; safe</h2><h3>Second</h3>'
        f'<img src="/api/v1/media/{media_id}/file" onerror="alert(1)"><img>'
        '<iframe src="https://evil.test"></iframe><script>alert(1)</script>'
    )
    rendered, toc = decorate(
        html, [{"id": media_id, "width": 24, "height": 16, "alt_text": 'A "safe" <alt>'}]
    )
    assert toc == [
        {"id": "section-1", "text": "First & safe", "level": 2},
        {"id": "section-2", "text": "Second", "level": 3},
    ]
    assert 'width="24"' in rendered and 'height="16"' in rendered and 'loading="lazy"' in rendered
    assert "&quot;safe&quot; &lt;alt&gt;" in rendered
    assert "iframe" not in rendered and "script" not in rendered and "onerror" not in rendered


def test_payload_cross_kind_and_duplicate_references():
    with pytest.raises(ValidationError):
        LearningPayload(kind="article", headline="text", aparat_id="abc12")
    with pytest.raises(ValidationError):
        LearningPayload(kind="series", headline="text", item_ids=[uuid4()] * 2)
    with pytest.raises(ValidationError):
        LearningPayload(kind="video", headline="text", embed_url="https://evil.test")
