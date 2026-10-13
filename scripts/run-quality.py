"""Portable local/CI gates against the dedicated test DB; no secret values in argv."""

import argparse
import os
import secrets
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = (
    ROOT
    / "apps/api/.venv"
    / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
)
NPM = "npm.cmd" if os.name == "nt" else "npm"


def environment():
    values = {}
    for line in (ROOT / ".env.test").read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            values[key] = value
    required = (
        "POSTGRES_PASSWORD",
        "MIGRATION_DB_PASSWORD",
        "API_DB_PASSWORD",
        "AUTH_SECRET",
        "AUTH_MFA_KEY",
    )
    if any(not values.get(key) or len(values[key]) != 64 for key in required):
        raise RuntimeError("Dedicated random test credentials are required")
    return {
        **os.environ,
        "TEST_DATABASE_ADMIN_URL": f"postgresql+psycopg://postgres:{values['POSTGRES_PASSWORD']}@127.0.0.1:15432/makan_test_control",
        "TEST_MIGRATION_DB_PASSWORD": values["MIGRATION_DB_PASSWORD"],
        "TEST_API_DB_PASSWORD": values["API_DB_PASSWORD"],
        "AUTH_SECRET": values["AUTH_SECRET"],
        "AUTH_MFA_KEY": values["AUTH_MFA_KEY"],
        "E2E_ADMIN_PASSWORD": secrets.token_hex(32),
        "API_INTERNAL_URL": "http://127.0.0.1:8100",
        "MAKAN_QA_PHASE": "step10",
    }


def run(argv, env=None, cwd=ROOT):
    subprocess.run(argv, env=env, cwd=cwd, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gate", choices=["prepare-test", "backend", "browser"])
    parser.add_argument(
        "--project", choices=["chromium", "firefox", "webkit"], default="chromium"
    )
    parser.add_argument(
        "--spec", choices=["acceptance", "seo", "cms", "all"], default="acceptance"
    )
    args = parser.parse_args()
    qa = ROOT / "docs/qa/step10"
    qa.mkdir(parents=True, exist_ok=True)
    if args.gate == "prepare-test":
        path = ROOT / ".env.test"
        if path.exists():
            raise RuntimeError(
                "Existing test credentials are preserved; do not regenerate"
            )
        with path.open("x", encoding="utf-8") as file:
            os.chmod(path, 0o600)
            for key in (
                "POSTGRES_PASSWORD",
                "MIGRATION_DB_PASSWORD",
                "API_DB_PASSWORD",
                "AUTH_SECRET",
                "AUTH_MFA_KEY",
            ):
                file.write(f"{key}={secrets.token_hex(32)}\n")
        return
    env = environment()
    if args.gate == "backend":
        run(
            [str(PYTHON), "-m", "pytest", "--junitxml=../../docs/qa/step10/pytest.xml"],
            env,
            ROOT / "apps/api",
        )
        return
    if (ROOT / ".preview/e2e-db-name.txt").exists():
        raise RuntimeError("A prior owned E2E fixture needs cleanup before another run")
    (ROOT / ".preview").mkdir(exist_ok=True)
    env["E2E_SEO_FIXTURES"] = "1" if args.spec == "seo" else "0"
    log = (ROOT / ".preview/ci-api.log").open("w", encoding="utf-8")
    server = subprocess.Popen(
        [str(PYTHON), "tests/e2e_server.py"],
        cwd=ROOT / "apps/api",
        env=env,
        stdout=log,
        stderr=log,
    )
    try:
        import urllib.request

        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError(
                    "Dedicated E2E API exited; inspect private diagnostics"
                )
            try:
                with urllib.request.urlopen(
                    "http://127.0.0.1:8100/api/v1/health/ready", timeout=2
                ) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.5)
        else:
            raise RuntimeError("Dedicated E2E API did not become ready")
        specs = {
            "acceptance": [
                "admin.spec.ts",
                "leads.spec.ts",
                "learning.spec.ts",
                "learning-category.spec.ts",
                "public-pages.spec.ts",
            ],
            "seo": ["seo.spec.ts"],
            "cms": ["cms.spec.ts"],
            "all": [],
        }[args.spec]
        run(
            [
                "node",
                str(ROOT / "node_modules/@playwright/test/cli.js"),
                "test",
                *specs,
                f"--project={args.project}",
                "--workers=1",
                "--max-failures=1",
            ],
            env,
            ROOT / "apps/web",
        )
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        log.close()
        run([str(PYTHON), "tests/e2e_cleanup.py"], env, ROOT / "apps/api")


if __name__ == "__main__":
    main()
