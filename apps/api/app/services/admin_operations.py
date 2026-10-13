from datetime import timedelta
from uuid import UUID

from fastapi import Request
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem, unauthorized
from app.core.security import enrollment_uri, matching_totp_step
from app.models import Admin, AdminMfa, AdminRecoveryCode, AdminSession, AuditLog, Page
from app.schemas.auth import (
    Account,
    AccountCreate,
    AccountUpdate,
    MfaConfirm,
    MfaEnrollment,
    PasswordUpdate,
    Reauthentication,
    RecoveryCodes,
    SessionInfo,
    SessionQuery,
)
from app.schemas.common import PaginationQuery
from app.services.auth import (
    audit,
    charge_sensitive_attempt,
    now_utc,
    principal,
    profile,
    reauthenticate,
    require_capability,
    revoke_all,
)
from app.services.mfa import new_totp_secret, replace_recovery_codes


def logout(request: Request, session: Session):
    with session.begin():
        admin, item, _ = principal(request, session, True)
        item.revoked_at = now_utc()
        audit(session, request, "auth.logout", admin.id, item.id, entity_type="admin_session")


def sessions(request: Request, session: Session, query: SessionQuery):
    with session.begin():
        admin, current, _ = principal(request, session)
        target_id = query.admin_id or admin.id
        if target_id != admin.id:
            require_capability(admin, "accounts")
            if not session.get(Admin, target_id):
                raise ApiProblem(404, "NOT_FOUND", "حساب یافت نشد.")
        now = now_utc()
        rows = session.scalars(
            select(AdminSession)
            .where(
                AdminSession.admin_id == target_id,
                AdminSession.revoked_at.is_(None),
                AdminSession.expires_at > now,
                AdminSession.idle_expires_at > now,
            )
            .order_by(AdminSession.created_at.desc())
            .limit(100)
        )
        return [
            SessionInfo(
                id=row.id,
                created_at=row.created_at,
                last_seen_at=row.last_seen_at,
                expires_at=row.expires_at,
                current=row.id == current.id,
            )
            for row in rows
        ]


def revoke(session_id: UUID, request: Request, session: Session):
    with session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(74120500)"))
        admin, current, _ = principal(request, session, True)
        target = session.get(AdminSession, session_id)
        if not target or (target.admin_id != admin.id and admin.role != "owner"):
            raise ApiProblem(404, "NOT_FOUND", "نشست یافت نشد.")
        target.revoked_at = now_utc()
        audit(
            session,
            request,
            "auth.session_revoked",
            admin.id,
            target.id,
            entity_type="admin_session",
        )
        own = target.id == current.id
    return own


def password(
    data: PasswordUpdate,
    request: Request,
    session: Session,
):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        admin.password_hash = request.app.state.security.hasher.hash(data.new_password)
        revoke_all(session, admin.id)
        audit(session, request, "auth.password_changed", admin.id, admin.id)


def accounts(request: Request, query: PaginationQuery, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session)
        require_capability(admin, "accounts")
        total = session.scalar(select(func.count()).select_from(Admin))
        rows = session.scalars(
            select(Admin)
            .order_by(Admin.created_at, Admin.id)
            .offset(query.offset)
            .limit(query.page_size)
        )
        return {
            "items": [
                Account(
                    id=row.id,
                    email=row.email,
                    role=row.role,
                    is_active=row.is_active,
                    created_at=row.created_at,
                    last_login_at=row.last_login_at,
                )
                for row in rows
            ],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


def create_account(data: AccountCreate, request: Request, session: Session):
    with session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(74120500)"))
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "accounts")
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        if session.scalar(select(Admin.id).where(Admin.email == str(data.email))):
            raise ApiProblem(409, "ACCOUNT_EXISTS", "حساب با این ایمیل وجود دارد.")
        row = Admin(
            email=str(data.email),
            password_hash=request.app.state.security.hasher.hash(data.password),
            role=data.role,
        )
        session.add(row)
        session.flush()
        audit(session, request, "admin.created", admin.id, row.id, {"role": str(data.role)})
        result = Account(
            id=row.id,
            email=row.email,
            role=row.role,
            is_active=row.is_active,
            created_at=row.created_at,
            last_login_at=row.last_login_at,
        )
    return result


