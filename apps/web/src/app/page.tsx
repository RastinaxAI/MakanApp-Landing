import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Layers3,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { ProductVisual } from "@/components/marketing/product-visual";
import { CallToAction } from "@/components/marketing/call-to-action";
import { FeatureIcon } from "@/components/marketing/feature-icon";
import { AudienceCard } from "@/features/marketing/audience-card";
import { ProductPreview } from "@/features/marketing/product-preview";
import { FaqList } from "@/features/marketing/faq-list";
import { audiences, onboarding } from "@/features/marketing/content";

const pillars = [
  {
    slug: "messenger" as const,
    title: "پیام‌رسان",
    text: "گفت‌وگوی خصوصی، گروه و کانال؛ ارتباط متناسب با مجوزهای مدرسه.",
    href: "/features/messenger",
  },
  {
    slug: "school" as const,
    title: "مدیریت کلاس",
    text: "کلاس، برنامه جلسات و حضور؛ برای نظم در جریان روزمره آموزش.",
    href: "/features/school",
  },
  {
    slug: "school" as const,
    title: "تکلیف و آزمون",
    text: "فعالیت آموزشی و ارزشیابی، در کنار کلاس و برنامه مدرسه.",
    href: "/features/school",
  },
  {
    slug: "reports" as const,
    title: "داشبورد و گزارش",
    text: "اطلاعات مرتبط با هر نقش، در محدوده دسترسی مجاز همان کاربر.",
    href: "/features/reports",
  },
];

