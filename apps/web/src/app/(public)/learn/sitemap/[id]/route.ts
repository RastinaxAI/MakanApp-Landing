import { sitemapResponse } from "@/lib/sitemap";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return sitemapResponse("learning", (await params).id);
}
