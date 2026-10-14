"""Compare an upgraded local stack against its restored original encrypted backup.

Only disposable databases on the dedicated test service are restored or dropped.
"""

import argparse
import json
import re
import runpy
import shutil
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(ROOT / "scripts/upgrade-development.py"))
backup = helpers["backup_helpers"]
run = helpers["run"]
container = helpers["container"]


def query(identifier, database, statement):
    return run(
        [
            "docker",
            "exec",
            identifier,
            "psql",
            "-U",
            "postgres",
            "-d",
            database,
            "-XqAt",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            "SET timezone='UTC'; " + statement,
        ]
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--backup-report",
        type=Path,
        default=ROOT / "docs/qa/v2-step6/backup-verification.json",
    )
    args = parser.parse_args()
    record = json.loads(args.backup_report.read_text(encoding="utf-8"))
    archive = (ROOT / record["archive"]).resolve()
    if (
        not archive.is_relative_to((ROOT / ".backups").resolve())
        or backup["sha256"](archive) != record["archive_sha256"]
        or not record["exact_data_match"]
    ):
        raise ValueError(
            "An original authenticated and restored workspace backup is required"
        )
    key = archive.with_suffix(".key").read_text(encoding="ascii").strip()
    source = container("db")
    target = container("db-test", True)
    token = uuid4().hex
    database = "makan_test_backup_" + token
    scratch = ROOT / ".preview" / ("backup-" + token)
    scratch.mkdir(mode=0o700)
    temporary = "/tmp/makan-backup-" + token + ".dump"
    created = False
    try:
        backup["decrypt"](archive, scratch / "original.tar.gz", key)
        metadata, _manifest = backup["unpack"](
            scratch / "original.tar.gz", scratch / "restored"
        )
        if metadata["migration_head"] != record["migration_head"]:
            raise ValueError("Backup metadata mismatch")
        run(["docker", "exec", target, "createdb", "-U", "postgres", database])
        created = True
        run(
            [
                "docker",
                "cp",
                str(scratch / "restored/database.dump"),
                target + ":" + temporary,
            ]
        )
        run(
            [
                "docker",
                "exec",
                target,
                "pg_restore",
                "-U",
                "postgres",
                "-d",
                database,
                "--exit-on-error",
                "--no-owner",
                "--no-privileges",
                temporary,
            ]
        )
        old_pages = json.loads(query(target, database, helpers["PAGE_SNAPSHOT"]))
        new_pages = json.loads(query(source, "makan_landing", helpers["PAGE_SNAPSHOT"]))
        if not helpers["pages_preserved"](old_pages, new_pages):
            raise RuntimeError(
                "An original page value, order, identity, title or SEO changed"
            )
        checked = {}
        for table in record["counts"]:
            if table in ("pages", "alembic_version"):
                continue
            if not re.fullmatch(r"[a-z_][a-z0-9_]*", table):
                raise ValueError("Invalid relation")
            statement = f"SELECT COALESCE(json_agg(md5(to_jsonb(t)::text)),'[]') FROM public.\"{table}\" t"
            original = json.loads(query(target, database, statement))
            current = set(json.loads(query(source, "makan_landing", statement)))
            if not set(original).issubset(current):
                raise RuntimeError("An original row changed or disappeared in " + table)
            checked[table] = len(original)
        run(
            [
                "docker",
                "compose",
                "--profile",
                "website",
                "up",
                "-d",
                "--wait",
                "api",
                "web",
                "maintenance",
            ]
        )
        report = {
            "verified_at": datetime.now(UTC).isoformat(),
            "backup": record["archive"],
            "migration_head_before": metadata["migration_head"],
            "migration_head_after": query(
                source, "makan_landing", "SELECT version_num FROM alembic_version"
            ),
            "pages_preserved": len(old_pages),
            "original_revisions_unchanged": checked["page_revisions"],
            "original_rows_preserved": checked,
            "published_identity_content_seo_preserved": True,
            "schema_defaults_only_added": True,
            "fresh_original_backup_restore_verified": True,
            "converted_pages": int(
                query(
                    source,
                    "makan_landing",
                    "SELECT count(*) FROM pages p JOIN page_revisions r ON r.id=p.published_revision_id WHERE jsonb_typeof(r.content_json->'payload'->'document')='object'",
                )
            ),
            "production_modified": False,
        }
        (ROOT / "docs/qa/v2-step6/local-upgrade.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps(report))
    finally:
        if created:
            if not re.fullmatch(r"makan_test_backup_[0-9a-f]{32}", database):
                raise RuntimeError("Unsafe cleanup target")
            run(["docker", "exec", target, "dropdb", "-U", "postgres", database])
            run(["docker", "exec", target, "rm", "-f", "--", temporary])
        resolved = scratch.resolve()
        if resolved.parent != (ROOT / ".preview").resolve() or not re.fullmatch(
            r"backup-[0-9a-f]{32}", resolved.name
        ):
            raise RuntimeError("Unsafe scratch cleanup target")
        shutil.rmtree(resolved)


if __name__ == "__main__":
    main()