export default function HomePage() {
  return (
    <>
      <section
        className="border-b border-border bg-card"
        aria-labelledby="hero-title"
        data-section="hero"
      >
        <Container className="hero-grid">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-primary-hover">
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              یک فضای مشترک برای آموزش و ارتباط
            </p>
            <h1 id="hero-title" className="hero-heading">
              مدرسه هوشمندتر،
              <br />
              <span className="text-primary">ارتباط ساده‌تر.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-muted-foreground">
              ماکان پیام‌رسانی، مدیریت کلاس، تکالیف، آزمون‌ها و گزارش‌های آموزشی
              را در یک تجربه یکپارچه کنار هم قرار می‌دهد.
            </p>
            <div className="mt-8 flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
              <Button asChild size="lg">
                <Link href="/demo">
                  درخواست دموی ماکان
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/features">مشاهده امکانات</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-primary" aria-hidden="true" />
                متناسب با نقش شما
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-primary" aria-hidden="true" />
                راه‌اندازی با همراهی تیم
              </span>
            </div>
          </div>
          <ProductVisual phone />
        </Container>
      </section>

      <section
        className="section-space"
        aria-labelledby="challenge-title"
        data-section="challenge"
      >
        <Container>
          <SectionHeading
            id="challenge-title"
            kicker="از پراکندگی، به یک تجربه منسجم"
            title="وقتی ابزارها جدا هستند، پیگیری سخت‌تر می‌شود."
            description="پیام‌های مدرسه در یک جا، برنامه کلاس در جای دیگر و گزارش‌ها در مسیری جدا؛ هماهنگی آموزش نباید به جمع‌کردن این تکه‌ها محدود شود."
          />
          <div className="grid gap-6 desktop:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "پیام‌هایی که گم می‌شوند",
                text: "اطلاع‌رسانی و گفت‌وگو میان چند فضای مختلف پخش می‌شود.",
              },
              {
                icon: ClipboardCheck,
                title: "پیگیری‌های پراکنده",
                text: "مرور کلاس، تکلیف و آزمون به رفت‌وآمد بین ابزارها نیاز دارد.",
              },
              {
                icon: Layers3,
                title: "هماهنگی دشوار",
                text: "مدرسه و خانواده برای رسیدن به یک دید مشترک، مسیرهای جدا را دنبال می‌کنند.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <Icon
                  size={26}
                  strokeWidth={1.5}
                  className="mb-5 text-primary-hover"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">
                  {text}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl border-s-4 border-primary ps-5 text-lg font-medium leading-9">
            ماکان ارتباط و مدیریت آموزش را در یک فضای یکپارچه کنار هم می‌آورد؛
            هر نقش، مسیر و دسترسی مرتبط با خودش را دارد.
          </p>
        </Container>
      </section>

      <section
        id="capabilities"
        className="section-space border-y border-border bg-card"
        aria-labelledby="capabilities-title"
        data-section="features"
      >
        <Container>
          <SectionHeading
            id="capabilities-title"
            kicker="امکانات آماده محصول"
            title="از گفت‌وگو تا گزارش، یک مسیر پیوسته."
            description="بخش‌های پیام‌رسان، مدیریت آموزشی و گزارش‌ها برای معرفی عمومی تأیید شده‌اند. دستیار هوش مصنوعی همچنان در نقشه راه است."
          />
          <div className="layout-grid">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-6"
              >
                <FeatureIcon
                  slug={pillar.slug}
                  className="mb-5 text-primary-hover"
                />
                <h3 className="text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">
                  {pillar.text}
                </p>
                <Link
                  href={pillar.href}
                  className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-lg pt-5 text-sm font-medium text-primary-hover"
                >
                  آشنایی با {pillar.title}
                  <ArrowLeft size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <Link
            href="/features/ai"
            className="mt-7 inline-flex min-h-11 flex-wrap items-center gap-2 rounded-lg text-sm text-warning"
          >
            <span className="rounded-full bg-warning-soft px-3 py-1">
              در نقشه راه
            </span>
            آشنایی با مسیر هوش مصنوعی ماکان
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </Container>
      </section>

      <section
        id="roles"
        className="section-space"
        aria-labelledby="roles-title"
        data-section="audiences"
      >
        <Container>
          <SectionHeading
            id="roles-title"
            kicker="چهار نقش، چهار نیاز"
            title="ماکان، از نگاه شما."
            description="مدیر، معلم، والد و دانش‌آموز نیاز یکسانی ندارند. نقش و فضای کاری، مسیر و اطلاعات مرتبط با هر فرد را مشخص می‌کنند."
          />
          <div className="layout-grid" data-testid="role-grid">
            {audiences.map((audience) => (
              <AudienceCard key={audience.slug} audience={audience} />
            ))}
          </div>
        </Container>
      </section>

      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="experience-title"
        data-section="experience"
      >
        <Container>
          <SectionHeading
            id="experience-title"
            kicker="تجربه ماکان"
            title="با مسیر هر بخش آشنا شوید."
            description="بخش‌های آماده محصول را مرور کنید و مسیر آینده Copilot را با وضعیت روشن ببینید."
          />
          <ProductPreview />
        </Container>
      </section>

      <section
        className="section-space"
        aria-labelledby="onboarding-title"
        data-section="onboarding"
      >
        <Container>
          <SectionHeading
            id="onboarding-title"
            kicker="راه‌اندازی با همراهی تیم"
            title="از نیاز مدرسه شما شروع می‌کنیم."
            description="مسیر اولیه ماکان با هماهنگی و بررسی نیاز پیش می‌رود؛ راه‌اندازی مدرسه یک فرایند همراه با تیم است."
          />
          <ol className="layout-grid">
            {onboarding.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="mb-5 inline-flex size-11 items-center justify-center rounded-full bg-secondary font-semibold text-primary-hover">
                  {new Intl.NumberFormat("fa").format(index + 1)}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Training cards are intentionally absent until actual published CMS content exists (STEP 7). */}
      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="trust-title"
        data-section="trust"
      >
        <Container>
          <div className="grid gap-10 desktop:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck
                size={34}
                strokeWidth={1.4}
                className="mb-5 text-primary-hover"
                aria-hidden="true"
              />
              <p className="section-kicker mb-3">دسترسی با حدود روشن</p>
              <h2 id="trust-title" className="section-heading">
                اطلاعات مرتبط، برای فرد مجاز.
              </h2>
              <p className="mt-5 leading-8 text-muted-foreground">
                والد گزارش مجاز فرزند را می‌بیند و مدیر در محدوده دسترسی خود کار
                می‌کند. این وب‌سایت معرفی، مستقل از اپلیکیشن آموزشی است و به
                پیام‌ها یا داده‌های خصوصی کاربران دسترسی ندارد.
              </p>
              <Link
                href="/privacy"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary-hover"
              >
                مطالعه حریم خصوصی
                <ArrowLeft size={17} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h2 className="mb-5 text-2xl font-semibold">پرسش‌های متداول</h2>
              <FaqList compact />
              <Link
                href="/faq"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary-hover"
              >
                همه پرسش‌ها
                <ArrowLeft size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <CallToAction />
    </>
  );
}
