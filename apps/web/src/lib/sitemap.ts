import type { MetadataRoute } from "next";
import { getSeoStatus, publicGet } from "./public-api";
export const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
export async function sitemapResponse(group: "pages" | "learning", id: string) {
  if (!/^\d{1,6}\.xml$/.test(id))
    return new Response("Not found", { status: 404 });
  const entries = await sitemapShard(group, id.slice(0, -4));
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escapeXml(entry.url)}</loc><lastmod>${escapeXml(String(entry.lastModified))}</lastmod></url>`).join("")}</urlset>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
export async function sitemapShard(
  group: "pages" | "learning",
  id: string,
): Promise<MetadataRoute.Sitemap> {
  if (!/^\d{1,6}$/.test(id)) return [];
  const s = await getSeoStatus();
  if (!s.enabled || !s.origin) return [];
  const data = await publicGet<{
    items: { path: string; updated_at: string }[];
  }>(`seo/sitemap?group=${group}&shard=${id}`);
  return data.items.map((item) => ({
    url: new URL(item.path, s.origin!).href,
    lastModified: item.updated_at,
  }));
}
