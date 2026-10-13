"""Redact expired personal data; retain non-personal CRM outcome aggregates."""

import argparse
import json

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.leads import purge


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=1000, choices=range(1, 10001))
    args = parser.parse_args()
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            result = purge(session, args.batch_size)
        print(json.dumps(result))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
