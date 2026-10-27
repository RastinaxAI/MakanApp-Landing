"""Local operator commands; credentials are prompted, never accepted in argv."""

import argparse
from getpass import getpass

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import Security
from app.db.session import build_engine
from app.models import Admin
from app.services.auth import audit, revoke_all


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["bootstrap", "recover", "bind-phone"])
    parser.add_argument("--email")
    parser.add_argument("--phone")
    args = parser.parse_args()
    if args.phone or not args.email or args.action == "bind-phone":
        from app.schemas.otp import normalize_phone

        phone = normalize_phone(args.phone or input("Administrator phone: "))
        email = (
            str(TypeAdapter(EmailStr).validate_python(args.email.strip().lower()))
            if args.email
            else None
        )
        config = Settings()
        engine = build_engine(config)
        try:
            with Session(engine) as session, session.begin():
                session.execute(text("SELECT pg_advisory_xact_lock(74120500)"))
                if args.action == "bootstrap":
                    if session.scalar(select(Admin.id).limit(1)):
                        raise SystemExit(
                            "An owner already exists; use bind-phone for an existing account."
                        )
                    row = Admin(phone=phone, email=email, role="owner", password_hash=None)
                    session.add(row)
                    session.flush()
                    audit(session, None, "admin.phone_bootstrap", None, row.id)
                else:
                    row = session.scalar(
                        select(Admin)
                        .where(Admin.email == email if email else Admin.phone == phone)
                        .with_for_update()
                    )
                    if not row or not row.is_active:
                        raise SystemExit("An active administrator is required.")
                    if session.scalar(
                        select(Admin.id).where(Admin.phone == phone, Admin.id != row.id)
                    ):
                        raise SystemExit("The phone already belongs to another account.")
                    row.phone = phone
                    revoke_all(session, row.id)
                    audit(session, None, "admin.phone_" + args.action, None, row.id)
            print("Administrator phone operation completed and audited.")
        finally:
            engine.dispose()
        return
    email = str(TypeAdapter(EmailStr).validate_python(args.email.strip().lower()))
    password = getpass("New password (15-128 characters): ")
    confirmation = getpass("Repeat password: ")
    if not 15 <= len(password) <= 128 or password != confirmation:
        raise SystemExit("Password confirmation or length is invalid; nothing changed.")
    config = Settings()
    security = Security(config)
    engine = build_engine(config)
    try:
        with Session(engine) as session, session.begin():
            session.execute(text("SELECT pg_advisory_xact_lock(74120500)"))
            if args.action == "bootstrap":
                if session.scalar(select(Admin.id).limit(1)):
                    raise SystemExit(
                        "Bootstrap is only allowed on an empty administrator registry."
                    )
                row = Admin(email=email, role="owner", password_hash=security.hasher.hash(password))
                session.add(row)
                session.flush()
                audit(session, None, "admin.bootstrap", None, row.id)
            else:
                row = session.scalar(select(Admin).where(Admin.email == email).with_for_update())
                if not row or not row.is_active:
                    raise SystemExit("An active administrator is required for operator recovery.")
                row.password_hash = security.hasher.hash(password)
                revoke_all(session, row.id)
                audit(session, None, "admin.operator_recovery", None, row.id)
        print("Administrator operation completed and audited; credentials were not printed.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
