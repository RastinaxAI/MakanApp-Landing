# قرارداد پیشنهادی API لندینگ

نسخه قرارداد مقصد: 0.1؛ مسیرهای سلامت و OpenAPI در STEP4 واقعی شده‌اند و سایر endpointهای این سند برنامه مراحل بعد هستند. Prefix: `/api/v1`. مرجع: R025–078. API متعلق به لندینگ است و قرارداد Backend اصلی ماکان را تغییر نمی‌دهد.

## قرارداد مشترک

JSON با UTF-8، زمان ISO8601 UTC، id داخلی UUID و reference عمومی تصادفی. Request schema با unknown fieldهای غیرمجاز رد می‌شود. Response schema ورودی DB را مستقیم serialize نمی‌کند. پاسخ فهرست:

```json
{"items": [], "pagination": {"page": 1, "page_size": 20, "total": 0, "pages": 0}}
```

این نمونه نمایش قرارداد است، نه داده نهایی. page>=1، page_size بین ۱ و ۱۰۰، پیش‌فرض ۲۰. q حداکثر ۱۰۰ نویسه؛ sort از allowlist، ترتیب tie-break با id. date_from/date_to زمان UTC با date_from<=date_to. فیلتر نامعتبر 422؛ slug ناموجود یا غیرمنتشرشده 404. public query هیچ include_draft ندارد. q فارسی normalize، SQL پارامتری و نتایج محدود.

خطا در تمام مسیرها، حتی validation و unexpected exception:

```json
{"error":{"code":"VALIDATION_ERROR","message":"اطلاعات واردشده را بررسی کنید.","details":[{"field":"phone","code":"INVALID_PHONE","message":"شماره تماس معتبر وارد کنید."}]},"trace_id":"opaque-id"}
```

200 خواندن/ویرایش/ replay امن، 201 ایجاد، 204 logout/delete، 400 ورودی ضداسپم نامعتبر، 401 نشست نامعتبر، 403 نقش/CSRF، 404 غایب/draft، 409 رقابت/slug/idempotency، 413 حجم، 415 MIME، 422 schema، 429 نرخ با Retry-After، 503 DB readiness/ثبت ناممکن، 500 خطای داخلی کلی. جزئیات PII، stack، DB error و تفاوت «email مدیر هست/نیست» بیرون نمی‌رود. trace_id در header و log یکسان و بی‌اطلاعات حساس است.

همه endpointهای پنل no-store. public content در MVP no-store مطابق architecture؛ assets immutable مستقل‌اند. same-origin پشت Caddy؛ CORS wildcard+credentials ممنوع. روش GET هیچ mutation حساس انجام نمی‌دهد.

## API عمومی سایت و وبلاگ

| روش / مسیر | Query / خروجی اصلی | معیار دسترسی |
|---|---|---|
| GET `/site/settings` | برند، تماس عمومی، APP_URL مصوب، navigation و defaults SEO allowlisted | secret/اطلاعات مدیر/analytics credential هرگز خروجی نیست |
| GET `/pages/{slug}` | id، slug، title، sections typed، seo، updated_at | فقط revision عمومی مؤثر؛ includes indexable |
| GET `/features` | visibility، readiness، sort_order؛ q اختیاری | فقط visible/published؛ readiness معتبر |
| GET `/features/{slug}` | عنوان، شرح، readiness، مزایا، تصویر و SEO | شاهد داخلی و draft حذف |
| GET `/audiences` | چهار نقش با slug/title/summary | published |
| GET `/audiences/{slug}` | مسئله، مزیت، body و CTA، SEO | published |
| GET `/faqs` | category، page/page_size؛ question/answer مرتب | فقط عمومی |
| GET `/faq-categories` | slug/title/order | فقط دسته مورد استفاده عمومی |
| GET `/blog` | q/category/tag/audience/sort(newest)/page/page_size | excerpt/cover/estimated_minutes، بدون body حجیم |
| GET `/blog/{slug}` | body_html sanitized، cover، tags/audiences، reviewed/published_at، seo | published یا schedule رسیده |
| GET `/blog/categories` | slug/title/count عمومی | count فقط public |
| GET `/tags` | scope=blog/learn، q | تنها تگ‌های قابل استفاده در محتوای public |
| GET `/seo/entries` | page/page_size، kind=pages/blog/learn/series | فقط canonicalهای indexable منتشرشده، lastmod؛ برای sitemap SSR |