def change_account(account_id: UUID, data: AccountUpdate, request: Request, session: Session):
    with session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(74120500)"))
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "accounts")
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        row = session.scalar(select(Admin).where(Admin.id == account_id).with_for_update())
        if not row:
            raise ApiProblem(404, "NOT_FOUND", "حساب یافت نشد.")
        new_role = data.role if data.role is not None else row.role
        new_active = data.is_active if data.is_active is not None else row.is_active
        owners = session.scalar(
            select(func.count())
            .select_from(Admin)
            .where(Admin.role == "owner", Admin.is_active.is_(True))
        )
        if (
            row.role == "owner"
            and row.is_active
            and (new_role != "owner" or not new_active)
            and owners <= 1
        ):
            raise ApiProblem(
                409, "LAST_OWNER", "آخرین مالک فعال را نمی‌توان غیرفعال کرد یا نقش او را تغییر داد."
            )
        changes = {
            "role": {"old": row.role, "new": str(new_role)},
            "is_active": {"old": row.is_active, "new": new_active},
        }
        if new_role != row.role or new_active != row.is_active:
            row.role, row.is_active = new_role, new_active
            revoke_all(session, row.id)
            audit(session, request, "admin.updated", admin.id, row.id, changes)
        return Account(
            id=row.id,
            email=row.email,
            role=row.role,
            is_active=row.is_active,
            created_at=row.created_at,
            last_login_at=row.last_login_at,
        )


def audit_logs(request: Request, query: PaginationQuery, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session)
        require_capability(admin, "audit")
        total = session.scalar(select(func.count()).select_from(AuditLog))
        rows = session.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc(), AuditLog.id)
            .offset(query.offset)
            .limit(query.page_size)
        )
        return {
            "items": [
                {
                    "id": row.id,
                    "action": row.action,
                    "actor_id": row.actor_id,
                    "entity_id": row.entity_id,
                    "created_at": row.created_at,
                }
                for row in rows
            ],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


def dashboard(request: Request, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session)
        metrics = {}
        if admin.role == "owner":
            metrics["active_admins"] = session.scalar(
                select(func.count()).select_from(Admin).where(Admin.is_active.is_(True))
            )
        if "content" in profile(session, admin).capabilities:
            metrics["pages"] = session.scalar(
                select(func.count()).select_from(Page).where(Page.is_archived.is_(False))
            )
        return {"metrics": metrics, "modules": {"content": "ready", "leads": "ready"}}


def enroll(data: Reauthentication, request: Request, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        existing = session.get(AdminMfa, admin.id)
        if existing and existing.enabled_at:
            raise ApiProblem(409, "MFA_ACTIVE", "ورود دومرحله‌ای قبلاً فعال شده است.")
        secret = new_totp_secret()
        if not existing:
            existing = AdminMfa(admin_id=admin.id)
            session.add(existing)
        existing.encrypted_totp_secret = request.app.state.security.encrypt(secret, str(admin.id))
        existing.pending_expires_at = now_utc() + timedelta(minutes=5)
        existing.last_used_step = -1
        audit(session, request, "mfa.enrollment_started", admin.id, admin.id)
        return MfaEnrollment(secret=secret, otpauth_url=enrollment_uri(admin.email, secret))


def confirm(data: MfaConfirm, request: Request, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        charge_sensitive_attempt(request, "mfa-confirm", admin.id)
        item = session.scalar(
            select(AdminMfa).where(AdminMfa.admin_id == admin.id).with_for_update()
        )
        if (
            not item
            or item.enabled_at
            or not item.pending_expires_at
            or item.pending_expires_at <= now_utc()
        ):
            raise ApiProblem(409, "MFA_ENROLLMENT_EXPIRED", "راه‌اندازی را دوباره شروع کنید.")
        security = request.app.state.security
        step = matching_totp_step(
            security.decrypt(item.encrypted_totp_secret, str(admin.id)),
            data.code,
            now_utc().timestamp(),
            item.last_used_step,
        )
        if step is None:
            raise unauthorized()
        item.enabled_at, item.pending_expires_at, item.last_used_step = now_utc(), None, step
        codes = replace_recovery_codes(session, security, admin.id)
        revoke_all(session, admin.id)
        audit(session, request, "mfa.enabled", admin.id, admin.id)
    return RecoveryCodes(recovery_codes=codes)


def disable(
    data: Reauthentication,
    request: Request,
    session: Session,
):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        session.execute(delete(AdminRecoveryCode).where(AdminRecoveryCode.admin_id == admin.id))
        session.execute(delete(AdminMfa).where(AdminMfa.admin_id == admin.id))
        revoke_all(session, admin.id)
        audit(session, request, "mfa.disabled", admin.id, admin.id)


def recovery(data: Reauthentication, request: Request, session: Session):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        reauthenticate(request, session, admin, data.current_password, data.mfa_code)
        item = session.get(AdminMfa, admin.id)
        if not item or not item.enabled_at:
            raise ApiProblem(409, "MFA_INACTIVE", "ابتدا ورود دومرحله‌ای را فعال کنید.")
        codes = replace_recovery_codes(session, request.app.state.security, admin.id)
        audit(session, request, "mfa.recovery_regenerated", admin.id, admin.id)
        return RecoveryCodes(recovery_codes=codes)
