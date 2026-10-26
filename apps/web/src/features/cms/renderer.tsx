import { SectionContent, type LegacyRendererProps } from "./section-content";
import { BuilderRenderer } from "@/features/builder/renderer";
import { Fragment } from "react";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/marketing/page-hero";
import { FaqList, type FaqItem } from "@/features/marketing/faq-list";
import type { Audience, Feature } from "@/features/marketing/content";
import { ContentSeo } from "@/features/seo/structured-data";
import type { CmsContent, LandingPayload } from "./types";
import { visibleNodes, documentFromContent } from "@/features/builder/types";

export function asFeatures(contents: CmsContent[]): Feature[] {
  return contents.flatMap((c) =>
    c.payload.kind === "feature"
      ? [
          {
            title: c.payload.title,
            eyebrow: c.payload.eyebrow,
            headline: c.payload.headline,
            summary: c.payload.summary,
            readiness: c.payload.readiness,
            benefits: c.payload.benefits,
            workflow: c.payload.workflow,
            boundary: c.payload.boundary,
            audience: c.payload.audience,
            icon: c.payload.icon,
            image_media_id: c.payload.image_media_id,
            slug: c.slug,
            media: c.media,
          },
        ]
      : [],
  );
}
export function asAudiences(contents: CmsContent[]): Audience[] {
  return contents.flatMap((c) =>
    c.payload.kind === "audience"
      ? [
          {
            title: c.payload.title,
            eyebrow: c.payload.eyebrow,
            headline: c.payload.headline,
            summary: c.payload.summary,
            pains: c.payload.pains,
            benefits: c.payload.benefits,
            journey: c.payload.journey,
            related: c.payload.related,
            cta: c.payload.cta,
            cta_href: c.payload.cta_href,
            boundary: c.payload.boundary,
            slug: c.slug,
          },
        ]
      : [],
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
  const legacyFaqs = trust
    ? trust.faq_slugs?.length
      ? trust.faq_slugs.flatMap((slug) =>
          (props.faqs || []).filter((f) => f.id === slug),
        )
      : (props.faqs || []).slice(0, 4)
    : [];
  const selected =
    p.kind !== "faq" && p.document
      ? visibleNodes(p.document.nodes).flatMap((node) => {
          if (
            node.styles.base.hidden === true &&
            node.styles.tablet.hidden !== false &&
            node.styles.mobile.hidden !== false
          )
            return [];
          const section = node.props.legacy_section;
          if (
            node.type !== "FAQ" &&
            !(
              node.type === "LegacySection" &&
              section &&
              ["trust", "faq"].includes(section.type)
            )
          )
            return [];
          const slugs =
            node.type === "FAQ" ? node.props.faq_slugs : section?.faq_slugs;
          return slugs?.length
            ? slugs.flatMap((slug) =>
                (props.faqs || []).filter((faq) => faq.id === slug),
              )
            : section?.type === "trust"
              ? (props.faqs || []).slice(0, 4)
              : props.faqs || [];
        })
      : legacyFaqs;
  const visibleFaqs = selected.filter(
    (faq, index) =>
      selected.findIndex((candidate) => candidate.id === faq.id) === index,
  );
  return (
    <>
      {!props.privatePreview && (
        <ContentSeo content={props.content} faqs={visibleFaqs} />
      )}
      {props.privatePreview ? (
        <div className="public-site">
          <CmsBody {...props} />
        </div>
      ) : (
        <CmsBody {...props} />
      )}
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
        {payload.kind !== "home" && !payload.document && (
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
          ((payload.document &&
            !visibleNodes(payload.document.nodes).some(
              (node) => node.type === "ArticleList",
            )) ||
            (!payload.document && learningIndex === sections.length)) &&
          props.learning}
      </>
    );
  if (payload.kind === "feature" || payload.kind === "audience")
    return (
      <BuilderRenderer
        document={documentFromContent(payload, props.features || [])}
        context={{
          content,
          features: props.features || [],
          audiences: props.audiences || [],
          faqs: props.faqs || [],
          articles: [],
          privatePreview,
        }}
      />
    );
  if (payload.kind !== "faq") return null;
  return (
    <Container>
      <h1 className="my-8 text-3xl font-semibold">{payload.question}</h1>
      <FaqList items={[{ id: content.slug, ...payload }]} />
    </Container>
  );
}
