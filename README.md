# ماکان — راهنمای ساده اجرا

این پروژه شامل سایت معرفی ماکان و پنل مدیریت آن است. مقاله، ویدیوهای آپارات، محتوای سایت و درخواست‌های دمو از پنل قابل مدیریت‌اند. فرم‌ها به دیتابیس واقعی وصل هستند.

## ۱. قبل از شروع

روی ویندوز این دو برنامه را نصب کنید:

- **Docker Desktop**: آن را باز کنید و صبر کنید تا آماده شود؛ حالت Linux containers فعال باشد.
- **PowerShell 7**: دستورهای زیر را در این برنامه اجرا کنید.

برای روش Docker، نصب جداگانه Node، Python یا PostgreSQL لازم نیست. اولین ساخت به اینترنت نیاز دارد و ممکن است چند دقیقه طول بکشد.

## ۲. اجرای سایت روی کامپیوتر

PowerShell را در پوشه همین پروژه باز کنید. اگر این پروژه در مسیر فعلی شما قرار دارد:

```powershell
cd C:\Users\OmidrezaBagheriyan\Desktop\MakanWebsite
```

**بار اول** دستورهای زیر را به‌ترتیب اجرا کنید. هر دستور باید بدون خطا تمام شود تا دستور بعدی را اجرا کنید:

```powershell
# ساخت تنظیمات و رمزهای خصوصی؛ تنظیمات موجود حفظ می‌شوند
pwsh -NoProfile -File .\scripts\setup-development.ps1

# ساخت برنامه‌ها
docker compose --profile tools --profile website build api migrate web

# آماده‌کردن دیتابیس و اجرای تغییرات آن
docker compose up -d --wait db
docker compose --profile tools run --rm migrate

# اجرای Backend
docker compose up -d --wait api

# واردکردن متن‌های اولیه سایت؛ ویرایش‌های مدیر بازنویسی نمی‌شوند
docker compose exec -T api python -m app.commands.import_content
docker compose exec -T api python -m app.commands.refresh_learning_intro
docker compose exec -T api python -m app.commands.refresh_form_copy

# به‌روزکردن آمار دیتابیس پس از ورود محتوا
docker compose exec -T db psql -U postgres -d makan_landing -c ANALYZE

# اجرای سایت
docker compose --profile website up -d --wait web
```

حالا این آدرس‌ها را در مرورگر باز کنید:

| بخش | آدرس |
|---|---|
| سایت | http://127.0.0.1:3100 |
| ورود مدیر | http://127.0.0.1:3100/admin/login |
| مستندات API برای توسعه‌دهنده | http://127.0.0.1:8000/api/v1/docs |

مقاله و ویدیو باید از پنل منتشر شوند؛ محتوای آموزشی فرضی به سایت اضافه نمی‌شود. متن‌های حقوقی و اطلاعات تماس را هم قبل از انتشار عمومی بررسی و تکمیل کنید.

## ۳. ساخت حساب مدیر

حساب و رمز پیش‌فرض وجود ندارد. فقط بار اول، دستور زیر را اجرا کنید؛ ایمیل خود را وارد کنید:

```powershell
$managerEmail = Read-Host 'ایمیل مدیر را وارد کنید'
docker compose exec -it api python -m app.commands.admin bootstrap --email $managerEmail
```

رمز را دو بار وارد کنید. باید حداقل **۱۵ کاراکتر** باشد. هنگام تایپ رمز چیزی نمایش داده نمی‌شود؛ این طبیعی است.

سپس در آدرس **/admin/login** وارد شوید. از پنل می‌توانید:

- متن صفحه اصلی، امکانات، پرسش‌ها و تصاویر را تغییر دهید.
- مقاله، ویدیو و مجموعه آموزشی بسازید و منتشر کنید.
- درخواست‌های دمو و مشاوره را ببینید و پیگیری کنید.
- اطلاعات عمومی، SEO و حساب مدیران را تنظیم کنید.
- از بخش امنیت، ورود دومرحله‌ای اختیاری را فعال کنید.

