import { getSettings, getSeoStatus } from "@/lib/public-api";
import type { CmsContent } from "@/features/cms/types";
import type { FaqItem } from "@/features/marketing/faq-list";
import type { LearningDetail } from "@/features/learning/types";
import { hrefFor } from "@/features/learning/types";
import { headers } from "next/headers";

export async function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      nonce={(await headers()).get("x-nonce") || undefined}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
function breadcrumb(origin: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: new URL(item.path, origin).href,
    })),
  };
}
export async function ContentSeo({
  content,
  faqs = [],
}: {
  content: CmsContent;
  faqs?: readonly FaqItem[];
}) {
  const [settings, status] = await Promise.all([getSettings(), getSeoStatus()]);
  const path =
    content.kind === "home"
      ? "/"
      : content.kind === "feature"
        ? `/features/${encodeURIComponent(content.slug)}`
        : content.kind === "audience"
          ? `/solutions/${encodeURIComponent(content.slug)}`
          : `/${encodeURIComponent(content.slug)}`;
  const items = [
    { name: "خانه", path: "/" },
    ...(content.kind === "feature"
      ? [{ name: "امکانات", path: "/features" }]
      : content.kind === "audience"
        ? [{ name: "راهکارها", path: "/solutions" }]
        : []),
    {
      name:
        "headline" in content.payload
          ? content.payload.headline
          : content.title,
      path,
    },
  ];
  const data: Record<string, unknown>[] = [];
  if (status.origin) {
    if (path === "/")
      data.push(
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.general.brand_name,
          url: status.origin,
          ...(settings.general.logo_approved && settings.general.logo_media_id
            ? {
                logo: `${status.origin}/api/v1/media/${settings.general.logo_media_id}/file`,
              }
            : {}),
        },
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: settings.general.brand_name,
          applicationCategory: "EducationalApplication",
          description: settings.general.tagline,
          url: status.origin,
        },
      );
    else data.push(breadcrumb(status.origin, items));
    if (faqs.length)
      data.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer_html || f.answer,
          },
        })),
      });
  }
  return data.length ? <JsonLd data={data} /> : null;
}
export async function LearningSeo({ content }: { content: LearningDetail }) {
  const status = await getSeoStatus();
  if (!status.origin) return null;
  const p = content.payload;
  const url = new URL(hrefFor(content), status.origin).href;
  const cover = content.media.find((m) => m.id === p.cover_media_id);
  const data: Record<string, unknown>[] = [
    breadcrumb(status.origin, [
      { name: "خانه", path: "/" },
      {
        name: content.kind === "blog" ? "وبلاگ" : "مرکز آموزش",
        path: content.kind === "blog" ? "/blog" : "/learn",
      },
      { name: p.headline, path: hrefFor(content) },
    ]),
  ];
  if (content.kind === "article" || content.kind === "blog")
    data.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.headline,
      description: p.summary,
      inLanguage: "fa",
      mainEntityOfPage: url,
      ...(content.published_at ? { datePublished: content.published_at } : {}),
      dateModified: content.updated_at,
      ...(cover
        ? { image: `${status.origin}/api/v1/media/${cover.id}/file` }
        : {}),
    });
  if (
    content.kind === "video" &&
    p.aparat_id &&
    cover &&
    p.duration_seconds &&
    p.video_uploaded_at &&
    Number.isFinite(Date.parse(p.video_uploaded_at)) &&
    Date.parse(p.video_uploaded_at) <=
      Date.parse(content.published_at || content.updated_at)
  )
    data.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: p.headline,
      description: p.summary,
      thumbnailUrl: `${status.origin}/api/v1/media/${cover.id}/file`,
      uploadDate: p.video_uploaded_at,
      duration: `PT${p.duration_seconds}S`,
      embedUrl: `https://www.aparat.com/video/video/embed/videohash/${p.aparat_id}/vt/frame`,
      inLanguage: "fa",
      url,
    });
  return <JsonLd data={data} />;
}
