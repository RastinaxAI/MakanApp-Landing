"""Cross-platform operator CLI. Only this repository's explicitly named prod projects."""

import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import sys
import tarfile
import tempfile
from contextlib import contextmanager, nullcontext
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.exceptions import InvalidTag

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from app.operations.backup_crypto import decrypt, encrypt, pack, sha256, unpack

PROJECT = re.compile(
    r"makan-landing-(?:prod|staging|acceptance|restore)(?:-[a-z0-9]+)*"
)
KEYS = (
    "POSTGRES_PASSWORD",
    "MIGRATION_DB_PASSWORD",
    "API_DB_PASSWORD",
    "AUTH_SECRET",
    "AUTH_MFA_KEY",
    "PROXY_SHARED_SECRET",
    "BACKUP_ENCRYPTION_KEY",
)
SERVICES = ("api", "web", "maintenance", "caddy")


def read_env(path: Path):
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.fullmatch(r"([A-Z_]+)=(.*)", line)
        if not match or match[1] in values:
            raise ValueError("Invalid or duplicate environment assignment")
        values[match[1]] = match[2]
    if not PROJECT.fullmatch(values.get("COMPOSE_PROJECT_NAME", "")):
        raise ValueError(
            "Only explicitly named production/staging/acceptance/restore projects are allowed"
        )
    for key in KEYS:
        if not re.fullmatch(r"[a-f0-9]{64}", values.get(key, "")):
            raise ValueError(f"Missing or invalid independent key: {key}")
    if len({values[k] for k in KEYS}) != len(KEYS):
        raise ValueError("Keys and database role passwords must all be independent")
    origin = urlsplit(values.get("PUBLIC_ORIGIN", ""))
    if (
        origin.scheme != "https"
        or origin.hostname != values.get("SITE_DOMAIN")
        or origin.path
        or origin.query
        or origin.fragment
        or origin.username
        or origin.password
    ):
        raise ValueError(
            "A matching, exact public HTTPS origin and hostname are required"
        )
    if not re.fullmatch(
        r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?", values["SITE_DOMAIN"]
    ):
        raise ValueError("Use a DNS hostname (IDNs in ASCII form)")
    if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", values.get("POSTGRES_DB", "")):
        raise ValueError("Unsafe database identifier")
    if values.get("APP_ENV") not in ("production", "staging"):
        raise ValueError(
            "Production Compose requires production or staging configuration"
        )
    if values.get("CADDY_CONFIG") == "/etc/caddy/Caddyfile.local" and (
        not values["COMPOSE_PROJECT_NAME"].startswith(
            ("makan-landing-acceptance-", "makan-landing-restore-")
        )
        or values["SITE_DOMAIN"] != "localhost"
        or any(values.get(k) != "127.0.0.1" for k in ("HTTP_BIND", "HTTPS_BIND"))
    ):
        raise ValueError(
            "Internal-CA mode is restricted to isolated loopback acceptance/restore projects"
        )
    if not 1 <= int(values.get("BACKUP_RETENTION_DAYS", "7")) <= 365:
        raise ValueError("Backup retention must be between one and 365 days")
    if not 1 <= (origin.port or 443) <= 65535:
        raise ValueError("Invalid public port")
    return values


