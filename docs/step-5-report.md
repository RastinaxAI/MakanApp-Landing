# گزارش STEP 5 — ورود امن مدیر و پنل پایه

تاریخ: ۱۳ اکتبر ۲۰۲۶. دامنه این مرحله با تأیید STEP4 و درخواست مستقیم کاربر آغاز شد. تصمیم تکمیلی کاربر: «MFA اختیاری برای هر مدیر». مرجع سند همان PRD v1.1 است؛ hash منبع `E3451CBB454F7B7E6B982DCCB644704218C2155EFE275485274114F3A9B8EFEA` تغییر نکرده است. Backend اصلی ماکان هیچ تغییر یا اتصال جدید ندارد.

## رفتار حاصل

پنل واقعی در `/admin` با صفحه ورود، داشبورد، امنیت حساب، حساب‌های مدیران و رویدادهای مدیریت ساخته شد. حساب مدیر مستقل از کاربران اپ است. داشبورد فقط شمارش واقعی PostgreSQL را نشان می‌دهد؛ CMS/آموزش/CRM هنوز pending هستند. chrome عمومی به route group `(public)` منتقل شد تا پنل layout مستقل داشته باشد؛ URL و محتوای صفحات عمومی حفظ شده‌اند.

ورود با رمز Argon2id، نشست opaque تصادفی و digest/HMAC در DB انجام می‌شود. cookie HttpOnly/SameSite=Lax و در staging/production Secure با پیشوند `__Host-` است. idle۳۰ دقیقه و absolute۸ ساعت، rotation ورود، revoke نشست، logout واقعی و بررسی active اجرا شده‌اند. CSRF پیش‌ورود و تغییرات، Origin دقیق و Fetch-Metadata، body۱۶KiB و limiter مشترک اتمیک PostgreSQL وجود دارند. limiter حساس در تراکنش مستقل quota را حتی با rollback نگه می‌دارد. no-store/noindex و CSP nonce در پنل اعمال شده‌اند؛ token در localStorage/sessionStorage نیست.

مالک حساب مدیر ایجاد می‌کند و نقش/active را با reauth تغییر می‌دهد؛ این تغییر نشست‌های هدف را می‌بندد. owner/editor/sales سمت API کنترل می‌شوند. آخرین مالک فعال تحت قفل تراکنشی در رقابت همزمان محافظت شده است. مالک نشست‌های مدیر دیگر را مشاهده/لغو می‌کند؛ دیگر نقش‌ها فقط نشست خود را می‌بینند. audit تغییر حساس در همان commit داده ثبت می‌شود؛ اگر ثبت audit شکست بخورد، عملیات هم rollback می‌شود. حساب یا audit از UI حذف نمی‌شود.

MFA اختیاری شامل secret دستی TOTP، تأیید پنج‌دقیقه‌ای، ارقام فارسی/عربی، replay guard، AES-256-GCM با کلید مستقل و AAD حساب، هشت کد بازیابی۱۲۸بیتی یک‌بارمصرف و regeneration/disable است. secret خام و کدهای خام در DB/log ذخیره نمی‌شوند؛ کدها فقط پاسخ همان بارند. bootstrap اولین مالک و recovery lost-MFA در CLI کنسول مجاز با getpass، بدون رمز در argv، و audit واقعی هستند. هیچ حساب پیش‌فرض یا حساب عملیاتی فرضی seed نشده است.

پنج جدول امنیتی در migration جدید `0003_auth_mfa` اضافه شده‌اند. migrationهای قبلی دست‌نخورده‌اند؛ grants runtime صریح و audit همچنان SELECT/INSERT است. فرمان maintenance یک batch محدود challenge/bucket منقضی را پاک می‌کند؛ حساب/نشست/audit را لمس نمی‌کند. راه‌اندازی، عملیات حساب، policy، کلیدها و recovery در [راهنمای مدیر](admin-runbook.md) ثبت شده‌اند.

## معیارهای پذیرش و شواهد

