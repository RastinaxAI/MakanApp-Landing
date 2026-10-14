# برنامهٔ فنی و اجرایی V2 — پیشنهاد پس از STEP 0

> به‌روزرسانی مجوز: کاربر پس از ممیزی، ادامهٔ همهٔ مراحل را بدون توقف تأیید کرده است. شرط‌های توقف/اجازه در متن تاریخی زیر دیگر فعال نیستند؛ کنترل کیفیت و حفظ داده همچنان الزامی است. وضعیت اجرای واقعی در `v2-execution-log.md` ثبت می‌شود.

این سند **پیشنهاد** است؛ هیچ موتور صفحه‌ساز، مدل CRM، endpoint یا Migration جدیدی در ممیزی نصب/اجرا نشده است. شروع هر مرحله، تأیید جداگانهٔ کاربر را لازم دارد.

## Reuse Matrix — چه چیزی حفظ می‌شود؟

| دارایی فعلی | شاهد در کد | تصمیم ارتقا |
|---|---|---|
| Page و PageRevision | `apps/api/app/models/content.py` | همان هویت صفحه، slug، revision، draft/published و row_version حفظ شود |
| سرویس CMS و انتشار | `services/cms.py` | افزودن schema/validation سند V2 به همان مسیر ذخیره؛ CMS موازی ساخته نشود |
| ContentEditor و CmsRenderer | `features/cms/editor.tsx` و `renderer.tsx` | فرم قدیمی و Renderer سازگار تا تبدیل هر صفحه باقی بمانند |
| تاریخچه و Preview | `revisions-panel.tsx` و admin preview | UI پیشرفته روی چرخهٔ نسخهٔ موجود؛ restore-to-draft افزوده شود |
| MediaAsset و مراجع رسانه | `models/cms.py` و `services/media.py` | Media Library موجود به Canvas متصل شود؛ upload/storage دوم لازم نیست |
| Tiptap و Sanitization | `rich-editor.tsx` و `html_safety.py` | RichText widget از همین دو استفاده کند |
| کامپوننت‌های عمومی | Container، Button، Tabs، FAQ، CTA، MediaImage | هستهٔ rendering مشترک؛ ترکیب‌بندی اختصاصی با نسخهٔ قابل ویرایش |
| Design Tokens و لوگو | `styles/tokens.css`، `public/brand` | برند مصوب حفظ؛ تغییر ترکیب/نوع/فاصله در STEP 1 برای تأیید |
| PublicPage و URLها | مسیرهای `(public)`، `[slug]` و metadata | مسیر و SEO حفظ؛ dispatch بین سند قدیمی و V2 |
| مرکز آموزش | learning models/services و Public Library | مقاله/ویدیو/series دوباره ساخته نشوند؛ ArticleList/Aparat به API موجود متصل شوند |
| RequestForm و API دمو/تماس | `features/leads/request-form.tsx`، routes/leads.py | widgetها همین قرارداد را استفاده کنند؛ Lead Capture دوم ساخته نشود |
| Lead/LeadReceipt | `models/leads.py` | شناسه و retry/dedupe فعلی حفظ؛ توسعهٔ مدیریت و روابط روی همین Lead |
| LeadNote/LeadHistory | `models/leads.py` | تاریخچه حذف نشود؛ در timeline یکپارچه نمایش داده شود |
| Assignment/RBAC/If-Match | `services/leads.py`، `services/auth.py` | توسعه به فرصت/فعالیت، با سیاست مشاهدهٔ تیم فروش مصوب |
| OTP/MFA/Session/Audit | auth/otp services و admin shell | Auth دوم یا حساب وابسته به backend اصلی ساخته نشود |
| MeliPayamak Provider | `services/sms.py` | credentials و transport واقعی حفظ؛ event templates و outbox جدید برای CRM |
| Analytics/SEO | services و features متناظر | رضایت مستقل، metadata، canonical، sitemap و noindex حفظ شوند |
| Docker/CI/Backup/Restore | Compose، workflows، `scripts/production.py` | توسعهٔ gateها؛ بدون حذف volume یا bootstrap دوبارهٔ داده |

