# راهنمای طراحی پیشنهادی ماکان

وضعیت: مشخصات پایه طراحی و اجرای STEP 2. در این مرحله tokens، فونت محلی، primitives و layout در `apps/web` پیاده شدند؛ نتیجه آزمون‌ها در `step-2-report.md` ثبت می‌شود. هویت رسمی/لوگو/تصاویر محصول هنوز ارائه نشده‌اند. مقادیر زیر پیشنهاد فنی موقت‌اند؛ رنگ و برند نهایی باید تأیید شوند. مرجع: R002–024، R049–063، R087–090 و بخش‌های ۵، ۷ و ۱۲ الف PRD.

## جهت طراحی و محتوا

فضای آرام آموزشی با سفید، متن آبی نفتی و accent فیروزه‌ای محدود. هدف هر صفحه روشن: برای مدیر مدرسه درخواست دمو؛ برای سایر مخاطبان شناخت امکانات و آموزش. ادعاهای قابل اثبات مهم‌تر از تصویر تزئینی‌اند. لوگو در development فقط عنوان متنی «ماکان» همراه برچسب «نشان موقت»؛ لوگوی نهایی یا نماد جدید بدون تأیید ساخته نمی‌شود.

copy اصلی از سند: «مدرسه هوشمندتر، ارتباط ساده‌تر». زیرتیتر پیام‌رسانی، کلاس، تکالیف، آزمون و گزارش را روشن توضیح می‌دهد. CTA پیش‌فرض «درخواست دمو»، بدون «رایگان» یا وعده پاسخ زمانی تا تأیید. AI label «در نقشه راه»؛ partial label «بخشی از امکانات آماده است». label علاوه بر رنگ آیکون/متن دارد. تصاویر مشتری/آمار/security badge بدون مدرک نمایش داده نمی‌شوند.

## Design Tokens پیشنهادی

| token | مقدار پیشنهادی | کاربرد |
|---|---|---|
| color.background | #F4F8FA | زمینه کلی |
| color.surface | #FFFFFF | کارت، فرم، پنل |
| color.text | #173044 | متن اصلی/تیتر |
| color.text-muted | #5B7081 | توضیح ثانویه؛ کنتراست با زمینه سنجیده شود |
| color.primary | #087C86 | CTA و link با white در دکمه |
| color.primary-hover | #056C78 | hover/active |
| color.primary-soft | #EAF5F6 | زمینه محدود قابلیت |
| color.border | #DCE7EB | جداکننده تزئینی؛ برای مرز input تنها کافی نیست |
| color.input-border | #5B7081 | کنترل تعاملی با مرز قابل تشخیص |
| color.focus | #056C78 | outline 3px و offset 3px روی سطح روشن |
| color.error | #B42318 | خطا روی سفید + آیکون و متن |
| color.success | #176B45 | موفقیت واقعی + متن |
| color.warning/text | #854D0E / #FEF3C7 | roadmap/partial با متن وضعیت |
| font.family-fa | Noto Sans Arabic محلی یا Vazirmatn محلی | انتخاب نهایی با مجوز و دارایی واقعی در STEP2 |
| font.family-latin | system-ui | URL/کد با bidi isolate |
| font.weight | 400/500/600/700 | حداکثر وزن‌های موردنیاز، subset فارسی |
| font.size | 12/14/16/18/20/24/32/40/48 px | متن body حداقل 16؛ metadata حداقل 14 در UI معمول |
| line.height | body 1.9، heading 1.45، button 1.5 | خوانایی فارسی و جلوگیری از بریدگی |
| space | 4/8/12/16/24/32/48/64/96 px | شبکه پایه 8 با نیم‌گام 4 |
| radius | control 10، card 16، panel 24، pill 999 px | محدود و یکدست |
| shadow.card | 0 8px 24px rgb(23 48 68 / 0.06) | سطح آرام؛ بدون shadow سنگین |
| shadow.overlay | 0 16px 48px rgb(23 48 68 / 0.14) | dialog/menu |
| content.max-width | 1200px | صفحات بازاریابی |
| article.max-width | 760px | متن آموزشی |
| motion.duration | 120/180/240ms | focus/hover، menu/tab؛ بدون parallax یا loop |
| z.layer | base 0، sticky 20، menu 40، dialog 60، toast 80 | stack مرکزی |

