# برنامه اجرای مرحله‌ای و معیارهای پذیرش

وضعیت این برنامه: مبنای تحلیل اولیه، با یادداشت پیشرفت در انتها. کاربر پس از تحلیل مستقیماً STEP 2 را درخواست کرد؛ bootstrap حداقلی وب برای اجرای همان مرحله انجام شده است. Backend، migration و Docker هنوز اجرا نشده‌اند. هر STEP به تأیید کاربر قبل شروع STEP بعد وابسته است. این گیت از بند ۱۶ درخواست مستقیم کاربر می‌آید؛ محدودیت ناشی از مهارت یا ابزار نیست.

## قواعد تحویل و وابستگی

برای هر مرحله: scope مصوب → implementation → checks → رفع خطا → گزارش فارسی شامل files/requirements/tests/limitations → در صورت tests موفق، گزارش پیش از Commit و Commit مرحله‌ای در مخزن موجود → توقف برای تأیید. Push تنها با مجوز صریح. در تحویل فعلی Git repository وجود ندارد و هیچ Commit/Push انجام نمی‌شود. در bootstrap می‌توان Git local ایجاد کرد؛ remote/deploy بدون مقصد و مجوز ساخته نمی‌شود.

تست‌های پایین برنامه اجرای آینده‌اند؛ اکنون اجرا نشده‌اند. هیچ مرحله‌ای به دلیل نبود dependency «کامل» اعلام نمی‌شود. پذیرش layout در STEP3 به معنای پذیرش CMS یا فرم نیست؛ پذیرش انتهابه‌انتها آن‌ها به STEP6–8 وابسته است. محیط staging قبل از gate انتشار عمومی است؛ UI ناقص با فرم جعلی production نمی‌شود. هر بار فقط checks مرتبط با تغییر و gates الزامی اجرا؛ تکرار بی‌دلیل suite کامل لازم نیست.

## تحلیل فعلی — خروجی قابل بررسی

شش فایل خواسته‌شده، `analysis-report.md` و `validation-report.md`: استخراج ۱۰۴ نیازمندی و ردیابی همه بخش‌ها؛ وضعیت Workspace؛ معماری و مرز محصول؛ schema/قرارداد؛ tokens و مرحله‌بندی. معیار پذیرش: خواندن تمام PRD، نبود تغییر کد/منبع، اتصال اسناد، پوشش هر بخش، encoding فارسی و ثبت محدودیت‌ها. build نرم‌افزار برای docs-only کاربرد ندارد؛ شواهد واقعی در validation-report است.

پس از تأیید همین تحلیل، قدم بعد «تکمیل STEP1 مهندسی» است؛ شروع STEP2 نیاز به گیت جدا دارد.

## STEP 1 — Foundation مهندسی (پس از تأیید تحلیل)

scope: ساخت monorepo حداقلی مطابق architecture، package/pyproject/lock، TS strict، ESLint مستقل، scripts کیفیت، env schema/example بدون secrets، .gitignore/.dockerignore، README فارسی و CI skeleton. Next صفحه حداقلی توسعه با placeholder صریح، FastAPI اسکلت بدون CMS یا اتصال عملیاتی. runtime Node24/Python3.13 در container/CI تثبیت می‌شود. Compose اولیه برای مسیر engineering قابل افزودن است؛ Docker production کامل در STEP10.

وابستگی: تأیید تحلیل؛ دسترسی registry و runtime؛ Docker daemon برای checks کانتینری. پذیرش: install reproducible، Next build/typecheck/lint، import/config API، هیچ secret یا Mock API نهایی، pipeline اولیه checkها. R095/R103/R104 به شکل foundation شروع می‌شوند؛ تکمیل نهایی‌شان تا integration باقی می‌ماند. files: apps skeleton، manifests/locks، CI، README/env و docs نسخه‌ها. پایان با گزارش و انتظار تأیید STEP2.

