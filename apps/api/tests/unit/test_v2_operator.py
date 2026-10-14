import copy
import json
import runpy
from pathlib import Path

from app.schemas.cms import payload_adapter

ROOT = Path(__file__).resolve().parents[4]
helpers = runpy.run_path(str(ROOT / "scripts/upgrade-development.py"))


def test_preservation_accepts_added_defaults_without_changing_existing_values():
    assert helpers["preserved_values"](
        {"items": [{"title": "original"}]}, {"items": [{"title": "original", "media_id": None}]}
    )
    assert not helpers["preserved_values"]({"title": "original"}, {"title": "changed"})
    assert not helpers["preserved_values"]({"value": None}, {"value": "replacement"})
    assert not helpers["preserved_values"]({"value": False}, {"value": 0})


def test_preservation_rejects_list_reordering_and_removed_fields():
    assert not helpers["preserved_values"]([{"id": 1}, {"id": 2}], [{"id": 2}, {"id": 1}])
    assert not helpers["preserved_values"]({"title": "original"}, {})
    assert not helpers["preserved_values"]([1, 2], [1, 2, 3])


def test_page_comparison_allows_only_current_schema_defaults_and_preserves_metadata():
    manifest = json.loads(
        (ROOT / "apps/api/app/data/initial-marketing.json").read_text(encoding="utf-8")
    )
    payload = next(row["payload"] for row in manifest["records"] if row["slug"] == "about")
    old = [
        {
            "id": "test",
            "slug": "page:about",
            "title": "original",
            "seo": {},
            "payload": copy.deepcopy(payload),
        }
    ]
    fresh = copy.deepcopy(old)
    fresh[0]["payload"] = payload_adapter.validate_python(payload).model_dump(
        mode="json", exclude={"document"}
    )
    assert helpers["pages_preserved"](old, fresh)
    fresh[0]["title"] = "changed"
    assert not helpers["pages_preserved"](old, fresh)
    fresh[0]["title"] = "original"
    fresh[0]["payload"]["summary"] = "changed"
    assert not helpers["pages_preserved"](old, fresh)
