"""Idempotently link existing personal requests; never resend intake notifications."""

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.crm import backfill


def main():
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            count = backfill(session)
        print(f"Linked existing requests: {count}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