گیت‌های application موفق‌اند و پاک‌سازی ابزار تست پس از اصلاح race با smoke واقعی مجدد تأیید شد. خلاصه قابل بررسی در `qa/step5/verification-summary.json` است.

| بررسی | نتیجه ثبت‌شده |
|---|---|
| Pytest/HTTPX + PostgreSQL واقعی | ۵۱/۵۱ موفق، صفر failure/error/skip، ۴۳٫۷۵ ثانیه؛ `qa/step5/pytest.xml` |
| Ruff check / format / compileall / uv lock --check | موفق؛ ۴۲ فایل Python، ۴۱ package در lock |
| Next build تولید | موفق؛ مسیرهای عمومی static/SSG و مدیریت dynamic، بدون خطای compile/type |
| ESLint و TypeScript strict | موفق، صفر warning/error |
| Playwright کامل | ۱۰۸/۱۰۸ موفق، صفر failure/skip/flaky؛ ۴۴۲٫۵۱ ثانیه؛ ۳۶ سناریو در هر موتور؛ `qa/step5/playwright-summary.json` |
| دسترس‌پذیری و تصاویر | ۱۲۶ audit خودکار axe، صفر violation؛ ۶۳ PNG واقعی؛ `qa/step5/accessibility.json` |
| smoke ابزار اجرا/cleanup | ۳/۳ موتور موفق؛ exit۰؛ API/وب بسته، DB fixture باقی‌مانده صفر؛ `qa/step5/harness-smoke.json` |
| Docker build/migrate/check/smoke | موفق؛ head=`0003_auth_mfa`، drift صفر، health۲۰۰، guest۴۰۱، hostile Origin۴۰۳؛ `qa/step5/docker-verification.json` |
| npm audit --omit=dev | صفر finding |
| npm audit کامل | ۹ high، صفر critical؛ یک advisory پایه braces در زنجیره ابزارهای توسعه؛ ریسک باز |

پوشش Backend شامل login success/failure عمومی، Origin/CSRF معتبر/نامعتبر/replay/expiry، cookie flags در development و production شبیه‌سازی‌شده HTTPS، HMAC به‌جای token خام، expiry/revoked/inactive/fixation، guest/RBAC، account/last-owner/audit، تغییر رمز، نشست خود/دیگری، MFA lifecycle/replay/recovery، quota ناموفق، JSON errors/redaction، حجم۴۱۳، XFF غیرقابل‌اعتماد، rollback در خطای audit، bootstrap/recover و cleanup bounded است. concurrency واقعی limiter از۱۲ درخواست فقط۳ درخواست مجاز کرده و شمارنده۱۲ ثبت می‌شود؛ دو تغییر همزمان آخرین owner نتیجه۲۰۰/۴۰۹ دارند.

پوشش مرورگر روی Next خروجی تولید و Uvicorn/PostgreSQL واقعی است؛ هیچ login/API نمایشی یا حافظه موقت جای persistence نیست. HTML tampering فقط برای مدل‌کردن اسکریپت XSS واردشده توسط parser است؛ پاسخ واقعی SSR/CSP و API اصلی حفظ می‌شوند. آزمون wire-level cookie SameSite=Lax روی همه موتورها الزام دارد.

## خطاهای کشف‌شده و اصلاح

