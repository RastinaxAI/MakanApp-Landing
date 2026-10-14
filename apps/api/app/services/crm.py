"""Transactional sales workflows reuse Lead, sessions, RBAC, CSRF and audit."""

import hashlib
import json
import secrets
from datetime import timedelta
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    String,
    case,
    cast,
    delete,
    exists,
    func,
    literal,
    or_,
    select,
    text,
    union_all,
)
from sqlalchemy.dialects.postgresql import insert

from app.core.problems import ApiProblem
from app.models import Admin, Lead, LeadHistory, LeadNote, SiteSetting
from app.models.crm import (
    Activity,
    Contact,
    DemoSession,
    LeadProfile,
    Notification,
    Opportunity,
    SavedView,
    School,
    StageHistory,
)
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.crm import (
    ActivityRecord,
    AutomationInput,
    ContactRecord,
    DemoRecord,
    NotificationRecord,
    OpportunityRecord,
    SavedViewRecord,
    SchoolRecord,
)
from app.schemas.leads import CONSENT_VERSION
from app.services import leads
from app.services.auth import audit, now_utc, require_capability

RESOURCES = {
    "schools": (School, SchoolRecord),
    "contacts": (Contact, ContactRecord),
    "opportunities": (Opportunity, OpportunityRecord),
    "activities": (Activity, ActivityRecord),
    "demos": (DemoSession, DemoRecord),
    "views": (SavedView, SavedViewRecord),
}
SETTINGS_KEY = "crm_automations"


def values(row, schema):
    return schema.model_validate({key: getattr(row, key) for key in schema.model_fields})


def page(session, statement, schema, query):
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    rows = session.scalars(statement.offset(query.offset).limit(query.page_size)).all()
    return PaginatedResponse(
        items=[values(row, schema) for row in rows],
        pagination=PaginationMeta(
            page=query.page,
            page_size=query.page_size,
            total=total,
            pages=(total + query.page_size - 1) // query.page_size,
        ),
    )


def get(session, model, identifier, lock=False):
    statement = select(model).where(model.id == identifier)
    row = session.scalar(statement.with_for_update() if lock else statement)
    if not row:
        raise ApiProblem(404, "NOT_FOUND", "رکورد پیدا نشد.")
    return row


def version(request, row):
    header = request.headers.get("if-match", "").strip('"')
    if not header:
        raise ApiProblem(428, "VERSION_REQUIRED", "نسخهٔ رکورد لازم است.")
    if header != str(row.version):
        raise ApiProblem(409, "VERSION_CONFLICT", "اطلاعات تغییر کرده؛ صفحه را تازه‌سازی کنید.")


def active_lead(session, identifier, lock=True):
    row = leads.get_row(session, identifier, lock)
    if row.purged_at:
        raise ApiProblem(409, "LEAD_PURGED", "اطلاعات شخصی حذف شده؛ این رکورد قابل پیگیری نیست.")
    return row


def active_school(session, identifier):
    row = get(session, School, identifier, True)
    if row.purged_at:
        raise ApiProblem(409, "SCHOOL_PURGED", "پروندهٔ مدرسه طبق سیاست نگهداری حذف شده است.")
    return row


def assignee(session, identifier):
    if identifier and not session.scalar(
        select(Admin.id).where(
            Admin.id == identifier, Admin.is_active.is_(True), Admin.role.in_(("owner", "sales"))
        )
    ):
        raise ApiProblem(422, "INVALID_ASSIGNEE", "کارشناس باید مالک یا عضو فعال فروش باشد.")


def automation_settings(session):
    row = session.get(SiteSetting, SETTINGS_KEY)
    return {
        **AutomationInput.model_validate(row.value_json if row else {}).model_dump(mode="json"),
        "row_version": row.row_version if row else 1,
    }


def notify(session, kind, key, lead_id, recipient=None):
    recipients = (
        [recipient]
        if recipient
        else session.scalars(
            select(Admin.id).where(Admin.role == "owner", Admin.is_active.is_(True))
        ).all()
    )
    count = 0
    for identifier in recipients:
        event_key = f"{key}:{identifier}"
        result = session.execute(
            insert(Notification)
            .values(
                recipient_id=identifier,
                event_key=event_key,
                kind=kind,
                href=f"/admin/crm/leads/{lead_id}",
            )
            .on_conflict_do_nothing(index_elements=[Notification.event_key])
            .returning(Notification.id)
        )
        count += int(result.scalar_one_or_none() is not None)
    return count


