// Read-only screenshots of the public website URL supplied by the user.
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const origin = process.env.SITE_GUIDE_BASE_URL || "http://127.0.0.1:3100";
  if (!["http://127.0.0.1:3100", "http://127.0.0.1:3300"].includes(origin))
    throw new Error(
      "Only the supplied local site or its owned read-only preview is allowed.",
    );
  const routes = {
    home: "/",
    features: "/features",
    solutions: "/solutions",
    about: "/about",
    learn: "/learn",
    blog: "/blog",
    faq: "/faq",
    demo: "/demo",
    contact: "/contact",
  };
  const directory = path.resolve("apps/web/public/guides/site");
  await fs.mkdir(directory, { recursive: true });
  const browser = await chromium.launch(
    process.platform === "win32" ? { channel: "msedge" } : {},
  );
  const manifest = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
    });
    const blocked = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        blocked.push({
          method: request.method(),
          path: new URL(request.url()).pathname,
        });
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    for (const [name, route] of Object.entries(routes)) {
      const response = await page.goto(`${origin}${route}`);
      if (response?.status() !== 200)
        throw new Error(`${route}: ${response?.status()}`);
      await page.locator("h1").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content: ".site-guide-location { display: none !important; }",
      });
      await page.screenshot({
        path: path.join(directory, `${name}.png`),
        animations: "disabled",
      });
      manifest.push({
        name,
        source: `${origin}${route}`,
        width: 1440,
        height: 960,
      });
    }
    await fs.writeFile(
      "docs/qa/illustrated-help/site-guide-assets.json",
      JSON.stringify(
        {
          captures: manifest,
          write_requests_blocked: blocked,
          forms_submitted: 0,
          authenticated: false,
        },
        null,
        2,
      ),
    );
    console.log(
      `${manifest.length} real public screenshots captured; no forms submitted.`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
