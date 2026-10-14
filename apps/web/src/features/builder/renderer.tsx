import { publicGet } from "@/lib/public-api";
import type { CmsPage } from "@/features/cms/types";
import type { LearningContent } from "@/features/learning/types";
import { Widget } from "./widget";
import { globalCSS } from "./styles";
import type { BuilderContext, VisualDocument, VisualNode } from "./types";
import type { BuilderSite } from "./types";

export async function BuilderRenderer({
  document,
  context,
}: {
  document: VisualDocument;
  context: BuilderContext;
}) {
  const visit = (nodes: VisualNode[]): VisualNode[] =>
    nodes.flatMap((node) => [node, ...visit(node.children)]);
  const all = visit(document.nodes);
  const catalogs = new Map<string, LearningContent[]>();
  await Promise.all(
    all
      .filter((node) => node.type === "ArticleList")
      .map(async (node) => {
        const catalog = await publicGet<CmsPage<LearningContent>>(
          `learn/contents?type=article&page_size=12${node.props.category ? `&category=${encodeURIComponent(node.props.category)}` : ""}`,
        );
        catalogs.set(node.id, catalog.items);
      }),
  );
  const site =
    document.globals.inherit_site !== false
      ? await publicGet<BuilderSite>("site/builder")
      : null;
  const globals = site
    ? {
        ...document.globals,
        colors: { ...document.globals.colors, ...site.globals.colors },
        font: site.globals.font,
      }
    : document.globals;
  const scope = `page_${context.content.id}`;
  const render = (nodes: VisualNode[]) =>
    nodes.map((node) => (
      <Widget
        key={node.id}
        node={node}
        context={{
          ...context,
          articles: catalogs.get(node.id) || context.articles,
        }}
        scope={scope}
      >
        {(node.type === "Container" || node.type === "Grid") && (
          <div className="builder-layout">{render(node.children)}</div>
        )}
      </Widget>
    ));
  return (
    <div data-builder-scope={scope} className="builder-document">
      <style>{globalCSS(globals, scope)}</style>
      {render(document.nodes)}
    </div>
  );
}