## انتخاب موتور ویرایشگر

مقایسه با منابع اصلی در تاریخ ممیزی انجام شد. تناسب/هزینه‌های زیر **ارزیابی معماری این پروژه** است، نه ادعای benchmark یا نتیجهٔ POC.

| گزینه | توان مستند | تناسب با کد واقعی | هزینه و ریسک |
|---|---|---|---|
| Craft.js | React component، DnD و state قابل serialization | کنترل بسیار زیاد روی UI اختصاصی، reuse کامپوننت‌ها | ساخت Inspector، responsive model، ابزارها و render adapter بر عهدهٔ پروژه؛ وابستگی editor باید از bundle عمومی جدا شود |
| GrapesJS Core | مدل HTML-like، blocks، layers، storage و Style Manager | آزادی بالای styling و ابزارهای آماده | تبدیل React form/SEO/shared renderer به قرارداد HTML پیچیده‌تر؛ JS/CSS آزاد باید محدود شود؛ export HTML نباید منبع اصلی داده گردد |
| Puck Core | React components، nested layouts، config fields، viewports و مسیر RSC | نزدیک‌ترین گزینه به React/Tailwind/CMS موجود و reuse SSR | responsive override، styling حرفه‌ای، resize و ابزارهای خاص نیازمند توسعه و POC‌اند؛ تغییر اندازهٔ viewport به‌تنهایی responsive editing نیست |
| توسعهٔ کامل Canvas اختصاصی | کنترل کامل بر قرارداد | مالکیت کامل و انعطاف | هزینهٔ زیاد DnD، keyboard، selection، undo و resize؛ بدون دلیل اثبات‌شده انتخاب اول نیست |
| Tiptap موجود | ویرایش متن غنی | بهترین reuse برای RichText | جای موتور page layout نیست |

