import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import lighthouse from "lighthouse";
import desktop from "lighthouse/core/config/desktop-config.js";
import { launch } from "chrome-launcher";

// Read-only lab measurement of the running local Docker website, not field data.
const origin = process.env.PUBLIC_TEST_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Use an explicit local HTTP origin");
const output = path.resolve("docs/qa/public-polish/lighthouse");
await mkdir(output, { recursive: true });
const rows = [];
for (const entry of [
  { route: "/", mode: "mobile", runs: 3 },
  { route: "/", mode: "desktop", runs: 1 },
  { route: "/demo", mode: "mobile", runs: 1 },
  { route: "/learn", mode: "mobile", runs: 1 },
]) {
  for (let run = 1; run <= entry.runs; run++) {
    const chrome = await launch({
      chromePath: process.env.CHROME_PATH,
      chromeFlags: ["--headless", "--disable-gpu", "--no-first-run"],
      handleSIGINT: false,
    });
    try {
      const result = await lighthouse(
        origin + entry.route,
        {
          port: chrome.port,
          output: "json",
          logLevel: "error",
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
        },
        entry.mode === "desktop" ? desktop : undefined,
      );
      if (!result) throw new Error("No Lighthouse result");
      const lhr = result.lhr;
      const scores = Object.fromEntries(
        Object.entries(lhr.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      );
      const name = `${entry.route === "/" ? "home" : entry.route.slice(1)}-${entry.mode}-${run}`;
      await writeFile(path.join(output, `${name}.json`), JSON.stringify(lhr));
      rows.push({
        route: entry.route,
        mode: entry.mode,
        run,
        scores,
        runtimeError: lhr.runtimeError || null,
        lcp_ms: lhr.audits["largest-contentful-paint"].numericValue,
        cls: lhr.audits["cumulative-layout-shift"].numericValue,
        tbt_ms: lhr.audits["total-blocking-time"].numericValue,
      });
      await writeFile(
        path.join(output, "runs.json"),
        JSON.stringify(rows, null, 2),
      );
      console.log(JSON.stringify(rows.at(-1)));
    } finally {
      await chrome.kill();
    }
  }
}
const homepageMobile = rows.filter(
  (row) => row.route === "/" && row.mode === "mobile",
);
const median = (values) =>
  values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
await writeFile(
  path.join(output, "summary.json"),
  JSON.stringify(
    {
      origin,
      environment:
        "Local Docker HTTP, Lighthouse simulated throttling, no external domain; lab data only. Indexing intentionally disabled until the final domain is configured.",
      rows,
      home_mobile_medians: Object.fromEntries(
        ["performance", "accessibility", "best-practices", "seo"].map((key) => [
          key,
          median(homepageMobile.map((row) => row.scores[key])),
        ]),
      ),
    },
    null,
    2,
  ),
);
if (rows.some((row) => row.runtimeError)) process.exitCode = 1;
