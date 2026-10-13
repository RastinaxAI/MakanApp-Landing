from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.analytics import router as analytics_router
from app.api.v1.routes.cms import router as cms_router
from app.api.v1.routes.health import router
from app.api.v1.routes.leads import router as leads_router
from app.api.v1.routes.learning import router as learning_router
from app.api.v1.routes.seo import router as seo_router
from app.core.config import Settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.security import Security
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
        limiter_engine = build_engine(config.model_copy(update={"db_pool_size": 2}))
        app.state.limiter_session_factory = session_factory(limiter_engine)
        app.state.migration_heads = expected_heads()
        app.state.settings = config
        app.state.security = Security(config)
        try:
            yield
        finally:
            engine.dispose()
            limiter_engine.dispose()

    development = config.app_env in ("development", "test")
    app = FastAPI(
        title="MakanApp Landing API",
        version="0.9.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if development else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if development else None,
        responses={code: {"model": ErrorResponse} for code in (404, 422, 500, 503)},
    )
    install_error_handlers(app)
    app.add_middleware(RequestContextMiddleware)
    app.include_router(router, prefix="/api/v1")
    app.include_router(admin_router, prefix="/api/v1")
    app.include_router(cms_router, prefix="/api/v1")
    app.include_router(learning_router, prefix="/api/v1")
    app.include_router(leads_router, prefix="/api/v1")
    app.include_router(seo_router, prefix="/api/v1")
    app.include_router(analytics_router, prefix="/api/v1")
    return app
