import { SectionContent, type LegacyRendererProps } from "./section-content";
import { BuilderRenderer } from "@/features/builder/renderer";
import { Fragment } from "react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { PageHero } from "@/components/marketing/page-hero";
import { ProductVisual } from "@/components/marketing/product-visual";
import { CallToAction } from "@/components/marketing/call-to-action";
import { ContentGrid } from "@/components/marketing/content-grid";
import { StatusBadge } from "@/components/ui/status-badge";
import { FeatureCard } from "@/features/marketing/feature-card";
import { FaqList, type FaqItem } from "@/features/marketing/faq-list";
import { MediaImage } from "./media-image";
import { RichText } from "./rich-text";
import type { Audience, Feature } from "@/features/marketing/content";
import { ContentSeo } from "@/features/seo/structured-data";
import type { CmsContent, LandingPayload } from "./types";

export function asFeatures(contents: CmsContent[]): Feature[] {
  return contents.flatMap((c) =>
    c.payload.kind === "feature"
      ? [{ ...c.payload, slug: c.slug, media: c.media }]
      : [],
  );
}
export function asAudiences(contents: CmsContent[]): Audience[] {
  return contents.flatMap((c) =>
    c.payload.kind === "audience" ? [{ ...c.payload, slug: c.slug }] : [],
  );
}
export function asFaqs(contents: CmsContent[]): FaqItem[] {
  return contents.flatMap((c) =>
    c.payload.kind === "faq" ? [{ ...c.payload, id: c.slug }] : [],
  );
}

