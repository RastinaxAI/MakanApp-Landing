# گزارش مرحله۱۰ — Docker، امنیت و عملیات تولید

وضعیت: پیاده‌سازی و گیت‌های پذیرش محلی مرحله۱۰ موفق شدند؛ پذیرش انتشار عمومی مشروط و باز است. چهار image تولید، PostgreSQL واقعی، HTTPS با CA داخلی، backup/restore و مرورگرهای واقعی آزموده شدند. استقرار عمومی انجام نشده؛ دامنه و سرور هنوز اعلام نشده‌اند. Push انجام نشده است.

## تغییرات

- Compose تولید مستقل، چهار image برای Next standalone، API، PostgreSQL و Caddy؛ worker نگهداری از image API استفاده می‌کند. شبکه DB و application خصوصی، تنها پورت‌های proxy منتشر می‌شوند.
- برنامه‌ها با UID۱۰۰۰۱ و DB از آغاز با postgres اجرا می‌شوند. rootfs برنامه‌ها فقط‌خواندنی، capabilities حذف، no-new-privileges، health/restart و منابع/log محدود تعریف شده‌اند. رسانه، دیتابیس، cache و گواهی حجم پایدار دارند.
- Caddy2.11.7 با Go1.27.2 و x/net0.60 بازسازی شد؛ برنامه‌ها روی Debian13 با وصله سیستم هستند. npm/yarn و pip غیرضروری از runtime حذف شدند. gosu از DB حذف شد چون سرور از ابتدا non-root است.
- `/api/v1/*` مستقیم به API می‌رسد؛ peer IP با کلید مستقل edge احراز می‌شود. هدر جعلی IP پذیرفته نیست. CSP عمومی و پنل با nonce، JSON-LD با همان nonce و Zod با jitless سازگار شدند. body limit واقعی analytics نیز اعمال شد.
- ابزار init/build/deploy/backup/restore/status با قفل namespace، secrets مستقل و خطای عمومی بدون اطلاعات ورود اضافه شد. backup AES-256-GCM، manifest/hash، توقف کوتاه نویسنده‌ها، retention آرشیو و restore صرفاً در مقصد خالی پیاده شدند.
- Worker نگهداری ساعتی، retry خطای موقت۳۰ثانیه و heartbeat واقعی دارد. بازیابی نشست/challengeهای قدیمی را لغو و retention را پیش از دسترسی اجرا می‌کند.
- CI با نسخه action/tool pin، PostgreSQL واقعی، lint/type/build، pytest، سه مرورگر، dependency/image scan و مانور Docker تعریف شد؛ نمونه timerهای Linux و راهنمای نصب/rollback/backup تهیه شدند.

Backend اصلی ماکان تغییر نکرده است؛ هیچ migration جدید یا بازسازی جدول در این مرحله انجام نشده و head برابر `0007_analytics` است. تغییر موجود کاربر در next-env.d.ts از commit مرحله مستثنی می‌شود. Fixtureهای مقاله، ویدیو، حساب و درخواست فقط در محیط آزمون مستقل‌اند.

## شواهد تأییدشده

خلاصهٔ ماشینی گیت‌ها و تطبیق imageها در [acceptance-summary.json](qa/step10/acceptance-summary.json) است: ۱۸۷ تست API و ۱۷۷ تست مرورگر، ۲۴۶ ارزیابی خودکار Axe با صفر violation. آزمون خودکار ادعای ممیزی کامل انسانی WCAG نیست.

| بررسی | نتیجه |
|---|---|
| Pytest/HTTPX و PostgreSQL واقعی | ۱۸۷ تست موفق؛ `docs/qa/step10/pytest.xml` |
| Build تولید | build Linux چهار image و build Node24 میزبان موفق |
| Docker/HTTPS/restore | ۷ گروه بررسی موفق در `docker-acceptance.json` |
| پشتیبان | آرشیو احرازشده با یک رسانه، ۳٫۶۴ثانیه روی داده کوچک آزمون |
| backup و restore کامل | ۱۲۳٫۸۲ثانیه؛ درخواست/یادداشت و SHA256 رسانه برابر، cookie بازیابی‌شده۴۰۱ |
| guard بازیابی | مقصد موجود پیش از mutation رد شد؛ رمز/آرشیو خراب و traversal در pytest رد شدند |
| persistence/readiness | پس از recreate داده باقی ماند؛ API قطع → ready وب۵۰۳؛ سرویس‌ها دوباره سالم |
| Regression سه مرورگر | ۱۵۶ تست و ۲۲۸ ارزیابی Axe، صفر violation؛ `regression-summary.json` |
| HTTPS مرورگر نهایی | ۲۱ تست سه موتور، صفر شکست و flaky؛ ۹۰ بررسی عرض، ۱۸ ارزیابی Axe، JSON-LD nonce، تصویر بهینه و cookie امن؛ `production-browser.json` |
| کیفیت نهایی | ESLint/typecheck/Ruff، هر سه Compose config و actionlint موفق؛ exit code صفر در `quality-summary.json` |
| Lighthouse نهایی | ۱۸ اجرای کامل؛ میانه Performance هر شش مسیر ≥۹۰، SEO/Accessibility/Best Practices همگی۱۰۰؛ CLS همه دورها صفر |
| اطلاعات ورود | هیچ‌یک از۳۰ credential شناخته‌شده محلی در فایل‌های قابل ورود به Git پیدا نشد؛ `secret-scan.json`؛ اسکن عمومی entropy/OCR نیست |