## STEP 2 — طراحی UI و layout

scope: tokens مصوب/موقت، فونت مجاز محلی، primitives shadcn، RTL shell، header/footer/nav، سه layout واقعی، focus/reduced motion و UI states. mockup/wireframe قابل بررسی به عنوان فایل محلی؛ ارسال به سرویس طراحی بیرونی نیاز نیست. R087–090 بخش طراحی.

وابستگی: STEP1 و تعیین برند/مرورگر؛ نبود لوگو با placeholder صریح قابل توسعه، ولی برند نهایی تأیید نشده گزارش شود. پذیرش: build/lint/typecheck، contrast، Playwright shell widths 360/390/768/1024/1440، منو keyboard/Escape/focus restore، axe و reduced motion. UI stateهای طراحی در harness تست مجازند؛ داده جعلی production مجاز نیست. files: styles/tokens، components/ui/layout، public/fonts در صورت دارایی معتبر، screenshots QA و docs. توقف برای تأیید STEP3.

## STEP 3 — صفحات عمومی و copy

scope: `/`، features و چهار زیرصفحه، solutions چهار نقش، about/demo/contact/faq/privacy/terms و 404. ترتیب PRD، product screenshots معتبر، CTAهای navigation واقعی و readiness روشن. blog/learn route shell آماده می‌شود ولی پذیرش محتوایی در STEP7 است. R011–024 و R003–008.

وابستگی: STEP2، copy و لینک/تصویر معتبر؛ دریافت وضعیت محصول یا عدم انتشار ادعای آماده تأییدنشده. داده رسمی اولیه می‌تواند content source تأییدشده باشد و در STEP6 به DB منتقل شود؛ hardcode نهایی برای CMS پذیرش نیست. تا API STEP8، فرم فقط در محیط development یا state «هنوز قابل ارسال نیست» مشخص؛ هیچ success ساختگی. صفحات production همراه CTA/form ناتمام publish نمی‌شوند.

پذیرش: build/typecheck/lint، E2E URL/link/404 و responsive، بازبینی فارسی/marketing evidence و no horizontal overflow. معیار functional lead و CMS هنوز pending. files: app public routes، sections، assets واقعی مصوب، test و گزارش copy. توقف برای تأیید STEP4.

## STEP 4 — Backend، PostgreSQL و Alembic

scope: app config، schema/error/logging، repository/service/transaction، engine/session، migration اولیه auth/content core، OpenAPI، health/live/ready، DB volume/network و Compose dev. R001/R064–074 بنیاد. مدل‌های ماژول بعدی با migration مستقل در همان مرحله افزوده می‌شوند؛ تمام جداول لازم تا STEP9 تکمیل‌اند.

وابستگی: STEP1، Docker engine یا PostgreSQL واقعی قابل‌دسترسی؛ Python3.13 تثبیت‌شده. پذیرش: Pytest unit+HTTPX integration واقعی PostgreSQL، upgrade head fresh و seeded prior DB، health در قطع DB، 422/500 redaction، config secrets failure و API build image/Compose smoke. SQLite acceptance جایگزین نیست. files: API core/db/routes/schema، Alembic، tests، Compose dev و Docker اولیه. توقف برای تأیید STEP5.

## STEP 5 — auth و پنل پایه

scope: owner bootstrap امن، session DB، Argon2id، CSRF pre-login/session، roles owner/editor/sales، throttling مشترک DB، revoke/expiry، audit و admin shell/dashboard با capability واقعی. MFA feasibility/policy اینجا تعیین؛ اگر فعال، TOTP/recovery واقعی نه UI نمایشی. R044–047/R023/R045.

وابستگی: STEP2/4، نقش افراد و policy recovery؛ هر secret از env/vault. پذیرش: Pytest login success/failure، enumeration، cookie flags، stale/inactive/expired/revoked session، fixation، cross-origin/CSRF، role matrix و last-owner concurrency. Playwright login/logout، guest admin/API، noindex/no-store، build/typecheck/lint. files: auth/security services و schemas/migrations، admin layout/forms، tests و runbook حساب. توقف برای تأیید STEP6.