export function CmsRenderer(props: LegacyRendererProps) {
  const p = props.content.payload;
  const trust =
    p.kind === "home" || p.kind === "page"
      ? p.sections.find((s) => s.type === "trust")
      : undefined;
  const visibleFaqs = trust
    ? trust.faq_slugs?.length
      ? trust.faq_slugs.flatMap((slug) =>
          (props.faqs || []).filter((f) => f.id === slug),
        )
      : (props.faqs || []).slice(0, 4)
    : [];
  return (
    <>
      {!props.privatePreview && (
        <ContentSeo content={props.content} faqs={visibleFaqs} />
      )}
      <CmsBody {...props} />
    </>
  );
}
function CmsBody(props: LegacyRendererProps) {
  const { content, privatePreview = false } = props;
  const payload = content.payload;
  const sections =
    payload.kind === "home" || payload.kind === "page" ? payload.sections : [];
  const trustIndex = sections.findIndex((s) => s.type === "trust");
  const ctaIndex = sections.findIndex((s) => s.type === "final-cta");
  const learningIndex =
    trustIndex >= 0 ? trustIndex : ctaIndex >= 0 ? ctaIndex : sections.length;
  if (payload.kind === "home" || payload.kind === "page")
    return (
      <>
        {payload.kind !== "home" && (
          <PageHero
            eyebrow={payload.eyebrow}
            title={payload.headline}
            description={payload.summary}
          />
        )}{" "}
        {payload.legal_draft && (
          <Container>
            <aside className="my-8 rounded-xl border border-border bg-warning-soft p-5 text-warning">
              <h2 className="font-semibold">
                پیش‌نویس برای بازبینی؛ هنوز مصوب نیست
              </h2>
              <p className="mt-2 leading-8">
                این متن پیش از انتشار نهایی به بازبینی و تأیید نیاز دارد.
              </p>
            </aside>
          </Container>
        )}
        {payload.document ? (
          <BuilderRenderer
            document={payload.document}
            context={{
              content,
              features: props.features || [],
              audiences: props.audiences || [],
              faqs: props.faqs || [],
              articles: [],
              privatePreview,
            }}
          />
        ) : (
          (payload as LandingPayload).sections.map((section, index) => (
            <Fragment key={index}>
              {payload.kind === "home" &&
                index === learningIndex &&
                props.learning}
              <SectionContent
                {...props}
                key={index}
                section={section}
                index={index}
              />
            </Fragment>
          ))
        )}
        {payload.kind === "home" &&
          (payload.document || learningIndex === sections.length) &&
          props.learning}
      </>
    );
  if (payload.kind === "feature") {
    const image = content.media.find((m) => m.id === payload.image_media_id);
    return (
      <>
        <PageHero
          eyebrow={payload.eyebrow}
          title={payload.headline}
          description={payload.summary}
          parent={{ label: "امکانات", href: "/features" }}
          ctaLabel={
            payload.readiness === "roadmap"
              ? "مشاهده امکانات آماده"
              : "درخواست دموی ماکان"
          }
          ctaHref={payload.readiness === "roadmap" ? "/features" : "/demo"}
        >
          <StatusBadge status={payload.readiness} />
        </PageHero>
        <section className="section-space">
          <Container>
            <SectionHeading
              title={
                payload.readiness === "roadmap"
                  ? "جهت‌گیری توسعه"
                  : "کارکرد در زندگی روزمره مدرسه"
              }
            />
            <ContentGrid
              media={content.media}
              privatePreview={privatePreview}
              items={payload.benefits}
            />
            <div className="mt-8">
              {payload.readiness === "roadmap" ? (
                <aside className="rounded-xl bg-warning-soft p-6 leading-8 text-warning">
                  <h2 className="text-xl font-semibold">
                    در نقشه راه؛ بدون دموی فعال
                  </h2>
                  <p>
                    Copilot · نمای مفهومی نقشه راه؛ این بخش دموی هوش مصنوعی
                    نیست.
                  </p>
                </aside>
              ) : image ? (
                <MediaImage image={image} privatePreview={privatePreview} />
              ) : (
                <ProductVisual title={`نمای ${payload.title}`} />
              )}
            </div>
          </Container>
        </section>
        <section className="section-space border-y border-border bg-card">
          <Container>
            <SectionHeading title="مسیر استفاده" />
            <ContentGrid
              media={content.media}
              privatePreview={privatePreview}
              items={payload.workflow}
              numbered
            />
            <aside className="mt-8 rounded-xl bg-secondary p-6 leading-8">
              {payload.boundary}
            </aside>
            {payload.body_html && (
              <RichText
                privatePreview={privatePreview}
                html={payload.body_html}
              />
            )}
          </Container>
        </section>
        <CallToAction
          href={payload.readiness === "roadmap" ? "/features" : "/demo"}
          label={
            payload.readiness === "roadmap"
              ? "آشنایی با امکانات آماده"
              : "درخواست دموی ماکان"
          }
        />
      </>
    );
  }
  if (payload.kind === "audience")
    return (
      <>
        <PageHero
          eyebrow={payload.eyebrow}
          title={payload.headline}
          description={payload.summary}
          parent={{ label: "راهکارها", href: "/solutions" }}
          ctaLabel={payload.cta}
          ctaHref={payload.cta_href}
        />
        <section className="section-space">
          <Container>
            <SectionHeading title="کدام هماهنگی‌ها وقت بیشتری می‌گیرند؟" />
            <ul className="space-y-4">
              {payload.pains.map((p, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-card p-5 leading-8"
                >
                  {p}
                </li>
              ))}
            </ul>
          </Container>
        </section>
        <section className="section-space border-y border-border bg-card">
          <Container>
            <SectionHeading title="یک مسیر مشخص برای نیازهای شما." />
            <ContentGrid
              media={content.media}
              privatePreview={privatePreview}
              items={payload.benefits}
            />
          </Container>
        </section>
        <section className="section-space">
          <Container>
            <SectionHeading title="چطور این بخش‌ها کنار هم قرار می‌گیرند؟" />
            <ContentGrid
              media={content.media}
              privatePreview={privatePreview}
              items={payload.journey}
              numbered
            />
            <aside className="mt-8 rounded-xl bg-secondary p-6 leading-8">
              {payload.boundary}
            </aside>
            {payload.body_html && (
              <RichText
                privatePreview={privatePreview}
                html={payload.body_html}
              />
            )}
          </Container>
        </section>
        <section className="section-space border-y border-border bg-card">
          <Container>
            <SectionHeading title="امکانات مرتبط" />
            <div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
              {props.features
                ?.filter((f) => payload.related.includes(f.slug))
                .map((f) => (
                  <FeatureCard key={f.slug} feature={f} />
                ))}
            </div>
          </Container>
        </section>
        <CallToAction label={payload.cta} href={payload.cta_href} />
      </>
    );
  if (payload.kind !== "faq") return null;
  return (
    <Container>
      <h1 className="my-8 text-3xl font-semibold">{payload.question}</h1>
      <FaqList items={[{ id: content.slug, ...payload }]} />
    </Container>
  );
}
