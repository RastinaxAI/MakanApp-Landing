import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { ContentGrid } from "@/components/marketing/content-grid";
import { CallToAction } from "@/components/marketing/call-to-action";
import { FeatureCard } from "@/features/marketing/feature-card";
import {
  audiences,
  findAudience,
  features,
} from "@/features/marketing/content";
export const dynamicParams = false;
export function generateStaticParams() {
  return audiences.map((audience) => ({ slug: audience.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const audience = findAudience((await params).slug);
  if (!audience) notFound();
  return {
    title: `ماکان برای ${audience.title}`,
    description: audience.summary,
  };
}
export default async function SolutionPage({ params }: Props) {
  const audience = findAudience((await params).slug);
  if (!audience) notFound();
  const primaryHref =
    audience.slug === "schools"
      ? "/demo"
      : audience.slug === "parents"
        ? "/features/reports"
        : "/features/school";
  return (
    <>
      <PageHero
        eyebrow={audience.eyebrow}
        title={audience.headline}
        description={audience.summary}
        parent={{ label: "راهکارها", href: "/solutions" }}
        ctaLabel={audience.cta}
        ctaHref={primaryHref}
      />
      <section className="section-space" aria-labelledby="pain-title">
        <Container>
          <div className="grid items-start gap-8 desktop:grid-cols-2">
            <SectionHeading
              id="pain-title"
              kicker="مسئله از نگاه شما"
              title="کدام هماهنگی‌ها وقت بیشتری می‌گیرند؟"
            />
            <ul className="space-y-4">
              {audience.pains.map((pain) => (
                <li
                  key={pain}
                  className="flex gap-3 rounded-xl border border-border bg-card p-5"
                >
                  <Check
                    size={20}
                    className="mt-1 shrink-0 text-primary-hover"
                    aria-hidden="true"
                  />
                  <span className="leading-8 text-muted-foreground">
                    {pain}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="value-title"
      >
        <Container>
          <SectionHeading
            id="value-title"
            kicker={`ماکان برای ${audience.title}`}
            title="یک مسیر مشخص برای نیازهای شما."
          />
          <ContentGrid items={audience.benefits} />
        </Container>
      </section>
      <section className="section-space" aria-labelledby="journey-title">
        <Container>
          <SectionHeading
            id="journey-title"
            kicker="از نگاه کاربر"
            title="چطور این بخش‌ها کنار هم قرار می‌گیرند؟"
          />
          <ContentGrid items={audience.journey} numbered />
          <aside className="mt-8 rounded-2xl border-s-4 border-primary bg-secondary p-6">
            <h3 className="text-lg font-semibold">دسترسی متناسب با نقش</h3>
            <p className="mt-3 leading-8 text-muted-foreground">
              {audience.boundary}
            </p>
          </aside>
        </Container>
      </section>
      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="related-title"
      >
        <Container>
          <SectionHeading
            id="related-title"
            kicker="امکانات مرتبط"
            title="این بخش‌های ماکان را بیشتر بشناسید."
          />
          <div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
            {features
              .filter((feature) => audience.related.includes(feature.slug))
              .map((feature) => (
                <FeatureCard key={feature.slug} feature={feature} />
              ))}
          </div>
        </Container>
      </section>
      <CallToAction
        title={
          audience.slug === "schools"
            ? "برای مدرسه شما، از نیازها شروع کنیم."
            : `مسیر ${audience.title} را در ماکان ببینید.`
        }
        label={audience.cta}
        href={primaryHref}
        description={
          audience.slug === "schools"
            ? "ساختار و اولویت‌های مدرسه را در جلسه بررسی نیاز مطرح کنید."
            : "با امکانات مرتبط با نقش خودتان آشنا شوید."
        }
      />
    </>
  );
}