## STEP 6 — CMS، امکانات، FAQ، تنظیمات و رسانه

scope: CRUD page/section/feature/audience/FAQ/settings، revision/preview/publish/schedule/unpublish، typed JSON، rich text sanitization، media private/public با volume واقعی، UI editor و audit. اتصال صفحات STEP3 به API/DB واقعی. R003/R037–043/R048/R065–066/R069/R074.

وابستگی: STEP5؛ محتوای معتبر؛ انتخاب editor و sanitizer نگهداری‌شده و قفل‌شده؛ حل FK رسانه revision در migration. پذیرش: CRUD→preview خصوصی→publish→صفحه واقعی بدون کد؛ draft و edit منتشرنشده هرگز عمومی؛ boundary schedule UTC، stale version409، audit rollback، XSS vectors، MIME spoof/size/pixel/path traversal و persistence بعد restart. build/lint/typecheck، HTTPX و Playwright CMS واقعی. files: CMS/media API/model/migration، پنل editor، اتصال public data و tests. توقف برای تأیید STEP7.

## STEP 7 — وبلاگ و مرکز آموزش

scope: blog، دسته/tag، learn text/video، role/level/topic filters و q، collections/reorder/related/prev-next، metadata دستی آپارات و embed رسمی verify‌شده، click-to-load responsive/fallback/ثالث، شمارش واقعی qualified view، سه featured در خانه. R020/R039–041/R049–063/R067/R071.

وابستگی: STEP6، حداقل محتوای واقعی برای انتشار، ویدیوی آپارات مجاز/شناسه تست، دسترسی شبکه آپارات برای تست live؛ API metadata خارجی الزامی نیست. پذیرش: مدیر مقاله و ویدیو بدون کد منتشر کند؛ category/tag/search/level/type/role/pagination ترکیبی؛ مجموعه mixed و duplicate position؛ draft/scheduled/related protection؛ allowlist embed/XSS، بدون درخواست player پیش از کلیک، fallback دستی و widths، no fake popular views. blog/learn واقعاً مستقل و کارت خانه صفر/۱/۲/۳ محتوا درست. تست live اگر فیلتر باشد «اجرا نشده/محدود»؛ sanitization با adapter fake در unit مجاز ولی قبول player نهایی نیاز به live evidence دارد. files: ماژول‌ها/migrations، صفحات آموزش/وبلاگ، پلیر/فیلتر، tests و گزارش شبکه. توقف برای تأیید STEP8.

## STEP 8 — فرم‌های واقعی و CRM محدود

scope: RHF/Zod و Pydantic، فرم دمو کامل/تماس، PostgreSQL transactional persistence، consent نسخه‌دار، reference امن، idempotency/form token/duplicate guard، rate/honeypot، lead/contact پنل search/filter/assignment/status/outcome/notes/history، purge policy. R025–036/R048/R070/R076–077 بخش فروش.

وابستگی: STEP4/5، تماس رسمی، متن رضایت/retention و مسئول پیگیری. provider ایمیل/SMS شرط ثبت نیست؛ در صورت درخواست/تنظیم، durable retry مستقل لازم است. پذیرش: happy path DB→پنل status=new، concurrency same/different keys یک رکورد، changed body409، invalid/422/rate429/honeypot، DB failure503 بدون success، retry reference ثابت، role PII، notes/audit، consent mismatch و purge. Playwright دو فرم با API/DB واقعی، build/lint/typecheck، Pytest/HTTPX. files: lead/contact services/models/migrations و UI/forms/admin، tests، policy و runbook فروش. توقف برای تأیید STEP9.

## STEP 9 — SEO، عملکرد و analytics