`seo` schema مشترک: title، description، canonical_path، og_media و indexable؛ origin از config مصوب ساخته می‌شود. arbitrary canonical URL فقط برای owner و دامنه allowlisted؛ پیش‌فرض canonical داخلی. URL slug source ثابت و redirects معتبر از `/redirects/{namespace}/{old_slug}` در Next resolve می‌شود؛ redirect loop رد است.

## API عمومی مرکز آموزش

| روش / مسیر | ورودی / خروجی |
|---|---|
| GET `/learn/contents` | type=article/video، audience، category، tag، level، q، sort=newest/popular، page/page_size، featured=true؛ کارت شامل slug/kind/title/summary/cover/readiness انتشار/مدت |
| GET `/learn/contents/{slug}` | detail: sanitized body، headings برای TOC، estimated_minutes یا video، reviewed/published_at، category/tags/audiences، seo، related عمومی |
| GET `/learn/categories` | فهرست visible با تعداد public، sort_order |
| GET `/learn/categories/{slug}` | metadata دسته و contents با pagination/filter مشترک |
| GET `/learn/series` | فهرست published/schedule رسیده، خلاصه و count اعضای عمومی |
| GET `/learn/series/{slug}` | شرح، seo و items مرتب فقط public؛ هر item نوع و URL ثابت |
| POST `/learn/contents/{slug}/views` | anonymous_visit_token کوتاه‌عمر، visible_seconds>=10؛ 204، dedupe روزانه و rate-limit؛ bot حذف |

video detail شامل aparat_video_id، original_url تولیدشده، embed_url تولیدشده از قالب ثابت رسمی، duration_seconds اگر معلوم، upload_date اگر معتبر، transcript اگر واقعی است. input embed_url یا iframe HTML در هیچ مسیر مدیریتی پذیرفته نمی‌شود. URL رسمی/regex ID آپارات باید در STEP7 با مستند یا ویدیوی واقعی verify شود؛ در این تحویل قالب endpoint آپارات حدس زده نشده است. metadata دستی پیش‌فرض؛ GET به URL آزاد و fetch thumbnail نامعتبر ممنوع.

سکشن آموزش اصلی از featured=true، page_size=3 می‌خواند؛ شرط تعداد >=1. prev/next فقط در context مجموعه مشخص و بین اعضای عمومی؛ related draft حذف می‌شود. video/article اشتباه در مسیر وب 404 می‌دهد تا محتوای یکسان دو URL indexable نداشته باشد.

## ثبت دمو و تماس

### POST `/leads/demo`

Header الزامی `Idempotency-Key`: مقدار تصادفی حداقل ۱۲۸ بیت، در retry حفظ می‌شود. body:

| فیلد | نوع / قاعده پیشنهادی |
|---|---|
| full_name | string trim، ۲–۱۲۰ نویسه، الزامی |
| phone | string، ارقام فارسی/عربی normalize، شماره معتبر؛ ایران `09…` یا `+98…` پشتیبانی می‌شود |
| school_name | string trim، ۲–۱۸۰، الزامی |
| city | string <=100، اختیاری |
| job_title | string <=100، اختیاری |
| student_count_range | enum: under_100/100_299/300_599/600_999/1000_plus یا null |
| message | string <=3000، اختیاری؛ متن ساده، HTML اجرا نمی‌شود |
| consent | literal true، checkbox بدون انتخاب پیش‌فرض |
| consent_policy_version | نسخه فعال server؛ mismatch برای نمایش متن جدید 409 |
| source | channel و utm_source/medium/campaign، referrer_host؛ طول محدود، no full URL |
| form_token | token تصادفی هر فرم، در retry ثابت |
| website | honeypot خالی؛ نام فیلد در دسترس کاربر/reader نباشد |

consent_at از ساعت server است، نه ورودی قابل جعل. فیلدهای source الزامی نیستند و اعتبار attribution صددرصد ادعا نمی‌شود. نرخ پیشنهادی ۵ درخواست/۱۰min/IP hash به‌علاوه سقف روزانه؛ مقدار نهایی بعد load/spam test تنظیم می‌شود.

