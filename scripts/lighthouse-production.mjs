import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const origin = process.env.PRODUCTION_TEST_ORIGIN;
if (!origin || !/^https:\/\/localhost:\d+$/.test(origin)) throw new Error("Isolated HTTPS origin required");
const output = path.resolve("docs/qa/step10/lighthouse");
await mkdir(output, { recursive: true });
const routes = ["/", "/features", "/solutions/schools", "/demo", "/learn/articles/seo-article", "/learn/videos/seo-video"];
const rows = [];
for (const route of routes) {
  for (let run = 1; run <= 3; run++) {
    const chrome = await launch({
      chromePath: process.env.CHROME_PATH,
      // Only isolated internal-CA testing; public acceptance must validate public TLS.
      chromeFlags: ["--headless", "--disable-gpu", "--ignore-certificate-errors", "--no-first-run"],
      handleSIGINT: false,
    });
    try {
      const result = await lighthouse(origin + route, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "seo", "accessibility", "best-practices"] });
      if (!result) throw new Error("No Lighthouse result");
      const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)]));
      const file = `${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${run}.json`;
      await writeFile(path.join(output, file), JSON.stringify(result.lhr));
      rows.push({ route, run, scores, runtimeError: result.lhr.runtimeError || null, cls: result.lhr.audits["cumulative-layout-shift"].numericValue });
      await writeFile(path.join(output, "runs.json"), JSON.stringify(rows, null, 2));
      console.log(JSON.stringify(rows.at(-1)));
    } finally { await chrome.kill(); }
  }
}
const median = (values) => values.sort((a, b) => a - b)[1];
const medians = routes.map((route) => ({ route, ...Object.fromEntries(["performance", "seo", "accessibility", "best-practices"].map((key) => [key, median(rows.filter((row) => row.route === route).map((row) => row.scores[key]))])) }));
const passed = rows.every((row) => !row.runtimeError) && medians.every((row) => row.performance >= 90 && row.seo >= 90);
await writeFile(path.join(output, "summary.json"), JSON.stringify({ passed, origin, environment: "isolated local production Compose HTTPS internal CA, mobile simulated throttling; not public staging or field data", runs_per_route: 3, medians }, null, 2));
if (!passed) process.exitCode = 1;
