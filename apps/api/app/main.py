from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.routes.health import router
from app.core.config import Settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.db.session import build_engine, session_factory
from app.schemas.common import ErrorResponse
from app.services.health import expected_heads


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else Settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = build_engine(config)
        app.state.engine = engine
        app.state.session_factory = session_factory(engine)
        app.state.migration_heads = expected_heads()
        try:
            yield
        finally:
            engine.dispose()

    development = config.app_env in ("development", "test")
    app = FastAPI(
        title="MakanApp Landing API",
        version="0.4.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if development else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if development else None,
        responses={code: {"model": ErrorResponse} for code in (404, 422, 500, 503)},
    )
    install_error_handlers(app)
    app.add_middleware(RequestContextMiddleware)
    app.include_router(router, prefix="/api/v1")
    return app
