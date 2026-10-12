from uuid import UUID

from sqlalchemy.orm import Session

from app.db.base import Base


class Repository[Model: Base]:
    def __init__(self, session: Session, model: type[Model]) -> None:
        self.session = session
        self.model = model

    def get(self, entity_id: UUID) -> Model | None:
        return self.session.get(self.model, entity_id)

    def add(self, entity: Model) -> None:
        self.session.add(entity)