پس از commit پاسخ 201: `{"reference_id":"opaque-reference","status":"received","replayed":false}`. same key/body در TTL پیشنهادی ۲۴h پاسخ 200 با همان reference و replayed=true؛ تغییر body همان key 409. unique form token و fingerprint اتمیک بازه کوتاه از duplicate با key جدید جلوگیری می‌کند؛ پاسخ replay داده دیگران یا body قبلی را افشا نمی‌کند. آزمون همزمان key یکسان و متفاوت باید فقط یک lead بسازد. پس از انقضای TTL ضمانت dedupe فقط در بازه guard است، نه «exactly once ابدی».

پاسخ 429 قبل تکرار submit پیام فارسی و زمان تلاش دوباره دارد. honeypot پر پاسخ 400 کلی و بدون ذخیره؛ موفقیت دروغین داده نمی‌شود. CAPTCHA در صورت اضافه‌شدن token و server verification واقعی لازم دارد.

### POST `/contact`

همان قرارداد idempotency/ضداسپم. body: name ۲–۱۲۰، contact_type=phone/email، contact_value معتبر <=254، subject ۲–۱۶۰، message ۱۰–۵۰۰۰، consent=true، consent_policy_version، source، form_token و website. رضایت تماس عمومی تصمیم تکمیلی حریم خصوصی است. خروجی 201/200 همان ساختار دمو. ایمیل normalize domain؛ شماره normalize server. reference عمومی هیچ حق دسترسی به PII ایجاد نمی‌کند.

## ورود مدیر

| روش / مسیر | schema و رفتار |
|---|---|
| GET `/admin/auth/csrf` | pre-login challenge یا token متصل به نشست؛ no-store؛ origin مجاز؛ expiry کوتاه |
| POST `/admin/auth/login` | email/password و در صورت policy mfa_code؛ X-CSRF-Token/Origin؛ پاسخ عمومی 200 با profile مجاز، تنظیم cookie/rotation |
| POST `/admin/auth/logout` | نشست+CSRF؛ revoke server و پاک cookie؛ 204 |
| GET `/admin/auth/me` | id/email/role/capabilities؛ inactive/expired برابر 401 |
| GET `/admin/auth/sessions` | نشست‌های خود؛ owner می‌تواند account مشخص را مدیریت کند |
| DELETE `/admin/auth/sessions/{id}` | revoke نشست خود/owner؛ CSRF، audit |
| PATCH `/admin/auth/password` | current_password/new_password، CSRF، reauth؛ revoke بقیه نشست‌ها |
| GET/POST/PATCH `/admin/accounts` و `/{id}` | فقط owner؛ دعوت/ایجاد توسط command یا پنل owner، بدون signup عمومی؛ role/active و reset امن |

login throttle پیشنهادی ۵ تلاش/۱۵min/IP+email hash، بدون account lock دائمی قابل سوءاستفاده؛ پاسخ عمومی واحد. cookie مشخصات architecture، رمز Argon2id. reset لینک ایمیل بدون provider ساخته/ادعا نمی‌شود؛ owner command با audit مسیر اولیه است. MFA اگر تصویب/قابل اجرا شود: `/admin/auth/mfa/enroll`, `/confirm`, `/disable`, `/recovery-codes` همراه reauth، token و آزمون؛ این endpointهای مشروط تا اجرا capability اعلام نمی‌کنند.

## RBAC پیشنهادی

| عملیات | owner | editor | sales | مهمان |
|---|---|---|---|---|
| CMS، blog، learn، FAQ، رسانه | بله | بله | خیر | فقط GET public |
| تنظیمات عمومی/SEO سراسری، accounts | بله | خیر | خیر | فقط allowlist settings |
| lead/contact، notes، assignment/status | بله | خیر | بله | فقط POST فرم |
| audit/خلاصه عملیاتی/حذف PII | بله | خیر | فقط metrics فروش مجاز، بدون audit امنیتی | خیر |

permission در endpoint و query projection enforce می‌شود. owner بدون reauth به secret/session دیگران دسترسی plaintext ندارد؛ account آخرین owner قابل حذف/غیرفعال نیست.

## CMS و رسانه مدیریتی