اجرای اولیه Backend دو خطای fixture داشت: تضاد cookie domain در HTTPX و سقف پایین عمدی که سناریوی بعدی رمز را محدود کرده بود؛ fixture اصلاح و gate کامل تکرار شد. throttling production کاهش نیافت. تفاوت metadata کوکی Windows WebKit در اجرای اول مرورگر پیدا شد: wire صحیح بود ولی `context.cookies()` مقدار None می‌دهد. تست رسمی Playwright نیز این محدودیت Windows WebKit را ثبت کرده است؛ [منبع نسخه۱٫۶۴](https://github.com/microsoft/playwright/blob/v1.64.0/tests/library/browsercontext-cookies.spec.ts). روی Edge/Firefox metadata=Lax و روی همه موتورها header واقعی Lax بررسی می‌شود؛ محدودیت پلتفرم annotation دارد، نه skip کل تست.

probe اولیه با DevTools `page.evaluate` مدل معتبر parser-XSS نبود؛ به تزریق HTML در پاسخ واقعی تبدیل شد و جلوگیری CSP در سه موتور آزموده شد. locator متن audit با چند رویداد هم‌نام مبهم بود؛ اکنون entity_id حساب ایجادشده با رویداد واقعی تطبیق دارد. فعال‌سازی MFA در اجرای بعد API۲۰۰ داشت ولی انتظار۵ثانیه UI قبل رسیدن پاسخ تمام شد؛ حساب مشترک fixture هم موتورهای بعدی را آلوده کرد. fixtureهای MFA/رمز بر اساس موتور جدا، تأیید MFA منتظر پاسخ واقعی، انتظار UI۱۵ثانیه و تست‌های چندمرحله‌ای۹۰ثانیه شدند. آزمون‌های امنیتی حذف نشده‌اند. تفکیک fixtureها تعداد حساب‌ها را از یک صفحه بیشتر کرد؛ حساب جدید واقعی در صفحه دوم بود و locator قبلی صفحه اول را فرض می‌کرد. اجرای تشخیصی پس از اثبات علت متوقف و cleanup همان DB/فرآیند اجرا شد؛ تست اکنون pagination واقعی را هم بررسی می‌کند. صفحه audit نیز به axe سه عرض اضافه شد. اجرای نهایی یک worker دارد تا رقابت فرآیندهای Windows Firefox/axe کاهش یابد؛ خطاهای اولیه در JSON خلاصه جدا ثبت‌اند، نه به‌عنوان pass.

پس از عبور کامل۱۰۸ تست، cleanup launcher به race در CIM برخورد کرد: فرآیند بسته‌شده CommandLine نداشت. guard null و بررسی پورت/exit cleanup اضافه شد. DB همان اجرا و fixture قدیمی شناخته‌شده اجرای سوم در instance اختصاصی پاک شدند؛ marker/پورت/DB باقی‌مانده بررسی شد. smoke واقعی مجدد سه موتور با wrapper اصلاح‌شده و exit۰ تمام شد. این خطای ابزار از pass تست‌های application جدا گزارش شده و تکرار کامل تست‌های موفق بدون تغییر application لازم نبود.

محیط مرورگر: Node24.21.0، Edge155.0.4283.45 برای Chromium، Firefox157.0 و WebKit27.2 روی Windows؛ یک worker، بدون retry. همه۵ صفحه مدیریت در عرض‌های۳۶۰/۷۶۸/۱۴۴۰ audit شدند. داده‌های screenshot مدیریت fixture اختصاصی هستند؛ آمار۲۱ مدیر در تصویر، مشتری یا حساب واقعی محیط توسعه نیست. تصویر ورود خالی و مستقل از داده است.

## ریسک‌ها و محدودیت‌های باقی

`npm audit` در تاریخ بررسی ۹ dependency node ابزار توسعه را high اعلام کرد؛ ریشه واحد [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) در braces<=3.0.3 است و نسخه patched منتشرشده ندارد. شاخه‌های shadcn و eslint-config-next درگیرند؛ audit runtime صفر است. `npm audit fix --force` کاهش ناسازگار نسخه‌های اصلی پیشنهاد می‌کند و اجرا نشده؛ یافته پنهان یا waived نیست. تا patch سازگار/تصمیم امنیتی مصوب، اسکن نهایی تولید در STEP10 باز می‌ماند. این نتیجه گواهی امنیت کامل API یا image نیست.

در bridge توسعه API peer IP مشترک Next دارد و به XFF ورودی اعتماد نمی‌شود؛ trusted proxy و IP واقعی مرحله۱۰ هستند. production Secure cookie در HTTPX HTTPS آزموده شده، اما TLS واقعی/Caddy/HSTS/Compose کامل وب/CI/backup/restore/monitoring هنوز تکمیل نشده‌اند. Chrome bundled این میزبان در دسترس نبود و موتور Chromium روی Edge نصب‌شده اجرا می‌شود؛ WebKit Windows برابر دستگاه Safari/iOS واقعی نیست. axe/keyboard بررسی خودکار هستند؛ ارزیابی دستی کامل WCAG و دستگاه واقعی باقی است. Lighthouse نهایی مرحله۹ است و عددی حدس زده نشده است.

retention نشست/audit، rotation بازرمزگذاری MFA و recovery policy عملیاتی باید در استقرار نهایی تثبیت شوند. ایمیل/SMS reset بدون سرویس معتبر ساخته نشده؛ recovery کنسول راه فعال است. لوگو/screenshots رسمی محصول، دامنه، متن حقوقی مصوب و CMS/فرم‌های عمومی همچنان وابستگی مراحل قبلی/بعدی‌اند. فرم دمو/تماس عمومی تا STEP8 غیرفعال است؛ پنل امنیت و حساب به DB واقعی متصل است.

## فایل‌های ایجاد و تغییر

API جدید: `app/core/security.py` و `problems.py`؛ `models/auth.py`؛ `schemas/auth.py`؛ `services/auth.py`، `admin_operations.py`، `mfa.py`، `auth_maintenance.py`؛ `commands/admin.py`، `auth_cleanup.py` و package init؛ `api/v1/routes/admin.py`؛ migration `0003_auth_mfa_administrator_sessions_challenges_rate_.py`؛ تست‌های `unit/test_security.py`، `integration/test_auth.py`، `e2e_server.py` و `e2e_cleanup.py`.

API تغییر: config/error/middleware/main/models init، common schema، pyproject/uv.lock و تست‌های foundation/postgres/client/conftest/smoke. مدل‌های اولیه admins/pages بازنویسی نشده‌اند.

وب جدید: layout/pageهای admin/login و گروه protected (dashboard/accounts/audit/security)، error boundary، `features/admin` (shell/login/accounts/security/client)، `lib/admin-api.ts`، `proxy.ts`، bridge `/api/v1/[...path]`، `components/layout/public-shell.tsx` و `tests/e2e/admin.spec.ts`. انتقال صفحات عمومی به `(public)` به‌همراه layout/not-found؛ root layout/not-found تعدیل شدند. package و lock برای RHF/Zod/resolver و مسیر خروجی QA تست‌های عمومی تغییر کردند.

زیرساخت/مستند: compose.yaml، .env.example، setup-development/test-backend و اسکریپت جدید test-web-admin؛ README، backend-runbook و شش سند specification به‌روز شدند. admin-runbook و این گزارش جدیدند؛ QA مرحله۵ شامل XML/OpenAPI/audit/خلاصه JSON و تصاویر واقعی است. خروجی‌های QA مرحله۲–۴ حفظ می‌شوند؛ runtime ابزار و secrets/cache/traces خصوصی ignored هستند.

فهرست دقیق ایجاد/تغییر/انتقال تمام فایل‌ها در [changed-files.txt](qa/step5/changed-files.txt) ثبت شده است. فایل env، virtualenv، cache، trace خصوصی یا dependency نصب‌شده در Commit قرار ندارد. Docker توسعه/تست پس از QA متوقف شد؛ volume توسعه حفظ شده و راه‌اندازی دوباره در runbook آمده است.

## ادامه

R023 و R044–047 در محدوده این مرحله با شواهد پذیرفته می‌شوند؛ بخش‌های CMS/CRM/TLS تولید به مراحل بعد تعلق دارند. گزارش تغییرات قبل Commit ارائه می‌شود و Commit محلی فقط با gateهای موفق ثبت می‌شود؛ hash در پیام تحویل می‌آید. هیچ Push یا استقرار بیرونی مجاز فرض نشده و انجام نمی‌شود. STEP6 تا تأیید تازه کاربر شروع نخواهد شد.
