import { Library, type Search } from "@/features/learning/public";
import { publicGet } from "@/lib/public-api";
import type { Taxonomy } from "@/features/learning/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await publicGet<Taxonomy>(
    `learn/categories/${encodeURIComponent((await params).slug)}`,
  );
  return { title: c.title, robots: { index: false, follow: false } };
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
