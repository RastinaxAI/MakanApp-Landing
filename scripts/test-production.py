"""Real TLS/Compose/backup acceptance; fixtures restricted to isolated loopback projects."""

import argparse
import json
import os
import secrets
import ssl
import subprocess
import time
from pathlib import Path
from uuid import uuid4

import httpx
from production import ROOT, Operator, initialize


def require(value, message):
    if not value:
        raise AssertionError(message)


def tls(operator, directory):
    certificate = directory / (operator.project + "-root.crt")
    cid = operator.run("ps", "-q", "caddy").stdout.decode().strip()
    subprocess.run(
        [
            "docker",
            "cp",
            f"{cid}:/data/caddy/pki/authorities/local/root.crt",
            str(certificate),
        ],
        check=True,
        capture_output=True,
    )
    return ssl.create_default_context(cafile=str(certificate))


def client(operator, directory):
    return httpx.Client(
        base_url=operator.values["PUBLIC_ORIGIN"],
        verify=tls(operator, directory),
        timeout=30,
    )


def login(browser, password, role="owner"):
    csrf = browser.get("/api/v1/admin/auth/csrf").json()["csrf_token"]
    response = browser.post(
        "/api/v1/admin/auth/login",
        json={
            "email": f"{role}@example.com",
            "password": password,
            "mfa_code": None,
        },
        headers={"Origin": str(browser.base_url).rstrip("/"), "X-CSRF-Token": csrf},
    )
    require(response.status_code == 200, "TLS administrator login failed")
    require(
        "Secure" in response.headers["set-cookie"]
        and "HttpOnly" in response.headers["set-cookie"],
        "Cookie flags missing",
    )


