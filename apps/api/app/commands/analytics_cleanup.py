"""Run daily using the runtime role; remove expired minimal analytics rows."""

import json

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.analytics import purge


def main():
    engine = build_engine(Settings())
    try:
        totals = {"expired_events": 0, "expired_rate_buckets": 0}
        pending = True
        for _ in range(1000):
            with Session(engine) as session, session.begin():
                result = purge(session)
            for key in totals:
                totals[key] += result[key]
            if all(value < 500 for value in result.values()):
                pending = False
                break
        print(json.dumps({**totals, "pending": pending}))
        if pending:
            raise SystemExit(2)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
