import hashlib
import warnings
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import Request, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import MediaAsset, Page, PageRevision, RevisionMediaRef, SettingMediaRef
from app.schemas.cms import MediaInfo, MediaUpdate
from app.services.auth import audit, now_utc
from app.services.cms import authorize, effective_id

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "AVIF": "image/avif"}


def info(item: MediaAsset, session: Session | None = None):
    values = {name: getattr(item, name) for name in MediaInfo.model_fields}
    # A due scheduled reference can already serve the file, even before the first GET.
    if session and item.visibility == "private" and public_reference(session, item.id):
        values["visibility"] = "public"
    return MediaInfo.model_validate(values)


def storage_path(request: Request, storage_key: str) -> Path:
    root = Path(request.app.state.settings.media_root).resolve()
    path = (root / storage_key).resolve()
    if path.parent != root or not storage_key.endswith(".webp"):
        raise ApiProblem(404, "NOT_FOUND", "رسانه یافت نشد.")
    return path


def decode_image(body: bytes, declared_type: str) -> tuple[bytes, int, int]:
    if len(body) > MAX_BYTES:
        raise ApiProblem(413, "PAYLOAD_TOO_LARGE", "حجم تصویر باید حداکثر ۵ مگابایت باشد.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(body)) as image:
                if image.format not in TYPES or declared_type != TYPES[image.format]:
                    raise ApiProblem(
                        415, "INVALID_MEDIA_TYPE", "نوع واقعی فایل با تصویر مجاز سازگار نیست."
                    )
                if image.width * image.height > MAX_PIXELS or max(image.size) > 10000:
                    raise ApiProblem(413, "IMAGE_TOO_LARGE", "ابعاد تصویر بیش از حد مجاز است.")
                image.load()
                clean = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                output = BytesIO()
                clean.save(output, format="WEBP", quality=85, method=4)
                value = output.getvalue()
                if len(value) > MAX_BYTES:
                    raise ApiProblem(
                        413, "PAYLOAD_TOO_LARGE", "حجم خروجی تصویر بیش از حد مجاز است."
                    )
                return value, image.width, image.height
    except (UnidentifiedImageError, OSError, ValueError):
        raise ApiProblem(415, "INVALID_MEDIA_TYPE", "فایل تصویر سالم و معتبر نیست.") from None
    except (Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise ApiProblem(413, "IMAGE_TOO_LARGE", "ابعاد تصویر بیش از حد مجاز است.") from None


def upload(request: Request, session: Session, file: UploadFile, alt: str):
    path = None
    try:
        with session.begin():
            admin = authorize(request, session, True)
            body = file.file.read(MAX_BYTES + 1)
            data, width, height = decode_image(body, file.content_type or "")
            filename = Path((file.filename or "image").replace("\\", "/")).name[:180]
            item = MediaAsset(
                storage_key=uuid4().hex + ".webp",
                original_filename=filename,
                mime_type="image/webp",
                size_bytes=len(data),
                width=width,
                height=height,
                checksum_sha256=hashlib.sha256(data).hexdigest(),
                alt_text=alt,
                created_by=admin.id,
            )
            session.add(item)
            session.flush()
            path = storage_path(request, item.storage_key)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as output:
                output.write(data)
            audit(session, request, "media.uploaded", admin.id, item.id, entity_type="media")
            return info(item)
    except Exception:
        if path and path.exists():
            path.unlink()
        raise


def public_reference(session: Session, media_id: UUID):
    return session.scalar(
        select(
            exists().where(
                RevisionMediaRef.media_id == media_id,
                RevisionMediaRef.revision_id == PageRevision.id,
                PageRevision.page_id == Page.id,
                Page.is_archived.is_(False),
                PageRevision.id == effective_id(now_utc()),
                PageRevision.content_json["visibility"].as_boolean().is_(True),
            )
        )
    )


def file_path(request: Request, session: Session, media_id: UUID, private=False):
    with session.begin():
        if private:
            authorize(request, session)
        item = session.scalar(select(MediaAsset).where(MediaAsset.id == media_id).with_for_update())
        if not item or (
            not private and item.visibility != "public" and not public_reference(session, media_id)
        ):
            raise ApiProblem(404, "NOT_FOUND", "رسانه یافت نشد.")
        if not private and item.visibility != "public":
            item.visibility = "public"
            audit(session, request, "media.released", None, item.id, entity_type="media")
        path = storage_path(request, item.storage_key)
        if not path.is_file():
            raise ApiProblem(404, "NOT_FOUND", "فایل رسانه در دسترس نیست.")
        return path


def change(request: Request, session: Session, media_id: UUID, data: MediaUpdate):
    with session.begin():
        admin = authorize(request, session, True)
        item = session.scalar(select(MediaAsset).where(MediaAsset.id == media_id).with_for_update())
        if not item:
            raise ApiProblem(404, "NOT_FOUND", "رسانه یافت نشد.")
        item.alt_text = data.alt_text
        if data.make_public:
            item.visibility = "public"
        audit(session, request, "media.updated", admin.id, item.id, entity_type="media")
        return info(item, session)


def remove(request: Request, session: Session, media_id: UUID):
    with session.begin():
        admin = authorize(request, session, True)
        item = session.scalar(select(MediaAsset).where(MediaAsset.id == media_id).with_for_update())
        if not item:
            raise ApiProblem(404, "NOT_FOUND", "رسانه یافت نشد.")
        if session.scalar(
            select(exists().where(RevisionMediaRef.media_id == media_id))
        ) or session.scalar(select(exists().where(SettingMediaRef.media_id == media_id))):
            raise ApiProblem(409, "MEDIA_IN_USE", "رسانه در نسخه محتوا یا تنظیمات استفاده شده است.")
        path = storage_path(request, item.storage_key)
        session.delete(item)
        audit(session, request, "media.deleted", admin.id, media_id, entity_type="media")
    # A filesystem failure leaves an unservable orphan, never a visible row for a missing file.
    path.unlink(missing_ok=True)