برای منابع زیر، مگر خلافش ذکر شود: GET collection/detail، POST collection، PATCH detail و DELETE detail. list با page/page_size/q/status/date. DELETE برای content یعنی archive/unpublish صریح، نه soft-delete پنهان؛ resource استفاده‌شده 409. PATCH به `If-Match: row_version` نیاز دارد.

| resource در `/admin` | fields / عمل اختصاصی |
|---|---|
| `/pages` | slug/type/title/seo/sections[{type,schema_version,sort_order,content}]؛ sectionهای typed و media refs |
| `/features` | title/body/readiness/evidence_reference/verified_at/visibility/order/seo |
| `/audiences` | slug/title/pain_points/benefits/body/CTA/seo |
| `/faqs` و `/faq-categories` | question/sanitized answer/category/order؛ category CRUD |
| `/blog/posts` | title/slug/excerpt/body/cover/category/tags/audiences/estimated_minutes/seo |
| `/blog/categories` و `/tags` | title/slug/description/order؛ unique و delete RESTRICT |
| `/learn/contents` | title/slug/kind/summary/body/cover/category/tags/audiences/level/estimated_minutes/related/seo |
| `/learn/contents/{id}/video` | PUT آپارات ID یا URL معتبر، duration/cover/transcript/upload_date دستی؛ نوع video لازم |
| `/learn/categories` | title/slug/order/visibility |
| `/learn/series` | title/slug/description/seo/items[{content_id,position}]؛ reorder تراکنشی |
| `/media` | GET list/detail، POST multipart تصویر، DELETE unused، PATCH alt/visibility مجاز؛ metadata نه arbitrary path |
| `/media/{id}/file` | GET authenticated برای private؛ public asset مسیر `/media/{key}` فقط وقتی public |
| `/settings` | GET/PATCH allowlist schema، owner فقط؛ credentials ممنوع |

content resources به شکل مشترک دارای GET `/{id}/revisions`، GET `/{id}/preview`، POST `/{id}/publish`، POST `/{id}/schedule` با revision_id و publish_at آینده UTC، POST `/{id}/cancel-schedule` و POST `/{id}/unpublish` هستند. preview فقط مدیر نقش مربوط، noindex/no-store؛ entity_idها UUID هستند و slug فقط public lookup است. publish sanitization/evidence/media checks را دوباره اجرا می‌کند. revision+audit در یک transaction؛ role متفاوت 403، stale If-Match برابر 409.

uploads پیشنهادی JPEG/PNG/WebP/AVIF تا ۵MB و محدودیت pixel برای decompression bomb؛ sniff/redecode تصویر، EXIF حذف، filename تصادفی، no path traversal. original_filename فقط برای نمایش escaped. SVG/HTML/JS و ویدیوی خام ممنوع. این limits تصمیم مهندسی قابل بازبینی STEP6 هستند. media private از static عمومی serve نمی‌شود.

## CRM، audit و آمار پنل

| روش / مسیر | رفتار |
|---|---|
| GET `/admin/dashboard` | summary با projection role: شمارش leads/new و محتوا، بدون PII در aggregate |
| GET `/admin/leads` و `/{id}` | q/status/date/source/assigned_to، page/page_size؛ فقط owner/sales |
| PATCH `/admin/leads/{id}` | status/assigned_to/closed_outcome، If-Match؛ history/audit اتمیک |
| GET/POST `/admin/leads/{id}/notes` | body ۱–۴۰۰۰ متن ساده؛ author server؛ خصوصی |
| GET `/admin/leads/{id}/history` | تاریخچه مرتب و صفحه‌بندی |
| GET/PATCH `/admin/contact-messages` و `/{id}` | فیلتر/وضعیت/assignment مثل leads |
| GET/POST `/admin/contact-messages/{id}/notes` | همان schema یادداشت |
| GET `/admin/contact-messages/{id}/history` | تاریخچه مجاز |
| GET `/admin/audit-logs` | فقط owner، action/actor/entity/date/page؛ log append-only |
| GET `/admin/metrics` | بازه/channel و KPI واقعی با denominator/data_availability |
| DELETE `/admin/leads/{id}/personal-data` یا contact متناظر | owner+reauth+CSRF؛ policy purge هماهنگ، audit بی‌PII |

