"""Use the isolated HTTPS stack; credentials stay in the process environment."""

import argparse
import hashlib
import json
import os
import runpy
import subprocess
from pathlib import Path

from production import ROOT, Operator


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, required=True)
    args = parser.parse_args()
    operator = Operator(args.env_file)
    if not operator.project.startswith("makan-landing-acceptance-"):
        raise ValueError("Isolated acceptance project required")
    phase = os.environ.get("MAKAN_QA_PHASE", "step10")
    report_path = ROOT / "docs/qa" / phase
    acceptance = json.loads((report_path / "docker-acceptance.json").read_text(encoding="utf-8"))
    if acceptance.get("status") != "passed":
        raise ValueError("Run the real HTTPS backup/restore acceptance first")
    backups = ROOT / ".preview" / phase / "backups"
    verified = next(
        (
            path
            for path in backups.glob(f"{operator.project}-*.makanbackup")
            if hashlib.sha256(path.read_bytes()).hexdigest() == acceptance["backup"]["sha256"]
        ),
        None,
    )
    if not verified:
        raise ValueError("The tested encrypted backup is missing or changed")
    revision_sql = "SELECT id::text || ':' || md5(row_to_json(r)::text) FROM page_revisions r ORDER BY id"
    before = set(operator.pg("psql", "-Atc", revision_sql).stdout.decode().splitlines())
    converted = json.loads(
        operator.run(
            "exec", "-T", "api", "python", "-m", "app.commands.upgrade_visual",
            "--apply", "--verified-backup", verified.name,
        ).stdout
    )
    after = set(operator.pg("psql", "-Atc", revision_sql).stdout.decode().splitlines())
    if not before.issubset(after):
        raise RuntimeError("An original acceptance content revision changed")
    (report_path / "production-visual-conversion.json").write_text(
        json.dumps({
            "project": operator.project,
            "upgraded": converted["upgraded"],
            "original_revisions_unchanged": len(before),
            "verified_backup_sha256": acceptance["backup"]["sha256"],
            "applied_only_to_disposable_fixture": True,
        }, indent=2),
        encoding="utf-8",
    )
    helpers = runpy.run_path(
        str(ROOT / "scripts/test-production.py"), run_name="production_test_helpers"
    )
    with helpers["client"](
        operator, ROOT / ".preview" / os.environ.get("MAKAN_QA_PHASE", "step10")
    ) as browser:
        helpers["login"](browser, None)
        session_token = browser.cookies.get("__Host-makan_session")
        home = browser.get("/api/v1/pages/home").json()
        if not home["payload"].get("document"):
            raise RuntimeError("HTTPS quality must test the converted V2 homepage")
        if browser.get("/").status_code != 200:
            raise RuntimeError("Cannot warm the owned HTTPS frontend")
        operator.run("restart", "api")
        operator.run("up", "-d", "--wait", "api", "web")
        for path in ("/", "/features", "/solutions/schools"):
            if browser.get(path).status_code != 200:
                raise RuntimeError("Backend restart recovery failed")
        print("HTTPS reads recovered after the owned API restart", flush=True)
    environment = {
        **os.environ,
        "PRODUCTION_TEST_ORIGIN": operator.values["PUBLIC_ORIGIN"],
        "PRODUCTION_TEST_SESSION": session_token,
    }
    runtime = runpy.run_path(str(ROOT / "scripts/run-v2-quality.py"))
    command = runtime["node_command"]()
    if os.name == "nt":
        environment["PLAYWRIGHT_CHROMIUM_CHANNEL"] = "msedge"
    subprocess.run(
        [
            *command,
            "../../node_modules/@playwright/test/cli.js",
            "test",
            "--config=playwright.production.config.ts",
            "--max-failures=1",
        ],
        env=environment,
        cwd=ROOT / "apps/web",
        check=True,
    )


if __name__ == "__main__":
    main()