scope: metadata/canonical/OG/Twitter/breadcrumb/structured data واقعی، sitemap index و آموزش، robots/noindex، URL/redirect/cache، images/fonts، events هشت‌گانه بدون PII، KPI definitions و داده واقعی. R078–086/R051/R063.

وابستگی: STEP6–8، دامنه و assets/copy واقعی، policy analytics/consent. پذیرش: generated HTML دارای متن/metadata، sitemap فقط public/indexable و scheduled رسیده، schema validator، preview/admin/success noindex، canonical blog/learn غیرتکراری، event payload redaction، views bot/dedupe واقعی. typecheck/lint/build، Playwright/meta tests، axe+manual، Lighthouse سه اجرا. files: metadata/sitemap/robots/json-ld، metrics/events، asset optimization، tests و گزارش عملکرد. توقف برای تأیید STEP10.

شرایط پیشنهادی Lighthouse: production build روی staging واقعی پشت HTTPS، cold-cache، mobile emulation ثابت با throttling ثبت‌شده، نسخه Chromium/Lighthouse ثبت، سه اجرا در هر مسیر اصلی `/`, `/features`, `/solutions/schools`, `/demo`, یک مقاله و یک ویدیو واقعی. median Performance/SEO>=90 و نتایج تک‌اجرا نیز ذخیره؛ پنهان‌کردن run ضعیف ممنوع. پخش آپارات پیش از کلیک بارگذاری نشود؛ عملکرد پس از کلیک جدا بررسی. INP واقعی با Lighthouse static ثابت نمی‌شود؛ RUM p75 با داده کافی بعد انتشار گزارش می‌شود.

## STEP 10 — Docker تولید، امنیت و تحویل

scope: web/API multi-stage، Caddy HTTPS/HSTS، Compose prod شبکه خصوصی/volumes/restart/non-root/health، deploy migration job، scans CI، staging smoke، backup/restore DB+media، monitoring و README فارسی نصب/آپدیت/rollback. R091–099 و regression تمام MVP.

وابستگی: Docker daemon سالم، staging/server/DNS/دامنه، env secrets، backup target/RPO/RTO؛ انتشار محتوا و عملیات production با گیت مالک پروژه. permission Push همچنان مستقل و صریح لازم است. نبود hosting مانع نوشتن artifacts نیست ولی پذیرش deploy واقعی را pending می‌گذارد.

پذیرش: Compose config و build، up در محیط تازه، health endpoints و E2E با خدمات واقعی، restart persistence، عدم expose DB/API/web بیرونی، cookie/TLS/CSP/headers، migrations controlled، scan dependency/image، backup رمزگذاری و restore در DB/volume مجزا با مقایسه داده/فایل، Playwright cross-browser/device، Pytest کامل، lint/typecheck/build و Lighthouse نهایی. نتیجه scan بدون findings بحرانی حل‌نشده یا استثنای مکتوب مالک؛ ادعای امنیت مطلق نمی‌شود. files: Dockerfile/Compose/Caddy، workflows، runbooks و گزارش نهایی acceptance. بازبینی نهایی user قبل launch.

## commands برنامه‌ریزی‌شده برای gateها

این commands بعد bootstrap با نام scripts قطعی می‌شوند؛ الان قابل اجرا/پاس گزارش نشده‌اند.

```text
npm ci
npm --workspace apps/web run lint
npm --workspace apps/web run typecheck
npm --workspace apps/web run test
npm --workspace apps/web run build
python -m pytest apps/api/tests/unit
python -m pytest apps/api/tests/integration
alembic upgrade head                  (داخل apps/api و DB هدفِ آزمون)
docker compose config --quiet
docker compose build
docker compose up -d --wait
npm --workspace apps/web run test:e2e
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml build
```

