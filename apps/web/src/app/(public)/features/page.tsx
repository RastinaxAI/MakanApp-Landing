import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/marketing/page-hero";
import { CallToAction } from "@/components/marketing/call-to-action";
import { FeatureCard } from "@/features/marketing/feature-card";
import { features } from "@/features/marketing/content";

export const metadata: Metadata = {
  title: "امکانات ماکان",
  description:
    "پیام‌رسان، مدیریت آموزشی و گزارش‌های آماده ماکان؛ به‌همراه وضعیت روشن نقشه راه هوش مصنوعی.",
};
export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="امکانات ماکان"
        title="ابزارهای مرتبط، برای یک تجربه آموزشی منسجم."
        description="از ارتباط مدرسه تا برنامه کلاس و گزارش‌ها؛ هر بخش را با دامنه و وضعیت خودش بشناسید."
      />
      <section className="section-space" aria-label="حوزه‌های محصول">
        <Container>
          <div className="grid gap-6 tablet:grid-cols-2">
            {features.map((feature) => (
              <FeatureCard key={feature.slug} feature={feature} />
            ))}
          </div>
        </Container>
      </section>
      <CallToAction />
    </>
  );
}
