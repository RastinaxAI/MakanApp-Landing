# معماری پیشنهادی لندینگ ماکان

وضعیت: طراحی برای بررسی، اجرا نشده — ۱۲ اکتبر ۲۰۲۶. مبنا: سند ۱.۱، به‌ویژه بخش‌های ۸، ۱۰، ۱۱، ۱۳ و تکمیل‌های صریح پرامپت.

## تصمیم اصلی و مرز سامانه

یک monorepo با دو برنامه مستقل: Next.js برای وب عمومی و UI پنل؛ FastAPI برای قوانین کسب‌وکار، CMS، auth، رسانه و CRM محدود. PostgreSQL مالک تمام داده‌های همین وب‌سایت است. تنها ارتباط MVP با ماکان، لینک ورود مصوب است؛ هیچ call عملیاتی، دیتابیس SQL Server، SSO یا حساب کاربران ماکان به این سایت متصل نمی‌شود. حساب مدیر سایت مستقل است.

این اندازه پروژه به microserviceهای متعدد نیاز ندارد. جداسازی ماژول در FastAPI هزینه deployment را پایین نگه می‌دارد و استخراج سرویس بعدی را ممکن می‌کند. وبلاگ و مرکز آموزش URL، schema و نیازهای جدا دارند؛ فقط editor، sanitization، SEO و media مشترک می‌شوند.

## جریان درخواست

```text
مرورگر ── HTTPS ── Caddy
                    ├── /api/*       → FastAPI → PostgreSQL خصوصی
                    ├── /media/*     → فقط دارایی منتشرشده FastAPI/storage
                    └── /*           → Next.js
                                         └── SSR → FastAPI داخلی
API مدیریت ── storage volume مستقل از DB
کاربر پس از کلیک پلیر ── iframe رسمی آپارات
```

Caddy انتخاب پیشنهادی به‌جای Nginx است؛ دلیل: پیکربندی ساده‌تر TLS خودکار و کاهش کار عملیاتی برای MVP. دامنه، DNS، پورت‌های 80/443 و دسترسی صدور گواهی هنوز تعیین نشده‌اند. استفاده از TLS/HSTS فقط پس از تست دامنه واقعی مجاز است. انتخاب Caddy تصمیم تکمیلی است، نه الزام خاص سند.

## ساختار پیشنهادی

ریشه فعلی `MakanWebsite` خود ریشه پروژه خواهد بود؛ پوشه اضافی `makan-landing` سودی ندارد.

```text
MakanWebsite/
├── apps/
│   ├── web/
│   │   ├── src/app/(public)/...
│   │   ├── src/app/admin/...
│   │   ├── src/components/{ui,layout,sections,forms}/
│   │   ├── src/features/{cms,learn,blog,leads,auth}/
│   │   ├── src/{hooks,lib,types,styles}/
│   │   ├── public/{fonts,images}/
│   │   └── tests/{unit,e2e}/
│   └── api/
│       ├── app/api/v1/routes/
│       ├── app/{core,models,schemas,services,repositories,db}/
│       ├── app/commands/
│       ├── alembic/versions/
│       └── tests/{unit,integration}/
├── infrastructure/{caddy,docker}/
├── docs/
├── .github/workflows/
├── compose.yaml
├── compose.production.yaml
├── .env.example
└── README.md
```

این ساختار طرح اولیه مرحله تحلیل است؛ پیشرفت پیاده‌سازی در یادداشت انتهای سند ثبت می‌شود. نام‌های compose و infrastructure مطابق تصمیم تکمیلی کاربر است؛ تفاوت نام با نمونه PRD تفاوت عملکردی ندارد.

## فناوری و سیاست نسخه

