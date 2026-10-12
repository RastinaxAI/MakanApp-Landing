import base64
import hashlib
import hmac
import re
import secrets
import struct
from urllib.parse import quote

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import Settings


class Security:
    def __init__(self, settings: Settings):
        self.key = bytes.fromhex(settings.auth_secret.get_secret_value())
        self.cipher = AESGCM(bytes.fromhex(settings.auth_mfa_key.get_secret_value()))
        self.hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, type=Type.ID)
        self.dummy_hash = self.hasher.hash(secrets.token_urlsafe(32))

    def digest(self, purpose: str, value: str) -> str:
        return hmac.new(self.key, f"{purpose}:{value}".encode(), hashlib.sha256).hexdigest()

    def csrf(self, kind: str, token: str) -> str:
        return self.digest(f"csrf-{kind}", token)

    def password_matches(self, stored: str, password: str) -> bool:
        try:
            return self.hasher.verify(stored, password)
        except (VerificationError, InvalidHashError):
            return False

    def encrypt(self, secret: str, admin_id: str) -> bytes:
        nonce = secrets.token_bytes(12)
        return nonce + self.cipher.encrypt(nonce, secret.encode(), admin_id.encode())

    def decrypt(self, encrypted: bytes, admin_id: str) -> str:
        return self.cipher.decrypt(encrypted[:12], encrypted[12:], admin_id.encode()).decode()


def opaque_token() -> str:
    return secrets.token_urlsafe(32)


def valid_token(value: str | None) -> bool:
    return bool(value and re.fullmatch(r"[A-Za-z0-9_-]{43}", value))


def totp_code(secret: str, step: int) -> str:
    key = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8))
    digest = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 15
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(value % 1000000).zfill(6)


def matching_totp_step(secret: str, code: str, now: float, last_used: int) -> int | None:
    code = code.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")).strip()
    if not re.fullmatch(r"[0-9]{6}", code):
        return None
    step = int(now // 30)
    for candidate in (step, step - 1, step + 1):
        if (
            candidate >= 0
            and candidate > last_used
            and hmac.compare_digest(totp_code(secret, candidate), code)
        ):
            return candidate
    return None


def enrollment_uri(email: str, secret: str) -> str:
    return (
        f"otpauth://totp/{quote('MakanApp:' + email, safe='')}?secret={secret}"
        "&issuer=MakanApp&algorithm=SHA1&digits=6&period=30"
    )