def touch(session, row, admin_id, action):
    row.last_activity_at = now_utc()
    row.version += 1
    profile = session.get(LeadProfile, row.id)
    if profile and profile.school_id:
        school = session.get(School, profile.school_id)
        school.last_activity_at = row.last_activity_at
    session.add(
        LeadHistory(
            lead_id=row.id,
            actor_id=admin_id,
            changes={"crm": {"from": None, "to": action}},
            created_at=row.last_activity_at,
        )
    )


def ingest(session, row, backfill=False):
    """Called inside the EXISTING submit transaction, once per new request."""
    profile = session.get(LeadProfile, row.id)
    if not profile:
        profile = LeadProfile(lead_id=row.id, tags=[], qualification="")
        session.add(profile)
    if row.kind == "demo" and not row.purged_at and not profile.school_id:
        leads.advisory(
            session,
            hashlib.sha256(
                json.dumps(
                    [row.details.get("school_name"), row.contact_value], ensure_ascii=False
                ).encode()
            ).hexdigest(),
        )
        # Same name alone does not identify a school. Require the same contact too.
        school = session.scalar(
            select(School)
            .join(Contact, Contact.school_id == School.id)
            .where(
                School.name == row.details.get("school_name"),
                Contact.contact_value == row.contact_value,
                School.purged_at.is_(None),
            )
            .limit(1)
        )
        if not school:
            school = School(
                name=row.details.get("school_name") or "مدرسه",
                city=row.details.get("city", ""),
                province=row.details.get("province", ""),
                last_activity_at=row.last_activity_at,
            )
            session.add(school)
            session.flush()
        profile.school_id = school.id
        school.last_activity_at = max(school.last_activity_at, row.last_activity_at)
        existing_contact = session.scalar(
            select(Contact)
            .where(
                Contact.school_id == school.id,
                Contact.contact_value == row.contact_value,
                Contact.purged_at.is_(None),
            )
            .limit(1)
        )
        if not existing_contact:
            session.add(
                Contact(
                    school_id=school.id,
                    source_lead_id=row.id,
                    full_name=row.full_name,
                    contact_method=row.contact_method,
                    contact_value=row.contact_value,
                    job_title=row.details.get("job_title", ""),
                    is_manager=True,
                    last_activity_at=row.last_activity_at,
                )
            )
    if not backfill:
        settings = automation_settings(session)
        if settings["auto_assign"] and not row.assigned_to:
            session.execute(text("SELECT pg_advisory_xact_lock(74120605)"))
            if settings["assignment_mode"] == "fixed":
                candidate = settings["fixed_assignee"]
                try:
                    assignee(session, candidate)
                except ApiProblem:
                    candidate = None
            else:
                load = (
                    select(func.count())
                    .select_from(Lead)
                    .where(
                        Lead.assigned_to == Admin.id,
                        Lead.status != "closed",
                        Lead.purged_at.is_(None),
                    )
                    .correlate(Admin)
                    .scalar_subquery()
                )
                candidate = session.scalar(
                    select(Admin.id)
                    .where(Admin.role == "sales", Admin.is_active.is_(True))
                    .order_by(load, Admin.id)
                    .limit(1)
                )
            if candidate:
                row.assigned_to = UUID(str(candidate))
                session.add(
                    LeadHistory(
                        lead_id=row.id,
                        changes={"assigned_to": {"from": None, "to": str(candidate)}},
                        created_at=now_utc(),
                    )
                )
                notify(session, "assigned", f"assigned:{row.id}:initial", row.id, candidate)
        notify(session, "new_lead", f"new:{row.id}", row.id, row.assigned_to)
    session.flush()
    return profile


def backfill(session):
    session.execute(text("SELECT pg_advisory_xact_lock(74120605)"))
    rows = session.scalars(
        select(Lead).where(Lead.purged_at.is_(None)).order_by(Lead.id).with_for_update()
    ).all()
    count = 0
    for row in rows:
        old = session.get(LeadProfile, row.id)
        if not old or (row.kind == "demo" and not old.school_id):
            ingest(session, row, True)
            count += 1
    return count


def cohort_filters(query):
    result = []
    if query.source:
        result.append(Lead.source == query.source)
    if query.lead_status:
        result.append(Lead.status == query.lead_status)
    if query.tag:
        result.append(
            Lead.id.in_(select(LeadProfile.lead_id).where(LeadProfile.tags.contains([query.tag])))
        )
    if query.q:
        term = "%" + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        result.append(
            or_(
                Lead.full_name.ilike(term, escape="\\"),
                Lead.contact_value.ilike(term, escape="\\"),
                Lead.details["school_name"].astext.ilike(term, escape="\\"),
            )
        )
    return result


