"""Streaming authenticated encryption and guarded extraction of operator archives."""

import hashlib
import json
import os
import re
import tarfile
from pathlib import Path, PurePosixPath

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

MAGIC = b"MAKAN-BACKUP\x01"
CHUNK = 1024 * 1024
MEDIA = re.compile(r"media/[0-9a-f]{32}\.webp")


def key_bytes(value: str):
    try:
        key = bytes.fromhex(value)
    except ValueError:
        raise ValueError("A separate 32-byte backup encryption key is required") from None
    if len(key) != 32 or len(value) != 64:
        raise ValueError("A separate 32-byte backup encryption key is required")
    return key


def sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def encrypt(source: Path, target: Path, key: str):
    nonce = os.urandom(12)
    cipher = Cipher(algorithms.AES(key_bytes(key)), modes.GCM(nonce)).encryptor()
    cipher.authenticate_additional_data(MAGIC)
    created = False
    try:
        with target.open("xb") as output, source.open("rb") as data:
            created = True
            os.chmod(target, 0o600)
            output.write(MAGIC + nonce)
            while chunk := data.read(CHUNK):
                output.write(cipher.update(chunk))
            output.write(cipher.finalize() + cipher.tag)
    except BaseException:
        if created:
            target.unlink(missing_ok=True)
        raise


def decrypt(source: Path, target: Path, key: str):
    created = False
    try:
        with source.open("rb") as data:
            if data.read(len(MAGIC)) != MAGIC:
                raise ValueError("Unsupported or damaged backup format")
            nonce = data.read(12)
            length = source.stat().st_size - len(MAGIC) - 12 - 16
            if len(nonce) != 12 or length < 0:
                raise ValueError("Truncated encrypted backup")
            data.seek(-16, os.SEEK_END)
            tag = data.read(16)
            cipher = Cipher(algorithms.AES(key_bytes(key)), modes.GCM(nonce, tag)).decryptor()
            cipher.authenticate_additional_data(MAGIC)
            data.seek(len(MAGIC) + 12)
            with target.open("xb") as output:
                created = True
                os.chmod(target, 0o600)
                remaining = length
                while remaining:
                    chunk = data.read(min(CHUNK, remaining))
                    if not chunk:
                        raise ValueError("Truncated encrypted backup")
                    output.write(cipher.update(chunk))
                    remaining -= len(chunk)
                # Authentication completes before any archive member is read or restored.
                output.write(cipher.finalize())
    except BaseException:
        if created:
            target.unlink(missing_ok=True)
        raise


def pack(directory: Path, target: Path, metadata: dict):
    names = [
        "database.dump",
        *sorted(p.relative_to(directory).as_posix() for p in (directory / "media").glob("*.webp")),
    ]
    manifest = {
        name: {"sha256": sha256(directory / name), "size": (directory / name).stat().st_size}
        for name in names
    }
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    (directory / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    with tarfile.open(target, "w:gz") as archive:
        for name in ["manifest.json", "metadata.json", *names]:
            path = directory / name
            if path.is_symlink() or not path.is_file():
                raise ValueError("Only regular backup members are allowed")
            archive.add(path, arcname=name, recursive=False)


def unpack(source: Path, destination: Path, max_bytes=100 * 1024**3):
    if destination.exists():
        raise ValueError("Restore staging directory must be fresh")
    destination.mkdir(mode=0o700, parents=True)
    base = destination.resolve()
    seen = set()
    total = 0
    with tarfile.open(source, "r:gz") as archive:
        for member in archive:
            name = member.name
            if (
                name in seen
                or not member.isfile()
                or member.linkname
                or PurePosixPath(name).is_absolute()
                or ".." in PurePosixPath(name).parts
                or (
                    name not in {"database.dump", "manifest.json", "metadata.json"}
                    and not MEDIA.fullmatch(name)
                )
            ):
                raise ValueError("Unsafe or duplicate archive member")
            seen.add(name)
            total += member.size
            if total > max_bytes:
                raise ValueError("Restore staging size exceeds the operator limit")
            target = (base / name).resolve()
            if not target.is_relative_to(base):
                raise ValueError("Restore staging path escapes its destination")
            target.parent.mkdir(mode=0o700, exist_ok=True)
            input_stream = archive.extractfile(member)
            if input_stream is None:
                raise ValueError("Missing archive data")
            with target.open("xb") as output:
                os.chmod(target, 0o600)
                while chunk := input_stream.read(CHUNK):
                    output.write(chunk)
    if not {"manifest.json", "metadata.json", "database.dump"}.issubset(seen):
        raise ValueError("Incomplete archive")
    manifest = json.loads((base / "manifest.json").read_text(encoding="utf-8"))
    if set(manifest) != seen - {"manifest.json", "metadata.json"}:
        raise ValueError("Archive manifest mismatch")
    for name, facts in manifest.items():
        if sha256(base / name) != facts["sha256"] or (base / name).stat().st_size != facts["size"]:
            raise ValueError("Backup member checksum mismatch")
    return json.loads((base / "metadata.json").read_text(encoding="utf-8")), manifest
