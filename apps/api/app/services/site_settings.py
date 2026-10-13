from fastapi import Request
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import MediaAsset, SettingMediaRef, SiteSetting
from app.schemas.cms import SettingsInput, SettingsOutput
from app.services.auth import audit, principal, require_capability
from app.services.cms import expected_version, media_ids


def read(session: Session):
    rows = {
        row.key: row
        for row in session.scalars(
            select(SiteSetting).where(SiteSetting.key.in_(("general", "seo")))
        )
    }
    return SettingsOutput(
        general=rows["general"].value_json if "general" in rows else {},
        seo=rows["seo"].value_json if "seo" in rows else {},
        row_version=max((row.row_version for row in rows.values()), default=1),
    )


def update(request: Request, session: Session, data: SettingsInput):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "settings")
        session.execute(text("SELECT pg_advisory_xact_lock(74120600)"))
        current = read(session)
        expected_version(request, current.row_version)
        for key, value in data.model_dump(mode="json").items():
            row = session.get(SiteSetting, key)
            if not row:
                row = SiteSetting(key=key, value_json=value, updated_by=admin.id)
                session.add(row)
            row.value_json, row.row_version, row.updated_by = (
                value,
                current.row_version + 1,
                admin.id,
            )
            session.flush()
            session.execute(delete(SettingMediaRef).where(SettingMediaRef.setting_key == key))
            for media_id in sorted(media_ids(value), key=str):
                media = session.scalar(
                    select(MediaAsset).where(MediaAsset.id == media_id).with_for_update()
                )
                if not media or not media.alt_text.strip():
                    raise ApiProblem(
                        422, "INVALID_MEDIA", "رسانه تنظیمات باید معتبر و دارای متن جایگزین باشد."
                    )
                media.visibility = "public"
                session.add(SettingMediaRef(setting_key=key, media_id=media_id))
        audit(
            session,
            request,
            "settings.updated",
            admin.id,
            changes={"keys": ["general", "seo"]},
            entity_type="settings",
        )
        session.flush()
        return read(session)
