import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Reuse Next's image optimizer dependency for a small, reproducible browser asset.
// The owner's original PNG remains untouched; the SVG clips its display corners.
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");
const original = await readFile(new URL("../apps/web/public/brand/makan-logo.png", import.meta.url));
const optimized = await sharp(original).resize(128, 128).webp({ quality: 90 }).toBuffer();
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><clipPath id="rounded"><rect width="128" height="128" rx="16"/></clipPath></defs><image width="128" height="128" clip-path="url(#rounded)" href="data:image/webp;base64,${optimized.toString("base64")}"/></svg>\n`;
await writeFile(new URL("../apps/web/public/brand/makan-icon.svg", import.meta.url), icon);
console.log(`Rounded favicon generated: ${Buffer.byteLength(icon)} bytes; original logo preserved.`);
