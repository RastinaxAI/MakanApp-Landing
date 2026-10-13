"""Check known local credentials in Git-visible files without printing their values."""

import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    keys = set()
    environments = [ROOT / ".env", ROOT / ".env.test"]
    environments.extend((ROOT / ".preview/step10").glob("*.env"))
    environments.extend((ROOT / ".preview/admin-refresh").glob("*.env"))
    for path in environments:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            match = re.fullmatch(r"([A-Z_]+)=([a-f0-9]{64})", line)
            if match and any(
                word in match[1] for word in ("PASSWORD", "SECRET", "KEY")
            ):
                keys.add(match[2].encode())
    password = ROOT / ".preview/step10/admin-password.txt"
    if password.exists():
        keys.add(password.read_bytes().strip())
    owner_phone = ROOT / ".preview/admin-refresh/owner-phone.txt"
    if owner_phone.exists():
        keys.add(owner_phone.read_bytes().strip())
    files = (
        subprocess.check_output(
            ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            cwd=ROOT,
        )
        .decode("utf-8")
        .split("\0")
    )
    found = []
    checked = 0
    for name in filter(None, files):
        path = ROOT / name
        if not path.is_file():
            continue
        checked += 1
        with path.open("rb") as source:
            tail = b""
            while chunk := source.read(1024 * 1024):
                data = tail + chunk
                if any(key in data for key in keys):
                    found.append(name)
                    break
                tail = data[-128:]
    result = {
        "passed": not found,
        "git_visible_files_checked": checked,
        "known_credentials_checked": len(keys),
        "affected_files": found,
        "scope": "Known local credentials; not a general entropy or image OCR scan",
    }
    target = (
        ROOT
        / "docs/qa"
        / os.environ.get("MAKAN_QA_PHASE", "step10")
        / "secret-scan.json"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))
    if found:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
