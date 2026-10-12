"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProductVisual } from "@/components/marketing/product-visual";
import { features } from "@/features/marketing/content";

export function ProductPreview() {
  return (
    <Tabs defaultValue="messenger" dir="rtl">
      <TabsList
        aria-label="بخش‌های تجربه محصول"
        className="mb-6 grid h-auto w-full max-w-2xl grid-cols-2 gap-1 tablet:grid-cols-4"
      >
        {features.map((feature) => (
          <TabsTrigger
            key={feature.slug}
            value={feature.slug}
            className="min-h-11 whitespace-normal px-3"
          >
            {feature.slug === "school"
              ? "مدرسه"
              : feature.slug === "reports"
                ? "گزارش‌ها"
                : feature.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {features.map((feature) => (
        <TabsContent
          key={feature.slug}
          value={feature.slug}
          className="rounded-3xl border border-border bg-background p-5 tablet:p-8"
        >
          <div className="grid items-center gap-8 desktop:grid-cols-2">
            <div>
              <StatusBadge status={feature.readiness} />
              <h3 className="mt-5 text-2xl font-semibold">
                {feature.headline}
              </h3>
              <p className="mt-4 leading-8 text-muted-foreground">
                {feature.summary}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {feature.benefits.map((benefit) => (
                  <li key={benefit.title} className="flex items-start gap-2">
                    <span
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {benefit.title}
                  </li>
                ))}
              </ul>
              <Link
                href={`/features/${feature.slug}`}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-medium text-primary-hover"
              >
                بیشتر درباره {feature.title}
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            </div>
            {feature.readiness === "roadmap" ? (
              <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-input bg-warning-soft p-6 text-center">
                <div className="max-w-sm">
                  <p className="text-lg font-semibold text-warning">
                    Copilot · نمای مفهومی نقشه راه
                  </p>
                  <p className="mt-4 text-sm leading-8 text-warning">
                    این بخش دموی هوش مصنوعی نیست. قابلیت عملیاتی، خروجی نمونه یا
                    زمان انتشار تأییدشده‌ای برای نمایش وجود ندارد.
                  </p>
                </div>
              </div>
            ) : (
              <ProductVisual title={`نمای ${feature.title}`} />
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
