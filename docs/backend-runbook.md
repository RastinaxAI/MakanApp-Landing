# راهنمای توسعه Backend مستقل لندینگ

وضعیت: STEP5، ۱۳ اکتبر ۲۰۲۶. سرویس متعلق به وب‌سایت معرفی ماکان است؛ هیچ اتصال یا تغییر در Backend اصلی ماکان ندارد. APIهای ورود/حساب/MFA فعال‌اند؛ CMS و فرم در مراحل بعد هستند. راهنمای حساب، کلیدها و recovery در [راهنمای مدیر](admin-runbook.md) است.

## راه‌اندازی Docker توسعه در Windows

Docker Desktop باید running باشد. از ریشه مخزن و PowerShell:

```powershell
./scripts/setup-development.ps1
docker compose config --quiet
docker compose build api migrate
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --wait api
```

اسکریپت setup برای `.env` و `.env.test` سه رمز DB و دو کلید مستقل auth/MFA تصادفی ۳۲ بایتی می‌سازد و مقدار موجود را بازنویسی نمی‌کند؛ کلید مفقود به فایل قبلی اضافه می‌شود. فایل‌های خصوصی ignored هستند؛ محتوای آن‌ها را در Git/گزارش/پیام قرار ندهید. `.env.example` فقط نام تنظیم‌هاست؛ رمز خالی برای اجرا پذیرفته نیست. رمزهای Compose در DSN باید URI-safe باشند؛ مقدار hex تولیدشده مناسب است. تغییر credential در فایل env پس از ایجاد volume، رمز role موجود را تغییر نمی‌دهد؛ تغییر رمز باید با عملیات مصوب دیتابیس و هماهنگی اتصال‌ها انجام شود.

آدرس API فقط loopback میزبان است: `http://127.0.0.1:8000`. مسیرها:

| مسیر | رفتار |
|---|---|
| GET `/api/v1/health/live` | زنده‌بودن فرآیند، 200 حتی اگر DB قطع باشد |
| GET `/api/v1/health/ready` | 200 فقط با DB قابل‌دسترسی و revision دقیقاً برابر تمام headهای Alembic؛ در غیر این صورت 503 کلی |
| GET `/api/v1/openapi.json` | قرارداد واقعی توسعه؛ شامل فقط مسیرهای این مرحله |
| GET `/api/v1/docs` | Swagger توسعه؛ در staging/production غیرفعال |

prefix سلامت برخلاف مسیر خام داخلی `/health/*`، در API نسخه‌دار `/api/v1/health/*` است. API در startup فقط engine/pool می‌سازد؛ migration یا `create_all` اجرا نمی‌کند. بنابراین پیش از اجرای migration، liveness سالم و readiness ناموفق است. پورت PostgreSQL توسعه به میزبان منتشر نشده است. DB فقط در شبکه internal است؛ API برای publish loopback شبکه application جدا دارد.

## Python، وابستگی و بررسی

Python3.13.16 و uv0.13.0 مبنای ثبت‌شده‌اند. uv را از منبع رسمی نصب کنید؛ ابزار محلی مورد استفاده این میزبان در `.tools/uv/bin/uv.exe` است و وارد Git نمی‌شود. از `apps/api`:

```powershell
uv sync --frozen --python 3.13.16
uv run --frozen ruff check .
uv run --frozen ruff format --check .
uv run --frozen python -m compileall -q app alembic
uv run --frozen pytest tests/unit
```

برای اجرای API بدون container باید `AUTH_SECRET`، `AUTH_MFA_KEY` و `DATABASE_URL` از محیط امن، با driver `postgresql+psycopg`، user/password/host/database کامل تنظیم شود. از runtime role استفاده کنید؛ DB توسعه عمداً پورت میزبان ندارد، بنابراین اجرای container مسیر پیش‌فرض است. هیچ SQLite یا Mock API جایگزین پذیرش DB نمی‌شود. اجرای مستقیم از apps/api: `uv run uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers`.

## تست PostgreSQL واقعی و محیط جدا

از ریشه:

```powershell
docker compose --env-file .env.test -f compose.test.yaml config --quiet
docker compose --env-file .env.test -f compose.test.yaml up -d --wait
./scripts/test-backend.ps1
docker compose --env-file .env.test -f compose.test.yaml down
```

