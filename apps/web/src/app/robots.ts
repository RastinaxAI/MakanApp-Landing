import type { MetadataRoute } from "next";

import { getSeoStatus } from "@/lib/public-api";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const status = await getSeoStatus();
  return status.enabled && status.origin
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/admin/", "/design-system"],
        },
        sitemap: `${status.origin}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
