import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Resolve CMS metadata before sending headers, so missing/mismatched content stays a real 404.
  htmlLimitedBots: /.*/,
};

export default config;
