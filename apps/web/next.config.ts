import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/api/v1/media/**", search: "" }, { pathname: "/brand/**", search: "" }],
  },
  reactStrictMode: true,
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    optimizePackageImports: ["radix-ui", "zod"],
  },
  // Resolve CMS metadata before sending headers, so missing/mismatched content stays a real 404.
  htmlLimitedBots: /.*/,
};

export default config;
