import type { CmsPayload, CmsSection } from "./types";
import type { VisualNode } from "@/features/builder/types";

/** Fetch catalogues only when the saved document actually uses them. */
export function contentRequirements(payload: CmsPayload) {
  const required = { features: false, audiences: false, faqs: false };
  const section = (item: CmsSection) => {
    if (["features", "experience", "product-experience"].includes(item.type))
      required.features = true;
    if (item.type === "audiences") required.audiences = true;
    if (["faq", "trust"].includes(item.type)) required.faqs = true;
  };
  const visit = (nodes: VisualNode[]) => {
    for (const node of nodes) {
      if (
        ["FeatureIndex", "FeatureStory", "ProductShowcase"].includes(
          node.type,
        ) ||
        (node.type === "Features" && !node.props.items?.length)
      )
        required.features = true;
      if (node.type === "AudienceIndex") required.audiences = true;
      if (node.type === "FAQ") required.faqs = true;
      if (node.type === "LegacySection" && node.props.legacy_section)
        section(node.props.legacy_section);
      visit(node.children);
    }
  };
  if (payload.kind !== "faq" && payload.document) visit(payload.document.nodes);
  else if (payload.kind === "home" || payload.kind === "page")
    payload.sections.forEach(section);
  else if (payload.kind === "audience") required.features = true;
  return required;
}
