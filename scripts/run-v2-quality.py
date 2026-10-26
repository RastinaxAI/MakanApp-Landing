"""Run V2 gates with disposable PostgreSQL data and owned loopback processes."""

import argparse
import importlib.util
import json
import os
import shutil
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "existing_quality", ROOT / "scripts/run-quality.py"
)
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)
NPM = "npm.cmd" if os.name == "nt" else "npm"
NODE_PATH = None


def node_command(*args):
    global NODE_PATH
    if NODE_PATH is None:
        cache = ROOT / ".preview/node24-path.txt"
        if cache.is_file():
            candidate = cache.read_text(encoding="utf-8").strip()
            if Path(candidate).is_file() and Path(candidate).name.lower() in (
                "node",
                "node.exe",
            ):
                try:
                    if (
                        subprocess.check_output([candidate, "--version"], text=True)
                        .strip()
                        .startswith("v24.")
                    ):
                        NODE_PATH = candidate
                        return [NODE_PATH, *args]
                except (OSError, subprocess.CalledProcessError):
                    pass
        version = subprocess.check_output(["node", "--version"], text=True).strip()
        NODE_PATH = (
            shutil.which("node")
            if version.startswith("v24.")
            else subprocess.check_output(
                [
                    NPM,
                    "exec",
                    "--offline",
                    "--package=node@24",
                    "--",
                    "node",
                    "-p",
                    "process.execPath",
                ],
                text=True,
            ).strip()
        )
        if not NODE_PATH or not Path(NODE_PATH).is_file():
            raise RuntimeError("Node.js 24 runtime is unavailable")
        cache.parent.mkdir(exist_ok=True)
        cache.write_text(NODE_PATH, encoding="utf-8")
    return [NODE_PATH, *args]


def run(args, env=None, cwd=ROOT):
    subprocess.run(args, env=env, cwd=cwd, check=True)


def port_free(port):
    with socket.socket() as connection:
        if connection.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(
                f"Port {port} is in use; existing services are preserved"
            )


def ready(url, process):
    for _ in range(120):
        if process.poll() is not None:
            raise RuntimeError(
                "Owned test service exited; inspect private .preview diagnostics"
            )
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError("Owned test service did not become ready")


