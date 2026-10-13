"""Purge expired hashed deduplication keys; retain aggregate editorial view counts."""

import argparse
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.models import LearningView
from app.services.auth import now_utc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=1000, choices=range(1, 10001))
    args = parser.parse_args()
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            rows = (
                session.execute(
                    select(LearningView)
                    .where(LearningView.expires_at < now_utc())
                    .limit(args.batch_size)
                    .with_for_update(skip_locked=True)
                )
                .scalars()
                .all()
            )
            for row in rows:
                session.delete(row)
            print(json.dumps({"deleted": len(rows)}))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
