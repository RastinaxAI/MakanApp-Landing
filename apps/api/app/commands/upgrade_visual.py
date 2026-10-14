import argparse
import json

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.visual_upgrade import upgrade


def main():
    parser = argparse.ArgumentParser(
        description="Preserve revisions and URLs while converting published marketing pages"
    )
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verified-backup", help="Encrypted backup name verified by the operator")
    args = parser.parse_args()
    if args.apply and not args.verified_backup:
        parser.error("A verified backup reference is required for applying the conversion")
    engine = build_engine(Settings())
    try:
        with Session(engine) as session:
            try:
                result = upgrade(session)
                if args.apply:
                    session.commit()
                else:
                    session.rollback()
                print(
                    json.dumps(
                        {
                            "applied": args.apply,
                            "upgraded": len(result["upgraded"]),
                            "skipped": len(result["skipped"]),
                            "mapping": result["upgraded"],
                        }
                    )
                )
            except BaseException:
                session.rollback()
                raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
