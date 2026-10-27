import { SourceLink as Link } from "@/features/leads/source-link";
import { ArrowUpLeft } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import type { CmsSettings, CmsImageRef } from "@/features/cms/types";

const groups = [
  {
    title: "ماکان",
    items: [
      { label: "امکانات محصول", href: "/features" },
      { label: "برای مدارس", href: "/solutions/schools" },
      { label: "درباره ما", href: "/about" },
    ],
  },
  {
    title: "همراه شما",
    items: [
      { label: "آموزش ماکان", href: "/learn" },
      { label: "راهنمای شروع کار", href: "/learn?topic=getting-started" },
      { label: "وبلاگ", href: "/blog" },
      { label: "پرسش‌های متداول", href: "/faq" },
      { label: "تماس با ما", href: "/contact" },
    ],
  },
] as const;

export function SiteFooter({
  settings,
  logo,
}: {
  settings?: CmsSettings;
  logo?: CmsImageRef;
}) {
  const siteConfig = settings?.general;
  return (
    <footer className="public-footer border-t border-border bg-card">
      <div className="site-container public-footer-intro">
        <p>آموزش، با ارتباط بهتر.</p>
        <Link href="/demo">
          ماکان را برای مدرسه‌تان ببینید <ArrowUpLeft aria-hidden="true" />
        </Link>
      </div>
      <div className="public-footer-grid site-container grid gap-8 py-12 tablet:grid-cols-2 desktop:grid-cols-[1.4fr_1fr_1fr_1.25fr]">
        <div>
          <Brand name={siteConfig?.brand_name} logo={logo} />
          <p className="mt-5 max-w-xs text-sm text-muted-foreground">
            {siteConfig?.tagline ||
              "ارتباط و مدیریت آموزش، در یک فضای یکپارچه؛ برای مدرسه، معلم، خانواده و دانش‌آموز."}
          </p>
        </div>
        {groups.map((group) => (
          <nav
            key={group.title}
            aria-label={group.title}
            className="flex flex-col items-start"
          >
            <h2 className="mb-3 text-base font-semibold">{group.title}</h2>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="quiet-link inline-flex min-h-11 items-center rounded-lg text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="rounded-2xl bg-background p-5">
          <h2 className="text-base font-semibold">برای مدرسه شما</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            مسیر هماهنگی دمو و راه‌اندازی ماکان را ببینید.
          </p>
          <Link
            href="/demo"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary-hover"
          >
            درخواست دمو
          </Link>
          {siteConfig?.phone && (
            <a
              href={`tel:${siteConfig.phone.replace(/[ ()-]/g, "")}`}
              dir="ltr"
              className="block rounded-lg py-2 text-sm text-primary-hover"
            >
              {siteConfig.phone}
            </a>
          )}
          {siteConfig?.email && (
            <a
              href={`mailto:${siteConfig.email}`}
              dir="ltr"
              className="block break-all rounded-lg py-2 text-sm text-primary-hover"
            >
              {siteConfig.email}
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="site-container flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-muted-foreground">
          <span>
            {siteConfig?.brand_name || "ماکان"} ·{" "}
            {siteConfig?.tagline || "ارتباط و مدیریت آموزش"}
          </span>
          <nav aria-label="اطلاعات حقوقی" className="flex flex-wrap gap-5">
            <Link
              href="/privacy"
              className="quiet-link inline-flex min-h-11 items-center rounded-lg"
            >
              حریم خصوصی
            </Link>
            <Link
              href="/terms"
              className="quiet-link inline-flex min-h-11 items-center rounded-lg"
            >
              شرایط استفاده
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
