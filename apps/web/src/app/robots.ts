import type { MetadataRoute } from "next";

// Entire STEP 2 specimen is a review build, not an indexable marketing release.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