def stop(process):
    if process and process.poll() is None:
        if os.name == "nt":
            # Exact PID returned by our Popen; never terminate an existing user server.
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def build():
    target = ROOT / "apps/web/next-env.d.ts"
    original = target.read_bytes()
    try:
        run(
            node_command(
                str(ROOT / "node_modules/next/dist/bin/next"), "build", "--webpack"
            ),
            cwd=ROOT / "apps/web",
        )
    finally:
        target.write_bytes(original)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gate", choices=["build", "backend", "browser"])
    parser.add_argument(
        "--phase",
        choices=["v2-step5", "v2-step6", "builder-elementor", "builder-studio", "builder-library", "content-manager", "admin-refresh", "admin-unified", "public-polish", "public-library-search", "admin-login"],
        default="v2-step6",
    )
    parser.add_argument(
        "--project", choices=["all", "chromium", "firefox", "webkit"], default="all"
    )
    parser.add_argument(
        "--spec",
        choices=[
            "all",
            "crm",
            "builder",
            "studio",
            "library",
            "content-manager",
            "admin-refresh",
            "admin-unified",
            "elementor",
            "advanced",
            "theme",
            "widgets",
            "public-upgrade",
            "public-polish",
            "public-library-search",
            "admin-login",
            "visual-regression",
            "admin",
            "cms",
            "learning",
            "learning-category",
            "leads",
            "leads-layout",
            "public-pages",
            "layout",
            "seo",
            "otp-admin",
        ],
        default="all",
    )
    parser.add_argument("--dev", action="store_true")
    parser.add_argument("--max-failures", type=int, choices=range(0, 101), default=1)
    parser.add_argument("--update-snapshots", action="store_true")
    parser.add_argument(
        "--suite", choices=["v2", "legacy", "legacy-seo", "legacy-otp"], default="v2"
    )
    parser.add_argument("--api-scope", choices=["all", "crm"], default="all")
    args = parser.parse_args()
    qa = ROOT / "docs/qa" / args.phase
    qa.mkdir(parents=True, exist_ok=True)
    report_name = (
        (
            "browser.json"
            if args.spec == "all"
            else f"browser-v2-{args.spec}-{args.project}.json"
        )
        if args.suite == "v2"
        else f"browser-{args.suite}-{args.spec}-{args.project}.json"
    )
    if args.gate == "build":
        build()
        return
    env = quality.environment()
    if args.gate == "backend":
        scope = (
            []
            if args.api_scope == "all"
            else ["tests/integration/test_crm.py", "tests/integration/test_leads.py"]
        )
        run(
            [
                str(quality.PYTHON),
                "-m",
                "pytest",
                *scope,
                f"--junitxml={qa / 'pytest.xml'}",
            ],
            env,
            ROOT / "apps/api",
        )
        return
    port_free(8100)
    port_free(3200)
    if (ROOT / ".preview/e2e-db-name.txt").exists():
        raise RuntimeError("An earlier owned fixture must be cleaned before this run")
    env.update(
        E2E_OTP_ONLY="1" if args.suite in ("v2", "legacy-otp") else "0",
        E2E_SEO_FIXTURES="1" if args.suite == "legacy-seo" else "0",
        MAKAN_QA_PHASE=args.phase,
        E2E_BASE_URL="http://127.0.0.1:3200",
        API_INTERNAL_URL="http://127.0.0.1:8100",
    )
    if not args.dev and not (ROOT / "apps/web/.next/BUILD_ID").exists():
        raise RuntimeError("Run the production build gate first")
    logs = ROOT / ".preview"
    logs.mkdir(exist_ok=True)
    api = web = None
    result = ROOT / (
        "apps/web/test-results/v2-results.json"
        if args.suite == "v2"
        else "apps/web/test-results/v2-legacy-results.json"
    )
    result.unlink(missing_ok=True)
    original = (ROOT / "apps/web/next-env.d.ts").read_bytes()
    try:
        flags = (
            {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
        )
        with (
            (logs / "v2-api.log").open("w", encoding="utf-8") as api_log,
            (logs / "v2-web.log").open("w", encoding="utf-8") as web_log,
        ):
            api = subprocess.Popen(
                [str(quality.PYTHON), "tests/e2e_server.py"],
                cwd=ROOT / "apps/api",
                env=env,
                stdout=api_log,
                stderr=api_log,
                **flags,
            )
            ready("http://127.0.0.1:8100/api/v1/health/ready", api)
            web = subprocess.Popen(
                node_command(
                    str(ROOT / "node_modules/next/dist/bin/next"),
                    "dev" if args.dev else "start",
                    "--port",
                    "3200",
                    "--hostname",
                    "127.0.0.1",
                ),
                cwd=ROOT / "apps/web",
                env=env,
                stdout=web_log,
                stderr=web_log,
                **flags,
            )
            ready("http://127.0.0.1:3200/health/live", web)
            argv = node_command(
                str(ROOT / "node_modules/@playwright/test/cli.js"),
                "test",
                "--config=playwright.v2.config.ts"
                if args.suite == "v2"
                else "--config=playwright.v2-legacy.config.ts",
                f"--max-failures={args.max_failures}",
            )
            if args.project != "all":
                argv.append(f"--project={args.project}")
            if args.update_snapshots:
                argv.append("--update-snapshots=all")
            if args.spec != "all":
                argv.append(args.spec + ".spec.ts")
            run(argv, env, ROOT / "apps/web")
    finally:
        stop(web)
        stop(api)
        (ROOT / "apps/web/next-env.d.ts").write_bytes(original)
        result = ROOT / (
            "apps/web/test-results/v2-results.json"
            if args.suite == "v2"
            else "apps/web/test-results/v2-legacy-results.json"
        )
        if result.exists():
            shutil.copyfile(
                result,
                qa / report_name,
            )
        run([str(quality.PYTHON), "tests/e2e_cleanup.py"], env, ROOT / "apps/api")
    report = json.loads((qa / report_name).read_text(encoding="utf-8"))
    print("V2 browser gate passed; tests:", report.get("stats", {}).get("expected"))


if __name__ == "__main__":
    main()
