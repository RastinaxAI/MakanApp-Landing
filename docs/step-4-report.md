# گزارش تحویل STEP 4 — Backend Foundation

تاریخ: ۱۳ اکتبر ۲۰۲۶، Asia/Tehran. شروع به درخواست مستقیم کاربر پس از تحویل STEP3. محدوده: FastAPI مستقل، PostgreSQL واقعی، Alembic، پایه تراکنش/قرارداد/خطا/لاگ و Docker توسعه. Backend اصلی ماکان، کد وب و تصاویر QA مراحل قبل تغییر نکرده‌اند. hash سند HTML مرجع همچنان `E3451CBB454F7B7E6B982DCCB644704218C2155EFE275485274114F3A9B8EFEA` است.

## خروجی پیاده‌سازی

API با factory و lifespan ساخته شد؛ Settings اتصال PostgreSQL کامل با psycopg را الزامی می‌کند و SQLite/اتصال ناقص را رد می‌کند. DATABASE_URL از نوع SecretStr، ورودی خطای config مخفی و SQL parameters پنهان است. engine sync با pool محدود، timeout و pre-ping؛ session برای هر درخواست و transaction تحت مالکیت service. Repository هیچ commit پنهانی ندارد. startup فقط runtime را آماده می‌کند و schema را تغییر نمی‌دهد.

GET `/api/v1/health/live` مستقل از DB است. GET `/api/v1/health/ready` اتصال و تمام migration headها را بررسی می‌کند؛ DB قطع، بدون schema یا نسخه قدیمی پاسخ503 عمومی دارد. Swagger/OpenAPI فقط development/test، staging/production404. پاسخ خطا شامل error.code/message/details و trace_id برابر header است؛ شناسه server تولید می‌شود و به header دلخواه کاربر اعتماد ندارد. no-store/nosniff، بدون CORS باز و بدون اعتماد پیش‌فرض proxy. قالب pagination bounded آماده است؛ هنوز endpoint فهرست CMS نداریم.

لاگ درخواست JSON فقط event allowlist، method، route template، status، duration و code/trace دارد؛ query، IP، body، DSN و متن exception حذف‌اند. پیام دلخواه حتی برای logger داخلی allowlist نمی‌شود. لاگ Uvicorn نیز formatter امن دارد؛ access log خام غیرفعال است. خطاهای اعتبارسنجی input/ctx/متن exception را serialize نمی‌کنند.

دو migration واقعی:

| Revision | خروجی |
|---|---|
| `0001_admin_core` | admins با email lowercase/unique و role CHECK؛ audit_logs با FK/indices و مجوز append-only runtime |
| `0002_page_revision_core` | pages و page_revisions؛ slug unique، نسخه مثبت، زوج schedule، مالکیت revision با FK مرکب، UTC و JSONB |

چهار جدول اصلی به‌علاوه alembic_version ساخته می‌شوند؛ هیچ حساب یا محتوای عملیاتی فرضی seed نشده است. pointerها nullable هستند تا چرخه insert page/revision در یک تراکنش حل شود. downgrade مخرب صریحاً مسدود است. migration آنلاین advisory lock می‌گیرد و job از فرآیند API جداست. append-only audit در برابر runtime enforced است، نه ادعای tamper-proof در برابر مالک DB.

Docker API چندمرحله‌ای با Python ثابت، وابستگی frozen، uid10001، root filesystem read-only، tmpfs و cap-drop ساخته شد. PostgreSQL توسعه در شبکه internal و بدون پورت میزبان، با volume پایدار است. API شبکه application جدا برای اتصال loopback8000 دارد. roleهای bootstrap/migrator/runtime جدا و دو role برنامه بدون SUPERUSER/CREATEDB/CREATEROLE هستند. DB تست container/credential/tmpfs مستقل روی loopback15432 دارد و volume توسعه را لمس نمی‌کند.

## نتایج واقعی پذیرش

