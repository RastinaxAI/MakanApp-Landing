import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { MediaImage } from "@/features/cms/media-image";
import { RichText } from "@/features/cms/rich-text";
import { InlineRichEditor } from "./inline-rich-editor";
import { FeatureCard } from "@/features/marketing/feature-card";
import { AudienceCard } from "@/features/marketing/audience-card";
import { Container } from "@/components/layout/container";
import { SectionContent } from "@/features/cms/section-content";
import { SourceLink as Link } from "@/features/leads/source-link";
import { RequestForm } from "@/features/leads/request-form";
import { FaqList } from "@/features/marketing/faq-list";
import { ProductPreview } from "@/features/marketing/product-preview";
import {
  PremiumDemoInvitation,
  PremiumFeatureStory,
  PremiumHero,
} from "@/features/marketing/premium";
import { DetailIntroduction } from "@/features/marketing/premium-sections";
import { AparatPlayer } from "@/features/learning/player";
import { EditableHeading, WidgetCarousel, WidgetTabs } from "./interactive";
import type { BuilderContext, VisualNode } from "./types";
import { nodeCSS } from "./styles";

const icons = {
  school: GraduationCap,
  message: MessageCircle,
  users: Users,
  book: BookOpen,
  check: Check,
  shield: ShieldCheck,
  arrow: ArrowLeft,
  star: Star,
};
function safeHref(value = "/demo") {
  return /^\/(?!\/)/.test(value) ||
    /^#[\w-]+$/.test(value) ||
    /^https:\/\//.test(value)
    ? value
    : "/demo";
}
export function Widget({
  node,
  context,
  children,
  scope = "",
  onInlineEdit,
}: {
  node: VisualNode;
  context: BuilderContext;
  children?: ReactNode;
  scope?: string;
  onInlineEdit?: (text: string) => void;
}) {
  const p = node.props;
  const image = context.content.media.find((asset) => asset.id === p.media_id);
  const imageOf = (id?: string | null) =>
    context.content.media.find((asset) => asset.id === id);
  const items = p.items || [];
  let output: ReactNode;
  switch (node.type) {
    case "Container":
    case "Grid":
      output = children;
      break;
    case "Heading":
      output = (
        <EditableHeading
          title={p.title || "عنوان"}
          level={p.level || 2}
          editing={context.editing}
          onEdit={onInlineEdit}
        />
      );
      break;
    case "RichText":
      output = context.editing ? (
        <InlineRichEditor
          label="ویرایش متن در صفحه"
          value={p.body_html || ""}
          onChange={(html) => onInlineEdit?.(html)}
          assets={context.assets}
        />
      ) : (
        <RichText
          html={p.body_html || ""}
          privatePreview={context.privatePreview}
        />
      );
      break;
    case "Image":
      output = image ? (
        <MediaImage image={image} privatePreview={context.privatePreview} />
      ) : (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-input p-5 text-muted-foreground">
          تصویر را از رسانه‌ها انتخاب کنید.
        </div>
      );
      break;
    case "Video":
      output = p.aparat_id ? (
        <AparatPlayer
          id={p.aparat_id}
          title={p.title || "ویدیو"}
          poster={image}
          privatePreview={context.privatePreview}
        />
      ) : (
        <p>شناسهٔ معتبر آپارات را وارد کنید.</p>
      );
      break;
    case "Button":
      output = (
        <Link
          href={safeHref(p.href)}
          className="builder-widget-control premium-button premium-button-blue"
        >
          {p.label || p.title || "درخواست دمو"}
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      );
      break;
    case "Icon": {
      const Icon = icons[p.icon || "school"];
      const label = p.title?.trim();
      output = (
        <span
            className="builder-widget-control inline-flex size-14 items-center justify-center rounded-xl bg-secondary text-2xl text-primary-hover"
            role={label ? "img" : undefined}
            aria-label={label || undefined}
            aria-hidden={label ? undefined : true}
        >
            <Icon aria-hidden="true" className="size-[1em]" />
        </span>
      );
      break;
    }
    case "Gallery":
      output = (
        <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {items.map((item, index) => {
            const asset = imageOf(item.media_id);
            return asset ? (
              <figure key={index}>
                <MediaImage
                  image={asset}
                  privatePreview={context.privatePreview}
                />
                {item.title && (
                  <figcaption className="mt-2 text-sm">{item.title}</figcaption>
                )}
              </figure>
            ) : null;
          })}
        </div>
      );
      break;
    case "Carousel":
      output = (
        <WidgetCarousel
          slides={items.map((item, index) => {
            const asset = imageOf(item.media_id);
            return (
              <figure key={index}>
                {asset && (
                  <MediaImage
                    image={asset}
                    privatePreview={context.privatePreview}
                  />
                )}
                <figcaption className="mt-3 text-center">
                  {item.title}
                </figcaption>
              </figure>
            );
          })}
        />
      );
      break;
    case "Tabs":
      output = (
        <WidgetTabs
          items={
            context.editing
              ? items.map((item) => ({ ...item, body_html: undefined }))
              : items
          }
        />
      );
      break;
    case "Accordion":
      output = (
        <FaqList
          items={items.map((item, index) => ({
            id: `${node.id}_${index}`,
            question: item.title || "عنوان",
            answer: item.text || "",
            answer_html: context.editing ? undefined : item.body_html,
          }))}
        />
      );
      break;
    case "FAQ":
      output = (
        <FaqList
          items={
            p.faq_slugs?.length
              ? p.faq_slugs.flatMap((slug) =>
                  context.faqs.filter((faq) => faq.id === slug),
                )
              : context.faqs
          }
        />
      );
      break;
    case "Features":
      output = (
        <div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
          {(items.length
            ? items
            : context.features.map((feature) => ({
                title: feature.title,
                text: feature.summary,
                href: `/features/${feature.slug}`,
              }))
          ).map((item, index) => (
            <article key={index} className="border-s-2 border-primary ps-5">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="my-3 text-muted-foreground">{item.text}</p>
              {item.href && (
                <Link
                  href={safeHref(item.href)}
                  className="inline-flex min-h-11 items-center text-primary-hover"
                >
                  آشنایی بیشتر <ArrowLeft size={17} aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      );
      break;
    case "Statistics":
      output = (
        <dl className="grid gap-6 tablet:grid-cols-3">
          {items.map((item, index) => (
            <div key={index}>
              <dt className="text-sm text-muted-foreground">{item.title}</dt>
              <dd className="mt-2 text-4xl font-semibold text-primary-hover">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      );
      break;
    case "Testimonials":
      output = (
        <div className="grid gap-6 tablet:grid-cols-2">
          {items.map((item, index) => (
            <figure key={index} className="border-s-2 border-primary ps-5">
              <blockquote className="text-lg leading-9">{item.text}</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                {item.attribution || item.title}
              </figcaption>
            </figure>
          ))}
        </div>
      );
      break;
    case "CTA":
      output = (
        <PremiumDemoInvitation
          title={p.title || "مدرسهٔ شما، قدم بعدی."}
          description={p.text || ""}
          label={p.label}
          href={safeHref(p.href)}
        />
      );
      break;
    case "DemoForm":
    case "ContactForm":
      output = context.editing ? (
        <div className="rounded-xl border border-dashed border-primary bg-secondary p-8">
          <h3 className="text-xl font-semibold">
            {node.type === "DemoForm"
              ? "فرم واقعی درخواست دمو"
              : "فرم واقعی تماس"}
          </h3>
          <p className="mt-3">
            در صفحهٔ منتشرشده به سامانهٔ درخواست‌های سایت متصل است. هنگام طراحی،
            ثبت درخواست انجام نمی‌شود.
          </p>
        </div>
      ) : (
        <RequestForm kind={node.type === "DemoForm" ? "demo" : "contact"} />
      );
      break;
    case "Pricing":
      output = (
        <div className="grid gap-6 tablet:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={index}
              className="rounded-2xl border border-border p-6"
            >
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="my-5 text-3xl font-semibold">{item.value}</p>
              <p>{item.text}</p>
              <Link
                href={safeHref(item.href || p.href)}
                className="mt-5 inline-flex min-h-11 items-center text-primary-hover"
              >
                {p.label || "درخواست مشاوره"}
              </Link>
            </article>
          ))}
        </div>
      );
      break;
    case "ProductShowcase":
      output = (
        <ProductPreview
          features={context.features.filter(
            (feature) => !p.feature_slug || feature.slug === p.feature_slug,
          )}
          privatePreview={context.privatePreview}
        />
      );
      break;
    case "ArticleList":
      output = (
        <div className="grid gap-5 tablet:grid-cols-3">
          {context.articles.slice(0, p.limit || 3).map((article) => (
            <article key={article.id} className="border-b border-border pb-5">
              <p className="text-sm text-primary-hover">آموزش ماکان</p>
              <h3 className="mt-3 text-xl font-semibold">
                <Link
                  href={`/learn/${article.kind === "video" ? "videos" : "articles"}/${article.slug}`}
                >
                  {article.title}
                </Link>
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {article.payload.summary}
              </p>
            </article>
          ))}
          {!context.articles.length && (
            <p className="text-muted-foreground">
              هنوز مقاله‌ای منتشر نشده است.
            </p>
          )}
        </div>
      );
      break;
    case "LegacySection":
      output = p.legacy_section ? (
        <SectionContent
          {...context}
          section={p.legacy_section}
          index={`${scope}_${node.id}`}
        />
      ) : null;
      break;
    case "Hero":
      output =
        context.content.payload.kind === "feature" ||
        context.content.payload.kind === "audience" ? (
          <DetailIntroduction
            kind={context.content.payload.kind}
            roadmap={
              context.content.payload.kind === "feature" &&
              context.content.payload.readiness === "roadmap"
            }
            slug={context.content.slug}
            image={image}
            privatePreview={context.privatePreview}
            section={{
              type: "hero",
              title: p.title || "",
              accent: p.accent,
              kicker: p.kicker,
              description: p.text || "",
              items: [],
              cta_label: p.label,
              cta_href: p.href,
            }}
          />
        ) : (
          <PremiumHero
            section={{
              type: "hero",
              title: p.title || "",
              accent: p.accent,
              kicker: p.kicker,
              description: p.text || "",
              items: items.map((item) => ({
                title: item.title || "",
                description: item.text || "",
              })),
              cta_href: p.href,
              cta_label: p.label,
            }}
            image={image}
            privatePreview={context.privatePreview}
          />
        );
      break;
    case "FeatureIndex":
    case "AudienceIndex":
      output = (
        <section className="section-space">
          <Container>
            {p.title && (
              <h2 className="builder-widget-title mb-6 text-2xl font-semibold">
                {p.title}
              </h2>
            )}
            {!p.title && (
              <h2 className="sr-only">
                {node.type === "FeatureIndex" ? "فهرست امکانات ماکان" : "ماکان برای مخاطبان"}
              </h2>
            )}
            <div className="grid gap-6 tablet:grid-cols-2">
              {node.type === "FeatureIndex"
                ? context.features.map((feature) => (
                    <FeatureCard key={feature.slug} feature={feature} />
                  ))
                : context.audiences.map((audience) => (
                    <AudienceCard key={audience.slug} audience={audience} />
                  ))}
            </div>
          </Container>
        </section>
      );
      break;
    case "FeatureStory": {
      const feature = context.features.find(
        (item) => item.slug === p.feature_slug,
      );
      output = feature ? (
        <PremiumFeatureStory
          storyId={`story-${scope}-${node.id}`}
          feature={feature}
          privatePreview={context.privatePreview}
        />
      ) : (
        <p>قابلیت منتشرشده‌ای انتخاب نشده است.</p>
      );
      break;
    }
  }
  return (
    <div
      data-node-id={node.id}
      data-widget={node.type}
      className={`builder-node ${node.type === "Heading" ? "text-3xl font-bold" : ""}`}
    >
      <style>{nodeCSS(node, scope, context.privatePreview)}</style>
      {output}
    </div>
  );
}