class Operator:
    def __init__(self, env_file: Path):
        self.env_file = env_file.resolve()
        self.values = read_env(self.env_file)
        self.project = self.values["COMPOSE_PROJECT_NAME"]
        self.prefix = [
            "docker",
            "compose",
            "-p",
            self.project,
            "-f",
            str(ROOT / "compose.production.yaml"),
            "--env-file",
            str(self.env_file),
        ]

    @contextmanager
    def lock(self):
        directory = ROOT / ".ops"
        directory.mkdir(mode=0o700, exist_ok=True)
        path = directory / (self.project + ".lock")
        token = json.dumps(
            {
                "pid": os.getpid(),
                "created_at": datetime.now(UTC).isoformat(),
                "token": secrets.token_hex(16),
            }
        )
        with path.open("x", encoding="utf-8") as handle:
            os.chmod(path, 0o600)
            handle.write(token)
        try:
            yield
        finally:
            if path.read_text(encoding="utf-8") == token:
                path.unlink()

    def run(
        self, *args, input=None, output=None, environment=None, check=True, source=None
    ):
        if (
            args
            and args[0] == "up"
            and "--wait" in args
            and "--wait-timeout" not in args
        ):
            args = (*args, "--wait-timeout", "180")
        result = subprocess.run(
            [*self.prefix, *args],
            cwd=ROOT,
            check=False,
            stdin=source,
            input=input,
            stdout=output or subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
        )
        if check and result.returncode:
            diagnostic = self.env_file.parent / ".ops" / (self.project + "-error.log")
            diagnostic.parent.mkdir(mode=0o700, exist_ok=True)
            diagnostic.write_bytes(result.stderr or b"Operator command failed")
            os.chmod(diagnostic, 0o600)
            # Do not echo resolved Compose env, DB exceptions or argv to the public report.
            raise RuntimeError(
                "Operator command failed; inspect service health and private diagnostics"
            )
        return result

    def containers(self):
        raw = self.run("ps", "--all", "--format", "json").stdout.decode()
        if not raw.strip():
            return []
        parsed = (
            json.loads(raw)
            if raw.lstrip().startswith("[")
            else [json.loads(line) for line in raw.splitlines()]
        )
        for row in parsed:
            if row.get("Project") != self.project:
                raise RuntimeError("Container ownership check failed")
        return parsed

    def fresh(self):
        existing = subprocess.check_output(
            [
                "docker",
                "volume",
                "ls",
                "--filter",
                f"label=com.docker.compose.project={self.project}",
                "--format",
                "{{.Name}}",
            ],
            text=True,
        )
        if existing.strip() or self.containers():
            raise ValueError(
                "Target project must have no existing containers or volumes"
            )

    def command(self, module, service="api"):
        return self.run(
            "run", "--rm", "--no-deps", service, "python", "-m", module
        ).stdout

    def migrate(self):
        self.run("up", "-d", "--wait", "db")
        self.run("--profile", "tools", "run", "--rm", "migrate")

    def deploy(self, import_content=False):
        if (
            self.values["APP_ENV"] == "production"
            and self.values.get("PUBLIC_POLICY_APPROVED") != "true"
        ):
            raise ValueError(
                "Public release requires explicit owner approval of policy and content"
            )
        self.run("config", "--quiet")
        self.migrate()
        self.command("app.commands.crm_backfill")
        if import_content:
            for module in (
                "import_content",
                "refresh_learning_intro",
                "refresh_form_copy",
            ):
                self.command(f"app.commands.{module}")
            self.pg("psql", "-c", "ANALYZE")
        self.run("up", "-d", "--no-build", "--wait", "--wait-timeout", "180")

    def pg(
        self,
        program,
        *args,
        role="makan_migrator",
        output=None,
        input=None,
        source=None,
    ):
        env = {
            **os.environ,
            "PGPASSWORD": self.values[
                "MIGRATION_DB_PASSWORD"
                if role == "makan_migrator"
                else "POSTGRES_PASSWORD"
            ],
        }
        return self.run(
            "exec",
            "-T",
            "-e",
            "PGPASSWORD",
            "db",
            program,
            "-U",
            role,
            "-d",
            self.values["POSTGRES_DB"],
            *args,
            output=output,
            input=input,
            environment=env,
            source=source,
        )

    def media_snapshot(self, target: Path):
        target.mkdir(mode=0o700)
        # Streaming docker cp as tar avoids exposing the host or interpreting shell paths.
        cid = self.run("ps", "--all", "-q", "api").stdout.decode().strip()
        if not cid:
            raise RuntimeError(
                "An API container with the source media volume is required"
            )
        process = subprocess.Popen(
            ["docker", "cp", f"{cid}:/srv/media/.", "-"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        try:
            with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
                for member in archive:
                    name = Path(member.name).name
                    if member.isdir():
                        continue
                    if (
                        not member.isfile()
                        or member.linkname
                        or not re.fullmatch(r"[0-9a-f]{32}\.webp", name)
                    ):
                        raise ValueError(
                            "Unexpected file or link in media volume; backup aborted"
                        )
                    with (
                        archive.extractfile(member) as source,
                        (target / name).open("xb") as sink,
                    ):
                        os.chmod(target / name, 0o600)
                        while chunk := source.read(1024 * 1024):
                            sink.write(chunk)
            if process.wait() != 0:
                raise RuntimeError("Media snapshot failed")
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()

    def backup(self, directory: Path):
        directory = directory.resolve()
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        running = [
            r["Service"]
            for r in self.containers()
            if r["State"] == "running" and r["Service"] in ("api", "web", "maintenance")
        ]
        if "api" not in running:
            raise ValueError(
                "Source API must be running; partial or unknown snapshots are rejected"
            )
        started = datetime.now(UTC)
        name = (
            self.project
            + "-"
            + started.strftime("%Y%m%dT%H%M%SZ")
            + "-"
            + secrets.token_hex(4)
            + ".makanbackup"
        )
        target = directory / name
        try:
            self.run("stop", *running)
            with tempfile.TemporaryDirectory(
                prefix="makan-backup-", dir=directory
            ) as scratch:
                base = Path(scratch)
                with (base / "database.dump").open("xb") as dump:
                    self.pg("pg_dump", "--format=custom", "--no-owner", output=dump)
                self.media_snapshot(base / "media")
                head = (
                    self.pg("psql", "-Atc", "SELECT version_num FROM alembic_version")
                    .stdout.decode()
                    .strip()
                )
                fingerprints = {
                    k: hashlib.sha256(self.values[k].encode()).hexdigest()
                    for k in ("AUTH_SECRET", "AUTH_MFA_KEY")
                }
                pack(
                    base,
                    base / "snapshot.tar.gz",
                    {
                        "format": 1,
                        "created_at": started.isoformat(),
                        "migration_head": head,
                        "key_fingerprints": fingerprints,
                    },
                )
                encrypt(
                    base / "snapshot.tar.gz",
                    target,
                    self.values["BACKUP_ENCRYPTION_KEY"],
                )
                # Authenticate and validate the new archive before declaring backup success.
                decrypt(
                    target,
                    base / "verified.tar.gz",
                    self.values["BACKUP_ENCRYPTION_KEY"],
                )
                _, manifest = unpack(base / "verified.tar.gz", base / "verified")
            state = {
                "status": "ok",
                "last_success": datetime.now(UTC).isoformat(),
                "file": name,
                "sha256": sha256(target),
                "media_files": len(manifest) - 1,
            }
            (directory / f"{self.project}-last-backup.json").write_text(
                json.dumps(state) + "\n", encoding="utf-8"
            )
            cutoff = (
                datetime.now(UTC).timestamp()
                - int(self.values.get("BACKUP_RETENTION_DAYS", "7")) * 86400
            )
            for candidate in directory.glob(self.project + "-*.makanbackup"):
                if (
                    candidate != target
                    and candidate.is_file()
                    and not candidate.is_symlink()
                    and candidate.stat().st_mtime < cutoff
                ):
                    candidate.unlink()
            return {
                **state,
                "path": str(target),
                "duration_seconds": (datetime.now(UTC) - started).total_seconds(),
            }
        finally:
            if running:
                self.run("up", "-d", "--no-build", "--wait", *running)

    def restore(self, source: Path, max_bytes=100 * 1024**3):
        if (
            self.values["APP_ENV"] == "production"
            and self.values.get("PUBLIC_POLICY_APPROVED") != "true"
        ):
            raise ValueError(
                "Public restore requires owner approval of policy and content"
            )
        self.fresh()
        with tempfile.TemporaryDirectory(prefix="makan-restore-") as scratch:
            base = Path(scratch)
            decrypt(
                source.resolve(),
                base / "snapshot.tar.gz",
                self.values["BACKUP_ENCRYPTION_KEY"],
            )
            metadata, manifest = unpack(
                base / "snapshot.tar.gz", base / "contents", max_bytes
            )
            if metadata.get("format") != 1:
                raise ValueError("Unsupported backup metadata")
            for key, fingerprint in metadata["key_fingerprints"].items():
                if (
                    key not in ("AUTH_SECRET", "AUTH_MFA_KEY")
                    or hashlib.sha256(self.values[key].encode()).hexdigest()
                    != fingerprint
                ):
                    raise ValueError(
                        "Restore requires the source authentication and MFA keys"
                    )
            if set(metadata["key_fingerprints"]) != {"AUTH_SECRET", "AUTH_MFA_KEY"}:
                raise ValueError("Required key fingerprints are missing")
            self.run("up", "-d", "--wait", "db")
            with (base / "contents/database.dump").open("rb") as dump:
                self.pg(
                    "pg_restore",
                    "--no-owner",
                    "--clean",
                    "--if-exists",
                    "--exit-on-error",
                    source=dump,
                )
            self.migrate()
            self.pg("psql", "-c", "ANALYZE")
            media_path = base / "media.tar"
            with tarfile.open(media_path, mode="w") as archive:
                for name in manifest:
                    if name.startswith("media/"):
                        member = archive.gettarinfo(
                            str(base / "contents" / name), arcname=Path(name).name
                        )
                        member.uid = member.gid = 10001
                        with (base / "contents" / name).open("rb") as data:
                            archive.addfile(member, data)
            # A one-shot non-root API image mounts the fresh target volume before public services start.
            with media_path.open("rb") as source_stream:
                self.run(
                    "run",
                    "-T",
                    "--rm",
                    "--no-deps",
                    "api",
                    "python",
                    "-c",
                    "import sys,tarfile; t=tarfile.open(fileobj=sys.stdin.buffer,mode='r|'); t.extractall('/srv/media',filter='data')",
                    source=source_stream,
                )
            result = self.command("app.commands.prepare_restore")
            self.run("up", "-d", "--no-build", "--wait")
            return {
                "status": "ok",
                "migration_head_from_backup": metadata["migration_head"],
                "media_files": len(manifest) - 1,
                "privacy_preparation": json.loads(result),
            }

    def status(self, backup_directory: Path | None):
        rows = self.containers()
        states = {
            r["Service"]: {"state": r["State"], "health": r.get("Health", "")}
            for r in rows
            if r["Service"] in (*SERVICES, "db")
        }
        ok = all(
            states.get(name, {}).get("state") == "running"
            and states[name]["health"] == "healthy"
            for name in (*SERVICES, "db")
        )
        backup = None
        if backup_directory is not None:
            path = backup_directory / f"{self.project}-last-backup.json"
            try:
                backup = json.loads(path.read_text(encoding="utf-8"))
                age = datetime.now(UTC) - datetime.fromisoformat(backup["last_success"])
                ok = (
                    ok
                    and backup["status"] == "ok"
                    and timedelta(0) <= age <= timedelta(hours=26)
                )
            except (OSError, ValueError, KeyError, TypeError):
                ok = False
        return {"healthy": ok, "services": states, "backup": backup}


def initialize(
    path: Path,
    domain: str | None,
    local_test=False,
    project=None,
    https_port=18443,
    http_port=18080,
):
    if path.exists():
        raise ValueError(
            "Environment file already exists; existing secrets must not be replaced"
        )
    if local_test:
        domain = "localhost"
        project = project or "makan-landing-acceptance-" + secrets.token_hex(8)
    elif not domain:
        raise ValueError("The owner must provide the final domain")
    domain = domain.encode("idna").decode().lower()
    template = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    replacements = {
        **{k: secrets.token_hex(32) for k in KEYS},
        "SITE_DOMAIN": domain,
        "PUBLIC_ORIGIN": f"https://{domain}" + (f":{https_port}" if local_test else ""),
        "COMPOSE_PROJECT_NAME": project or "makan-landing-prod",
    }
    if local_test:
        replacements.update(
            APP_ENV="staging",
            HTTP_BIND="127.0.0.1",
            HTTPS_BIND="127.0.0.1",
            HTTP_PORT=str(http_port),
            HTTPS_PORT=str(https_port),
            CADDY_CONFIG="/etc/caddy/Caddyfile.local",
            AUTH_LOGIN_IP_LIMIT="1000",
            AUTH_LOGIN_ACCOUNT_LIMIT="200",
            AUTH_CHALLENGE_LIMIT="1000",
        )
    for key, value in replacements.items():
        template = re.sub(
            rf"(?m)^{key}=.*$",
            lambda _, key=key, value=value: f"{key}={value}",
            template,
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as output:
        os.chmod(path, 0o600)
        output.write(template)
    read_env(path)
    return {
        "status": "created",
        "environment_file": str(path.resolve()),
        "private_keys_generated": len(KEYS),
        "local_acceptance_only": local_test,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, required=True)
    commands = parser.add_subparsers(dest="action", required=True)
    init = commands.add_parser("init")
    init.add_argument("--domain")
    init.add_argument("--local-test", action="store_true")
    commands.add_parser("build")
    deploy = commands.add_parser("deploy")
    deploy.add_argument("--import-approved-marketing", action="store_true")
    backup = commands.add_parser("backup")
    backup.add_argument("--output", type=Path)
    restore = commands.add_parser("restore")
    restore.add_argument("--input", type=Path, required=True)
    restore.add_argument("--max-bytes", type=int, default=100 * 1024**3)
    status = commands.add_parser("status")
    status.add_argument("--backup-directory", type=Path)
    args = parser.parse_args()
    try:
        if args.action == "init":
            result = initialize(args.env_file, args.domain, args.local_test)
        else:
            operator = Operator(args.env_file)
            with operator.lock() if args.action != "status" else nullcontext():
                if args.action == "build":
                    for service in (
                        "db",
                        "api",
                        "migrate",
                        "maintenance",
                        "web",
                        "caddy",
                    ):
                        operator.run("--profile", "tools", "build", service)
                    result = {"status": "built"}
                elif args.action == "deploy":
                    operator.deploy(args.import_approved_marketing)
                    result = operator.status(None)
                elif args.action == "backup":
                    directory = args.output or operator.values.get("BACKUP_DIRECTORY")
                    if not directory:
                        raise ValueError("An explicit backup directory is required")
                    result = operator.backup(Path(directory))
                elif args.action == "restore":
                    result = operator.restore(args.input, args.max_bytes)
                else:
                    directory = args.backup_directory or operator.values.get(
                        "BACKUP_DIRECTORY"
                    )
                    result = operator.status(Path(directory) if directory else None)
        print(json.dumps(result))
        if "healthy" in result and not result["healthy"]:
            raise SystemExit(2)
    except (ValueError, RuntimeError, OSError, InvalidTag):
        print(
            json.dumps(
                {
                    "status": "failed",
                    "message": "Operation rejected or failed; no public launch is confirmed.",
                }
            ),
            file=sys.stderr,
        )
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
