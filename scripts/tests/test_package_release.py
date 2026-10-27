import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "package_release", Path(__file__).resolve().parents[1] / "package-release.py"
)
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ServerPackageTests(unittest.TestCase):
    def test_package_selection_keeps_source_and_required_help_images(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            keep = [
                ".env.production.example",
                "apps/web/public/guides/admin/media.png",
                "apps/api/alembic/versions/0001.py",
                "docs/production-runbook.md",
            ]
            omit = [
                ".env",
                "apps/web/.env.local",
                "apps/api/.venv/password.txt",
                "apps/web/node_modules/example/index.js",
                "apps/web/.next/server.js",
                "docs/qa/screenshot.png",
                ".backups/database.dump",
                "apps/api/secret.key",
                "apps/web/test-results/trace.zip",
                "tmp/private.html",
            ]
            for name in keep + omit:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture", encoding="utf-8")
            selected = {
                p.relative_to(root).as_posix() for p in release.source_files(root)
            }
            self.assertEqual(selected, set(keep))

    def test_missing_deployment_inputs_refuses_to_create_archive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            destination = root / "release/server.zip"
            with self.assertRaisesRegex(
                ValueError, "Required deployment files missing"
            ):
                release.package(root, destination)
            self.assertFalse(destination.exists())

    def test_archive_is_verified_and_contains_a_manifest_and_shell_permissions(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in [
                "compose.production.yaml",
                "apps/web/Dockerfile",
                "apps/api/Dockerfile",
                "apps/api/uv.lock",
                "package-lock.json",
                ".env.production.example",
                "infrastructure/postgres/init-roles.sh",
                "scripts/production.py",
            ]:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture", encoding="utf-8")
            destination = root / "release/server.zip"
            result = release.package(root, destination)
            with zipfile.ZipFile(destination) as archive:
                self.assertIsNone(archive.testzip())
                manifest = json.loads(
                    archive.read("makan-landing/RELEASE-MANIFEST.json")
                )
                self.assertEqual(result["source_files"], len(manifest["sha256"]))
                mode = archive.getinfo(
                    "makan-landing/infrastructure/postgres/init-roles.sh"
                )
                self.assertEqual((mode.external_attr >> 16) & 0o777, 0o755)
            self.assertTrue(destination.with_suffix(".zip.sha256").is_file())

    def test_symlinks_cannot_copy_outside_secrets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "apps").mkdir()
            private = root / "private.txt"
            private.write_text("secret", encoding="utf-8")
            try:
                (root / "apps/link.txt").symlink_to(private)
                (root / "scripts").symlink_to(root / "apps", target_is_directory=True)
            except OSError:
                self.skipTest("Host does not allow unprivileged symlinks")
            self.assertEqual(list(release.source_files(root)), [])


if __name__ == "__main__":
    unittest.main()