def list_records(request, session, resource, query):
    model, schema = RESOURCES[resource]
    with session.begin():
        admin = leads.authorize(request, session)
        statement = select(model)
        if resource == "views":
            statement = statement.where(SavedView.admin_id == admin.id)
        elif resource in ("schools", "contacts"):
            statement = statement.where(model.purged_at.is_(None))
        else:
            statement = statement.join(Lead, Lead.id == model.lead_id).where(
                Lead.purged_at.is_(None)
            )
            statement = statement.where(*cohort_filters(query.model_copy(update={"q": ""})))
        if resource in ("schools", "contacts") and (
            query.tag or query.source or query.lead_status or query.assigned_to
        ):
            conditions = cohort_filters(query.model_copy(update={"q": ""}))
            if query.assigned_to:
                conditions.append(Lead.assigned_to == query.assigned_to)
            linked = (
                select(LeadProfile.school_id)
                .join(Lead, Lead.id == LeadProfile.lead_id)
                .where(Lead.purged_at.is_(None), *conditions)
            )
            statement = statement.where(
                (model.id if resource == "schools" else model.school_id).in_(linked)
            )
        if query.lead_id and hasattr(model, "lead_id"):
            statement = statement.where(model.lead_id == query.lead_id)
        if query.school_id and hasattr(model, "school_id"):
            statement = statement.where(model.school_id == query.school_id)
        if query.assigned_to and hasattr(model, "assigned_to"):
            statement = statement.where(model.assigned_to == query.assigned_to)
        if resource == "opportunities" and query.stage:
            statement = statement.where(model.stage == query.stage)
        if query.overdue and resource == "activities":
            statement = statement.where(model.status == "open", model.due_at < now_utc())
        if query.q:
            column = (
                model.name
                if resource in ("schools", "views")
                else model.full_name
                if resource == "contacts"
                else model.title
                if resource != "demos"
                else None
            )
            if column is not None:
                term = (
                    "%"
                    + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                    + "%"
                )
                statement = statement.where(column.ilike(term, escape="\\"))
        if query.date_from:
            statement = statement.where(model.created_at >= query.date_from)
        if query.date_to:
            statement = statement.where(model.created_at < query.date_to)
        return page(session, statement.order_by(model.created_at.desc(), model.id), schema, query)


def read_record(request, session, resource, identifier):
    model, schema = RESOURCES[resource]
    with session.begin():
        admin = leads.authorize(request, session)
        row = get(session, model, identifier)
        if resource == "views" and row.admin_id != admin.id:
            raise ApiProblem(404, "NOT_FOUND", "نمای ذخیره‌شده پیدا نشد.")
        return values(row, schema)


def delete_view(request, session, identifier):
    with session.begin():
        admin = leads.authorize(request, session, True)
        row = get(session, SavedView, identifier, True)
        if row.admin_id != admin.id:
            raise ApiProblem(404, "NOT_FOUND", "نمای ذخیره‌شده پیدا نشد.")
        version(request, row)
        session.delete(row)
        audit(session, request, "crm.view.deleted", admin.id, row.id, entity_type="crm")


def check_links(session, resource, data):
    payload = data.model_dump()
    if "assigned_to" in payload:
        assignee(session, payload["assigned_to"])
    lead = active_lead(session, payload["lead_id"]) if "lead_id" in payload else None
    source = (
        active_lead(session, payload["source_lead_id"]) if payload.get("source_lead_id") else None
    )
    if "school_id" in payload:
        school = active_school(session, payload["school_id"])
        if lead:
            profile = session.get(LeadProfile, lead.id) or ingest(session, lead, True)
            if profile.school_id != school.id:
                raise ApiProblem(422, "SCHOOL_MISMATCH", "فرصت باید متعلق به مدرسهٔ همین لید باشد.")
    if payload.get("source_lead_id"):
        profile = session.get(LeadProfile, source.id)
        if not profile or profile.school_id != payload["school_id"]:
            raise ApiProblem(422, "SCHOOL_MISMATCH", "فرد باید متعلق به مدرسهٔ لید باشد.")
    if payload.get("opportunity_id"):
        opportunity = get(session, Opportunity, payload["opportunity_id"])
        if opportunity.lead_id != payload["lead_id"]:
            raise ApiProblem(422, "LEAD_MISMATCH", "فرصت مربوط به این لید نیست.")
    return lead or source