CI باید PostgreSQL واقعی service داشته باشد. integration DB/volumes اختصاصی تست از production جدا؛ cleanup به هدف مطلق verified محدود. هیچ purge/restore/recursive-delete روی DB یا فایل واقعی کاربر به بهانه تست انجام نشود. report artifacts شامل junit، traces، screenshots، accessibility، Lighthouse و scan همراه نسخه ابزار و commit هستند. restore script نام مقصد جدا و guard دارد.

## خارج MVP و موارد مشروط

پرداخت، provisioning خودکار، چت‌بات AI، حساب یادگیرنده/progress، CRM جامع، campaign automation و چندزبانه کامل نیازمند تصویب دامنه جدا هستند. اتصال مستقیم SQL Server اصلی حتی در توسعه بعدی مجاز فرض نمی‌شود؛ فقط API رسمی با قرارداد امنیتی و مجوز. MFA، ایمیل/SMS، CAPTCHA، customer logos، قیمت‌گذاری، roadmap AI concept و ثالث/analytics consent به تصمیم/مدرک واقعی وابسته‌اند؛ هیچ‌کدام با داده ساختگی جایگزین نمی‌شوند.

## قالب گزارش هر STEP

گزارش فارسی شامل: رفتار حاصل و علت؛ files ایجاد/تغییر؛ شناسه‌های R با evidence تست؛ commands اجراشده و exit code؛ failure/skip به‌همراه دلیل؛ ریسک/تصمیم باقی؛ وضعیت commit (hash اگر ایجاد شد) و عدم Push؛ STEP بعدِ منتظر تأیید. برآورد تقویمی/هزینه بدون محتوا و hosting معتبر داده نمی‌شود؛ این پروژه شامل ده گیت واقعی است و تحویل فعلی صرفاً گیت تحلیل است.

## پیشرفت پس از درخواست مستقیم STEP 2

در پاسخ به درخواست STEP 2، workspace وب، lockfile، TS strict، ESLint، Next App Router و start تولید مستقل ایجاد شد؛ این‌ها dependency ضروری UI بوده‌اند. این کار به معنی تکمیل همه STEP1 (به‌ویژه API/CI/Docker) نیست. صفحه `/` specimen چیدمان و `/design-system` راهنمای تعامل است؛ صفحات عمومی نهایی STEP3 یا فرم STEP8 ساخته نشده‌اند. گزارش و گیت همین مرحله در `step-2-report.md` است؛ STEP3 بدون تأیید آغاز نمی‌شود.

## پیشرفت پس از تأیید STEP2 و درخواست STEP3

کاربر STEP2 را تأیید و شروع STEP3 را درخواست کرد؛ در پاسخ تکمیلی، پیام‌رسان/مدرسه/گزارش را آماده معرفی عمومی دانست. صفحه اصلی و ۱۸ مسیر عمومی دیگر با copy PRD، صفحات چهار مخاطب و AI roadmap ساخته شده‌اند. `/blog` و `/learn` فقط shell انتشار واقعی‌اند و محتوای فرضی ندارند. فرم‌ها تا STEP8 غیرفعال، متن حقوقی پیش‌نویس و تصاویر/راه تماس رسمی هنوز نیازمند دارایی واقعی‌اند. شواهد build/test و وضعیت پذیرش در `step-3-report.md` ثبت می‌شود؛ STEP4 به تأیید بعدی کاربر وابسته است.

## پیشرفت پس از درخواست STEP4

کاربر شروع Backend Foundation را درخواست کرد. API مستقل، config/schema/error/logging، engine/session/transaction/repository پایه، دو migration اولیه حساب/audit/page/revision، OpenAPI/health و Compose توسعه/تست PostgreSQL واقعی ساخته و آزموده شدند. startup هیچ schema mutation ندارد؛ job migration و role runtime جدا هستند. شواهد fresh/prior upgrade، rollback، constraints، privileges، قطع/بازیابی DB و persistence در step-4-report ثبت شده است. schema/session/login/CMS/lead/module API در این مرحله اضافه نشده‌اند؛ STEP5 به تأیید بعدی کاربر وابسته است.
