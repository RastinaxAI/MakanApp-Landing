from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.orm import Session


@contextmanager
def transaction(session: Session) -> Iterator[Session]:
    """Service owns one transaction; repository methods never commit."""
    with session.begin():
        yield session