| جزء | خط نسخه پیشنهادی | دلیل/روش تثبیت |
|---|---|---|
| Node | 24 LTS | runtime Docker و CI یکسان؛ Node محلی 26.8.1 مبنای تولید نیست |
| Next/React | Next 16.x / React و ReactDOM 19.x سازگار | App Router؛ دقیقاً peerDependency نسخه Next انتخاب‌شده رعایت شود |
| TypeScript | 5.x با strict | typecheck مستقل و noUncheckedIndexedAccess پیشنهادی |
| Tailwind | 4.x + PostCSS سازگار | tokens مرکزی و CSS logical properties؛ شناسایی مرورگر قدیمی پیش از UI |
| UI | shadcn/ui، Lucide، Motion | کامپوننت‌های shadcn در مخزن مالکیت دارند؛ lock رجیستری/وابستگی، فقط motion ضروری |
| فرم | React Hook Form 7.x / Zod 4.x / resolver سازگار | سازگاری واقعی با lock و آزمون فرم، نه فرض نظری |
| Python | 3.13.x | runtime کنترل‌شده؛ Python محلی 3.14.6 جایگزین تست این runtime نیست |
| API | FastAPI stable 0.x، Pydantic 2.x، SQLAlchemy 2.x، Alembic 1.x | شماره minor FastAPI در bootstrap از release رسمی resolve و قفل می‌شود |
| DB/driver | PostgreSQL 17.x / psycopg 3.x | خط پشتیبانی‌شده با patch امنیتی جاری؛ SQLAlchemy sync و session-per-request |
| پراکسی | Caddy 2.x | TLS و routing؛ patch و image digest در مرحله زیرساخت قفل شود |
| تست | Pytest، HTTPX، Playwright، ESLint | lock دقیق در bootstrap و مرورگرهای Playwright هم‌نسخه image |

