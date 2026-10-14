import type { CmsContent } from "@/features/cms/types";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { StatusBadge } from "@/components/ui/status-badge";
import { walkNodes, type VisualDocument } from "./types";
export function hasMainHeading(document: VisualDocument) {
  return walkNodes(document.nodes).some(
    (node) =>
      node.type === "Hero" ||
      (node.type === "Heading" && node.props.level === 1) ||
      (node.type === "LegacySection" &&
        node.props.legacy_section?.type === "hero"),
  );
}
export function DocumentPrelude({
  content,
  document,
}: {
  content: CmsContent;
  document: VisualDocument;
}) {
  const payload = content.payload;
  if (
    payload.kind === "page" &&
    (!document.purpose || document.purpose === "page") &&
    !hasMainHeading(document)
  )
    return (
      <PageHero
        eyebrow={payload.eyebrow}
        title={payload.headline}
        description={payload.summary}
      />
    );
  if (payload.kind === "feature" || payload.kind === "audience")
    return (
      <Container>
        <aside className="my-6 flex flex-wrap items-center gap-3 text-sm leading-8">
          {payload.kind === "feature" && (
            <StatusBadge status={payload.readiness} />
          )}
          <p>{payload.boundary}</p>
        </aside>
      </Container>
    );
  return null;
}
