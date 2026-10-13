"""Trusted host CLI for the first production SMS configuration and local-only recovery."""

import argparse
from getpass import getpass

from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import Security
from app.db.session import build_engine
from app.models import AdminOtp, SmsConfiguration
from app.services.auth import audit


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["configure", "reset-debug"])
    args = parser.parse_args()
    settings = Settings()
    security = Security(settings)
    if args.action == "reset-debug" and settings.app_env not in ("development", "test"):
        raise SystemExit("Fixed OTP recovery is forbidden outside local development/test.")
    username = password = None
    body_id = None
    if args.action == "configure":
        username = getpass("MeliPayamak username: ")
        password = getpass("MeliPayamak webservice password: ")
        body_id = int(input("Approved one-parameter OTP pattern Body ID: "))
        if (
            not 1 <= len(username) <= 128
            or not 1 <= len(password) <= 256
            or not 1 <= body_id <= 2147483647
        ):
            raise SystemExit("Invalid SMS configuration; nothing changed.")
    engine = build_engine(settings)
    try:
        with Session(engine) as session, session.begin():
            session.execute(text("SELECT pg_advisory_xact_lock(74120800)"))
            row = session.get(SmsConfiguration, 1)
            if not row:
                row = SmsConfiguration(id=1, row_version=1)
                session.add(row)
            if args.action == "configure":
                row.encrypted_username = security.encrypt(username, "sms:username")
                row.encrypted_password = security.encrypt(password, "sms:password")
                row.body_id = body_id
                row.enabled = True
                row.debug_mode = False
            else:
                row.debug_mode = True
            row.row_version += 1
            session.execute(delete(AdminOtp))
            audit(
                session, None, "settings.sms_operator_" + args.action, None, entity_type="settings"
            )
        print("SMS configuration saved and audited; credentials were not printed.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
