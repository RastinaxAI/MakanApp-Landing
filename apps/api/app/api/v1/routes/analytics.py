from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.analytics import (
    POLICY_VERSION,
    AnalyticsConfig,
    AnalyticsInput,
    AnalyticsMetrics,
    AnalyticsResult,
)
from app.services import analytics

router = APIRouter(tags=["analytics"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/analytics/config", response_model=AnalyticsConfig)
def config(request: Request):
    return {
        "enabled": request.app.state.settings.analytics_enabled,
        "policy_version": POLICY_VERSION,
        "retention_days": analytics.RETENTION_DAYS,
    }


@router.post(
    "/analytics/events", response_model=AnalyticsResult, dependencies=[Depends(analytics.gate)]
)
def event(data: AnalyticsInput, request: Request, session: SessionDep):
    return analytics.receive(data, request, session)


@router.get("/admin/analytics/metrics", response_model=AnalyticsMetrics)
def metrics(request: Request, session: SessionDep, days: int = Query(default=30, ge=1, le=30)):
    return analytics.metrics(request, session, days)