این tokens قبل از component implementation به CSS variables/shadcn theme نگاشت خواهند شد. رنگ CTA باید contrast>=4.5 برای متن عادی، کنترل و focus>=3 نسبت به رنگ مجاور، متن بزرگ>=3 داشته باشد. در validation-report نسبت‌های نمونه همین پالت محاسبه می‌شود؛ این بررسی جای audit UI واقعی را نمی‌گیرد. dark mode در MVP درخواست نشده و دامنه اضافه نمی‌شود.

## Layout و breakpoint

| بازه | layout مستقل |
|---|---|
| ۳۶۰–۴۷۹ | padding-inline 16، تک‌ستونه، منوی drawer، hero متن سپس تصویر، تب قابل پیمایش داخلی، CTA تمام‌عرض، filter در sheet |
| ۴۸۰–۱۰۲۳ | padding-inline 24، کارت‌ها دو ستون متناسب، hero عمدتاً عمودی، navigation فشرده، آموزش دو ستون، form labels ثابت |
| >=۱۰۲۴ | padding-inline 32، container<=1200، hero دو ستون، چهار کارت یا ترکیب ۲×۲، آموزش ۳ ستون، TOC جانبی sticky در متن |

breakpointهای لازم دقیقاً 480 و 1024 با media query/token سفارشی هستند؛ default Tailwind sm را جایگزین مرز 480 نمی‌کنیم. زیر 360 نیز graceful layout بدون overflow به عنوان پوشش اضافی تست می‌شود. body فارسی `lang=fa`, `dir=rtl`؛ spacing با inline/block logical properties، URL/phone/code `dir=ltr` و `unicode-bidi:isolate`. متن و ترتیب DOM منطقی است؛ برای RTL همه آیکون‌ها کورکورانه flip نمی‌شوند.

## ترتیب و رفتار صفحه اصلی

Header دارای لوگوی مصوب/موقت، امکانات/راهکارها/درباره/وبلاگ/آموزش/تماس، دمو برجسته و ورود معتبر. Hero متن کوتاه و عکس واقعی با ابعاد رزروشده، primary دمو و secondary امکانات. چالش با سه مسئله مشخص، سپس کارت‌های پیام‌رسان، مدرسه، ارزشیابی و گزارش؛ Copilot با آینده در صورت تأیید نمایش.

چهار نقش محتوای متفاوت دارند؛ مدیر overview/report و هماهنگی، معلم کلاس/ارزیابی، والد اطلاعات مجاز فرزند، دانش‌آموز کلاس/تکلیف/آزمون. تب تجربه محصول دارای keyboard roving focus و aria-selected؛ برای AI فقط concept برچسب‌دار. راه‌اندازی چهار مرحله دستی. سکشن آموزش حداکثر سه محتوای public؛ صفر محتوا یعنی حذف سکشن، نه skeleton همیشگی یا کارت فرضی. اعتماد از توضیح واقعی امنیت/تفکیک داده‌ها و FAQ؛ logo wall فقط با شاهد. CTA پایانی و Footer تماس/حقوقی/شبکه رسمی.

## تفاوت صفحات اختصاصی

| صفحه | مسئله و محور محتوا | اقدام |
|---|---|---|
| schools | پراکندگی فرایند، نبود گزارش منسجم و هماهنگی خانواده؛ onboarding دستی و overview مجاز | درخواست دمو / مشاوره مدرسه |
| teachers | زمان کلاس، جمع‌آوری تکلیف و ارزشیابی؛ مراحل کار واقعی | امکانات مدرسه و آموزش معلم |
| parents | اطلاع‌رسانی و گزارش مجاز فرزند بدون دسترسی اضافه | آموزش والد / امکانات مرتبط |
| students | یافتن برنامه، تکالیف و آزمون در فضای واحد | آموزش شروع کار و لینک ورود رسمی |
| messenger | ارتباط خصوصی/گروه/کانال و حدود مجوز سازمانی | امکانات/دمو با وضعیت معتبر |
| school | کلاس/جلسات/حضور/تکلیف/آزمون؛ فقط features تأییدشده | دمو و آموزش |
| reports | فهم گزارش نقش‌ها و حدود مشاهده، بدون آمار جعلی | دمو مدارس |
| ai | roadmap صریح و توضیح مسئله؛ بدون live chat یا وعده موجود | آشنایی با ماکان / تماس |
| about/contact | هویت/راه‌های ارتباطی واقعی، فرم عمومی | ثبت پیام واقعی |
| blog/learn | blog بازاریابی، learn راهنمای استفاده با فیلتر/سطح/نقش | مطالعه/ویدیو/مجموعه مرتبط |

