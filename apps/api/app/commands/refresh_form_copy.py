from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.services.form_copy import refresh_form_copy


def main():
    engine = build_engine(Settings())
    try:
        with Session(engine) as session, session.begin():
            count = refresh_form_copy(session)
        print(f"Untouched form policy copies refreshed: {count}; editor changes preserved.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