ارسال ایمیل/پیام‌رسان/SMS endpoint پیش‌فرض نیست؛ ثبت لید مجوز ارسال پیام خودکار ایجاد نمی‌کند. workflow پنل برای پاسخ انسانی تیم فروش است. integration آینده به provider و مجوز واقعی وابسته است.

## سلامت، events و docs

GET `/health/live` برای زنده بودن فرآیند؛ GET `/health/ready` با بررسی DB و migration، 200/503 بدون جزئیات اتصال. Next مسیر health داخلی مستقل دارد و Compose هر دو را چک می‌کند. OpenAPI در development؛ production مستندات مدیریتی owner یا شبکه محدود، هرگز حفاظت API را جایگزین نمی‌کند.

POST `/events`: event_name از hero_demo_click/navigation_cta_click/feature_tab_view/demo_form_start/demo_form_submit_success/demo_form_submit_error/contact_click/faq_expand؛ properties فقط placement/feature_key/error_code/channel. success form event ترجیحاً در server بعد commit تا trustworthy باشد و replay دوباره count نشود؛ view/interaction سمت client. rate-limited و payload محدود؛ field دلخواه/phone/email/message/URL query/token رد. events با trace رسمی بدون body حساس؛ consent/anonymous session policy قبل production تعیین می‌شود.

## معیار پذیرش قرارداد

OpenAPI واقعی پس از ساخت جایگزین ابهام‌ها می‌شود و type generation باید با این تصمیم‌ها تطبیق یابد. HTTPX integration با PostgreSQL: validation، success، draft، schedule boundary، role matrix، CSRF، rate، duplicate concurrency، XSS، upload MIME/size، rollback audit و sanitized output. Playwright فراخوانی همین API واقعی را بررسی می‌کند؛ fixture موفقیت یا Mock API به معنی acceptance نهایی نیست.

## قرارداد اجراشده STEP4

نسخه برنامه API برابر0.4.0 است. اکنون فقط GET `/api/v1/health/live`، GET `/api/v1/health/ready` و OpenAPI/Swagger توسعه وجود دارند. ready در DB قطع/ناموجود/schema قدیمی503 و در head فعلی200 است؛ live مستقل از DB200 می‌ماند. پاسخ خطای واقعی دارای details آرایه، trace_id همسان header تولیدشده server و no-store است. 422/404/405/500/503 و redaction با HTTPX بررسی شدند. OpenAPI واقعی در `docs/qa/step4/openapi.json` snapshot شده است. docs در staging/production404 می‌دهد؛ CORS wildcard یا اعتماد proxy header فعال نیست.

PaginationQuery مشترک با page>=1/page_size<=100 و unknown-field rejection ساخته و تست شده، اما endpoint فهرست/فیلتر CMS هنوز وجود ندارد. هیچ endpoint نمایشی برای site/pages/leads/admin/learn ساخته نشده؛ مسیرهای آن‌ها تا مراحل بعد404 هستند. جدول یا schema پایه حساب مدیر به معنی احراز هویت اجراشده نیست.

## قرارداد فعال مرحله ۵ — نسخه API 0.5.0

این بخش نسبت به طرح endpointهای بالا مرجع وضعیت فعلی است؛ مسیرهای عمومی CMS/آموزش/lead هنوز موجود نیستند. snapshot واقعی OpenAPI در `qa/step5/openapi.json` است. همه مسیرهای زیر `/api/v1/admin` هستند و خروجی‌ها Pydantic response schema دارند. errorهای 401/403/404/409/413/422/429/503 در OpenAPI ثبت‌اند.