## آموزش و پنل

فهرست learn: جست‌وجو labelدار، فیلتر role/topic/type/level، newest/popular با تعریف داده. URL query قابل اشتراک و back/forward حفظ‌شده. کارت متن/ویدیو با icon، خلاصه، role و مدت واقعی؛ هیچ player در کارت اصلی. جزئیات مقاله: breadcrumb، H1، خلاصه، بازبینی، زمان، نقش، TOC از تیترها، متن/تصویر/گام، منابع/related و prev/next مجموعه.

جزئیات ویدیو: cover با نسبت 16:9، دکمه «پخش ویدیو از آپارات»، اطلاع اتصال به ثالث پیش از کلیک، iframe رسمی پس از تعامل، بدون autoplay، لینک «باز کردن در آپارات» همیشه حاضر. به دلیل cross-origin، timeout iframe اثبات خراب‌بودن ویدیو نیست؛ UI بازیابی دستی و لینک را حفظ می‌کند. transcript تنها در صورت وجود، body آموزشی همیشه خوانا و SSR. مجموعه دارای قسمت‌های مرتب article/video؛ progress و حساب آموزشی نداریم.

پنل: sidebar RTL و drawer در موبایل، جدول leads با filter/search/pagination، editor با پیش‌نمایش خصوصی، تاریخ schedule با zone مشخص Asia/Tehran و ذخیره UTC، badge وضعیت، publish صریح، هشدار stale version و audit. داده PII فقط roleهای مجاز؛ CSV export یا mass messaging خارج دامنه تا درخواست مستقل. تنظیمات secret در فرم CMS وجود ندارند. editor rich text toolbar محدود و خروجی sanitized؛ iframe/JS دلخواه ندارد.

## کامپوننت‌ها و stateها

| کامپوننت | حالت/قاعده |
|---|---|
| Button/link | default/hover/pressed/focus/disabled/loading؛ CTA link واقعی؛ disabled دلیل قابل‌خواندن دارد |
| Field/select/textarea | label ثابت، hint، required متنی، error با aria-describedby، preserve input، inputmode phone/email |
| Demo/contact form | idle/validating/submitting/success/error/rate-limited؛ success فقط پاسخ DB؛ aria-live و focus error summary |
| Header/drawer/dialog | focus trap، Escape، بازگشت focus به trigger، scroll lock صحیح، focus زیر sticky مخفی نشود |
| Tabs/FAQ | WAI-ARIA patterns، keyboard arrow/Home/End برای tabs، button برای accordion |
| Card/status | عنوان link یکتا، alt درست؛ برچسب readiness با رنگ و متن |
| Toast | وضعیت کمکی، نه تنها محل نمایش نتیجه حیاتی؛ screen-reader live region |
| Table/filter | header scope، caption/label، empty واقعی، loading با ارتفاع پایدار، خطای retry، scroll فقط داخل جدول |
| Upload | progress واقعی، خطای MIME/size فارسی، alt الزامی، private preview مجاز |
| 404 | status واقعی، توضیح کوتاه، خانه/آموزش/تماس؛ layout برند |

تا STEP8، form stateها در طراحی/تست واحد بررسی می‌شوند؛ فرم عمومی ناقص در production منتشر یا موفقیت ساختگی نمایش داده نمی‌شود. مرحله layout، پذیرش عملکرد نهایی فرم نیست.

## دسترس‌پذیری و کارایی

WCAG 2.2 AA هدف است؛ targetهای لمسی 44×44px تصمیم طراحی محافظه‌کارانه، skip link، landmarks، H1 یکتا، heading hierarchy، label/alt، focus واضح و tab order طبیعی. آزمون دستی صفحه‌کلید و screen reader کنار axe لازم است؛ گزارش صفر خطای ابزار به‌تنهایی گواهی WCAG نیست. امکان paste/password manager ورود حفظ، CAPTCHA اجباری بدون گزینه قابل‌دسترس اضافه نمی‌شود. فرم رضایت checkbox پیش‌فرض خالی، بدون dark pattern.

