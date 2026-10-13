from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.learning_intro import refresh_intro


def main():
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            changed = refresh_intro(session)
        print(
            "Learning intro refreshed with a new immutable revision."
            if changed
            else "No untouched legacy intro found; editor changes preserved."
        )
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
