"""Package current source for a server without local data, secrets or build caches."""

import argparse
import hashlib
import json
import os
import stat
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = (
    "README.md",
    ".dockerignore",
    ".gitignore",
    ".gitattributes",
    ".nvmrc",
    ".env.example",
    ".env.production.example",
    "package.json",
    "package-lock.json",
    "compose.yaml",
    "compose.test.yaml",
    "compose.production.yaml",
)
SOURCE_DIRECTORIES = ("apps", "infrastructure", "scripts", ".github")
EXCLUDED_DIRECTORIES = {
    "node_modules",
    ".next",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    "dist",
    "coverage",
    "htmlcov",
    "test-results",
    "playwright-report",
    ".media",
    ".git",
    ".backups",
    ".ops",
    ".preview",
    ".tools",
    "tmp",
    "output",
    "release",
    "*.egg-info",
}
EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".tsbuildinfo",
    ".log",
    ".key",
    ".pem",
    ".pfx",
    ".p12",
    ".dump",
    ".sql",
    ".sqlite",
    ".sqlite3",
    ".db",
    ".bak",
    ".enc",
    ".zip",
}


def allowed_file(path: Path) -> bool:
    return (
        not path.is_symlink()
        and not path.name.startswith(".env")
        and path.name not in {".coverage", ".DS_Store", "Thumbs.db"}
        and path.suffix.lower() not in EXCLUDED_SUFFIXES
    )


def source_files(root: Path):
    files = [root / name for name in ROOT_FILES if (root / name).is_file()]
    files.extend(p for p in (root / "docs").glob("*.md") if not p.is_symlink())
    for directory in SOURCE_DIRECTORIES:
        for base, directories, names in os.walk(root / directory, followlinks=False):
            directories[:] = [
                name
                for name in directories
                if name not in EXCLUDED_DIRECTORIES
                and not name.endswith(".egg-info")
                and not (Path(base) / name).is_symlink()
            ]
            files.extend(p for name in names if allowed_file(p := Path(base) / name))
    for path in sorted(files):
        if not path.is_symlink() and path.resolve().is_relative_to(root.resolve()):
            yield path


def package(root: Path, destination: Path):
    required = (
        "compose.production.yaml",
        "apps/web/Dockerfile",
        "apps/api/Dockerfile",
        "apps/api/uv.lock",
        "package-lock.json",
        ".env.production.example",
        "infrastructure/postgres/init-roles.sh",
        "scripts/production.py",
    )
    paths = list(source_files(root))
    relative_names = {p.relative_to(root).as_posix() for p in paths}
    missing = set(required) - relative_names
    if missing:
        raise ValueError(f"Required deployment files missing: {sorted(missing)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".zip.tmp")
    manifest = {}
    try:
        with zipfile.ZipFile(
            temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=6
        ) as archive:
            for path in paths:
                name = path.relative_to(root).as_posix()
                content = path.read_bytes()
                manifest[name] = hashlib.sha256(content).hexdigest()
                entry = zipfile.ZipInfo("makan-landing/" + name)
                entry.create_system = 3
                mode = 0o755 if path.suffix == ".sh" else 0o644
                entry.external_attr = (stat.S_IFREG | mode) << 16
                entry.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(entry, content)
            archive.writestr(
                "makan-landing/RELEASE-MANIFEST.json",
                json.dumps(
                    {
                        "scope": "Source only; database and uploaded media require separate transfer",
                        "sha256": manifest,
                    },
                    indent=2,
                )
                + "\n",
            )
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip():
                raise ValueError("Archive CRC verification failed")
            for name, expected in manifest.items():
                if (
                    hashlib.sha256(archive.read("makan-landing/" + name)).hexdigest()
                    != expected
                ):
                    raise ValueError(f"Archive content verification failed: {name}")
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(".zip.sha256").write_text(
        f"{digest}  {destination.name}\n", encoding="ascii"
    )
    return {
        "archive": str(destination),
        "source_files": len(paths),
        "bytes": destination.stat().st_size,
        "sha256": digest,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    print(
        json.dumps(package(ROOT, ROOT / "release/makan-landing-server.zip"), indent=2)
    )
