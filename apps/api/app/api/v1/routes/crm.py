from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.common import PaginatedResponse
from app.schemas.crm import (
    ActivityInput,
    ActivityRecord,
    AutomationInput,
    AutomationRecord,
    ContactInput,
    ContactRecord,
    CrmQuery,
    CustomerRecord,
    DashboardRecord,
    DemoInput,
    DemoRecord,
    NotificationRecord,
    OpportunityInput,
    OpportunityRecord,
    SavedViewInput,
    SavedViewRecord,
    SchoolInput,
    SchoolRecord,
)
from app.services import crm

router = APIRouter(prefix="/admin/crm", tags=["crm"])
SessionDep = Annotated[Session, Depends(get_session)]
QueryDep = Annotated[CrmQuery, Query()]


@router.get("/schools/{identifier}/customer", response_model=CustomerRecord)
def school_customer(identifier: UUID, request: Request, session: SessionDep, query: QueryDep):
    return crm.customer(request, session, identifier, query, True)


@router.get("/dashboard", response_model=DashboardRecord)
def dashboard(request: Request, session: SessionDep, query: QueryDep):
    return crm.dashboard(request, session, query)


@router.get("/automations", response_model=AutomationRecord)
def automations(request: Request, session: SessionDep):
    return crm.settings_api(request, session)


@router.put("/automations", response_model=AutomationRecord)
def save_automations(data: AutomationInput, request: Request, session: SessionDep):
    return crm.settings_api(request, session, data)


@router.get("/notifications", response_model=PaginatedResponse[NotificationRecord])
def notifications(request: Request, session: SessionDep, query: QueryDep):
    return crm.notifications(request, session, query)


@router.post("/notifications/{identifier}/read", response_model=NotificationRecord)
def read_notification(identifier: UUID, request: Request, session: SessionDep):
    return crm.notifications(request, session, CrmQuery(), identifier)


@router.delete("/views/{identifier}", status_code=204)
def delete_view(identifier: UUID, request: Request, session: SessionDep):
    crm.delete_view(request, session, identifier)
    return Response(status_code=204)


@router.get("/schools", response_model=PaginatedResponse[SchoolRecord])
def list_schools(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "schools", query)


@router.get("/schools/{identifier}", response_model=SchoolRecord)
def read_schools(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "schools", identifier)


@router.post("/schools", status_code=201, response_model=SchoolRecord)
def create_schools(data: SchoolInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "schools", data)


@router.patch("/schools/{identifier}", response_model=SchoolRecord)
def update_schools(identifier: UUID, data: SchoolInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "schools", data, identifier)


@router.get("/contacts", response_model=PaginatedResponse[ContactRecord])
def list_contacts(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "contacts", query)


@router.get("/contacts/{identifier}", response_model=ContactRecord)
def read_contacts(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "contacts", identifier)


@router.post("/contacts", status_code=201, response_model=ContactRecord)
def create_contacts(data: ContactInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "contacts", data)


@router.patch("/contacts/{identifier}", response_model=ContactRecord)
def update_contacts(identifier: UUID, data: ContactInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "contacts", data, identifier)


@router.get("/opportunities", response_model=PaginatedResponse[OpportunityRecord])
def list_opportunities(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "opportunities", query)


@router.get("/opportunities/{identifier}", response_model=OpportunityRecord)
def read_opportunities(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "opportunities", identifier)


@router.post("/opportunities", status_code=201, response_model=OpportunityRecord)
def create_opportunities(data: OpportunityInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "opportunities", data)


@router.patch("/opportunities/{identifier}", response_model=OpportunityRecord)
def update_opportunities(
    identifier: UUID, data: OpportunityInput, request: Request, session: SessionDep
):
    return crm.save_record(request, session, "opportunities", data, identifier)


@router.get("/activities", response_model=PaginatedResponse[ActivityRecord])
def list_activities(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "activities", query)


@router.get("/activities/{identifier}", response_model=ActivityRecord)
def read_activities(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "activities", identifier)


@router.post("/activities", status_code=201, response_model=ActivityRecord)
def create_activities(data: ActivityInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "activities", data)


@router.patch("/activities/{identifier}", response_model=ActivityRecord)
def update_activities(identifier: UUID, data: ActivityInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "activities", data, identifier)


@router.get("/demos", response_model=PaginatedResponse[DemoRecord])
def list_demos(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "demos", query)


@router.get("/demos/{identifier}", response_model=DemoRecord)
def read_demos(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "demos", identifier)


@router.post("/demos", status_code=201, response_model=DemoRecord)
def create_demos(data: DemoInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "demos", data)


@router.patch("/demos/{identifier}", response_model=DemoRecord)
def update_demos(identifier: UUID, data: DemoInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "demos", data, identifier)


@router.get("/views", response_model=PaginatedResponse[SavedViewRecord])
def list_views(request: Request, session: SessionDep, query: QueryDep):
    return crm.list_records(request, session, "views", query)


@router.get("/views/{identifier}", response_model=SavedViewRecord)
def read_views(identifier: UUID, request: Request, session: SessionDep):
    return crm.read_record(request, session, "views", identifier)


@router.post("/views", status_code=201, response_model=SavedViewRecord)
def create_views(data: SavedViewInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "views", data)


@router.patch("/views/{identifier}", response_model=SavedViewRecord)
def update_views(identifier: UUID, data: SavedViewInput, request: Request, session: SessionDep):
    return crm.save_record(request, session, "views", data, identifier)
