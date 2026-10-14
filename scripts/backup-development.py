"""Encrypted dev backup + exact restore verification in a fresh dedicated test database.

Never restores or deletes a database on the source instance. Production uses production.py.
"""

import json
import re
import secrets
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from app.operations.backup_crypto import decrypt, encrypt, pack, sha256, unpack  # noqa: E402


def run(arguments):
    result = subprocess.run(arguments, cwd=ROOT, capture_output=True, check=True)
    return result.stdout.decode("utf-8").strip()


def container(service, test=False):
    arguments = ["docker", "compose"]
    if test:
        arguments += ["--env-file", ".env.test", "-f", "compose.test.yaml"]
    identifier = run([*arguments, "ps", "-q", service])
    if not re.fullmatch(r"[0-9a-f]{64}", identifier):
        raise RuntimeError("Expected local container is unavailable")
    facts = json.loads(run(["docker", "inspect", identifier]))[0]
    labels = facts["Config"]["Labels"]
    expected = "makan-landing-test" if test else "makan-landing-dev"
    if labels.get("com.docker.compose.project") != expected or Path(labels.get("com.docker.compose.project.working_dir", "")).resolve() != ROOT:
        raise RuntimeError("Container does not belong to this development workspace")
    return identifier


class Snapshot:
    def __init__(self, identifier):
        self.process = subprocess.Popen(["docker", "exec", "-i", identifier, "psql", "-U", "postgres", "-d", "makan_landing", "-XqAt", "-v", "ON_ERROR_STOP=1"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")
        self.identifier = self.query("SET statement_timeout='15s'; SET timezone='UTC'; BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot()")
        if not re.fullmatch(r"[0-9A-F-]+", self.identifier):
            raise RuntimeError("Snapshot identity is invalid")

    def query(self, statement):
        self.process.stdin.write(statement + ";\n")
        self.process.stdin.flush()
        value = self.process.stdout.readline().strip()
        if not value:
            raise RuntimeError("Snapshot query failed")
        return value

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.write("ROLLBACK;\n\\q\n")
            self.process.stdin.flush()
            self.process.communicate(timeout=15)


def signature_sql(table):
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", table):
        raise RuntimeError("Unexpected relation identifier")
    return f'''SELECT json_build_object('rows', count(*), 'digest', md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text), '')))::text FROM public."{table}" t'''


def main():
    identifier = uuid4().hex
    stage = ROOT / ".preview" / ("backup-" + identifier)
    directory = ROOT / ".backups"
    stage.mkdir(parents=True, mode=0o700)
    directory.mkdir(exist_ok=True, mode=0o700)
    source_db = container("db")
    source_api = container("api")
    test_db = container("db-test", True)
    snapshot = Snapshot(source_db)
    database = "makan_test_backup_" + identifier
    temporary = "/tmp/makan-backup-" + identifier + ".dump"
    created = False
    key = secrets.token_hex(32)
    archive = directory / ("v2-before-upgrade-" + identifier + ".enc")
    key_file = archive.with_suffix(".key")
    environment = directory / ("v2-environment-" + identifier + ".enc")
    try:
        tables = json.loads(snapshot.query("SELECT json_agg(tablename ORDER BY tablename)::text FROM pg_tables WHERE schemaname='public'"))
        signatures = {table: json.loads(snapshot.query(signature_sql(table))) for table in tables}
        head = snapshot.query("SELECT version_num FROM alembic_version")
        media = json.loads(snapshot.query("SELECT COALESCE(json_agg(json_build_object('file',storage_key,'sha',checksum_sha256,'size',size_bytes)), '[]'::json)::text FROM media_assets"))
        run(["docker", "exec", source_db, "pg_dump", "-U", "postgres", "-d", "makan_landing", "-Fc", "--snapshot=" + snapshot.identifier, "-f", temporary])
        run(["docker", "cp", source_db + ":" + temporary, str(stage / "database.dump")])
        (stage / "media").mkdir()
        run(["docker", "cp", source_api + ":/srv/media/.", str(stage / "media")])
        for asset in media:
            if not re.fullmatch(r"[0-9a-f]{32}\.webp", asset["file"]):
                raise RuntimeError("Unexpected media filename")
            file = stage / "media" / asset["file"]
            if file.stat().st_size != asset["size"] or sha256(file) != asset["sha"]:
                raise RuntimeError("Media differs from the database snapshot")
        snapshot.close()
        metadata = {"format": 1, "created_at": datetime.now(UTC).isoformat(), "migration_head": head, "source_commit": run(["git", "rev-parse", "HEAD"])}
        pack(stage, stage / "snapshot.tar.gz", metadata)
        with key_file.open("x", encoding="ascii") as stream:
            stream.write(key + "\n")
        encrypt(stage / "snapshot.tar.gz", archive, key)
        encrypt(ROOT / ".env", environment, key)
        decrypt(archive, stage / "verified.tar.gz", key)
        restored_metadata, manifest = unpack(stage / "verified.tar.gz", stage / "verified")
        decrypt(environment, stage / "verified.env", key)
        if (stage / "verified.env").read_bytes() != (ROOT / ".env").read_bytes():
            raise RuntimeError("Environment backup verification failed")
        run(["docker", "exec", test_db, "createdb", "-U", "postgres", database])
        created = True
        run(["docker", "cp", str(stage / "verified/database.dump"), test_db + ":" + temporary])
        run(["docker", "exec", test_db, "pg_restore", "-U", "postgres", "-d", database, "--exit-on-error", "--no-owner", "--no-privileges", temporary])
        for table, expected in signatures.items():
            value = json.loads(run(["docker", "exec", test_db, "psql", "-U", "postgres", "-d", database, "-XqAt", "-c", "SET timezone='UTC'; " + signature_sql(table)]))
            if value != expected:
                raise RuntimeError("Restored data differs in relation " + table)
        report = {"verified_at": datetime.now(UTC).isoformat(), "source_commit": metadata["source_commit"], "migration_head": restored_metadata["migration_head"], "tables_verified": len(tables), "counts": {table: item["rows"] for table, item in signatures.items()}, "media_files_verified": len(media), "authenticated_encryption": True, "checksums_verified": True, "exact_data_match": True, "fresh_test_database_restored": True, "source_database_modified": False, "archive": archive.relative_to(ROOT).as_posix(), "archive_sha256": sha256(archive), "environment_encrypted": True}
        report_path = ROOT / "docs/qa/v2-step4/backup-verification.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"backup": report["archive"], "tables_verified": len(tables), "exact_data_match": True, "report": report_path.relative_to(ROOT).as_posix()}))
    finally:
        snapshot.close()
        if created:
            if not re.fullmatch(r"makan_test_backup_[0-9a-f]{32}", database):
                raise RuntimeError("Unsafe verification cleanup target")
            run(["docker", "exec", test_db, "dropdb", "-U", "postgres", database])
        run(["docker", "exec", source_db, "rm", "-f", "--", temporary])
        run(["docker", "exec", test_db, "rm", "-f", "--", temporary])
        resolved = stage.resolve()
        if resolved.parent != (ROOT / ".preview").resolve() or not re.fullmatch(r"backup-[0-9a-f]{32}", resolved.name):
            raise RuntimeError("Unsafe plaintext staging cleanup target")
        shutil.rmtree(resolved)


if __name__ == "__main__":
    main()