def save_record(request, session, resource, data, identifier=None):
    model, schema = RESOURCES[resource]
    with session.begin():
        admin = leads.authorize(request, session, True)
        row = get(session, model, identifier, True) if identifier else None
        if row:
            version(request, row)
            if resource == "views" and row.admin_id != admin.id:
                raise ApiProblem(404, "NOT_FOUND", "نمای ذخیره‌شده پیدا نشد.")
            if getattr(row, "purged_at", None):
                raise ApiProblem(409, "RECORD_PURGED", "اطلاعات حذف شده است.")
        payload = data.model_dump(mode="json") if resource == "views" else data.model_dump()
        for key in ("lead_id", "school_id", "source_lead_id"):
            if row and key in payload and getattr(row, key) != payload[key]:
                raise ApiProblem(422, "IMMUTABLE_RELATION", "ارتباط ثبت‌شده قابل جابه‌جایی نیست.")
        lead = check_links(session, resource, data)
        if resource == "contacts":
            duplicate = session.scalar(
                select(Contact.id)
                .where(
                    Contact.school_id == data.school_id,
                    Contact.contact_value == data.contact_value,
                    Contact.purged_at.is_(None),
                    Contact.id != identifier if identifier else literal(True),
                )
                .limit(1)
            )
            if duplicate:
                raise ApiProblem(409, "DUPLICATE_CONTACT", "این راه تماس در پرونده وجود دارد.")
        if resource == "demos" and data.status == "scheduled":
            leads.advisory(session, hashlib.sha256(str(data.assigned_to).encode()).hexdigest())
            overlap = session.scalar(
                select(DemoSession.id)
                .where(
                    DemoSession.assigned_to == data.assigned_to,
                    DemoSession.status == "scheduled",
                    DemoSession.starts_at < data.ends_at,
                    DemoSession.ends_at > data.starts_at,
                    DemoSession.id != identifier if identifier else literal(True),
                )
                .limit(1)
            )
            if overlap:
                raise ApiProblem(
                    409, "DEMO_OVERLAP", "در این زمان برای کارشناس جلسهٔ دیگری ثبت شده است."
                )
        if (
            resource == "views"
            and not identifier
            and session.scalar(
                select(func.count()).select_from(SavedView).where(SavedView.admin_id == admin.id)
            )
            >= 20
        ):
            raise ApiProblem(409, "VIEW_LIMIT", "حداکثر ۲۰ نمای شخصی قابل ذخیره است.")
        old_stage = row.stage if row and resource == "opportunities" else None
        if not row:
            row = model(**payload)
            if resource in ("schools", "contacts", "opportunities"):
                row.last_activity_at = now_utc()
            if resource == "activities":
                row.actor_id = admin.id
            if resource == "views":
                row.admin_id = admin.id
            session.add(row)
        else:
            for key, value in payload.items():
                setattr(row, key, value)
            row.version += 1
        if resource in ("schools", "contacts", "opportunities"):
            row.last_activity_at = now_utc()
        if resource == "contacts":
            session.get(School, row.school_id).last_activity_at = row.last_activity_at
        if resource == "activities":
            row.completed_at = (
                now_utc()
                if data.status == "completed" and not row.completed_at
                else row.completed_at
                if data.status == "completed"
                else None
            )
        session.flush()
        if lead:
            touch(session, lead, admin.id, resource + ".saved")
        if resource == "opportunities":
            profile = session.get(LeadProfile, lead.id)
            if not profile.converted_at:
                profile.converted_at = now_utc()
            if old_stage != row.stage:
                session.add(
                    StageHistory(
                        opportunity_id=row.id,
                        actor_id=admin.id,
                        from_stage=old_stage,
                        to_stage=row.stage,
                        created_at=now_utc(),
                    )
                )
                notify(
                    session,
                    "stage_changed",
                    f"stage:{row.id}:{row.version}:{row.stage}",
                    lead.id,
                    row.assigned_to,
                )
        if resource == "demos":
            notify(
                session, "demo_changed", f"demo:{row.id}:{row.version}", lead.id, row.assigned_to
            )
        if resource == "activities" and data.assigned_to:
            notify(
                session,
                "task_assigned",
                f"activity:{row.id}:{row.version}",
                lead.id,
                data.assigned_to,
            )
        audit(
            session,
            request,
            "crm." + resource + ".saved",
            admin.id,
            row.id,
            {"created": identifier is None, "version": row.version},
            "crm",
        )
        session.flush()
        return values(row, schema)


