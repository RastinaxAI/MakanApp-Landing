export type BusinessEvent =
  | "hero_demo_click"
  | "navigation_cta_click"
  | "feature_tab_view"
  | "demo_form_start"
  | "demo_form_submit_success"
  | "demo_form_submit_error"
  | "contact_click"
  | "faq_expand";
export type ErrorKind = "validation" | "server" | "network" | "rate_limit";
export function trackEvent(name: BusinessEvent, error_kind?: ErrorKind) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("makan:analytics", { detail: { name, error_kind } }),
    );
}
export function pageTemplate(path: string): string | null {
  if (
    [
      "/",
      "/features",
      "/solutions",
      "/about",
      "/faq",
      "/demo",
      "/contact",
      "/privacy",
      "/terms",
      "/learn",
      "/blog",
      "/learn/series",
    ].includes(path)
  )
    return path;
  for (const root of [
    "/features",
    "/solutions",
    "/learn/articles",
    "/learn/videos",
    "/learn/series",
    "/learn/categories",
    "/blog",
  ])
    if (new RegExp(`^${root}/[^/]+$`).test(path)) return `${root}/:slug`;
  return null;
}