Craft.js در releaseهای خود پشتیبانی React 19 را اعلام کرده است؛ این به‌تنهایی تأیید سازگاری کامل با React 19.3 و Next 16.4 این پروژه نیست. [Overview](https://craft.js.org/docs/overview/)، [Releases](https://github.com/prevwong/craft.js/releases).

GrapesJS ابزار مدیریت Style را مستند کرده و مدل آن بر ساختار HTML-like است. بررسی امنیت plugin/telemetry و هماهنگی React فرم‌ها در صورت انتخاب لازم خواهد بود. [Introduction](https://grapesjs.com/docs/)، [Style Manager](https://grapesjs.com/docs/modules/Style-manager.html).

Puck Core با مجوز MIT و کامپوننت‌های React معرفی شده و برای nested layout، RSC و preview در iframe مستندات دارد. سرویس Cloud یا AI آن برای این پروژه لازم نیست. [Introduction](https://puckeditor.com/docs)، [Nested Layout](https://puckeditor.com/docs/integrating-puck/multi-column-layouts)، [RSC](https://puckeditor.com/docs/integrating-puck/server-components)، [Viewports](https://puckeditor.com/docs/integrating-puck/viewports).

**پیشنهاد اولیه: Puck Core برای POC اصلی و Craft.js به‌عنوان گزینهٔ جایگزین.** انتخاب قطعی، version pin و نصب پس از STEP 1 و تأیید شروع STEP 2 انجام شود. اگر POC نتواند resize، RTL، nesting، responsive overrides، keyboard DnD و renderer مشترک را تأیید کند، گزینهٔ جایگزین بررسی شود؛ دو editor production هم‌زمان نگهداری نشوند.

## معماری صفحه‌ساز روی CMS موجود

### قرارداد سند

- شناسهٔ Page، page_type، slug و URL فعلی ثابت بماند. معرفی `kind=builder` به جای page/home، با immutability فعلی ناسازگار است و پیشنهاد نمی‌شود.
- در envelope فعلی `PageRevision.content_json.payload`، قالب سند نسخه‌دار برای home/page اضافه شود. legacy payload بدون تغییر معتبر بماند؛ discriminator قالب سند، از discriminator نوع محتوا جدا باشد.
- سند شامل schema_version، root، nodes با id یکتا، widget_type/version، props نوع‌دار، children/slots و styles کنترل‌شدهٔ base/tablet/mobile باشد. ارجاع رسانه/محتوا/قالب فقط با IDهای معتبر.
- دادهٔ پایدار، قرارداد پروژه باشد؛ adapter آن را به state موتور editor تبدیل کند. state داخلی یک کتابخانه یا export HTML، قرارداد دائمی API نشود.
- نسخهٔ واقعی هر document/widget مستقل ثبت شود؛ migrationهای محتوایی قابل تکرار و دارای آزمون باشند.
- PageSection فعلی constraint نسخهٔ ۱ دارد؛ tree V2 بی‌برنامه به این جدول تزریق نشود. جدول به‌عنوان projection legacy حفظ شود و منبع authoritative محتوای revision باقی بماند.

### Widget Registry و Renderer مشترک

هر widget یک تعریف ثبت‌شده داشته باشد: شناسه/نسخه، Schema ورودی، defaults، renderer مشترک، inspector fields، child rules، style capabilities، data dependencies و accessibility constraints.

Renderer عمومی و Preview، همان React widget را با props اعتبارسنجی‌شده استفاده کنند. Editor wrapper فقط selection/DnD/resize را اضافه کند. کتابخانهٔ editor با dynamic import در admin بارگذاری شود و به صفحات عمومی سرایت نکند.

ویجت‌های Features/FAQ/ArticleList از resolver سروری مشترک و query کنترل‌شدهٔ API فعلی استفاده کنند. Endpoint خصوصی CRM یا fetch URL دلخواه در سند عمومی مجاز نباشد. unresolved reference در انتشار خطای واضح بدهد.

React/Tailwind برای ظاهر مشترک حفظ شوند؛ Styleهای پویا به CSS variables/قواعد کامپایل‌شدهٔ محدود تبدیل شوند. اتکا به رشتهٔ Tailwind دلخواه که در build کشف نمی‌شود، یا پذیرش stylesheet/script دلخواه، پیشنهاد نمی‌شود.

### Style و Responsive

- Schema جدا برای Layout (flex/grid/children/gap/align/dimensions/position) و Style (color/type/background/border/shadow/radius/state/transition).
- مقدارها از token یا literal نوع‌دار و محدود پذیرفته شوند؛ URL، expression، import، script و CSS arbitrary ممنوع.
- base → tablet → mobile با merge مشخص؛ reset override و inheritance در UI دیده شوند.
- اندازهٔ iframe دقیقاً با breakpoint CSS یکسان باشد؛ viewport preview بدون ذخیرهٔ override، تکمیل responsive editor نیست.
- یک H1، ترتیب معنایی محتوا، touch target، contrast، focus و reduced-motion در registry/انتشار/تست کنترل شوند. responsive hide نباید فرم یا CTA لازم را ناخواسته حذف کند.

### امنیت و پایداری

- Pydantic در API و Zod در Client؛ unknown widget/style/property، cycle، duplicate ID، nesting نامجاز و عمق/تعداد/حجم بیش از سقف رد شود.
- sanitizer و safe_link موجود reuse شوند. Aparat فقط شناسهٔ معتبر و Embed رسمی؛ icon فقط registry مجاز؛ Media فقط asset موجود و بررسی private/public.
- autosave با debounce و optimistic concurrency؛ ذخیرهٔ working draft از انتشار مستقل باشد. published pointer فقط با عملیات انتشار بررسی‌شده تغییر کند.
- undo/redo روی state editor؛ copy/paste پس از revalidation و ساخت IDهای تازه؛ بازگردانی durable revision مستقل از history حافظه باشد.
- برای autosave حد revision/checkpoint مشخص شود تا نسخهٔ هر keystroke و رشد بی‌حد DB رخ ندهد؛ prune هرگز نسخهٔ منتشرشده/استفاده‌شده را حذف نکند.
- در Canvas، فرم انتخاب/ویرایش شود و submit ناخواسته نداشته باشد. در Public واقعی submit به API موجود؛ آزمون submit در محیط مستقل انجام شود. nested form ممنوع.
- نمایش Draft به مهمان ممنوع؛ Preview noindex و بدون collect analytics عمومی؛ Form policy و consent ثابت و قابل دورزدن از style panel نباشند.

### سازگاری صفحات موجود

Renderer قالب legacy تا پایان انتقال باقی بماند. تبدیل هر صفحه، revision جدید ایجاد کند و published_revision_id آن صفحه تا تأیید، روی نسخهٔ موجود بماند.

ابتدا هر سکشن موجود به LegacySection سازگار با Inspector فعلی تبدیل شود؛ سپس به widgetهای مستقل تبدیل شود. این adapter مسیر موقت قابل ویرایش است، نه بهانهٔ حذف دامنهٔ صفحه‌ساز. متن، CTA، تصویر، ترتیب، FAQ references، SEO و URL هر انتقال diff شوند.

### APIهای پیشنهادی — تغییر آینده، نه وضعیت فعلی

| قرارداد موجود | نحوهٔ ارتقا |
|---|---|
| `/api/v1/admin/content` و `/{id}` | همان create/save؛ پذیرش امن سند V2 و concurrency موجود |
| `/{id}/preview`، `/publish`، `/schedule`، `/{action}` | همان authorization و چرخهٔ انتشار؛ validation widget/media/style اضافه شود |
| `/{id}/revisions` | تاریخچهٔ موجود حفظ؛ restore-to-draft به‌صورت عملیات جدید بدون حذف revision |
| `/api/v1/admin/media` | picker در editor و queryهای لازم روی همان کتابخانه |
| `/api/v1/admin/settings` | globals/version با schema مستقل؛ دادهٔ حساس در سند صفحه قرار نگیرد |
| template/reusable-section/header/footer | subtype/mapping داخل همین CMS و همان revision core؛ نه CMS جدا |
| `/api/v1/leads/demo`، `/contact`، `/forms/token` | بدون شکستن فرم فعلی؛ campaign attribution بعداً به‌صورت additive و versioned |

## POC قابل اجرا — ابتدای STEP 2 پس از تأیید

Scope محدود POC: Container/Grid، Heading، RichText، Image، Button و DemoForm؛ همه در همان admin و با API/PostgreSQL موجود. نمونهٔ صرفاً localStorage یا Mock API برای پذیرش کافی نیست.

سناریوی ثبت‌شده: ایجاد Page → Container → Heading/Image → جابه‌جایی → تغییر رنگ/فونت/فاصله → override موبایل → افزودن DemoForm → ذخیره → Refresh → Preview → Publish → بازیابی نسخهٔ قبل.

شرط انتخاب موتور: همهٔ سناریوها در DB مستقل، با واقعی‌بودن form submit، مجوزهای owner/editor/sales، Draft isolation، conflict 409، رسانهٔ private/public، keyboard و RTL پاس شوند. SSR خروجی مشترک، اندازهٔ bundle عمومی و عدم اثر بر صفحات legacy نیز بررسی شوند. POC محدود قبل از توسعهٔ همهٔ widgetها review شود.

## معماری CRM در همان ماژول موجود

Lead فعلی هستهٔ دریافت درخواست باقی بماند. درخواست دمو همچنان همان Lead(kind=demo) است؛ ساخت یک lead capture موازی یا کپی بی‌روابط داده پیشنهاد نمی‌شود.

مدل‌های افزودهٔ پیشنهادی: Organization، Contact و OrganizationContact، Opportunity، OpportunityStageEvent، Activity، DemoSession، Tag/LeadTag، SavedView، Notification و OutboxJob. این‌ها داخل API و DB لندینگ اضافه شوند و به Lead/Admin موجود FK داشته باشند.

- Lead edit/create دستی، qualification ساختاری و conversion اتمیک روی همان Lead؛ conversion تکراری نباید مدرسه/فرصت تکراری بسازد.
- lead status فعلی با opportunity stage جدید مخلوط نشود. pipeline فرصت: new → contacted → qualified → demo_scheduled → demo_completed → proposal → negotiation → won/lost.
- تغییر مرحله با If-Match، Audit و StageEvent؛ جابه‌جایی Kanban هم همان API بررسی‌شده را اجرا کند، با rollback UI در خطا.
- DemoSession با زمان، timezone، مسئول، outcome، next_action و روابط lead/organization/opportunity؛ یک Lead می‌تواند چند جلسه داشته باشد.
- Activity برای call/meeting/demo/task/followup و note؛ timeline یادداشت‌ها و history قدیمی را نیز نمایش دهد. زمان due/completed از زمان درج رکورد تفکیک شود.
- Customer360 تجمیع مجاز سمت سرور؛ اطلاعات فرد/مدرسه به فروش غیرمجاز یا Public API نشت نکند.
- اتوماسیون: outbox تراکنشی، job idempotent، retry/backoff، delivery state و failure monitoring. maintenance worker حفظ و مسئولیت retention از کارهای تجاری جدا شود.
- اعلان داخلی واقعی نخست؛ external channel فقط با Provider متصل، قالب مصوب و consent مناسب. قابلیت‌های OTP provider را اعلان CRM آماده تلقی نکنیم.
- حق مشاهدهٔ همه/فقط اختصاص‌یافته، assignee mutation، انتقال مالکیت و نقش سرپرست فروش قبل از implementation مشخص شوند؛ از RBAC موجود شروع شود.
- گزارش‌ها از Lead/DemoSession/Opportunity/Activity محاسبه شوند؛ denominator و cohort conversion مستند شوند؛ تعداد صفر یا نبود داده بدون ساخت عدد نمایشی نشان داده شود.

تعریف پیشنهادی گزارش‌ها: Lead-to-Demo بر لیدهای cohort که حداقل یک جلسهٔ واجد وضعیت انتخاب‌شده دارند؛ Demo-to-Opportunity بر درخواست‌های دارای دموی completed که opportunity به آن‌ها متصل است. «scheduled» و «completed» در نرخ جدا باشند؛ با چند جلسه، numerator از تعداد لید/درخواست متمایز تجاوز نکند. Performance کارشناس بر فعالیت/دموی completed و فرصت won مستند باشد، نه صرف تعداد تخصیص.

### Integration Gap برای فروش آینده

پرداخت، مالی، پیش‌فاکتور، قرارداد، اشتراک و تمدید در کد فعلی پیاده نیستند. فقط outcome=won و شمارش دستی contracts موجود است و حفظ می‌شود. فاز آینده می‌تواند provider/سامانهٔ واقعی مربوط را به opportunity/customer ID متصل کند؛ اکنون backend مالی جدید، invoice ساختگی یا payment mock ساخته نمی‌شود.

## مراحل و معیارهای پذیرش

| مرحله | وابستگی و خروجی | معیار پذیرش و Gate |
|---|---|---|
| STEP 0 — ممیزی | کد، DB، API، تست؛ gap/reuse/mapping/plan | شواهد تازه و تاریخی تفکیک، بدون تغییر کد/DB؛ توقف برای تأیید |
| STEP 1 — Art Direction | حفظ لوگو/آبی مصوب، audit، tokens و wireframe؛ نمونهٔ واقعی Hero + دو بخش «پیام‌رسان» و «مدیریت مدرسه/درخواست دمو» | desktop/mobile screenshots و بررسی tablet، RTL/keyboard/reduced-motion، متن غیرتکراری و CTA واقعی؛ **توقف و تأیید طراحی پیش از ادامهٔ بازطراحی** |
| STEP 2 — Core Editor | بعد از تأیید STEP 1؛ POC، schema/registry/render adapter، canvas، DnD/nesting/selection/resize/inline، Inspector، save/load/preview/publish | سناریوی ۱۲مرحله‌ای برای core، persistence پس از Refresh، form API واقعی، private draft، no regressions؛ تأیید POC/مرحله |
| STEP 3 — Advanced Editor | توسعهٔ موتور تأییدشده؛ تکمیل کتابخانهٔ ۲۰ ویجت، responsive، undo/redo/copy/duplicate/layers، global styles، templates/reusable/header/footer، autosave و revisions | همهٔ ابزارها، override دقیق سه viewport، restore-to-draft/rollback، فرم دمو/تماس و scheduler؛ داده/Style نامجاز رد شود؛ تأیید |
| STEP 4 — Premium Public Site | فقط با design تأییدشده و widget contract پایدار؛ تبدیل تدریجی صفحه‌ها | محتوای/URL/SEO/CTA و فرم‌ها محفوظ؛ hero/clusters/storytelling اختصاصی، اسکرین‌شات و visual regression همهٔ مسیرها؛ تأیید |
| STEP 5 — Demo CRM | policy فروش/نگهداری/تخصیص مصوب، backup+restore test؛ توسعهٔ همان Lead | CRUD لید/مدرسه/Contacts، dedupe، tags/qualification/conversion، Kanban/stages/history، فعالیت/جلسه، Customer360، reminders/dashboard/saved views؛ تست نقش/هم‌زمانی/گزارش/چرخهٔ retention؛ تأیید |
| STEP 6 — Integration & Quality | Editor/CRM/website تکمیل‌شده، staging HTTPS و inputs واقعی | فرم هر صفحه → لید → مدرسه/کارشناس → دمو → opportunity؛ API/E2E/visual/mobile/performance/a11y/security/migration/rollback/Docker/restore؛ docs و گزارش نهایی واقعی؛ تأیید انتشار جداگانه |

در STEP 2 یک override موبایل پایه برای سناریوی POC لازم است؛ ابزار کامل responsive در STEP 3 تکمیل می‌شود. تاریخچه/بازگردانی عمومی موجود در POC reuse و restore-to-draft در STEP 3 تکمیل می‌شود؛ این ترتیب برای سناریوی پذیرش به معنی حذف قابلیت نیست.

## کنترل کیفیت بعد از هر مرحلهٔ اجرایی

Build تولید، ESLint/TypeScript/Ruff، unit/API tests مرتبط، role/CSRF/sanitization/concurrency، migration verification در DB مستقل (اگر schema تغییر کرده)، screenshot/keyboard/mobile و regression مسیرهای سالم اجرا شود.

E2E جدید باید OTP → Editor/CRM را پوشش دهد. تست‌های قدیمی حفظ شوند و فقط پس از جایگزین آزموده‌شده، مسیر fixture قدیمی حذف شود. در هر مرحله فقط پس از موفقیت gateهای مرتبط Commit و قبل از آن گزارش فارسی ارائه شود؛ Push نیازمند اجازهٔ صریح است.

برای Performance هدف حداقل ۹۰ SEO/Performance روی صفحات مصوب، با نسخهٔ Lighthouse، hardware/network/throttling، تعداد runs و دادهٔ واقعی تعریف شود. صرف build یا یک screenshot، نتیجهٔ Lighthouse/Core Web Vitals محسوب نمی‌شود.

گزارش هر مرحله: preserved/upgraded/new، فایل‌ها، API delta، migration/backfill، تست و شواهد، محدودیت‌ها و Commit Hash. هیچ موفقیت اجرای POC، انتشار، migration یا integration قبل از آزمون گزارش نشود.

**اقدام بعدی پس از تأیید ممیزی: فقط STEP 1 و نمونهٔ طراحی قابل بررسی.** توسعهٔ عمومی سایت، نصب موتور editor و Migration CRM هنوز مجاز نشده‌اند.
