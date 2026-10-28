import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

// Invoked by test-web-admin.ps1 with an owned, isolated PostgreSQL/API fixture.
if (
  process.env.E2E_SEO_FIXTURES !== "1" ||
  process.env.API_INTERNAL_URL !== "http://127.0.0.1:8100"
)
  throw new Error("Isolated SEO fixture required");
const root = path.resolve("../..");
const outputRoot = path.join(root, "docs/qa/step9/lighthouse");
const runId = new Date().toISOString().replaceAll(":", "-");
const output = path.join(outputRoot, runId);
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { cwd: path.join(root, "apps/web"), stdio: "ignore", windowsHide: true },
);
const routes = [
  "/",
  "/features",
  "/solutions/schools",
  "/demo",
  "/learn/articles/seo-article",
  "/learn/videos/seo-video",
];
const all = [];
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null)
      throw new Error("Owned production server exited");
    try {
      if ((await fetch("http://127.0.0.1:3100/")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("Production server did not become ready");
  for (const route of routes)
    for (let run = 1; run <= 3; run++) {
      const chrome = await launch({
        chromePath:
          "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        chromeFlags: ["--headless", "--disable-gpu", "--no-first-run"],
        handleSIGINT: false,
      });
      try {
        const result = await lighthouse(`http://127.0.0.1:3100${route}`, {
          port: chrome.port,
          output: "json",
          logLevel: "error",
          onlyCategories: [
            "performance",
            "seo",
            "accessibility",
            "best-practices",
          ],
        });
        if (!result) throw new Error("No Lighthouse result");
        const file = `${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${run}.json`;
        await writeFile(
          path.join(output, file),
          JSON.stringify(result.lhr, null, 2),
        );
        const l = result.lhr;
        const scores = Object.fromEntries(
          Object.entries(l.categories).map(([name, value]) => [
            name,
            value.score === null ? null : Math.round(value.score * 100),
          ]),
        );
        const row = {
          route,
          run,
          file,
          version: l.lighthouseVersion,
          userAgent: l.environment.hostUserAgent,
          settings: l.configSettings,
          scores,
          lcp_ms: l.audits["largest-contentful-paint"].numericValue,
          cls: l.audits["cumulative-layout-shift"].numericValue,
          tbt_ms: l.audits["total-blocking-time"].numericValue,
          runtimeError: l.runtimeError || null,
        };
        all.push(row);
        await writeFile(
          path.join(output, "runs.json"),
          JSON.stringify(all, null, 2),
        );
        console.log(
          JSON.stringify({
            route,
            run,
            scores,
            lcp_ms: row.lcp_ms,
            cls: row.cls,
          }),
        );
      } finally {
        await chrome.kill();
      }
    }
  const median = (values) => [...values].sort((a, b) => a - b)[1];
  const medians = routes.map((route) => {
    const rows = all.filter((r) => r.route === route);
    return {
      route,
      performance: median(rows.map((r) => r.scores.performance)),
      seo: median(rows.map((r) => r.scores.seo)),
      accessibility: median(rows.map((r) => r.scores.accessibility)),
      lcp_ms: median(rows.map((r) => r.lcp_ms)),
      cls: median(rows.map((r) => r.cls)),
    };
  });
  const passed =
    all.length === 18 &&
    all.every((r) => !r.runtimeError) &&
    medians.every((r) => r.performance >= 90 && r.seo >= 90);
  const summary = {
    passed,
    environment:
      "local HTTP production build; isolated real PostgreSQL; fixture article/video; not HTTPS staging or field data",
    cold_cache: true,
    runs_per_route: 3,
    medians,
    runId,
  };
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  await writeFile(
    path.join(outputRoot, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  if (!passed) process.exitCode = 1;
} finally {
  if (server.exitCode === null) {
    const stopped = new Promise((r) => server.once("exit", r));
    server.kill();
    await stopped;
  }
}
