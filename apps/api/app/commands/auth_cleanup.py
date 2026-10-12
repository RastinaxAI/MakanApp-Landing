"""Operator maintenance; one bounded transaction, no account/session/audit deletion."""

import argparse
import json

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.auth import now_utc
from app.services.auth_maintenance import cleanup_expired


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            result = cleanup_expired(session, now_utc(), args.batch_size)
        print(json.dumps(result))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