| روش / مسیر | schema / خروجی | دسترسی و اثر |
|---|---|---|
| GET `/auth/csrf` | csrf_token؛ cookie challenge پیش از ورود یا token مشتق از نشست | محدودیت نرخ، no-store؛ challenge پنج دقیقه |
| POST `/auth/login` | email/password/mfa_code اختیاری → Profile | challenge+Origin+CSRF؛ cookie پس از commit؛ خطای عمومی 401 |
| GET `/auth/me` | id/email/role/capabilities/mfa_enabled | نشست معتبر و active |
| POST `/auth/logout` | 204 | نشست+Origin+CSRF، revoke+audit |
| GET `/auth/sessions` | SessionInfo[]؛ query admin_id اختیاری | خود یا owner برای حساب دیگر؛ حداکثر۱۰۰ نشست فعال |
| DELETE `/auth/sessions/{session_id}` | 204 | خود/owner، CSRF؛ هدف غیرمجاز 404؛ current cookie پاک می‌شود |
| PATCH `/auth/password` | current_password/new_password/mfa_code → 204 | رمز جدید۱۵–۱۲۸؛ reauth؛ revoke تمام نشست‌ها |
| GET `/accounts` | PaginatedResponse[Account]، page/page_size | owner؛ page_size۱–۱۰۰، پیش‌فرض۲۰؛ ترتیب created_at/id |
| POST `/accounts` | email/password/role/current_password/mfa_code → Account 201 | owner+reauth؛ تکراری409؛ بدون signup عمومی |
| PATCH `/accounts/{account_id}` | role/is_active اختیاری+reauth → Account | owner؛ آخرین مالک409؛ revoke و audit تغییر واقعی |
| GET `/audit-logs` | PaginatedResponse[AuditEvent] | owner؛ id/action/actor_id/entity_id/created_at؛ بدون payload حساس |
| GET `/dashboard` | metrics عدد واقعی، modules content/leads=pending | active_admins فقط owner؛ pages فقط capability محتوا |
| POST `/auth/mfa/enroll` | current_password/mfa_code → secret/otpauth_url | مدیر خود؛ رمز دوباره؛ اگر فعال409 |
| POST `/auth/mfa/confirm` | code شش‌رقمی → recovery_codes | pending معتبر؛ replay/rate guard؛ revoke تمام نشست‌ها |
| POST `/auth/mfa/disable` | reauth → 204 | رمز+عامل دوم اگر فعال؛ MFA/recovery حذف؛ revoke تمام نشست‌ها |
| POST `/auth/mfa/recovery-codes` | reauth → recovery_codes | MFA فعال و رمز+عامل دوم؛ قبلی‌ها بی‌اعتبار |

login password۱–۱۲۸ برای سازگاری خطای عمومی؛ رمز جدید۱۵–۱۲۸ است. email normalized trim/lower و حداکثر۲۵۴ است. MFA login اختیاری در schema ولی برای مدیر enabled الزامی است؛ code field می‌تواند TOTP یا recovery باشد. تمام requestها extra fields را رد می‌کنند. body تغییر حداکثر۱۶KiB است. تغییر role/active خود نشست را می‌بندد؛ ورود دوباره لازم است. role reset endpoint ساخته نشده؛ operator CLI recovery مرجع است. account q/filter تا نیاز CMS/CRM اضافه نشده و جعل نمی‌شود.

cookie توسعه non-Secure فقط loopback و cookie تولید `__Host-*` با Secure است؛ HTTPX حالت production را با HTTPS بررسی می‌کند، اما TLS واقعی هنوز مرحله۱۰ است. rate limits و کلیدها در راهنمای مدیر ثبت‌اند. درخواست مستقیم API و bridge توسعه قرارداد یکسان JSON/trace/Retry-After دارند؛ headerهای غیرمجاز forward نمی‌شوند.

## قرارداد فعال مرحله۶ — نسخه 0.6.0

قرارداد auth مرحله۵ حفظ شده است. جدول زیر زیر پیشوند `/api/v1` است؛ OpenAPI واقعی و schemaها در QA همین مرحله ثبت می‌شوند. owner/editor محتوا و رسانه را مدیریت می‌کنند؛ sales403 و مهمان401. settings مدیریتی فقط owner است. همه mutations نیازمند Origin/CSRF معتبر هستند؛ content/settings به If-Match نسخه جاری نیاز دارند (نبود428، stale409).

