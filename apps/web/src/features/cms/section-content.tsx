import { SourceLink as Link } from "@/features/leads/source-link";
import { type ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";

import {
  PremiumHero,
  PremiumDemoInvitation,
} from "@/features/marketing/premium";
import {
  DetailIntroduction,
  PremiumProblem,
  PremiumFeatures,
  PremiumAudiences,
  PremiumJourney,
} from "@/features/marketing/premium-sections";
import { ContentGrid } from "@/components/marketing/content-grid";

import { ProductPreview } from "@/features/marketing/product-preview";
import { FaqList, type FaqItem } from "@/features/marketing/faq-list";
import { MediaImage } from "./media-image";
import { RichText } from "./rich-text";
import type { Audience, Feature } from "@/features/marketing/content";
import type { CmsContent, CmsSection } from "./types";

export type LegacyRendererProps = {
  content: CmsContent;
  features?: Feature[];
  audiences?: Audience[];
  faqs?: FaqItem[];
  privatePreview?: boolean;
  learning?: ReactNode;
};

export function SectionContent({
  section,
  index,
  ...props
}: LegacyRendererProps & { section: CmsSection; index: number | string }) {
  const {
    content,
    features = [],
    audiences = [],
    faqs = [],
    privatePreview = false,
  } = props;
  const image = content.media.find((m) => m.id === section.media_id);
  const headingId = `cms-section-${index}`;
  const extras = (
    <>
      {section.body_html && (
        <RichText html={section.body_html} privatePreview={privatePreview} />
      )}
      {image && (
        <div className="mt-7">
          <MediaImage image={image} privatePreview={privatePreview} />
        </div>
      )}
      {section.cta_label && (
        <Link href={section.cta_href || "/demo"} className="premium-story-link">
          {section.cta_label}
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
      )}
    </>
  );
  if (section.type === "hero")
    return content.payload.kind === "feature" ||
      content.payload.kind === "audience" ? (
      <DetailIntroduction
        section={section}
        kind={content.payload.kind}
        roadmap={
          content.payload.kind === "feature" &&
          content.payload.readiness === "roadmap"
        }
        slug={content.slug}
        image={image}
        privatePreview={privatePreview}
      />
    ) : (
      <PremiumHero
        section={section}
        image={image}
        privatePreview={privatePreview}
      />
    );
  if (["challenge", "benefits"].includes(section.type))
    return (
      <PremiumProblem section={section} suffix={String(index)}>
        {extras}
      </PremiumProblem>
    );
  if (section.type === "features")
    return (
      <PremiumFeatures
        section={section}
        features={features}
        suffix={String(index)}
        stories={content.kind === "home"}
      >
        {extras}
      </PremiumFeatures>
    );
  if (section.type === "audiences")
    return (
      <PremiumAudiences
        section={section}
        audiences={audiences}
        suffix={String(index)}
      >
        {extras}
      </PremiumAudiences>
    );
  if (section.type === "onboarding")
    return (
      <PremiumJourney section={section} suffix={String(index)}>
        {extras}
      </PremiumJourney>
    );
  if (section.type === "final-cta")
    return (
      <>
        <PremiumDemoInvitation
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
        {["experience", "product-experience"].includes(section.type) ? (
          <ProductPreview features={features} privatePreview={privatePreview} />
        ) : section.type === "faq" ? (
          <FaqList
            items={
              section.faq_slugs?.length
                ? section.faq_slugs.flatMap((slug) =>
                    faqs.filter((faq) => faq.id === slug),
                  )
                : faqs
            }
          />
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
