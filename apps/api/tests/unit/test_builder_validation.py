import pytest
from pydantic import ValidationError

from app.schemas.builder import VisualDocument
from app.schemas.cms import ContentInput


def node(kind="Heading", identifier="heading_1", **props):
    return {"id": identifier, "type": kind, "props": props}


def test_visual_tree_nested_styles_and_server_sanitization():
    value = VisualDocument.model_validate(
        {
            "nodes": [
                {
                    **node("Container", "layout_1"),
                    "styles": {
                        "base": {"display": "grid", "columns": 2, "color": "global:primary"},
                        "mobile": {"columns": 1},
                    },
                    "children": [
                        node(
                            "RichText",
                            body_html='<script>alert(1)</script><p onclick="x()">متن</p>',
                        ),
                        node("Video", "video_1", aparat_id="https://www.aparat.com/v/abc12"),
                    ],
                },
            ]
        }
    )
    assert len(value.all_nodes()) == 3
    assert value.nodes[0].children[0].props.body_html == "<p>متن</p>"
    assert value.nodes[0].children[1].props.aparat_id == "abc12"


@pytest.mark.parametrize(
    "value",
    [
        {"nodes": [node(), node()]},
        {"nodes": [node("Unknown")]},
        {"nodes": [{**node(), "children": [node(identifier="child")]}]},
        {"nodes": [{**node(), "styles": {"base": {"color": "red;position:fixed"}}}]},
        {"nodes": [{**node(), "styles": {"base": {"color": "global:missing"}}}]},
        {"nodes": [{**node(), "styles": {"base": {"width": "url(https://example.test)"}}}]},
        {"nodes": [{**node(), "styles": {"base": {"padding": 100000}}}]},
        {"nodes": [node(href="javascript:alert(1)")]},
        {"nodes": [node("Video", aparat_id="https://evil.test/v/abc12")]},
        {"nodes": [node("LegacySection")]},
        {"nodes": [node(executable_script="alert(1)")]},
    ],
)
def test_unsafe_unknown_or_inconsistent_documents_rejected(value):
    with pytest.raises(ValidationError):
        VisualDocument.model_validate(value)


def test_depth_limit_and_legacy_input_compatibility():
    current = node()
    for index in range(11):
        current = {**node("Container", f"container_{index}"), "children": [current]}
    with pytest.raises(ValidationError):
        VisualDocument.model_validate({"nodes": [current]})
    legacy = ContentInput.model_validate(
        {
            "title": "صفحه",
            "slug": "sample",
            "payload": {"kind": "page", "headline": "عنوان", "summary": "", "sections": []},
        }
    )
    assert legacy.payload.document is None
