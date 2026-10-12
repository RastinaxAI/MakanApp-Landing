import base64
import secrets
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import Security, matching_totp_step
from app.models import Admin, AdminMfa, AdminRecoveryCode
from app.services.auth import now_utc


def new_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def verify_second_factor(
    session: Session, security: Security, admin: Admin, code: str | None
) -> bool:
    mfa = session.scalar(select(AdminMfa).where(AdminMfa.admin_id == admin.id).with_for_update())
    if not mfa or not mfa.enabled_at:
        return True
    if not code:
        return False
    secret = security.decrypt(mfa.encrypted_totp_secret, str(admin.id))
    step = matching_totp_step(secret, code, now_utc().timestamp(), mfa.last_used_step)
    if step is not None:
        mfa.last_used_step = step
        return True
    digest = security.digest("recovery", code.replace("-", "").lower())
    recovery = session.scalar(
        select(AdminRecoveryCode)
        .where(AdminRecoveryCode.admin_id == admin.id, AdminRecoveryCode.code_digest == digest)
        .with_for_update()
    )
    if not recovery or recovery.used_at:
        return False
    recovery.used_at = now_utc()
    return True


def replace_recovery_codes(session: Session, security: Security, admin_id: UUID) -> list[str]:
    session.execute(delete(AdminRecoveryCode).where(AdminRecoveryCode.admin_id == admin_id))
    values = [secrets.token_hex(16) for _ in range(8)]
    for value in values:
        session.add(
            AdminRecoveryCode(admin_id=admin_id, code_digest=security.digest("recovery", value))
        )
    return ["-".join(value[start : start + 4] for start in range(0, 32, 4)) for value in values]