| بررسی | نتیجه |
|---|---|
| uv sync frozen و lock check، Python3.13.16 | موفق؛ dependency graph و hashes در uv.lock |
| Ruff lint/format و compileall | موفق، exit0 |
| ساخت wheel/sdist و Docker API/migration | موفق، exit0؛ deployment این مرحله از Docker با فایل‌های Alembic همراه است |
| Pytest/HTTPX | ۱۹/۱۹ موفق: ۱۳ پایه و ۶ integration واقعی، بدون skip/error/failure |
| fresh upgrade و اجرای دوباره head | موفق؛ drift مدل/migration صفر |
| ارتقای نسخه قبلی دارای داده | حساب fixture همان id/email/role را پس از upgrade حفظ کرد |
| قیود و تراکنش | commit/rollback، slug، role، RESTRICT، مالکیت revision، schedule و UTC موفق |
| حداقل مجوز | runtime DDL و UPDATE/DELETE audit و DELETE alembic_version رد شدند |
| خطا/trace/redaction | 422/404/405/500/503 و config validation موفق؛ payload/exception خصوصی افشا نشد |
| Compose dev/test config و up | موفق؛ API/DB healthy، بدون DB port توسعه |
| HTTPX روی فرآیند واقعی Docker | live/ready/OpenAPI200 و مسیرهای مراحل بعد404 |
| قطع واقعی container DB | live200 و ready503؛ پس از بازیابی ready200 |
| down بدون حذف volume و recreate | schema و head `0002_page_revision_core` حفظ و ready200 شد |
| Alembic current --check-heads و check | head صحیح و «No new upgrade operations detected» |
| Build تولید وب، TypeScript و ESLint | موفق، exit0؛ کد UI این مرحله تغییر نکرده است |

آمار دقیق زمان نهایی و شناسه image/lock در `docs/qa/step4/final-test-summary.json`؛ XML واقعی ۱۹ تست در `pytest.xml`؛ قرارداد واقعی در `openapi.json`؛ سه پاسخ smoke در `docker-db-unavailable.json`، `docker-recovered.json` و `docker-persistence.json`. آزمون persistence روی schema/version واقعی است؛ آزمون backup/restore یا داده CRM آینده محسوب نمی‌شود. Playwright مرحله۳ تکرار نشد چون UI تغییر نکرده؛ ۸۱ نتیجه قبلی در گزارش همان مرحله محفوظ است.

## نسخه‌های ثبت‌شده

| جزء | نسخه |
|---|---|
| Python / uv | 3.13.16 / 0.13.0 |
| FastAPI / Starlette | 0.143.0 / 1.7.0 |
| Pydantic / pydantic-settings | 2.14.1 / 2.15.0 |
| SQLAlchemy / Alembic / psycopg | 2.1.4 / 1.20.0 / 3.3.6 |
| Uvicorn | 0.54.0 |
| Pytest / HTTPX / Ruff | 9.1.1 / 0.28.1 / 0.17.0 |
| PostgreSQL image | 17.11-alpine |
| Python image | 3.13.16-slim-bookworm |
| Docker Engine / Compose | 29.8.0 / 5.5.1 |
| gate وب | Node24.21.0؛ وابستگی وب و npm lock تغییر نکردند |

