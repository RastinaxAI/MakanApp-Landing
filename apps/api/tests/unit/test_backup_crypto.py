import io
import json
import os
import secrets
import tarfile
from datetime import UTC, datetime, timedelta

import pytest
from cryptography.exceptions import InvalidTag

from app.commands.maintenance import healthy
from app.operations.backup_crypto import CHUNK, decrypt, encrypt, pack, unpack


def test_cipher_streams_multiple_chunks(tmp_path):
    source = tmp_path / "payload"
    source.write_bytes(os.urandom(CHUNK * 2 + 79))
    key = secrets.token_hex(32)
    encrypt(source, tmp_path / "encrypted", key)
    decrypt(tmp_path / "encrypted", tmp_path / "roundtrip", key)
    assert source.read_bytes() == (tmp_path / "roundtrip").read_bytes()


def snapshot(tmp_path):
    base = tmp_path / "snapshot"
    base.mkdir()
    (base / "media").mkdir()
    (base / "database.dump").write_bytes(b"realistic-dump-payload" * (CHUNK // 10))
    (base / "media" / ("a" * 32 + ".webp")).write_bytes(b"fixture-media")
    pack(
        base, tmp_path / "archive.tar.gz", {"format": 1, "created_at": "2026-10-13T00:00:00+00:00"}
    )
    return tmp_path / "archive.tar.gz"


def test_authenticated_streaming_roundtrip_and_existing_target_guard(tmp_path):
    source = snapshot(tmp_path)
    key = secrets.token_hex(32)
    encrypted = tmp_path / "archive.makanbackup"
    encrypt(source, encrypted, key)
    assert b"fixture-media" not in encrypted.read_bytes()
    decrypt(encrypted, tmp_path / "plain.tar.gz", key)
    metadata, manifest = unpack(tmp_path / "plain.tar.gz", tmp_path / "restored")
    assert metadata["format"] == 1 and len(manifest) == 2
    assert (tmp_path / "restored/media" / ("a" * 32 + ".webp")).read_bytes() == b"fixture-media"
    preserved = tmp_path / "existing"
    preserved.write_bytes(b"do-not-overwrite")
    with pytest.raises(FileExistsError):
        decrypt(encrypted, preserved, key)
    assert preserved.read_bytes() == b"do-not-overwrite"


@pytest.mark.parametrize("mode", ["wrong_key", "tampered", "truncated"])
def test_unauthenticated_backup_never_exposes_restore_staging(tmp_path, mode):
    key = secrets.token_hex(32)
    encrypted = tmp_path / "archive.makanbackup"
    encrypt(snapshot(tmp_path), encrypted, key)
    if mode == "wrong_key":
        key = secrets.token_hex(32)
    elif mode == "tampered":
        value = bytearray(encrypted.read_bytes())
        value[len(value) // 2] ^= 1
        encrypted.write_bytes(value)
    else:
        encrypted.write_bytes(encrypted.read_bytes()[:20])
    with pytest.raises((InvalidTag, ValueError)):
        decrypt(encrypted, tmp_path / "rejected.tar.gz", key)
    assert not (tmp_path / "rejected.tar.gz").exists()


@pytest.mark.parametrize("mode", ["traversal", "absolute", "symlink", "duplicate", "size"])
def test_unsafe_tar_members_rejected_without_escape(tmp_path, mode):
    target = tmp_path / "malicious.tar.gz"
    with tarfile.open(target, "w:gz") as archive:
        name = {"traversal": "../escape", "absolute": "/escape"}.get(mode, "database.dump")
        info = tarfile.TarInfo(name)
        info.size = 3
        if mode == "symlink":
            info.type = tarfile.SYMTYPE
            info.linkname = "../escape"
        archive.addfile(info, io.BytesIO(b"bad"))
        if mode == "duplicate":
            archive.addfile(info, io.BytesIO(b"bad"))
    with pytest.raises(ValueError):
        unpack(target, tmp_path / "staging", max_bytes=2 if mode == "size" else 1000)
    assert not (tmp_path / "escape").exists()


def test_expired_or_failed_maintenance_is_not_healthy(tmp_path):
    path = tmp_path / "maintenance.json"
    now = datetime.now(UTC)
    for hours, status, expected in [
        (0, "ok", True),
        (3, "ok", False),
        (0, "error", False),
        (-1, "ok", False),
    ]:
        path.write_text(
            json.dumps(
                {"status": status, "last_success": (now - timedelta(hours=hours)).isoformat()}
            ),
            encoding="utf-8",
        )
        assert healthy(path, now) is expected
    path.write_text("invalid", encoding="utf-8")
    assert not healthy(path, now)