اگر قبلاً حساب مدیر ساخته‌اید، همان حساب را استفاده کنید؛ دستور بالا حساب موجود را تغییر نمی‌دهد.

## ۴. اجراهای بعدی و توقف

برای روشن‌کردن دوباره سایت:

```powershell
docker compose --profile website up -d --wait db api web
```

برای توقف:

```powershell
docker compose --profile website stop web api db
```

داده‌ها پس از توقف باقی می‌مانند. از دستور **down --volumes** برای این محیط استفاده نکنید؛ داده‌های ذخیره‌شده را حذف می‌کند.

اگر کد پروژه تغییر کرد، دوباره `build` را اجرا کنید، سپس `migrate` و `up` را طبق بخش۲ انجام دهید.

## ۵. اگر سایت باز نشد

```powershell
# وضعیت سرویس‌ها؛ باید running و در صورت وجود healthcheck، healthy باشند
docker compose --profile website ps

# دیدن خطاهای اخیر
docker compose --profile website logs --tail 60 web api
```

- خطای اتصال Docker: Docker Desktop را باز کنید.
- خطای متغیر محیطی: دستور setup-development.ps1 را از بخش۲ اجرا کنید.
- خطای پورت۳۱۰۰: برنامه‌ای که از این پورت استفاده می‌کند ببندید؛ این سایت روی۳۱۰۰ اجرا می‌شود، نه۳۰۰۰.
- خطای ورود: حساب مدیر را طبق بخش۳ بسازید یا با ایمیل و رمز قبلی وارد شوید.
- صفحه بدون محتوا: دستور import_content بخش۲ را بررسی کنید.

رمزها در فایل خصوصی `.env` هستند. آن را منتشر نکنید یا داخل Git قرار ندهید.

## رنگ و لوگو

لوگوی شما در `apps/web/public/brand/makan-logo.png` بدون تغییر ذخیره شده و در سایت و آیکون مرورگر استفاده می‌شود. رنگ اصلی لوگو **#156FEE** است؛ دکمه‌ها و نوشته‌ها با آبی خواناتر، سفید و زمینه آبی بسیار روشن هماهنگ شده‌اند. رنگ‌ها در `apps/web/src/styles/tokens.css` تنظیم می‌شوند. لوگوی ثبت‌شده در تنظیمات پنل همچنان قابل جایگزینی است.

## انتشار روی دامنه واقعی

دستورهای بالا برای اجرای محلی هستند. برای دامنه واقعی، راهنمای جداگانه [استقرار روی سرور](docs/production-runbook.md) و [بکاپ و بازیابی](docs/backup-restore-runbook.md) را بخوانید. دامنه/سرور هنوز تعیین نشده‌اند؛ انتشار عمومی انجام نشده است. وضعیت تست‌ها و موارد باقی‌مانده در [گزارش مرحله۱۰](docs/step-10-report.md) ثبت شده است.

## برای توسعه‌دهنده

Node24، Python3.13 و نسخه‌های وابستگی در فایل‌های پروژه ثبت شده‌اند. راهنمای [Backend](docs/backend-runbook.md)، [CMS](docs/cms-runbook.md)، [مرکز آموزش](docs/learning-runbook.md) و [طراحی](docs/ui-design-system.md) جزئیات را دارند.

برای اجرای وب خارج Docker، ابتدا Backend بخش۲ را روشن کنید؛ سپس با Node24:

```powershell
npm ci
npm run dev
```

این روش سایت را روی http://127.0.0.1:3000 اجرا می‌کند. مسیر پیش‌فرض API داخلی http://127.0.0.1:8000 است.

اگر پورت۳۰۰۰ اشغال بود، از `npm run dev -- --port 3200` استفاده کنید.

بررسی کد:

```powershell
npm run lint
npm run build
npm run typecheck
```
