"""Use the isolated HTTPS stack; credentials stay in the process environment."""

import argparse
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
    helpers = runpy.run_path(
        str(ROOT / "scripts/test-production.py"), run_name="production_test_helpers"
    )
    with helpers["client"](
        operator, ROOT / ".preview" / os.environ.get("MAKAN_QA_PHASE", "step10")
    ) as browser:
        helpers["login"](browser, None)
        session_token = browser.cookies.get("__Host-makan_session")
    environment = {
        **os.environ,
        "PRODUCTION_TEST_ORIGIN": operator.values["PUBLIC_ORIGIN"],
        "PRODUCTION_TEST_SESSION": session_token,
    }
    if os.name == "nt":
        command = ["npm.cmd", "exec", "--offline", "--package=node@24", "--", "node"]
        environment["PLAYWRIGHT_CHROMIUM_CHANNEL"] = "msedge"
    else:
        command = ["node"]
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