test DB روی `127.0.0.1:15432` در container مستقل، با credentials مستقل و tmpfs است؛ volume توسعه را لمس نمی‌کند. تست‌ها تنها DSN کنترل `localhost:15432/makan_test_control` را می‌پذیرند. هر سناریو database با نام `makan_test_<uuid>` می‌سازد، با role مهاجرت upgrade می‌کند و فقط همان نام تولیدشده را در همین instance حذف می‌کند. در صورت نبود تنظیم/DB، integration شکست می‌خورد و silently skip نمی‌شود. داده نمونه حساب/صفحه فقط fixture همین DBهای یک‌بارمصرف است؛ دیتابیس توسعه با هیچ حساب یا محتوای فرضی seed نمی‌شود.

HTTPX مستقیماً ASGI API و lifespan واقعی را در تست‌ها اجرا می‌کند؛ درخواست موفق/422/404/405/500/503 و redaction بررسی می‌شود. SQLAlchemy/PostgreSQL واقعی برای migration، تراکنش، قیود، UTC و privileges استفاده می‌شوند. XML پذیرش در `docs/qa/step5/pytest.xml` (برای بازتولید گزارش تاریخی مرحله۴، commit همان مرحله را در checkout مستقل اجرا کنید؛ گزارش تاریخی را با تست فعلی بازنویسی نکنید) نوشته می‌شود. Smoke فرآیند واقعی Docker از ریشه: `apps/api/.venv/Scripts/python.exe apps/api/tests/smoke_api.py`؛ برای DB قطع‌شده، `--ready-status 503`.

## مدیریت migration و مجوز

سه role مستقل: `postgres` فقط bootstrap container، `makan_migrator` مالک schema بدون SUPERUSER/CREATEDB/CREATEROLE، `makan_api` runtime بدون DDL. runtime روی `audit_logs` فقط SELECT/INSERT دارد، نه UPDATE/DELETE؛ روی alembic_version فقط SELECT. مجوز هر جدول جدید باید در migration همان مرحله صریح اضافه شود. تغییر roleها توسط init فقط در database تازه اجرا می‌شود؛ init script جای migration آینده نیست.

```powershell
docker compose run --rm migrate alembic current --check-heads
docker compose run --rm migrate alembic check
docker compose run --rm migrate alembic upgrade head
```

migration آنلاین یک PostgreSQL advisory lock می‌گیرد؛ انتظار/SQL با timeout محدود است و خطای migration موفق تلقی نمی‌شود. ارتقای دوباره head تغییری نمی‌دهد. downgrade مخرب در migrationهای اولیه صریحاً مسدود است؛ تغییر schema با migration جدید و review انجام می‌شود، نه reset یا حذف volume. پس از افزودن مدل، `alembic revision --autogenerate` در محیط توسعه و با credential migration انجام و خروجی SQL/FK/grant بازبینی شود. لاگ SQL پارامترهای خصوصی را نمایش نمی‌دهد.

توقف توسعه بدون حذف داده: `docker compose down`؛ restart و up از volume موجود استفاده می‌کنند. `down -v` دستور معمول توسعه/تست این مخزن نیست. backup/restore مصوب، HTTPS/proxy، image digest نهایی، CI و Compose تولید در STEP10 تکمیل می‌شوند؛ Compose فعلی انتشار Production نیست.

## تنظیم‌های فعال

`APP_ENV`: development/test/staging/production؛ `DATABASE_URL`: secret ضروری. pool پیش‌فرض۵ و overflow صفر؛ `DB_POOL_SIZE` حداکثر۵۰، `DB_POOL_TIMEOUT` و `DB_CONNECT_TIMEOUT` پیش‌فرض۳ ثانیه، `DB_STATEMENT_TIMEOUT_MS` پیش‌فرض۳۰۰۰ و حداکثر۳۰۰۰۰. برای migration بزرگ‌تر timeout با بررسی عملیات تنظیم شود؛ این حدود جای load test نیستند. کلیدهای auth/MFA اکنون ضروری و جداگانه اعتبارسنجی می‌شوند؛ origins و policy در راهنمای مدیر آمده‌اند.

لاگ درخواست JSON شامل شناسه تولیدشده server، method، route template، status، duration و code است؛ IP، query، body، DSN و متن exception در آن نیست. Header ورودی X-Trace-Id مبنای اعتماد قرار نمی‌گیرد. پاسخ‌ها no-store هستند؛ CORS عمومی و اعتماد خودکار به proxy header فعال نیست. آینده proxy فقط پس از پیکربندی allowlist مصوب فعال می‌شود.