def run(env_file, keep):
    source = Operator(env_file)
    require(
        source.project.startswith("makan-landing-acceptance-")
        and source.values["SITE_DOMAIN"] == "localhost",
        "Acceptance project only",
    )
    require(
        source.values.get("CADDY_CONFIG") == "/etc/caddy/Caddyfile.local",
        "Internal CA acceptance only",
    )
    directory = ROOT / ".preview/step10"
    directory.mkdir(parents=True, exist_ok=True)
    password_path = directory / "admin-password.txt"
    clone = None
    report = {"checks": [], "public_deployment": False}

    def passed(name):
        report["checks"].append(name)
        print(name, flush=True)

    try:
        with source.lock():
            source.deploy()
        # Reuse the current isolated manual acceptance stack, or seed a fresh CI stack.
        exists = (
            source.pg("psql", "-Atc", "SELECT count(*) FROM admins")
            .stdout.decode()
            .strip()
        )
        if exists == "0":
            password = secrets.token_hex(24)
            password_path.write_text(password, encoding="utf-8")
            os.chmod(password_path, 0o600)
            fixture = (ROOT / "apps/api/tests/production_fixtures.py").read_text(
                encoding="utf-8"
            )
            seo = (ROOT / "apps/api/tests/seo_fixtures.py").read_text(encoding="utf-8")
            program = (
                fixture
                + "\nseed_fixture("
                + repr(password)
                + ","
                + repr(source.values["PUBLIC_ORIGIN"])
                + ","
                + repr(seo)
                + ")\n"
            )
            source.run("exec", "-T", "api", "python", "-", input=program.encode())
        else:
            password = password_path.read_text(encoding="utf-8").strip()
        source.pg("psql", "-c", "ANALYZE")
        redirect = httpx.get(
            f"http://127.0.0.1:{source.values['HTTP_PORT']}/demo",
            headers={"Host": "localhost"},
            timeout=15,
        )
        require(
            redirect.status_code == 308
            and redirect.headers["location"]
            == source.values["PUBLIC_ORIGIN"] + "/demo",
            "HTTP redirect failed",
        )
        with client(source, directory) as browser:
            require(browser.get("/health/ready").status_code == 200, "Readiness failed")
            page = browser.get("/")
            require(
                page.status_code == 200
                and "nonce-" in page.headers["content-security-policy"],
                "Nonce CSP missing",
            )
            require(
                "max-age=31536000" in page.headers["strict-transport-security"],
                "HSTS missing",
            )
            require(
                browser.get("/api/v1/docs").status_code == 404,
                "Private documentation exposed",
            )
            require(
                browser.get("/api/v1/admin/auth/me").status_code == 401,
                "Guest access allowed",
            )
            passed("verified_internal_ca_https_headers_private_docs_guest_denial")
            token = browser.get("/api/v1/forms/token?kind=demo").json()
            time.sleep(2)
            name = "Docker acceptance " + secrets.token_hex(4)
            data = {
                "full_name": name,
                "consent": True,
                "consent_version": token["consent_version"],
                "form_token": token["token"],
                "idempotency_key": str(uuid4()),
                "source": "demo",
                "phone": "09123456789",
                "school_name": "Isolated acceptance school",
            }
            headers = {"Origin": source.values["PUBLIC_ORIGIN"]}
            response = browser.post("/api/v1/leads/demo", json=data, headers=headers)
            require(response.status_code == 201, "Persistent demo submission failed")
            reference = response.json()["reference_id"]
            require(
                browser.post("/api/v1/leads/demo", json=data, headers=headers).json()[
                    "reference_id"
                ]
                == reference,
                "Idempotency failed",
            )
            login(browser, password)
            session_cookies = dict(browser.cookies)
            rows = browser.get("/api/v1/admin/leads", params={"q": name}).json()
            require(rows["pagination"]["total"] == 1, "Duplicate or absent CRM record")
            identifier = rows["items"][0]["id"]
            require(
                browser.post(
                    f"/api/v1/admin/leads/{identifier}/notes",
                    json={"body": "Private restore witness"},
                    headers=headers,
                ).status_code
                == 403,
                "CSRF bypass",
            )
            csrf = browser.get("/api/v1/admin/auth/csrf").json()["csrf_token"]
            require(
                browser.post(
                    f"/api/v1/admin/leads/{identifier}/notes",
                    json={"body": "Private restore witness"},
                    headers={
                        **headers,
                        "X-CSRF-Token": csrf,
                        "If-Match": str(rows["items"][0]["version"]),
                    },
                ).status_code
                == 201,
                "CRM note write failed",
            )
            media = (
                source.pg(
                    "psql", "-Atc", "SELECT storage_key FROM media_assets LIMIT 1"
                )
                .stdout.decode()
                .strip()
            )
            media_before = (
                source.run(
                    "exec",
                    "-T",
                    "api",
                    "python",
                    "-c",
                    "import hashlib,pathlib; print(hashlib.sha256(pathlib.Path('/srv/media/' + "
                    + repr(media)
                    + ").read_bytes()).hexdigest())",
                )
                .stdout.decode()
                .strip()
            )
            passed("persistent_demo_idempotency_crm_note_csrf_secure_cookie")
        with client(source, directory) as editor:
            login(editor, password, "editor")
            require(
                editor.get("/api/v1/admin/leads").status_code == 403,
                "Editor accessed private CRM",
            )
        with client(source, directory) as sales:
            login(sales, password, "sales")
            require(
                sales.get("/api/v1/admin/accounts").status_code == 403,
                "Sales accessed administrator registry",
            )
        passed("https_rbac_editor_crm_sales_accounts_denied")
        report["runtime"] = []
        for row in source.containers():
            if row["Service"] not in ("api", "web", "maintenance", "caddy", "db"):
                continue
            details = json.loads(
                subprocess.check_output(["docker", "inspect", row["ID"]])
            )[0]
            report["runtime"].append(
                {
                    "service": row["Service"],
                    "image_id": details["Image"],
                    "user": details["Config"]["User"],
                    "read_only": details["HostConfig"]["ReadonlyRootfs"],
                    "cap_drop": details["HostConfig"]["CapDrop"],
                    "security_options": details["HostConfig"]["SecurityOpt"],
                    "published_ports": details["HostConfig"]["PortBindings"],
                }
            )
            if row["Service"] != "db":
                require(
                    details["Config"]["User"] == "10001:10001",
                    "Application runs as root",
                )
                require(
                    details["HostConfig"]["ReadonlyRootfs"], "Writable application root"
                )
                require(
                    "ALL" in details["HostConfig"]["CapDrop"], "Capabilities present"
                )
            if row["Service"] == "db":
                require(
                    details["Config"]["User"] == "postgres:postgres",
                    "Database bootstrap runs as root",
                )
                require(
                    "ALL" in details["HostConfig"]["CapDrop"],
                    "Database capabilities present",
                )
            if row["Service"] != "caddy":
                require(
                    not details["HostConfig"]["PortBindings"],
                    "Private service published",
                )
        passed("nonroot_readonly_capabilities_private_ports")
        started = time.monotonic()
        with source.lock():
            backup = source.backup(directory / "backups")
        report["backup"] = {
            k: v for k, v in backup.items() if k not in ("path", "file")
        }
        clone_env = directory / ("restore-" + secrets.token_hex(5) + ".env")
        initialize(
            clone_env,
            None,
            True,
            "makan-landing-restore-" + secrets.token_hex(8),
            18444,
            18081,
        )
        replacements = {
            k: source.values[k]
            for k in ("AUTH_SECRET", "AUTH_MFA_KEY", "BACKUP_ENCRYPTION_KEY")
        }
        text = clone_env.read_text(encoding="utf-8")
        for key, value in replacements.items():
            text = (
                "\n".join(
                    key + "=" + value if line.startswith(key + "=") else line
                    for line in text.splitlines()
                )
                + "\n"
            )
        clone_env.write_text(text, encoding="utf-8")
        clone = Operator(clone_env)
        with clone.lock():
            restoration = clone.restore(Path(backup["path"]))
        report["restore"] = restoration
        report["backup_and_restore_seconds"] = round(time.monotonic() - started, 2)
        with client(clone, directory) as restored:
            restored.cookies.update(session_cookies)
            require(
                restored.get("/api/v1/admin/auth/me").status_code == 401,
                "Recovered session still valid",
            )
            restored.cookies.clear()
            login(restored, password)
            require(
                restored.get(f"/api/v1/admin/leads/{identifier}").json()["reference_id"]
                == reference,
                "Lead not restored",
            )
            require(
                restored.get(f"/api/v1/admin/leads/{identifier}/notes").json()["items"][
                    0
                ]["body"]
                == "Private restore witness",
                "Note not restored",
            )
        media_after = (
            clone.run(
                "exec",
                "-T",
                "api",
                "python",
                "-c",
                "import hashlib,pathlib; print(hashlib.sha256(pathlib.Path('/srv/media/' + "
                + repr(media)
                + ").read_bytes()).hexdigest())",
            )
            .stdout.decode()
            .strip()
        )
        require(media_before == media_after, "Media integrity failure")
        passed("encrypted_backup_fresh_restore_db_notes_media_old_sessions_revoked")
        try:
            clone.restore(Path(backup["path"]))
        except ValueError:
            passed("restore_existing_target_rejected_before_mutation")
        else:
            raise AssertionError("Existing target restore permitted")
        source.run("up", "-d", "--force-recreate", "--no-build", "--wait", "api", "web")
        with client(source, directory) as browser:
            login(browser, password)
            require(
                browser.get(f"/api/v1/admin/leads/{identifier}").status_code == 200,
                "Recreate lost records",
            )
        source.run("stop", "api")
        try:
            with client(source, directory) as browser:
                require(
                    browser.get("/health/ready").status_code == 503,
                    "Readiness falsely healthy",
                )
        finally:
            source.run("up", "-d", "--wait", "api", "web")
        passed("recreate_persistence_dependency_failure_readiness")
        require(
            source.status(directory / "backups")["healthy"], "Final stack health failed"
        )
        report["status"] = "passed"
    finally:
        if clone:
            clone.run("down", "--volumes", "--remove-orphans", check=False)
        if not keep:
            source.run("down", "--volumes", "--remove-orphans", check=False)
        output = ROOT / "docs/qa/step10/docker-acceptance.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()
    run(args.env_file, args.keep)