SameSite از هدر واقعی `Set-Cookie` بررسی می‌شود؛ WebKit برای cookie گواهی داخلی مقدار متفاوتی در API introspection گزارش کرد. Secure/HttpOnly و ورود واقعی در هر سه موتور بررسی شدند. HTTPX به CA داخلی اعتماد صریح دارد؛ ignoreHTTPS فقط در مرورگرهای localhost آزمون استفاده می‌شود. این شواهد گواهی عمومی ACME نیستند.

## امنیت و محدودیت‌های واقعی

اسکن imageها، صفر Critical در هر چهار image نشان داد. Caddy و DB صفر High؛ API۴۴ و web۴۳ یافته High در بسته‌های OS با `FixedVersion` خالی دارند. خروجی کامل در QA حفظ شده و ریسک آن‌ها قبل از انتشار عمومی باید بازبینی شود؛ صفر آسیب‌پذیری کلی ادعا نمی‌شود. runtime dependency audit npm و pip-audit صفر یافته شناخته‌شده داشتند؛ audit کامل dev شامل۹ High ابزار توسعه است و در runtime کپی نمی‌شود.

استثنای قدیمی CVE-2023-45853 فقط PURL مشخص zlib1g bookworm و با انقضا است؛ [Debian اعلام می‌کند کد MiniZip آسیب‌پذیر در آن binary ساخته نشده](https://security-tracker.debian.org/tracker/CVE-2023-45853). پایه نهایی برنامه‌ها Debian13 است. خطاهای ابتدایی فایل‌cap Caddy، mirror با۴۰۳، timeout زیر رقابت منابع و تلاش بازیابی قطع‌شده، موفق گزارش نشده‌اند؛ اصلاح و بازآزمایی انجام شد.

میزبان۸GiB و Docker Desktop حدود۳٫۷۷GiB دارد؛ آزمون‌های سنگین پشت سر هم اجرا می‌شوند. زمان انتظار fixture کارکردی۱۰ثانیه است؛ مقدار تولید۳ثانیه باقی می‌ماند. انتظار assertion مرورگر کارکردی۱۵ثانیه و workflow۹۰ثانیه است؛ اندازه‌گیری سرعت با Lighthouse جداست. تست کارکردی جای آزمون ظرفیت/latency نیست. [Zod jitless](https://zod.dev/compile) برای رفع probe تولید کد و حفظ CSP فعال شد.

نخستین اجرای کامل Lighthouse روی image نهایی مردود شد: مسیر مدارس یک NO_FCP و یک HTTP500 داشت و میانه دمو۸۵ بود. لاگ API پاسخ settings حدود۳۶٫۸ثانیه را نشان داد؛ در همان بررسی میزبان تنها حدود۵۳۶MiB RAM آزاد داشت. ارتباط قطعی علت با کمبود حافظه اثبات نشده است. خروجی کامل در `lighthouse-first-final-attempt` حفظ شده؛ این اجرا موفق شمرده نمی‌شود. بازآزمایی کامل۱۸دور پس از پایان ابزارهای کیفیت/scan موفق شد؛ امتیاز یا دور منتخب جایگزین معیار میانه۳دور نشده است. نتایج نوسان محیط مشترک را نشان می‌دهند؛ آزمون ظرفیت و پایداری سرور نهایی هنوز لازم است.

## Lighthouse نهایی

Lighthouse13.5.0، Edge headless، پروفایل mobile با throttling شبیه‌سازی‌شده، هر مسیر۳دور با مرورگر تازه؛ HTTPS مستقل localhost با CA داخلی، محتوای fixture فقط در DB آزمون. فایل‌های خام تمام دورها در `docs/qa/step10/lighthouse` موجودند. این نتیجه جای staging عمومی، assets نهایی، ترافیک واقعی و CWV میدانی را نمی‌گیرد.

| مسیر | میانه Performance | SEO | Accessibility | Best Practices |
|---|---:|---:|---:|---:|
| `/` | ۹۵ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `/features` | ۹۸ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `/solutions/schools` | ۹۷ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `/demo` | ۹۴ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `/learn/articles/seo-article` | ۹۸ | ۱۰۰ | ۱۰۰ | ۱۰۰ |
| `/learn/videos/seo-video` | ۹۸ | ۱۰۰ | ۱۰۰ | ۱۰۰ |

## معیارهای پذیرش و فایل‌ها

R091/R092/R094/R097/R099 و بخش محلی R098: build، سلامت، محدودیت مجوز و شبکه، migration مستقل، persistence، auth/RBAC/CSRF، backup احرازشده و restore بدون overwrite موفق. R093 فقط برای TLS/CSP محلی پذیرفته؛ ACME عمومی باز است. R095 تعریف CI و actionlint موفق؛ اجرای runner واقعی باز است. R096 و بخش عمومی R098 به دامنه/سرور و مانور نهایی وابسته‌اند. R036/R076 در proxy و worker واقعی آزموده شدند. Backend اصلی و شمار داده توسعه حفظ شدند؛ تطبیق شاهد اولیه با شمار نهایی در `main-data-final.json` و migration head0007 است.

فهرست دقیق تمام فایل‌های ایجادشده/تغییرکرده در [change-manifest.json](qa/step10/change-manifest.json) آمده است؛ فایل موجود کاربر `apps/web/next-env.d.ts` مستثنی است. گروه‌های اصلی:

- زیرساخت: `compose.production.yaml`، `compose.yaml`، Dockerfileهای API/web/Caddy/Postgres، `.dockerignore`، `.env.production.example`، `.github/workflows/ci.yml`، `infrastructure/caddy/*`، `infrastructure/security/trivy-ignore.yaml` و چهار واحد `infrastructure/systemd/*`.
- API: config/middleware/main، `core/trusted_proxy.py`، `commands/maintenance.py`، `commands/prepare_restore.py`، `operations/backup_crypto.py` و نسخه/lock.
- وب: proxy، JSON-LD، health/live و health/ready، `lib/validation.ts`، پنج مصرف‌کننده Zod و bridge رسانه.
- آزمون و عملیات: `scripts/production.py`، `test-production.py`، `test-production-browser.py`، `run-quality.py`، `check-secrets.py`، `lighthouse-production.mjs`، `capture-browser-quality.py`، `test-regression.ps1`؛ تنظیم Playwright و تست‌های API/مرورگر و helperهای تست.
- مستندات: همین گزارش، contract/decisions، سه runbook، README، معماری، دیتابیس، API، matrix و plan؛ شواهد خام و خلاصه‌ها در `docs/qa/step10`.

## پذیرش وابسته به محیط نهایی

دامنه/سرور، DNS و ACME واقعی، مانور staging/backup با حجم واقعی، RPO/RTO، مقصد offsite و نگهداری آرشیو۷روز پیشنهادی، اتصال هشدار عملیاتی، محتوای حقوقی/تماس/لوگو و تصویر واقعی، اجرای GitHub Actions و داده میدانی CWV هنوز باز هستند. سیاست درخواست۱۸۰روز و analytics با رضایت اختیاری مصوب کاربر است؛ این تأیید جای تصویب نگهداری backup را نمی‌گیرد. index/analytics محیط اصلی همچنان پیش‌فرض خاموش‌اند؛ فعال‌سازی در localhost فقط برای سنجش بوده است.

## مستندات و اجرای دوباره

[استقرار](production-runbook.md)، [backup/restore](backup-restore-runbook.md)، [امنیت](security-runbook.md)، [قرارداد مرحله۱۰](step-10-contract.md) و [تصمیم‌ها](step-10-decisions.md) مرجع هستند. مسیر شواهد `docs/qa/step10` است. نصب timer یا ارسال اعلان/استقرار سرور واقعی انجام نشده است.

```powershell
pwsh -NoProfile -File scripts/test-backend.ps1 -Phase step10
pwsh -NoProfile -File scripts/test-regression.ps1 -BrowserProject chromium
pwsh -NoProfile -File scripts/test-regression.ps1 -BrowserProject firefox
pwsh -NoProfile -File scripts/test-regression.ps1 -BrowserProject webkit
apps/api/.venv/Scripts/python.exe scripts/test-production.py --env-file .preview/local-production.env --keep
apps/api/.venv/Scripts/python.exe scripts/test-production-browser.py --env-file .preview/local-production.env
apps/api/.venv/Scripts/python.exe scripts/check-secrets.py
```

پیش‌نیاز test DB و build و browserها در runbook آمده است. همه گیت‌های محلی پیش از commit موفق شده‌اند؛ commit محلی این مرحله مجوز انتشار عمومی یا Push محسوب نمی‌شود. namespace و volumeهای ساخته‌شده acceptance پس از ثبت شواهد جمع‌آوری می‌شوند؛ Compose توسعه/تست و سرویس‌های کاربر حذف نمی‌شوند.
