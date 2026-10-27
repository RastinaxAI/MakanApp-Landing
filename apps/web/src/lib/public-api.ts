import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { backendUrl } from "./admin-api";
import { backendRead } from "./backend-read";
import { coalescePublicRead } from "./public-read-coalescer";
import type {
  CmsContent,
  CmsPage,
  CmsSettings,
  FaqCategory,
} from "@/features/cms/types";

export const publicGet = cache(async <T>(path: string): Promise<T> => {
  const url = backendUrl(path);
  return coalescePublicRead(url.href, async () => {
    const started = Date.now();
    let result: Response;
    try {
      result = await backendRead(url, {
        cache: "no-store",
        redirect: "manual",
      });
    } catch (error) {
      console.error("public_content_read_failed", {
        path: url.pathname,
        duration_ms: Date.now() - started,
        reason: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }
    if (result.status === 404) notFound();
    if (!result.ok) throw new Error("Published content service unavailable");
    return result.json() as Promise<T>;
  });
});
export const getPage = (slug: string) =>
  publicGet<CmsContent>(`pages/${encodeURIComponent(slug)}`);
export const getSettings = () => publicGet<CmsSettings>("site/settings");
export type SeoStatus = {
  origin: string | null;
  enabled: boolean;
  shard_size: number;
  counts: { pages: number; learning: number };
};
export const getSeoStatus = () => publicGet<SeoStatus>("seo/status");
export const getFeatures = () =>
  publicGet<CmsPage<CmsContent>>("features?page_size=100");
export const getAudiences = () =>
  publicGet<CmsPage<CmsContent>>("audiences?page_size=100");
export const getFaqs = (category?: string) =>
  publicGet<CmsPage<CmsContent>>(
    `faqs?page_size=100${category ? `&category_id=${encodeURIComponent(category)}` : ""}`,
  );
export const getCategories = () => publicGet<FaqCategory[]>("faq-categories");
export async function pageMetadata(
  content: CmsContent,
  path: string,
  options: { noindex?: boolean } = {},
): Promise<Metadata> {
  const [settings, status] = await Promise.all([getSettings(), getSeoStatus()]);
  const title =
    content.seo.title ||
    (content.kind === "home" ? settings.seo.default_title : content.title);
  const description =
    content.seo.description ||
    ("summary" in content.payload ? content.payload.summary : content.title) ||
    settings.seo.default_description;
  const url = status.origin ? new URL(path, status.origin).href : undefined;
  const imageId = content.seo.og_media_id || settings.seo.og_media_id;
  const image =
    imageId && status.origin
      ? new URL(`/api/v1/media/${imageId}/file`, status.origin).href
      : undefined;
  const imageInfo = imageId
    ? content.media.find((m) => m.id === imageId) ||
      (await publicGet<{ width: number; height: number; alt_text: string }>(
        `media/${imageId}`,
      ))
    : undefined;
  const eligibility =
    status.enabled && !options.noindex && content.seo.indexable
      ? await publicGet<{ indexable: boolean }>(
          `seo/page?path=${encodeURIComponent(path)}`,
        )
      : { indexable: false };
  const images = image
    ? [
        {
          url: image,
          ...(imageInfo
            ? {
                width: imageInfo.width,
                height: imageInfo.height,
                alt: imageInfo.alt_text,
              }
            : {}),
        },
      ]
    : undefined;
  return {
    title: {
      absolute:
        path === "/" ? title : `${title} | ${settings.general.brand_name}`,
    },
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fa_IR",
      siteName: settings.general.brand_name,
      ...(url ? { url } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
    robots: { index: eligibility.indexable, follow: true },
  };
}