def manual_lead(request, session, data):
    with session.begin():
        admin = leads.authorize(request, session, True)
        assignee(session, data.assigned_to)
        leads.advisory(session, hashlib.sha256(data.phone.encode()).hexdigest())
        duplicate = session.scalar(
            select(Lead.id)
            .where(
                Lead.contact_value == data.phone,
                Lead.details["school_name"].astext == data.school_name,
                Lead.status != "closed",
                Lead.purged_at.is_(None),
            )
            .limit(1)
        )
        if duplicate:
            raise ApiProblem(
                409,
                "DUPLICATE_LEAD",
                "درخواست باز برای همین شماره و مدرسه وجود دارد؛ از جست‌وجو استفاده کنید.",
            )
        now = now_utc()
        row = Lead(
            reference_id="MK-" + secrets.token_urlsafe(24),
            kind="demo",
            full_name=data.full_name,
            contact_method="phone",
            contact_value=data.phone,
            details={"school_name": data.school_name, "city": data.city, "province": data.province},
            source=data.source,
            consent_version=CONSENT_VERSION,
            consent_at=now,
            last_activity_at=now,
            assigned_to=data.assigned_to,
        )
        session.add(row)
        session.flush()
        ingest(session, row)
        session.add(
            LeadHistory(
                lead_id=row.id,
                actor_id=admin.id,
                changes={"status": {"from": None, "to": "new"}},
                created_at=now,
            )
        )
        audit(
            session,
            request,
            "crm.lead.created",
            admin.id,
            row.id,
            {"consent_recorded": True},
            "lead",
        )
        return leads.projection(row, True)


def profile_update(request, session, identifier, data):
    with session.begin():
        admin = leads.authorize(request, session, True)
        row = active_lead(session, identifier)
        leads.expected(request, row)
        profile = session.get(LeadProfile, row.id) or ingest(session, row, True)
        if data.school_id:
            active_school(session, data.school_id)
        if data.school_id != profile.school_id and session.scalar(
            select(Opportunity.id).where(Opportunity.lead_id == row.id).limit(1)
        ):
            raise ApiProblem(
                409,
                "SCHOOL_HAS_OPPORTUNITIES",
                "ارتباط لید دارای فرصت، نیازمند انتقال اختصاصی است.",
            )
        row.full_name = data.full_name
        if data.contact_method:
            if row.kind == "demo" and data.contact_method != "phone":
                raise ApiProblem(
                    422, "DEMO_PHONE_REQUIRED", "درخواست دمو باید شمارهٔ تماس داشته باشد."
                )
            row.contact_method = data.contact_method
            row.contact_value = data.contact_value
            row.fingerprint = None
        profile.school_id = data.school_id
        profile.tags = data.tags
        profile.qualification = data.qualification
        touch(session, row, admin.id, "qualification.updated")
        audit(
            session,
            request,
            "crm.lead.qualified",
            admin.id,
            row.id,
            {"profile_updated": True},
            "lead",
        )
        session.flush()
        return leads.projection(row, True)


def timeline(session, lead_ids, query):
    build = func.jsonb_build_object
    parts = [
        select(
            literal("activity").label("kind"),
            Activity.id,
            Activity.updated_at.label("at"),
            build(
                "kind",
                Activity.kind,
                "title",
                Activity.title,
                "body",
                Activity.body,
                "status",
                Activity.status,
            ).label("details"),
        ).where(Activity.lead_id.in_(lead_ids)),
        select(
            literal("note"), LeadNote.id, LeadNote.created_at, build("body", LeadNote.body)
        ).where(LeadNote.lead_id.in_(lead_ids)),
        select(
            literal("lead_history"), LeadHistory.id, LeadHistory.created_at, LeadHistory.changes
        ).where(LeadHistory.lead_id.in_(lead_ids)),
        select(
            literal("demo"),
            DemoSession.id,
            DemoSession.updated_at,
            build(
                "status",
                DemoSession.status,
                "starts_at",
                DemoSession.starts_at,
                "outcome",
                DemoSession.outcome,
                "next_action",
                DemoSession.next_action,
            ),
        ).where(DemoSession.lead_id.in_(lead_ids)),
        select(
            literal("stage"),
            StageHistory.id,
            StageHistory.created_at,
            build("from", StageHistory.from_stage, "to", StageHistory.to_stage),
        )
        .join(Opportunity, Opportunity.id == StageHistory.opportunity_id)
        .where(Opportunity.lead_id.in_(lead_ids)),
    ]
    source = union_all(*parts).subquery()
    total = session.scalar(select(func.count()).select_from(source))
    items = (
        session.execute(
            select(source)
            .order_by(source.c.at.desc(), source.c.id)
            .offset(query.offset)
            .limit(query.page_size)
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(row) for row in items],
        "pagination": {
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "pages": (total + query.page_size - 1) // query.page_size,
        },
    }


