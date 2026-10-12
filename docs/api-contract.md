# قرارداد پیشنهادی API لندینگ

نسخه قرارداد: 0.1 برای بررسی؛ endpointها هنوز ساخته نشده‌اند. Prefix: `/api/v1`. مرجع: R025–078. API متعلق به لندینگ است و قرارداد Backend اصلی ماکان را تغییر نمی‌دهد.

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