نسخه‌ها با metadata رسمی PyPI resolve و در Windows/Python3.13 و Linux container نصب شدند. خط نسخه PostgreSQL با [سیاست رسمی نسخه‌ها](https://www.postgresql.org/support/versioning/) بررسی شد. الگوی session و psycopg از [SQLAlchemy Session](https://docs.sqlalchemy.org/en/20/orm/session_basics.html) و [dialect PostgreSQL](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)، و migration heads از [Alembic Cookbook](https://alembic.sqlalchemy.org/en/latest/cookbook.html) بررسی شد. [Release notes رسمی FastAPI](https://fastapi.tiangolo.com/release-notes/) مرجع سازگاری بود. این تحویل آزمون سازگاری نسخه‌های قفل‌شده است؛ تضمین امنیت مطلق یا scan تولید نیست.

## خطاهای اصلاح‌شده

Docker engine ابتدا خاموش بود و با CLI رسمی Docker Desktop راه‌اندازی شد؛ مانع PostgreSQL واقعی برطرف شد. Python3.13.16 مدیریت‌شده نصب شد و Python3.14 سیستم gate این مرحله نبود. آزمون اول ۱۸/۱۹ بود؛ fixture پس از بسته‌شدن session به attribute expired دسترسی داشت. email پیش از خروج ذخیره شد و assertion حفظ داده بدون کاهش معیار موفق شد؛ خلاصه تاریخی نگهداری شد.

Compose اولیه API را فقط به network internal متصل کرده بود؛ Docker پورت API را از میزبان publish نکرد. شبکه application برای API افزوده شد؛ DB همچنان internal و خصوصی ماند. smoke واقعی میزبان تکرار و موفق شد. استفاده اولیه TestClient روی Starlette جدید warning deprecated HTTPX داشت؛ تست‌ها مستقیماً HTTPX ASGITransport و lifespan واقعی استفاده می‌کنند و اجرای نهایی warning ندارد. خطاهای اولیه formatting/lint برطرف شدند؛ lint نهایی صفر است.

## فایل‌های ایجاد/تغییر

API جدید: `apps/api/pyproject.toml`، `uv.lock`، `.python-version`، `Dockerfile`، `.dockerignore`، `alembic.ini`؛ `app/__init__.py` و `app/main.py`؛ `core/config.py`، `errors.py`، `logging.py`، `middleware.py`؛ `db/base.py`، `session.py`؛ `models/__init__.py`، `admin.py`، `content.py`؛ `schemas/common.py`؛ `repositories/base.py`؛ `services/health.py`، `unit_of_work.py`؛ `api/v1/routes/health.py`.

Migrationها: `alembic/env.py`، `script.py.mako` و `versions/0001_admin_core.py` / `0002_page_revision_core.py`. تست‌ها: `tests/__init__.py`، `client.py`، `conftest.py`، `unit/test_foundation.py`، `integration/conftest.py`، `integration/test_postgres.py` و `smoke_api.py`.

زیرساخت/اسکریپت جدید: `compose.yaml`، `compose.test.yaml`، `infrastructure/postgres/init-roles.sh`، `scripts/setup-development.ps1` و `test-backend.ps1`. مستند جدید: `backend-runbook.md`، این گزارش و فایل‌های QA نام‌برده. تغییر: `.gitignore`، `.env.example`، `README.md`، `architecture.md`، `database-design.md`، `api-contract.md`، `implementation-plan.md` و `requirements-matrix.md`.

`.env`، `.env.test`، runtime ابزار، virtualenv، dist و cache خصوصی ignored هستند. پیش از Commit نام‌ها/UTF-8/fences/diff و عدم حضور secretهای واقعی در فایل‌های تحویل بررسی می‌شود. Docker development پس از QA متوقف می‌شود؛ volume حفظ و راه‌اندازی مجدد در runbook مشخص است.

## پذیرش باقی‌مانده و ادامه

R064 در حد Foundation واقعی پذیرفته شد؛ R001/R065/R066/R068/R072/R073/R074/R091/R092/R094/R097/R103/R104 به‌اندازه محدوده این مرحله پیشرفت دارند و بخش‌های باقیمانده در ماتریس ثبت است. session/login/CSRF/RBAC/limiter در STEP5؛ CMS/media در STEP6؛ آموزش در STEP7؛ persistence فرم/CRM در STEP8؛ SEO در STEP9؛ Compose کامل وب/proxy/HTTPS، CI، digest/scan، backup/restore و deploy نهایی در STEP10 است. وجود جدول admins به معنی احراز هویت اجراشده نیست؛ هیچ endpoint نمایشی آینده اضافه نشده است.

گزارش تغییرات پیش از Commit ارائه و Commit محلی تنها پس از موفقیت checks ثبت می‌شود؛ hash در پیام تحویل می‌آید. هیچ Push یا استقرار بیرونی انجام نشده است. STEP5 مطابق مرحله‌بندی کاربر منتظر تأیید بعدی است.
