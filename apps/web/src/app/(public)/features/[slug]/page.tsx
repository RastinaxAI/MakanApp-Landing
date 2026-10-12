import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { PageHero } from "@/components/marketing/page-hero";
import { ContentGrid } from "@/components/marketing/content-grid";
import { CallToAction } from "@/components/marketing/call-to-action";
import { ProductVisual } from "@/components/marketing/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  features,
  findFeature,
  findAudience,
} from "@/features/marketing/content";

export const dynamicParams = false;
export function generateStaticParams() {
  return features.map((feature) => ({ slug: feature.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const feature = findFeature((await params).slug);
  if (!feature) notFound();
  return { title: feature.title, description: feature.summary };
}
export default async function FeaturePage({ params }: Props) {
  const feature = findFeature((await params).slug);
  if (!feature) notFound();
  const audience = findAudience(feature.audience);
  const roadmap = feature.readiness === "roadmap";
  return (
    <>
      <PageHero
        eyebrow={feature.eyebrow}
        title={feature.headline}
        description={feature.summary}
        parent={{ label: "امکانات", href: "/features" }}
        ctaLabel={roadmap ? "مشاهده امکانات آماده" : "درخواست دموی ماکان"}
        ctaHref={roadmap ? "/features" : "/demo"}
      >
        <StatusBadge status={feature.readiness} />
      </PageHero>
      <section className="section-space" aria-labelledby="benefits-title">
        <Container>
          <SectionHeading
            id="benefits-title"
            kicker={roadmap ? "جهت‌گیری توسعه" : "کارکرد در زندگی روزمره مدرسه"}
            title={
              roadmap
                ? "مسیرهایی که برای آینده مطرح شده‌اند."
                : "کدام بخش کار شما منظم‌تر می‌شود؟"
            }
          />
          <ContentGrid items={feature.benefits} />
        </Container>
      </section>
      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="workflow-title"
      >
        <Container>
          <SectionHeading
            id="workflow-title"
            kicker={roadmap ? "از ایده تا معرفی" : "یک مسیر ساده"}
            title={
              roadmap
                ? "انتشار پس از آماده‌شدن و تأیید محصول."
                : "از شروع کار تا پیگیری نتیجه."
            }
          />
          <ContentGrid items={feature.workflow} numbered />
        </Container>
      </section>
      <section className="section-space" aria-labelledby="boundary-title">
        <Container>
          <div className="grid items-center gap-10 desktop:grid-cols-2">
            <div>
              <p className="section-kicker mb-3">دامنه و حدود</p>
              <h2 id="boundary-title" className="section-heading">
                وضعیت روشن، انتظار دقیق.
              </h2>
              <p className="mt-5 leading-8 text-muted-foreground">
                {feature.boundary}
              </p>
              {audience && (
                <Link
                  href={`/solutions/${audience.slug}`}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-medium text-primary-hover"
                >
                  ماکان برای {audience.title}
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              )}
            </div>
            {roadmap ? (
              <aside className="rounded-2xl border border-border bg-warning-soft p-7 text-warning">
                <h3 className="text-xl font-semibold">
                  در نقشه راه؛ بدون دموی فعال
                </h3>
                <p className="mt-4 leading-8">
                  این صفحه برای توضیح مسیر آینده است. چت‌بات، تولید پاسخ و تحلیل
                  عملیاتی در این وب‌سایت ارائه نمی‌شود.
                </p>
              </aside>
            ) : (
              <ProductVisual title={`تصویر بخش ${feature.title}`} />
            )}
          </div>
        </Container>
      </section>
      <CallToAction
        title={
          roadmap
            ? "با بخش‌های آماده ماکان آشنا شوید."
            : "این مسیر را برای مدرسه خود ببینید."
        }
        label={roadmap ? "مشاهده امکانات" : "درخواست دموی ماکان"}
        href={roadmap ? "/features" : "/demo"}
        description={
          roadmap
            ? "پیام‌رسان، مدرسه و گزارش‌ها اکنون برای معرفی عمومی آماده‌اند."
            : "در جلسه دمو، امکانات مرتبط با نیاز و نقش شما بررسی می‌شوند."
        }
      />
    </>
  );
}