| روش/مسیر | ورودی/خروجی و اثر |
|---|---|
| GET `/pages/{slug}` | PublicContent؛ فقط snapshot مؤثر home/page؛ unpublished/archive/invisible404 |
| GET `/features`, `/audiences`, `/faqs` | PaginatedResponse[PublicContent]؛ page/page_size<=100، q، category_id مناسب FAQ؛ فقط عمومی |
| GET `/features/{slug}`, `/audiences/{slug}`, `/faqs/{slug}` | PublicContent؛ evidence_reference مدیریتی حذف می‌شود |
| GET `/site/settings` | GeneralSettings + SeoSettings + row_version؛ فقط allowlist عمومی |
| GET `/faq-categories` | دسته‌های دارای FAQ مؤثر عمومی؛ navigation bounded |
| GET `/admin/content` و aliases `/admin/pages`, `/admin/features`, `/admin/audiences`, `/admin/faqs` | PaginatedResponse[AdminContent]؛ kind، status، q و category_id؛ ترتیب sort_order/id |
| POST `/admin/{alias}` | ContentInput discriminated payload →201 AdminContent؛ draft واقعی |
| GET/PATCH `/admin/{alias}/{id}` | خواندن working snapshot / ویرایش immutable revision جدید با If-Match |
| DELETE `/admin/{alias}/{id}` | archive+قطع publication/schedule؛ تاریخچه حذف نمی‌شود |
| GET `/admin/{alias}/{id}/preview?revision_id=` | snapshot انتخابی فقط همین entity؛ احراز هویت و no-store؛ نامعتبر404 |
| GET `/admin/{alias}/{id}/revisions` | تاریخچه صفحه‌بندی‌شده، created/published/actor، ترتیب revision_no نزولی |
| POST `/admin/{alias}/{id}/publish` | RevisionAction revision_id؛ validation/readiness/alt، جایگزینی public pointer و لغو schedule |
| POST `/admin/{alias}/{id}/schedule` | revision_id و publish_at با timezone؛ زمان گذشته/بدون offset422؛ UTC ذخیره می‌شود |
| POST `/admin/{alias}/{id}/cancel-schedule`, `/unpublish` | If-Match؛ لغو برنامه / قطع هر دو publication pointers |
| GET/POST `/admin/faq-categories` | PaginationQuery → PaginatedResponse[Category] / CategoryInput→201 Category |
| PATCH/DELETE `/admin/faq-categories/{id}` | CategoryInput /204؛ category referenced در هر revision409 |
| GET/POST `/admin/media` | pagination / multipart file+alt_text→201 MediaInfo؛ فایل واقعی private WebP |
| PATCH/DELETE `/admin/media/{id}` | alt_text+make_public /204؛ FK reference مانع حذف409 |
| GET `/admin/media/{id}/file` | binary WebP محافظت‌شده؛ no-store/nosniff، بدون optimizer عمومی |
| GET `/media/{id}` | ImageRef عمومی با id/width/height/alt؛ filename/storage_key/actor ندارد |
| GET `/media/{id}/file` | public WebP یا404؛ private scheduled قبل زمان مخفی |
| GET/PATCH `/admin/settings` | SettingsOutput / SettingsInput general+seo، If-Match؛ فقط owner، extra/secret fields422 |

alias یک endpoint واقعی ثبت‌شده برای هر resource است؛ route literal `{resource}` برای client لازم نیست. نوع محتوا discriminated home/page/feature/audience/faq، فیلدهای ناشناخته رد و type immutable است. slug پس از اولین publish/schedule ثابت می‌ماند؛ duplicate409. body JSON256KiB، تصویر۵MiB با سربار bounded؛ 413 حجم و415 نوع نامعتبر. تمام errors ErrorResponse و trace_id دارند و payload/credential در log نیست.

AdminContent شامل revisionها/row_version و publication_state مشتق از ساعت سرور (draft/published/scheduled/archived) است؛ PublicContent از همان revision immutable انتخاب می‌شود و public media تنها ImageRef دارد. HTML صرفاً خروجی sanitized سرور است؛ src تصویر فقط مسیر UUID داخلی و FK موجود. SEO همان snapshot منتشر می‌شود. visibility=false و archive، public را حذف می‌کنند. API public داده آموزشی/حساب اپ اصلی ندارد. مقاله/ویدیو/lead endpoints مرحله۷/۸ همچنان فعال نیستند.

## الحاق مرحله۷ — API0.7.0

