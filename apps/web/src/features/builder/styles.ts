import type { DocumentGlobals, StyleValues, VisualNode } from "./types";

export const fontFamilies = {
  sans: "var(--font-vazirmatn),Tahoma,sans-serif",
  serif: "Georgia,serif",
  mono: "monospace",
};
const layoutKeys = new Set([
  "display",
  "direction",
  "wrap",
  "columns",
  "gap",
  "align",
  "justify",
]);
const names: Partial<Record<keyof StyleValues, string>> = {
  display: "display",
  direction: "flex-direction",
  columns: "grid-template-columns",
  gap: "gap",
  wrap: "flex-wrap",
  padding: "padding",
  padding_inline: "padding-inline",
  padding_block: "padding-block",
  margin: "margin",
  margin_inline: "margin-inline",
  margin_block: "margin-block",
  width: "width",
  max_width: "max-width",
  height: "height",
  min_height: "min-height",
  position: "position",
  top: "top",
  inset_start: "inset-inline-start",
  align: "align-items",
  justify: "justify-content",
  text_align: "text-align",
  color: "color",
  background: "background-color",
  border_color: "border-color",
  border_width: "border-width",
  border_style: "border-style",
  radius: "border-radius",
  shadow: "box-shadow",
  font_family: "font-family",
  font_size: "font-size",
  font_weight: "font-weight",
  line_height: "line-height",
  letter_spacing: "letter-spacing",
  transition_ms: "transition-duration",
  hidden: "display",
};
const unitless = new Set(["font_weight", "line_height"]);
const colors = new Set(["color", "background", "border_color"]);
function color(value: string) {
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) || value === "transparent")
    return value;
  return /^global:[a-z][a-z0-9_-]{0,31}$/.test(value)
    ? `var(--builder-${value.slice(7)})`
    : "inherit";
}
function declarations(
  style: StyleValues,
  layout: boolean,
  privatePreview = false,
) {
  const output: string[] = [];
  for (const [rawKey, value] of Object.entries(style)) {
    if (
      value === undefined ||
      value === null ||
      layoutKeys.has(rawKey) !== layout
    )
      continue;
    const key = rawKey as keyof StyleValues;
    const property = names[key];
    if (!property) continue;
    let css: string;
    if (key === "hidden") {
      css = value ? "none" : "block";
    } else if (key === "wrap") {
      css = value ? "wrap" : "nowrap";
    } else if (key === "columns") {
      css = `repeat(${Number(value)},minmax(0,1fr))`;
    } else if (key === "font_family") {
      css =
        fontFamilies[value as keyof typeof fontFamilies] || fontFamilies.sans;
    } else if (key === "shadow") {
      css =
        value === "soft"
          ? "0 8px 32px #172a4b0f"
          : value === "raised"
            ? "0 20px 60px #172a4b20"
            : "none";
    } else if (colors.has(key)) {
      css = color(String(value));
    } else if (key === "width" || key === "max_width" || key === "height") {
      css = /^(?:auto|[0-9.]+(?:px|rem|%|vw|vh))$/.test(String(value))
        ? String(value)
        : "auto";
    } else if (typeof value === "number") {
      css = `${value}${unitless.has(key) ? "" : key === "transition_ms" ? "ms" : "px"}`;
    } else {
      css = /^[a-z-]+$/.test(String(value)) ? String(value) : "inherit";
    }
    output.push(`${property}:${css}`);
  }
  if (!layout && style.gradient_from && style.gradient_to)
    output.push(
      `background-image:linear-gradient(${Number(style.gradient_angle ?? 135)}deg,${color(style.gradient_from)},${color(style.gradient_to)})`,
    );
  else if (
    !layout &&
    style.background_media_id &&
    /^[0-9a-f-]{36}$/i.test(style.background_media_id)
  ) {
    output.push(
      `background-image:url("/api/v1/${privatePreview ? "admin/" : ""}media/${style.background_media_id}/file");background-size:${style.background_size === "contain" ? "contain" : style.background_size === "auto" ? "auto" : "cover"};background-position:center;background-repeat:no-repeat`,
    );
  }
  return output.join(";");
}
export function nodeCSS(node: VisualNode, scope = "", privatePreview = false) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(node.id) ||
    (scope && !/^[a-zA-Z0-9_-]+$/.test(scope))
  )
    return "";
  const selector = `${scope ? `[data-builder-scope="${scope}"] ` : ""}[data-node-id="${node.id}"]`;
  const rule = (style: StyleValues, suffix = "") =>
    `${selector}${suffix}{${declarations(style, false, privatePreview)}}${selector}${suffix}>.builder-layout{${declarations(style, true)}}`;
  return (
    rule(node.styles.base) +
    `@media(max-width:1023px){${rule(node.styles.tablet)}}` +
    `@media(max-width:479px){${rule(node.styles.mobile)}}` +
    rule(node.styles.hover, ":hover") +
    rule(node.styles.focus, ":focus-within") +
    `${selector}{transition-property:color,background-color,border-color,box-shadow}@media(prefers-reduced-motion:reduce){${selector}{transition:none!important}}`
  );
}
export function globalCSS(globals: DocumentGlobals, scope: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(scope)) return "";
  const tokens = Object.entries(globals.colors)
    .filter(
      ([key, value]) =>
        /^[a-z][a-z0-9_-]{0,31}$/.test(key) && /^#[0-9a-f]{6}$/i.test(value),
    )
    .map(([key, value]) => `--builder-${key}:${value}`);
  return `[data-builder-scope="${scope}"]{${tokens.join(";")};--primary:var(--builder-primary);--brand:var(--builder-brand);--foreground:var(--builder-text);--card:var(--builder-surface);font-family:${fontFamilies[globals.font] || fontFamilies.sans}}`;
}
