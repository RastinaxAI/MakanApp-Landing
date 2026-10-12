import app.models  # noqa: F401
from alembic import context
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine

config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=Settings().database_url.get_secret_value(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    supplied = config.attributes.get("connection")
    if supplied is not None:
        context.configure(connection=supplied, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
        return
    engine = build_engine(Settings())
    # Migration command opens a dedicated connection; API startup never mutates schema.
    try:
        with engine.connect() as connection:
            # One migration process per database; PostgreSQL releases the lock on disconnect.
            connection.exec_driver_sql("SELECT pg_advisory_lock(74120401)")
            connection.commit()
            context.configure(
                connection=connection, target_metadata=target_metadata, compare_type=True
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
