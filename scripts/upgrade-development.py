"""Upgrade this workspace's local Docker stack after a verified encrypted backup.

Never targets production or deletes volumes. Old revisions and business rows are verified.
"""

import argparse
import json
import runpy
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
backup_helpers = runpy.run_path(str(ROOT / "scripts/backup-development.py"))
container = backup_helpers["container"]
run = backup_helpers["run"]
signature_sql = backup_helpers["signature_sql"]


def compose(*arguments):
    return run(
        ["docker", "compose", "--profile", "tools", "--profile", "website", *arguments]
    )


def sql(identifier, statement):
    return run(
        [
            "docker",
            "exec",
            identifier,
            "psql",
            "-U",
            "postgres",
            "-d",
            "makan_landing",
            "-XqAt",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            statement,
        ]
    )


PAGE_SNAPSHOT = """SELECT COALESCE(json_agg(json_build_object(
 'id',p.id,'slug',p.slug,'type',p.page_type,'archived',p.is_archived,
 'published',p.published_revision_id IS NOT NULL,'title',r.title,'seo',r.seo_json,
 'payload',(r.content_json->'payload') - 'document') ORDER BY p.id),'[]')
 FROM pages p LEFT JOIN page_revisions r ON r.id=p.published_revision_id"""


def preserved_values(previous, current):
    """Allow schema defaults to be added, but never change an existing value/order."""
    if isinstance(previous, dict):
        return isinstance(current, dict) and all(
            key in current and preserved_values(value, current[key])
            for key, value in previous.items()
        )
    if isinstance(previous, list):
        return (
            isinstance(current, list)
            and len(previous) == len(current)
            and all(
                preserved_values(left, right)
                for left, right in zip(previous, current, strict=True)
            )
        )
    return type(previous) is type(current) and previous == current


def pages_preserved(previous, current):
    from app.schemas.cms import payload_adapter

    if len(previous) != len(current):
        return False
    for old, fresh in zip(previous, current, strict=True):
        if {k: v for k, v in old.items() if k != "payload"} != {
            k: v for k, v in fresh.items() if k != "payload"
        }:
            return False
        if not preserved_values(old["payload"], fresh["payload"]):
            return False
        if payload_adapter.validate_python(old["payload"]).model_dump(
            mode="json", exclude={"document"}
        ) != payload_adapter.validate_python(fresh["payload"]).model_dump(
            mode="json", exclude={"document"}
        ):
            return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Use images already built from this checkout",
    )
    args = parser.parse_args()
    database = container("db")
    container("api")
    if not args.skip_build:
        for service in ("api", "migrate", "maintenance", "web"):
            compose("build", service)
    backup_report = ROOT / "docs/qa/v2-step6/backup-verification.json"
    compose("stop", "web", "api", "maintenance")
    try:
        subprocess.run(
            [
                sys.executable,
                "-X",
                "utf8",
                str(ROOT / "scripts/backup-development.py"),
                "--report",
                str(backup_report),
            ],
            cwd=ROOT,
            check=True,
        )
    except BaseException:
        compose("start", "api", "web")
        raise
    backup = json.loads(backup_report.read_text(encoding="utf-8"))
    if not backup["exact_data_match"] or not (ROOT / backup["archive"]).is_file():
        raise RuntimeError("A restored and verified backup is required")
    pages_before = json.loads(sql(database, PAGE_SNAPSHOT))
    revisions = json.loads(
        sql(
            database,
            "SELECT COALESCE(json_agg(json_build_object('id',id,'digest',md5(to_jsonb(r)::text)) ORDER BY id),'[]') FROM page_revisions r",
        )
    )
    protected = ["admins", "leads", "lead_notes", "lead_status_history", "media_assets"]
    signatures = {
        name: json.loads(sql(database, "SET timezone='UTC'; " + signature_sql(name)))
        for name in protected
    }
    try:
        compose("run", "--rm", "migrate")
        compose("up", "-d", "--wait", "api")
        compose("exec", "-T", "api", "python", "-m", "app.commands.crm_backfill")
        conversion = json.loads(
            compose(
                "exec",
                "-T",
                "api",
                "python",
                "-m",
                "app.commands.upgrade_visual",
                "--apply",
                "--verified-backup",
                backup["archive"],
            )
        )
        if not pages_preserved(pages_before, json.loads(sql(database, PAGE_SNAPSHOT))):
            raise RuntimeError("Public page identity, original content or SEO changed")
        after = {
            value["id"]: value["digest"]
            for value in json.loads(
                sql(
                    database,
                    "SELECT COALESCE(json_agg(json_build_object('id',id,'digest',md5(to_jsonb(r)::text))),'[]') FROM page_revisions r",
                )
            )
        }
        if any(after.get(value["id"]) != value["digest"] for value in revisions):
            raise RuntimeError("An original revision changed")
        for name, signature in signatures.items():
            if (
                json.loads(sql(database, "SET timezone='UTC'; " + signature_sql(name)))
                != signature
            ):
                raise RuntimeError("Preserved business data changed in " + name)
        media_check = """from pathlib import Path
import hashlib,json
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import Settings
from app.db.session import build_engine
from app.models import MediaAsset
engine=build_engine(Settings())
with Session(engine) as session:
    assets=list(session.scalars(select(MediaAsset)))
    for asset in assets:
        file=Path('/srv/media') / asset.storage_key
        assert file.is_file() and file.stat().st_size==asset.size_bytes
        assert hashlib.sha256(file.read_bytes()).hexdigest()==asset.checksum_sha256
print(json.dumps({'verified_media':len(assets)}))
engine.dispose()
"""
        media = json.loads(compose("exec", "-T", "api", "python", "-c", media_check))
        compose("up", "-d", "--wait", "web", "maintenance")
        report = {
            "verified_at": datetime.now(UTC).isoformat(),
            "migration_head": sql(database, "SELECT version_num FROM alembic_version"),
            "backup": backup["archive"],
            "pages_preserved": len(pages_before),
            "original_revisions_unchanged": len(revisions),
            "business_tables_unchanged": protected,
            "converted_pages": conversion["upgraded"],
            "published_identity_content_seo_preserved": True,
            "production_modified": False,
            "media_files_verified": media["verified_media"],
        }
        (ROOT / "docs/qa/v2-step6/local-upgrade.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps(report))
    except BaseException:
        print(
            "Upgrade stopped. Encrypted backup is retained; no volumes were deleted. See docs/v2-data-preservation.md.",
            file=sys.stderr,
        )
        raise


if __name__ == "__main__":
    main()
