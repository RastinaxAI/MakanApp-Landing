"""Invalidate recovered sessions and apply current retention before exposing a restore."""

import json

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.commands.maintenance import cycle
from app.core.config import Settings
from app.db.session import build_engine
from app.models import AdminSession, AuthChallenge
from app.services.auth import audit, now_utc


def prepare(engine):
    with Session(engine) as session, session.begin():
        revoked = session.execute(
            update(AdminSession)
            .where(AdminSession.revoked_at.is_(None))
            .values(revoked_at=now_utc())
        ).rowcount
        session.execute(delete(AuthChallenge))
        audit(
            session, None, "operations.restore_prepared", None, None, {"revoked_sessions": revoked}
        )
    result = cycle(engine)
    if result.get("skipped_lock"):
        raise RuntimeError("Retention lock held; retry before opening the restored application")
    return {"revoked_sessions": revoked, "retention": result}


def main():
    engine = build_engine(Settings())
    try:
        print(json.dumps(prepare(engine)))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