`prefers-reduced-motion` تمام انیمیشن غیرضروری و smooth scroll را حذف می‌کند؛ animation transform/opacity کوتاه و بدون تغییر layout، نه reveal که محتوای ضروری را تا JS پنهان کند. hero دارای width/height/aspect-ratio، فونت محلی preload محدود و fallback metric مناسب؛ تصویر بالای fold eager، تصاویر دیگر lazy. پلیر click-to-load جلوی درخواست ثالث زودهنگام را می‌گیرد. Motion تنها در component موردنیاز import می‌شود.

تحویل STEP2: وایرفریم و mockup سه viewport، tokens/components، states و گزارش QA، نه لوگوی نهایی ساخته‌شده. تست viewport 360/390/768/1024/1440، zoom 200%، keyboard، reduced-motion و contrast. Lighthouse نهایی در STEP9/10 با API/محتوای واقعی انجام می‌شود؛ هدف performance/SEO >=90 و سنجش CWV میدانی بعد انتشار.

## نگاشت اجرا و نگهداری نسخه ۰.۲

`tokens.css` منبع styling مشترک و سازگار با Tailwind4/shadcn است؛ token جدید با نام معنایی و معیار contrast اضافه شود. primitiveها از registry رسمی سبک new-york با CLI قفل‌شده گرفته شده‌اند. نسخه بالاتر registry نباید بدون diff/آزمون با overwrite روی تغییرات RTL، focus یا target size بنشیند. Dark mode در این مرحله اضافه نشده است.

فونت انتخاب‌شده فعلی Vazirmatn متغیر، فایل Arabic WOFF2 با حجم ۴۶۳۰۸ بایت؛ `next/font/local` فایل را از همان origin سرو می‌کند. OFL.txt همراه آن نگهداری شده؛ [منبع رسمی فونت](https://github.com/rastikerdar/vazirmatn). تصویری از اپ اصلی یا لوگوی ساختگی ساخته نشده و جایگاه تصویر آشکارا برچسب دارد.

اجزای اجرایی: Button/Input/Textarea/Checkbox/Label/Tabs/Accordion/Sheet؛ StatusBadge متنی+آیکون برای سه readiness و MotionSurface برای hover محدود. نمونه‌های صفحه `/design-system` حالت disabled/loading/error/confirmation، فیلد labelدار و پنل focus-trap را ارائه می‌کنند. این نمونه فرم submit ندارد و هیچ lead یا رضایت واقعی ثبت نمی‌کند.

breakpointهای CSS در 480 و 1024 px دقیق‌اند؛ کارت‌ها ۱/۲/۴ ستون و Hero در desktop دو ستون می‌شود. ردیف CTAها در بزرگ‌نمایی متن قابلیت wrap دارد. skip link با tabIndex صفر، outline مشترک سه‌پیکسلی و media query کاهش حرکت برقرار است؛ ترجیح حرکت با useSyncExternalStore هم هنگام hydration و هم هنگام تغییر دستگاه دنبال می‌شود. screenshotهای layout و کامپوننت‌ها در `docs/qa/step2` از browser واقعی تولید می‌شوند و نمونه تصویری تحویل این مرحله‌اند.

## پنل مدیریت مرحله ۵

Layout مستقل RTL با tokenها و primitiveهای موجود؛ desktop sidebar و نمایش grid منو در موبایل، max-width ثابت و flex-wrap برای حساب/نشست. header/footer عمومی در پنل نمایش داده نمی‌شود. ورود و ایجاد حساب از RHF/Zod و labelهای صریح استفاده می‌کنند؛ پیام‌ها فارسی، رمزها دارای autocomplete مناسب و errors با alert/status هستند. اهداف لمسی حداقل۴۴px، skip link مدیریت، focus states و ترجیح reduced-motion از foundation حفظ شده‌اند.

صفحات پنل: login، dashboard، security، accounts و audit. وضعیت خالی از DB واقعی است؛ عدد leads یا نمودار فرضی وجود ندارد. MFA به‌صورت کلید دستی محلی و کدهای بازیابی فقط در پاسخ همان بار نمایش دارد. نقش و دسترسی UI از Profile server است و کنترل نهایی API انجام می‌شود. بعد revoke عملیات خود، navigation کامل داده خصوصی را کنار می‌گذارد. تاریخ‌های client با timeZone تهران تولید می‌شوند تا UTC سرور و مرورگر hydration متفاوت نسازند.

شواهد responsive/keyboard/axe و screenshots این مرحله در `qa/step5` ذخیره‌اند؛ QA قبلی حفظ شده است. این بررسی خودکار، گواهی کامل WCAG یا تست دستگاه واقعی نیست.
