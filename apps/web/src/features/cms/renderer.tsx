import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { PageHero } from "@/components/marketing/page-hero";
import { ProductVisual } from "@/components/marketing/product-visual";
import { CallToAction } from "@/components/marketing/call-to-action";
import { ContentGrid } from "@/components/marketing/content-grid";
import { FeatureIcon } from "@/components/marketing/feature-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { AudienceCard } from "@/features/marketing/audience-card";
import { FeatureCard } from "@/features/marketing/feature-card";
import { ProductPreview } from "@/features/marketing/product-preview";
import { FaqList, type FaqItem } from "@/features/marketing/faq-list";
import { MediaImage } from "./media-image";
import { RichText } from "./rich-text";
import type { Audience, Feature } from "@/features/marketing/content";
import type { CmsContent, CmsSection, LandingPayload } from "./types";

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
type Props = {
  content: CmsContent;
  features?: Feature[];
  audiences?: Audience[];
  faqs?: FaqItem[];
  privatePreview?: boolean;
};

function SectionContent({
  section,
  index,
  ...props
}: Props & { section: CmsSection; index: number }) {
  const {
    content,
    features = [],
    audiences = [],
    faqs = [],
    privatePreview = false,
  } = props;
  const image = content.media.find((m) => m.id === section.media_id);
  const headingId = `cms-section-${index}`;
  if (section.type === "hero")
    return (
      <section
        className="border-b border-border bg-card"
        data-section="hero"
        aria-labelledby="hero-title"
      >
        <Container className="hero-grid">
          <div>
            <p className="mb-6 inline-flex rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-primary-hover">
              {section.kicker}
            </p>
            <h1 id="hero-title" className="hero-heading">
              {section.title}
              <br />
              <span className="text-primary">{section.accent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-muted-foreground">
              {section.description}
            </p>
            {section.body_html && (
              <RichText
                html={section.body_html}
                privatePreview={privatePreview}
              />
            )}
            <div className="mt-8 flex flex-col gap-3 tablet:flex-row">
              <Button asChild size="lg">
                <Link href={section.cta_href || "/demo"}>
                  {section.cta_label}
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/features">مشاهده امکانات</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground">
              {section.items.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  <Check
                    size={16}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  {item.title}
                </span>
              ))}
            </div>
          </div>
          {image ? (
            <MediaImage
              image={image}
              priority
              privatePreview={privatePreview}
            />
          ) : (
            <ProductVisual phone />
          )}
        </Container>
      </section>
    );
  if (section.type === "final-cta")
    return (
      <>
        <CallToAction
          title={section.title}
          description={section.description}
          label={section.cta_label}
          href={section.cta_href}
        />
        <Container>
          {section.body_html && (
            <RichText
              html={section.body_html}
              privatePreview={privatePreview}
            />
          )}{" "}
          {image && (
            <MediaImage image={image} privatePreview={privatePreview} />
          )}{" "}
          {section.items.length > 0 && (
            <ContentGrid
              items={section.items}
              media={content.media}
              privatePreview={privatePreview}
            />
          )}
        </Container>
      </>
    );
  if (section.type === "trust")
    return (
      <section
        className="section-space border-y border-border bg-card"
        data-section="trust"
      >
        <Container>
          <div className="grid gap-10 desktop:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck
                size={34}
                className="mb-5 text-primary-hover"
                aria-hidden="true"
              />
              <SectionHeading
                id={headingId}
                kicker={section.kicker}
                title={section.title}
                description={section.description}
              />
              {section.body_html && (
                <RichText
                  html={section.body_html}
                  privatePreview={privatePreview}
                />
              )}
              {image && (
                <MediaImage image={image} privatePreview={privatePreview} />
              )}
              <Link
                href={section.cta_href || "/privacy"}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-primary-hover"
              >
                {section.cta_label}
                <ArrowLeft size={17} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h2 className="mb-5 text-2xl font-semibold">پرسش‌های متداول</h2>
              <FaqList
                items={
                  section.faq_slugs?.length
                    ? section.faq_slugs.flatMap((slug) =>
                        faqs.filter((f) => f.id === slug),
                      )
                    : faqs.slice(0, 4)
                }
              />
              <Link
                href="/faq"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-primary-hover"
              >
                همه پرسش‌ها
                <ArrowLeft size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  return (
    <section
      className={`section-space ${["features", "experience", "cards"].includes(section.type) ? "border-y border-border bg-card" : ""}`}
      data-section={section.type}
      aria-labelledby={section.title ? headingId : undefined}
    >
      <Container>
        <SectionHeading
          id={headingId}
          kicker={section.kicker}
          title={section.title}
          description={section.description}
        />
        {section.type === "features" ? (
          <>
            <div className="layout-grid">
              {section.items.map((item, i) => (
                <article
                  key={i}
                  className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-6"
                >
                  <FeatureIcon
                    slug={item.href?.split("/").pop() || "school"}
                    className="mb-5 text-primary-hover"
                  />
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-8 text-muted-foreground">
                    {item.description}
                  </p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-lg pt-5 font-medium text-primary-hover"
                    >
                      آشنایی با {item.title}
                      <ArrowLeft size={16} aria-hidden="true" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {features
              .filter((f) => f.readiness === "roadmap")
              .map((f) => (
                <Link
                  key={f.slug}
                  href={`/features/${f.slug}`}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-warning"
                >
                  <StatusBadge status={f.readiness} />
                  آشنایی با مسیر {f.title} ماکان
                  <ArrowLeft size={16} aria-hidden="true" />
                </Link>
              ))}
          </>
        ) : section.type === "audiences" ? (
          <div className="layout-grid" data-testid="role-grid">
            {audiences.map((a) => (
              <AudienceCard key={a.slug} audience={a} />
            ))}
          </div>
        ) : ["experience", "product-experience"].includes(section.type) ? (
          <ProductPreview features={features} privatePreview={privatePreview} />
        ) : section.type === "faq" ? (
          <FaqList items={faqs} />
        ) : section.type === "onboarding" ? (
          <ol className="layout-grid">
            {section.items.map((item, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="mb-5 inline-flex size-11 items-center justify-center rounded-full bg-secondary font-semibold text-primary-hover">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <ContentGrid
            media={content.media}
            privatePreview={privatePreview}
            items={section.items}
          />
        )}
        {section.body_html && (
          <RichText privatePreview={privatePreview} html={section.body_html} />
        )}
        {image && (
          <div className="mt-6">
            <MediaImage image={image} privatePreview={privatePreview} />
          </div>
        )}
        {section.cta_label && (
          <Link
            href={section.cta_href || "/demo"}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-primary-hover"
          >
            {section.cta_label}
            <ArrowLeft aria-hidden="true" />
          </Link>
        )}
      </Container>
    </section>
  );
}

export function CmsRenderer(props: Props) {
  const { content, privatePreview = false } = props;
  const payload = content.payload;
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
        {(payload as LandingPayload).sections.map((section, index) => (
          <SectionContent
            {...props}
            key={index}
            section={section}
            index={index}
          />
        ))}
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