این جدول انتخاب major است، نه ادعای آزمون سازگاری. patchهای دقیق، hashes، lockfile و digestها بعد از اجازه bootstrap و نصب ثبت می‌شوند. `latest` شناور برای build تولید پذیرفته نیست. build، lint و typecheck سه gate مستقل‌اند؛ در Next 16 build اجرای lint را تضمین نمی‌کند. [مستند رسمی نصب Next](https://nextjs.org/docs/app/getting-started/installation) و [ارتقا به نسخه ۱۶](https://nextjs.org/docs/app/guides/upgrading/version-16).

Tailwind 4 مرورگر مدرن می‌خواهد؛ مبنای پشتیبانی پیشنهادی Chrome/Edge 111+، Firefox 128+ و Safari 16.4+ است، طبق [سازگاری رسمی Tailwind](https://tailwindcss.com/docs/compatibility). نیاز به مرورگر قدیمی باید قبل STEP 2 تعیین شود. Node 24 LTS و PostgreSQL 17 پشتیبانی‌شده با منابع رسمی بررسی شدند: [Node releases](https://nodejs.org/en/about/previous-releases)، [PostgreSQL versioning](https://www.postgresql.org/support/versioning/). منابع Python و FastAPI: [Python 3.13](https://www.python.org/downloads/release/python-3130/)، [FastAPI releases](https://fastapi.tiangolo.com/release-notes/).

## مرز لایه‌ها و داده

Route مسئول HTTP/schema/dependency است. Service مالک تراکنش، انتشار، نقش‌ها، dedupe و audit است. Repository فقط query/storage را انجام می‌دهد؛ مدل SQLAlchemy قرارداد API نیست. وابستگی database session برای هر درخواست مستقل؛ transaction یک‌بار در service commit می‌شود. endpointهای sync با ORM sync از blocking event loop جلوگیری می‌کنند؛ async فقط برای IO واقعاً async. استفاده از SQLite به‌جای PostgreSQL در acceptance ممنوع است.

Pydantic schema ورودی و خروجی جدا؛ public projection هیچ email مدیر، lead، audit، draft یا secret را serialize نمی‌کند. OpenAPI مبنای typeهای تولیدشده فرانت می‌شود؛ check drift در CI. monorepo به معنی import مستقیم مدل Python در وب نیست.

SSR پنل تنها cookie نشست لازم را به API داخلی مورد اعتماد forward می‌کند؛ authorization نهایی همان FastAPI است. URL مقصد ثابت از env و headerهای allowlisted، بدون forward عمومی Authorization/Cookie به سرویس ثالث. تصاویر private پنل از مسیر authenticated مستقیم و بدون optimizer/cache عمومی Next نمایش داده می‌شوند؛ فقط تصاویر public در next/image قرار می‌گیرند.

## رندر، CMS و انتشار زمان‌بندی‌شده

وب عمومی با Server Components و SSR؛ client component فقط فرم، menu، tabs، filter و پلیر. در MVP خواندن محتوای CMS، sitemap و تنظیمات عمومی `no-store` است تا draft، لغو انتشار و موعد schedule بدون race cache دیده شوند. فایل‌های fingerprinted، فونت و تصاویر منتشرشده cache پایدار دارند؛ محتوای ثابت بی‌ارتباط با CMS می‌تواند static باشد. ISR فقط بعد از افزودن invalidation امن و تست حذف انتشار بررسی می‌شود.

ویرایش draft، نسخه منتشرشده جاری را تغییر نمی‌دهد. نسخه content revision immutable پس از publish؛ schedule به revision مشخص اشاره دارد. predicate مشترک API/sitemap/related/series: entity فعال، نسخه منتشرشده یا schedule سررسیده، زمان <= اکنون UTC، indexability متناسب. بدون worker، زمان‌بندی در read فعال می‌شود؛ job نگهداری برای cleanup لازم است ولی شرط انتشار نیست. لغو انتشار باید خروجی عمومی را فوراً 404 کند. preview فقط مدیر مجاز، no-store/noindex و بدون URL عمومی دارای token.

sections دارای type و schema نسخه‌دار هستند، نه page builder با HTML/JS دلخواه. rich text به HTML محدود تبدیل و سمت سرور با allowlist sanitize می‌شود. raw HTML به iframe دسترسی نمی‌دهد؛ پلیر آپارات component اختصاصی با ID تأییدشده است. امتیاز «آماده» برای قابلیت‌ها تنها با evidence/copy review مجاز خواهد بود.

## احراز هویت و نقش

نشست opaque تصادفی با digest در PostgreSQL؛ Argon2id برای رمز؛ rotation پس از ورود؛ انقضای idle/absolute و revoke. cookie تولید `__Host-makan_session`، Secure، HttpOnly، SameSite=Lax، Path=/ و بدون Domain. session و CSRF در localStorage ذخیره نمی‌شوند. login نیز Origin و anti-CSRF پیش‌ورود دارد؛ سایر mutations از synchronizer token و Origin معتبر استفاده می‌کنند. SameSite به‌تنهایی کافی فرض نمی‌شود. مبنا: [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)، [OWASP Session](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

سه role پیشنهادی: owner برای حساب‌ها/تنظیمات/همه محتوا؛ editor برای CMS/media؛ sales برای lead/contact/یادداشت. authorization در FastAPI اجباری؛ مخفی‌کردن دکمه امنیت نیست. owner از command یک‌بار و secret محیط امن ساخته می‌شود؛ endpoint signup عمومی نداریم. MFA مشروط سند، در STEP 5 امکان TOTP و recovery بررسی و تصمیم مستند می‌شود. ورود ناموفق پیام کلی دارد و throttle بر IP hash و email hash. audit بدون رمز، cookie، body تماس یا شماره کامل.

## فرم، rate limit و مشاهده‌پذیری

Idempotency-Key تصادفی با payload digest، رزرو تراکنشی و reference غیرقابل‌حدس. همان key/body نتیجه قبلی؛ key متفاوت با submission token همان فرم به رکورد قبلی متصل می‌شود؛ anti-duplicate شماره/مدرسه در بازه پیشنهادی ۱۰ دقیقه فقط محافظ کسب‌وکار است، نه unique همیشگی موبایل. details در قرارداد API آمده است.

بدون Redis: rate buckets اتمیک PostgreSQL با HMAC IP/identifier، expiry کوتاه و cleanup. چند worker یک سقف دارند؛ در خرابی DB پاسخ موفق فرم داده نمی‌شود. trusted proxy صریح؛ X-Forwarded-For دلخواه کاربر قابل اعتماد نیست. honeypot قبل ثبت و success جعلی ممنوع؛ CAPTCHA فقط اگر نیاز واقعی به provider تأییدشده ایجاد شد.

لاگ JSON با trace_id، route template، status، duration و کد خطا؛ redaction داده فرم و auth. liveness بدون DB، readiness با DB و migration head. instrumentation هشت event سند با allowlist properties و aggregation؛ organic KPI وابسته به منبع attribution/search console مصوب. بازدید آموزش با تعریف qualified view و کنترل bot/dedupe، نه شمارنده جعلی. notification پیش‌فرض فقط نمایش در پنل؛ ایمیل/SMS صرفاً بعد از provider واقعی و durable retry اضافه می‌شود.

## زیرساخت، امنیت و استقرار

dev: Compose محلی، HTTP روی loopback، DB فقط شبکه خصوصی، hot reload؛ prod: image چندمرحله‌ای، non-root برای web/API، read-only filesystem جز volume مشخص، healthchecks، restart، env validation و resource limits. فقط proxy منتشرشونده؛ شبکه DB از شبکه دسترسی بیرونی جدا. API تنها writer upload؛ فایل draft خصوصی و منتشرشده از مسیر کنترل‌شده؛ thumbnail/alt شامل نسخه immutable. media و DB هر دو باید backup شوند.

CSP باید scripts/fonts/styles محلی و frame-src رسمی آپارات را محدود کند؛ iframe اختیاری click-to-load و بدون autoplay. SVG/HTML upload فعال پذیرفته نمی‌شود. در SSR هیچ URL دلخواه CMS fetch نمی‌شود؛ برای metadata آپارات، دستی پیش‌فرض و API بیرونی تا تأیید اعتبار/SSRF ممنوع است.

deploy: build/scan → backup پیش از migration پرخطر → migration job واحد با lock → health/smoke در staging → انتشار کنترل‌شده production. rollback image و migration backward-compatible؛ downgrade مخرب اتوماتیک ممنوع. backup رمزگذاری و restore در DB جدا با checksum رسانه و سنجش رکوردها. RPO/RTO و محل نگهداری باید توسط مالک عملیات تعیین شوند. دامنه/hosting/secrets موجود نیست؛ هیچ deployment یا Push در این مرحله انجام نمی‌شود.

## ریسک‌ها و دلایل جایگزین

| موضوع | تصمیم فعلی | تغییر فقط در صورت |
|---|---|---|
| صف/Redis | نداریم؛ DB نرخ و schedule read-time | حجم بالا یا اعلان پس‌زمینه واقعی با نیاز عملیاتی |
| Object Storage | interface قابل تعویض + volume پایدار MVP | چند replica/چند میزبان یا نیاز CDN/storage خارجی |
| جست‌وجو | normalize فارسی + query PostgreSQL محدود | حجم/کیفیت جست‌وجو نیاز تخصصی ثابت شود |
| SSR no-store | صحت انتشار اولویت؛ static assets cached | load test نیاز cache و invalidation تست‌شده نشان دهد |
| CMS آماده خارجی | پنل اختصاصی مطابق درخواست | تغییر دامنه با تصمیم صریح کاربر |
| MFA | تصمیم STEP 5 و آماده‌سازی مدل | توان عملیاتی recovery و policy مشخص شود |

## پیشرفت STEP4 — ۱۳ اکتبر ۲۰۲۶

FastAPI مستقل با factory/lifespan، config امن، engine sync/session-per-request، transaction و repository پایه ساخته شد. health تحت `/api/v1` و OpenAPI توسعه فعال‌اند. Python3.13.16، FastAPI0.143.0، Pydantic2.14.1، SQLAlchemy2.1.4، Alembic1.20.0، psycopg3.3.6 و uvicorn0.54.0 در pyproject/uv.lock قفل شدند. Docker API چندمرحله‌ای با uid10001 و filesystem read-only Compose، PostgreSQL17.11-alpine و job migration جدا آزموده شدند. network DB internal و بدون host port است؛ API شبکه application جدا برای publish روی127.0.0.1 دارد. role مالک migration و runtime غیر-superuser جدا هستند؛ schema فقط با Alembic تغییر می‌کند.

دو migration اولیه admins/audit و pages/revisions اجرا شدند؛ schema کامل CMS/auth/CRM به مراحل بعد تعلق دارد. ۱۹ تست HTTPX/Pytest، ارتقای fresh/prior، drift صفر، قطع DB و persistence پس از recreate موفق‌اند. وب مرحله۳ تغییر نکرده و build/typecheck/lint آن نیز موفق بود. جزئیات شواهد و محدودیت‌ها در `step-4-report.md` و راه‌اندازی در `backend-runbook.md` است. Compose وب/proxy/HTTPS تولید و CI هنوز ساخته نشده‌اند.

## اجرای مرحله ۵ و تصمیم MFA

کاربر STEP4 را تأیید و STEP5 را درخواست کرد؛ MFA اختیاری برای هر مدیر تصویب شد. ورود opaque session، Argon2id، CSRF، RBAC، audit تراکنشی و MFA واقعی اکنون فعال‌اند. routeهای پنل زیر `/admin` و صفحات عمومی زیر route group `(public)` قرار گرفته‌اند؛ URL عمومی عوض نشده است. Root layout فقط فونت و providers دارد؛ chrome عمومی و مدیریت جدا هستند.

API مستقل با migration `0003_auth_mfa` پنج جدول امنیتی اضافه می‌کند. HTTP routeها schema/cookie را اداره می‌کنند؛ business transactionها در `services/auth.py`، `admin_operations.py` و `mfa.py` هستند. ORM sync داخل endpoint sync اجرا می‌شود. limiter حساس با pool مستقل دو اتصال commit می‌شود تا rollback عملیات، quota را از بین نبرد؛ pool اصلی همچنان محدود است.

SSR پنل و bridge توسعه فقط cookieهای مجاز و headerهای Origin/CSRF/Fetch-Metadata را به API server-side تنظیم‌شده می‌فرستند. مقصد URL از env ثابت است، redirect دنبال نمی‌شود و body mutation تا ۱۶KiB محدود است. bridge مسیرها را allowlist می‌کند و به X-Forwarded-For ورودی اعتماد ندارد. در این توسعه IP فرآیند Next مشترک است؛ proxy تولید و IP واقعی در STEP10 آزموده خواهند شد.

CSP هر پاسخ مدیریت nonce مستقل دارد؛ SSR مدیریت dynamic است، script بدون nonce در آزمون تزریق HTML اجرا نمی‌شود. پنل no-store/noindex است؛ token در storage مرورگر قرار ندارد. logout/تغییر رمز/MFA مسیر خصوصی را با full navigation پاک می‌کنند. cookie Secure در staging/production و HTTPS origin اجباری است؛ TLS واقعی هنوز تحویل مرحله۱۰ است.

ثبت first owner و بازیابی lost-MFA فقط CLI کنسول مجاز، بدون رمز در argv است. AES-256-GCM با کلید مستقل و AAD شناسه حساب برای secret MFA؛ HMAC برای token/CSRF/recovery/rate subject. TOTP شش رقم، ۳۰ثانیه، replay guard و هشت کد بازیابی یک‌بارمصرف دارد. راهنمای policy و rotation در [admin-runbook](admin-runbook.md) است. dashboard شمارش واقعی DB دارد و ماژول‌های CMS/CRM را pending اعلام می‌کند؛ این مرحله هیچ CMS/lead ساختگی ندارد.

## معماری اجراشده مرحله۶ — نسخه API 0.6.0

صفحات عمومی از FastAPI/PostgreSQL خوانده می‌شوند؛ copy runtime ثابت حذف و متن تألیف‌شده قبلی به manifest idempotent منتقل شده است. public SSR با fetch no-store و React cache در محدوده درخواست، snapshot مؤثر را می‌گیرد؛ CMS خراب با copy جایگزین پنهان نمی‌شود. بهینه‌سازی cache/SEO مرحله۹ است. پنل همان auth/CSRF/RBAC مرحله۵ را مصرف می‌کند؛ BFF مقصد و route/header را allowlist و If-Match را منتقل می‌کند. JSON CMS حداکثر۲۵۶KiB، auth۱۶KiB و multipart تصویر۵MiB به‌علاوه سربار محدود است؛ فایل به‌صورت binary stream سرو می‌شود.

موتور Page/PageRevision موجود برای home/page/feature/audience/faq با قراردادهای typed مستقل حفظ شد. slug داخلی kind:slug و endpointهای مستقل، همگرایی انتشار را از تفکیک دامنه جدا می‌کنند؛ جزئیات دلیل فنی در step-6-decisions است. ویرایش snapshot جدید، publication pointer ثابت، If-Match، row lock و advisory lock رزرو slug دارد. schedule روی snapshot انتخابی و ساعت UTC سرور اعمال می‌شود؛ worker برای درست‌بودن نمایش لازم نیست. audit و تغییر محتوا یک تراکنش دارند.

Tiptap3.31.4 در پنل و nh3 0.3.7 در سرور استفاده می‌شوند؛ HTML فعال/پیوند اجرایی/تصویر خارجی حذف می‌شود. Pillow12.3.0 decode/re-encode WebP با محدودیت حجم/pixel/MIME و حذف EXIF انجام می‌دهد. تصویر ابتدا private و خارج web/public است؛ Volume media_data با UID10001، root read-only و مسیر UUID باقی می‌ماند. preview خصوصی optimizer عمومی را دور می‌زند. FK به snapshot، تصویر مصرف‌شده در تاریخچه را از حذف حفظ می‌کند. تنظیمات تنها دو کلید typed عمومی دارند و مخصوص owner هستند؛ secrets همچنان env هستند.

وب/proxy Docker کامل، HTTPS، backup/restore عملی، CI و تأیید انتشار Production مرحله۱۰ باقی‌اند. آموزش/آپارات و CRM مستقل از این CMS معرفی در مراحل۷/۸ اجرا خواهند شد.
