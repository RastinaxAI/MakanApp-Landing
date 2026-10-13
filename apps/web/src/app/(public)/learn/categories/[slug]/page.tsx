import { Library, type Search } from "@/features/learning/public";
import { publicGet, getPage, pageMetadata } from "@/lib/public-api";
import type { Taxonomy } from "@/features/learning/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await publicGet<Taxonomy>(
    `learn/categories/${encodeURIComponent((await params).slug)}`,
  );
  const header = await getPage("learn");
  return pageMetadata(
    {
      ...header,
      title: c.title,
      seo: {
        ...header.seo,
        title: c.title,
        description: `آموزش‌های منتشرشده در دسته ${c.title}`,
      },
    },
    `/learn/categories/${encodeURIComponent(c.slug)}`,
    { noindex: true },
  );
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  return <Library category={(await params).slug} search={await searchParams} />;
}
