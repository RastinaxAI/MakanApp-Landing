import { getSeoStatus } from "@/lib/public-api";
import { escapeXml as xml } from "@/lib/sitemap";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSeoStatus();
  const urls =
    s.enabled && s.origin
      ? (Object.keys(s.counts) as (keyof typeof s.counts)[]).flatMap((group) =>
          Array.from(
            { length: Math.ceil(s.counts[group] / s.shard_size) },
            (_, id) =>
              `${s.origin}/${group === "learning" ? "learn" : "sitemaps/pages"}/sitemap/${id}.xml`,
          ),
        )
      : [];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join("")}</sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