- GET /learn/contents، /blog/articles، /learn/series: pagination و sort=newest/popular؛ q متن/عنوان/خلاصه، audience، topic، level، category slug، tag slug؛ type=article/video و featured مخصوص آموزش. page_size<=100؛ sort/type/status نامعتبر422. فهرست، متن کامل و transcript را ارسال نمی‌کند؛ جزئیات متن کامل دارند.
- GET /learn/contents/{slug}، /blog/articles/{slug}، /learn/series/{slug}: snapshot عمومی موثر؛ draft/پنهان/بایگانی404. related/items/series/previous/next فقط عمومی؛ query series مجموعه را انتخاب می‌کند.
- GET /learn/categories و /learn/tags: paginated، domain learn/blog؛ فقط taxonomy مرتبط با محتوای عمومی. GET /learn/categories/{slug}: دسته عمومی یا404.
- /admin/learn/contents، /admin/learn/series، /admin/blog/articles: همان CRUD، revisions، preview، publish، schedule، cancel-schedule، unpublish و archive مرحله۶؛ content capability، CSRF و If-Match لازم‌اند. kind با resource سازگار باشد؛ تغییر نوع ممنوع.
- /admin/learn/categories و /admin/learn/tags: GET paginated، POST، PATCH/{id} و DELETE/{id}؛ مالک/ویرایشگر؛ domain/slug پس از ثبت ثابت، حذف referenced409.
- GET /learn/views/{id}/ticket و POST /learn/views/{id}: ticket امضاشده، Origin مجاز، حداقل۲۰ثانیه و حداکثر۱۰دقیقه، کنترل bot، حذف تکرار روزانه و throttle مشترک. خروجی ticket یا counted واقعی؛ مجموع views در projection عمومی. view برای مجموعه پذیرفته نمی‌شود.

تمام پاسخ‌های عمومی schema مستقل OpenAPI دارند. مقدار payload.toc و ابعاد inline image محاسباتی‌اند؛ در ورودی ذخیره toc ارسال نشود. body_html/transcript_html تا۶۴هزار کاراکتر، درخواست مدیریتی۲۵۶KiB، view۱۶KiB، تصویر همان۵MiB است. iframe/embed_url ورودی مجاز نیست؛ aparat_id لینک HTTPS یا ID را به شناسه normalize می‌کند. منابع/CTA HTTPS یا مسیر داخلی امن. ناسازگاری domain/reference و metadata ناقص422، slug duplicate/stale409، If-Match مفقود428 و throttle429 با Retry-After.
# افزوده مرحله ۸ — فرم‌ها و CRM

| روش | مسیر `/api/v1` | مجوز و نتیجه |
| --- | --- | --- |
| GET | `/forms/token?kind=demo\|contact` | عمومی، token/consent_version/consent_text/retention_days/expires_in |
| POST | `/leads/demo` | عمومی با Origin معتبر؛ نام، phone، school_name، city/job_title/student_count_range/message اختیاری |
| POST | `/contact` | عمومی با Origin معتبر؛ full_name/contact_method/contact_value/subject/message |
| GET | `/admin/leads` | owner/sales؛ q/kind/status/source/assigned_to/date_from/date_to/include_purged/page/page_size |
| GET | `/admin/leads/assignees` | owner/sales؛ فقط حساب‌های فعال owner/sales |
| GET | `/admin/leads/metrics` | owner/sales؛ آمار واقعی cohort و source، بدون PII |
| GET/PATCH | `/admin/leads/{uuid}` | owner/sales؛ PATCH نیازمند CSRF و If-Match؛ status/outcome/assigned_to |
| GET/POST | `/admin/leads/{uuid}/notes` | owner/sales؛ GET صفحه‌بندی، POST متن ساده body و If-Match/CSRF |
| GET | `/admin/leads/{uuid}/history` | owner/sales؛ صفحه‌بندی تغییرات بدون متن خصوصی |

هر POST عمومی همچنین consent=true، consent_version=`2026-10-13-v1`، form_token، idempotency_key UUIDv4، source allowlist و website خالی دارد. پاسخ 201 `{reference_id,status:"received"}` فقط پس از commit، retry معتبر همان مرجع. کلید مشترک با body متفاوت 409؛ duplicate همسان در ۲۴ ساعت با کلید تازه یک رکورد. خطاهای یکپارچه 403/409/413/422/429/503 و Retry-After؛ مدیر فاقد مجوز403، مهمان401، نسخه غایب428. زمان‌های فیلتر نیازمند timezone؛ پایان بازه غیرشامل. فهرست و تاریخچه دارای PaginationMeta استاندارد هستند. مسیر عمومی lookup رکورد وجود ندارد. OpenAPI از schema واقعی تولید می‌شود؛ قرارداد کامل در [راهنمای CRM](crm-runbook.md).