def customer(request, session, identifier, query, school=False):
    with session.begin():
        leads.authorize(request, session)
        lead = None if school else leads.get_row(session, identifier)
        profile = session.get(LeadProfile, lead.id) if lead else None
        organization = (
            get(session, School, identifier)
            if school
            else session.get(School, profile.school_id)
            if profile and profile.school_id
            else None
        )
        lead_ids = (
            session.scalars(
                select(LeadProfile.lead_id)
                .join(Lead, Lead.id == LeadProfile.lead_id)
                .where(LeadProfile.school_id == organization.id, Lead.purged_at.is_(None))
            ).all()
            if organization
            else [identifier]
        )
        result = {
            "lead": leads.projection(lead, True) if lead else None,
            "profile": {
                "school_id": profile.school_id,
                "tags": profile.tags,
                "qualification": profile.qualification,
                "converted_at": profile.converted_at,
            }
            if profile
            else {"school_id": None, "tags": [], "qualification": "", "converted_at": None},
            "school": values(organization, SchoolRecord) if organization else None,
        }
        result["requests"] = [
            leads.projection(row, True)
            for row in session.scalars(
                select(Lead)
                .where(Lead.id.in_(lead_ids))
                .order_by(Lead.created_at.desc())
                .limit(100)
            )
        ]
        result["contacts"] = page(
            session,
            select(Contact)
            .where(
                Contact.school_id == organization.id if organization else literal(False),
                Contact.purged_at.is_(None),
            )
            .order_by(Contact.created_at.desc(), Contact.id),
            ContactRecord,
            query,
        )
        for key, model, schema in [
            ("opportunities", Opportunity, OpportunityRecord),
            ("activities", Activity, ActivityRecord),
            ("demos", DemoSession, DemoRecord),
        ]:
            result[key] = page(
                session,
                select(model)
                .where(model.lead_id.in_(lead_ids))
                .order_by(model.created_at.desc(), model.id),
                schema,
                query,
            )
        result["timeline"] = timeline(session, lead_ids, query)
        return result


def dashboard(request, session, query):
    with session.begin():
        leads.authorize(request, session)
        filters = [Lead.purged_at.is_(None)]
        if query.date_from:
            filters.append(Lead.created_at >= query.date_from)
        if query.date_to:
            filters.append(Lead.created_at < query.date_to)
        if query.assigned_to:
            filters.append(Lead.assigned_to == query.assigned_to)
        filters.extend(cohort_filters(query))
        cohort = select(Lead.id).where(*filters)

        def count(statement):
            return session.scalar(statement) or 0

        total = count(select(func.count()).select_from(Lead).where(*filters))
        scheduled = count(
            select(func.count(func.distinct(DemoSession.lead_id))).where(
                DemoSession.lead_id.in_(cohort), DemoSession.status == "scheduled"
            )
        )
        completed = count(
            select(func.count(func.distinct(DemoSession.lead_id))).where(
                DemoSession.lead_id.in_(cohort), DemoSession.status == "completed"
            )
        )
        demo_leads = count(
            select(func.count(func.distinct(DemoSession.lead_id))).where(
                DemoSession.lead_id.in_(cohort), DemoSession.status.in_(("scheduled", "completed"))
            )
        )
        completed_ids = select(DemoSession.lead_id).where(
            DemoSession.lead_id.in_(cohort), DemoSession.status == "completed"
        )
        converted = count(
            select(func.count(func.distinct(Opportunity.lead_id))).where(
                Opportunity.lead_id.in_(completed_ids)
            )
        )
        stages = dict(
            session.execute(
                select(Opportunity.stage, func.count())
                .where(Opportunity.lead_id.in_(cohort))
                .group_by(Opportunity.stage)
            ).all()
        )
        sources = dict(
            session.execute(
                select(Lead.source, func.count()).where(*filters).group_by(Lead.source)
            ).all()
        )
        assignees = session.scalars(
            select(Admin)
            .where(Admin.is_active.is_(True), Admin.role.in_(("owner", "sales")))
            .order_by(Admin.id)
        ).all()
        performance = []
        for admin in assignees:
            performance.append(
                {
                    "id": admin.id,
                    "label": admin.phone or admin.email,
                    "completed_activities": count(
                        select(func.count())
                        .select_from(Activity)
                        .where(
                            Activity.lead_id.in_(cohort),
                            Activity.assigned_to == admin.id,
                            Activity.status == "completed",
                        )
                    ),
                    "completed_demos": count(
                        select(func.count())
                        .select_from(DemoSession)
                        .where(
                            DemoSession.lead_id.in_(cohort),
                            DemoSession.assigned_to == admin.id,
                            DemoSession.status == "completed",
                        )
                    ),
                    "won_opportunities": count(
                        select(func.count())
                        .select_from(Opportunity)
                        .where(
                            Opportunity.lead_id.in_(cohort),
                            Opportunity.assigned_to == admin.id,
                            Opportunity.stage == "won",
                        )
                    ),
                }
            )
        return {
            "total_leads": total,
            "new_leads": count(
                select(func.count()).select_from(Lead).where(*filters, Lead.status == "new")
            ),
            "qualified_leads": count(
                select(func.count()).select_from(Lead).where(*filters, Lead.status == "qualified")
            ),
            "demo_requests": count(
                select(func.count()).select_from(Lead).where(*filters, Lead.kind == "demo")
            ),
            "scheduled_demos": count(
                select(func.count())
                .select_from(DemoSession)
                .where(DemoSession.lead_id.in_(cohort), DemoSession.status == "scheduled")
            ),
            "completed_demos": count(
                select(func.count())
                .select_from(DemoSession)
                .where(DemoSession.lead_id.in_(cohort), DemoSession.status == "completed")
            ),
            "lead_to_demo_percent": round(demo_leads * 100 / total, 2) if total else 0,
            "demo_to_opportunity_percent": round(converted * 100 / completed, 2)
            if completed
            else 0,
            "scheduled_leads": scheduled,
            "completed_leads": completed,
            "overdue_followups": count(
                select(func.count())
                .select_from(Activity)
                .where(
                    Activity.lead_id.in_(cohort),
                    Activity.status == "open",
                    Activity.due_at < now_utc(),
                )
            ),
            "stages": stages,
            "sources": sources,
            "performance": performance,
        }


