import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { backendUrl } from "./admin-api";
import type {
  CmsContent,
  CmsPage,
  CmsSettings,
  FaqCategory,
} from "@/features/cms/types";

export const publicGet = cache(async <T>(path: string): Promise<T> => {
  const result = await fetch(backendUrl(path), {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (result.status === 404) notFound();
  if (!result.ok) throw new Error("Published content service unavailable");
  return result.json() as Promise<T>;
});
export const getPage = (slug: string) =>
  publicGet<CmsContent>(`pages/${encodeURIComponent(slug)}`);
export const getSettings = () => publicGet<CmsSettings>("site/settings");
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
): Promise<Metadata> {
  const settings = await getSettings();
  const title =
    content.seo.title ||
    (content.kind === "home" ? settings.seo.default_title : content.title);
  const description =
    content.seo.description ||
    settings.seo.default_description ||
    ("summary" in content.payload ? content.payload.summary : content.title);
  const url = settings.general.site_url
    ? new URL(path, settings.general.site_url).href
    : undefined;
  const imageId = content.seo.og_media_id || settings.seo.og_media_id;
  const image =
    imageId && settings.general.site_url
      ? new URL(`/api/v1/media/${imageId}/file`, settings.general.site_url).href
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
      ...(url ? { url } : {}),
      ...(image ? { images: [image] } : {}),
    },
    robots: { index: false, follow: false },
  };
}