def settings_api(request, session, data=None):
    with session.begin():
        admin = leads.authorize(request, session, data is not None)
        if data is not None:
            require_capability(admin, "settings")
            session.execute(text("SELECT pg_advisory_xact_lock(74120605)"))
            current = automation_settings(session)
            if request.headers.get("if-match", "").strip('"') != str(current["row_version"]):
                raise ApiProblem(409, "VERSION_CONFLICT", "تنظیمات تغییر کرده است.")
            assignee(session, data.fixed_assignee)
            row = session.get(SiteSetting, SETTINGS_KEY)
            if not row:
                row = SiteSetting(key=SETTINGS_KEY, value_json={}, updated_by=admin.id)
                session.add(row)
            row.value_json = data.model_dump(mode="json")
            row.row_version = current["row_version"] + 1
            row.updated_by = admin.id
            audit(
                session,
                request,
                "crm.automations.updated",
                admin.id,
                changes={"settings_updated": True},
                entity_type="settings",
            )
            session.flush()
        return automation_settings(session)


def notifications(request, session, query, identifier=None):
    with session.begin():
        admin = leads.authorize(request, session, identifier is not None)
        if identifier:
            row = session.scalar(
                select(Notification)
                .where(Notification.id == identifier, Notification.recipient_id == admin.id)
                .with_for_update()
            )
            if not row:
                raise ApiProblem(404, "NOT_FOUND", "اعلان پیدا نشد.")
            row.read_at = now_utc()
            session.flush()
            return values(row, NotificationRecord)
        return page(
            session,
            select(Notification)
            .where(Notification.recipient_id == admin.id)
            .order_by(Notification.created_at.desc(), Notification.id),
            NotificationRecord,
            query,
        )


def automations(session, now=None):
    """Durable internal delivery. No external SMS is claimed or sent by this job."""
    now = now or now_utc()
    settings = automation_settings(session)
    if not settings["reminders_enabled"]:
        return {"notifications": 0}
    total = 0

    def pending(kind, identifier, at):
        prefix = func.concat(
            kind,
            ":",
            identifier,
            ":",
            cast(cast(func.floor(func.extract("epoch", at)), BigInteger), String),
            ":%",
        )
        return ~exists(select(Notification.id).where(Notification.event_key.like(prefix)))

    activity_kind = case((Activity.due_at < now, "overdue_task"), else_="followup_reminder")
    for row in session.scalars(
        select(Activity)
        .join(Lead, Lead.id == Activity.lead_id)
        .where(
            Lead.purged_at.is_(None),
            Activity.status == "open",
            Activity.due_at <= now + timedelta(hours=24),
            pending(activity_kind, Activity.id, Activity.due_at),
        )
        .order_by(Activity.due_at, Activity.id)
        .limit(500)
    ):
        kind = "overdue_task" if row.due_at < now else "followup_reminder"
        total += notify(
            session,
            kind,
            f"{kind}:{row.id}:{int(row.due_at.timestamp())}",
            row.lead_id,
            row.assigned_to,
        )
    for row in session.scalars(
        select(DemoSession)
        .join(Lead, Lead.id == DemoSession.lead_id)
        .where(
            Lead.purged_at.is_(None),
            DemoSession.status == "scheduled",
            DemoSession.starts_at >= now,
            DemoSession.starts_at <= now + timedelta(hours=24),
            pending("demo_reminder", DemoSession.id, DemoSession.starts_at),
        )
        .order_by(DemoSession.starts_at, DemoSession.id)
        .limit(500)
    ):
        total += notify(
            session,
            "demo_reminder",
            f"demo_reminder:{row.id}:{int(row.starts_at.timestamp())}",
            row.lead_id,
            row.assigned_to,
        )
    for row in session.scalars(
        select(Opportunity)
        .join(Lead, Lead.id == Opportunity.lead_id)
        .where(
            Lead.purged_at.is_(None),
            Opportunity.stage.not_in(("won", "lost")),
            Opportunity.last_activity_at < now - timedelta(days=settings["inactive_days"]),
            pending("inactive", Opportunity.id, Opportunity.last_activity_at),
        )
        .order_by(Opportunity.last_activity_at, Opportunity.id)
        .limit(500)
    ):
        total += notify(
            session,
            "inactive_opportunity",
            f"inactive:{row.id}:{int(row.last_activity_at.timestamp())}",
            row.lead_id,
            row.assigned_to,
        )
    return {"notifications": total}


def purge_copies(session, lead, now):
    """Remove every copied personal field when the existing 180-day policy runs."""
    profile = session.get(LeadProfile, lead.id)
    if profile:
        profile.tags = []
        profile.qualification = ""
    for model in (Activity, DemoSession, Opportunity):
        for row in session.scalars(select(model).where(model.lead_id == lead.id)):
            for field in ("title", "body", "notes", "lost_reason", "outcome", "next_action"):
                if hasattr(row, field):
                    setattr(
                        row,
                        field,
                        "اطلاعات حذف‌شده"
                        if field in ("title", "lost_reason", "outcome", "next_action")
                        else "",
                    )
            row.version += 1
    for row in session.scalars(select(Contact).where(Contact.source_lead_id == lead.id)):
        other = session.scalar(
            select(Lead.id)
            .join(LeadProfile, LeadProfile.lead_id == Lead.id)
            .where(
                Lead.id != lead.id,
                Lead.purged_at.is_(None),
                LeadProfile.school_id == row.school_id,
                Lead.contact_value == row.contact_value,
                Lead.last_activity_at >= now - timedelta(days=leads.RETENTION_DAYS),
            )
            .order_by(Lead.last_activity_at.desc())
            .limit(1)
        )
        if other:
            row.source_lead_id = other
            continue
        row.full_name = row.contact_value = None
        row.job_title = ""
        row.purged_at = now
        row.version += 1


def purge_schools(session, now=None):
    now = now or now_utc()
    cutoff = now - timedelta(days=leads.RETENTION_DAYS)
    active = (
        select(LeadProfile.school_id)
        .join(Lead, Lead.id == LeadProfile.lead_id)
        .where(Lead.purged_at.is_(None), LeadProfile.school_id.is_not(None))
    )
    rows = session.scalars(
        select(School)
        .where(
            School.purged_at.is_(None), School.last_activity_at < cutoff, School.id.not_in(active)
        )
        .limit(500)
        .with_for_update(skip_locked=True)
    ).all()
    for school in rows:
        school.name = None
        school.city = school.province = ""
        school.students = None
        school.interested_features = []
        school.purged_at = now
        school.version += 1
        for contact in session.scalars(select(Contact).where(Contact.school_id == school.id)):
            contact.full_name = contact.contact_value = None
            contact.job_title = ""
            contact.purged_at = now
            contact.version += 1
    # Filters can contain search text; clear old personal views, too.
    session.execute(delete(SavedView).where(SavedView.updated_at < cutoff))
    session.execute(delete(Notification).where(Notification.created_at < cutoff))
    return {"schools_purged": len(rows)}
