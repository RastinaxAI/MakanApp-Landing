import { publicGet } from "@/lib/public-api";
import type { CmsPage } from "@/features/cms/types";
import type { LearningContent } from "@/features/learning/types";
import { Widget } from "./widget";
import { globalCSS } from "./styles";
import type { BuilderContext, VisualDocument, VisualNode } from "./types";

export async function BuilderRenderer({
  document,
  context,
}: {
  document: VisualDocument;
  context: BuilderContext;
}) {
  const visit = (nodes: VisualNode[]): VisualNode[] =>
    nodes.flatMap((node) => [node, ...visit(node.children)]);
  const articleWidget = visit(document.nodes).find(
    (node) => node.type === "ArticleList",
  );
  const articles = articleWidget
    ? (
        await publicGet<CmsPage<LearningContent>>(
          `learn/contents?type=article&page_size=12${articleWidget.props.category ? `&category=${encodeURIComponent(articleWidget.props.category)}` : ""}`,
        )
      ).items
    : context.articles;
  const scope = `page_${context.content.id}`;
  const render = (nodes: VisualNode[]) =>
    nodes.map((node) => (
      <Widget
        key={node.id}
        node={node}
        context={{ ...context, articles }}
        scope={scope}
      >
        {(node.type === "Container" || node.type === "Grid") && (
          <div className="builder-layout">{render(node.children)}</div>
        )}
      </Widget>
    ));
  return (
    <div data-builder-scope={scope} className="builder-document">
      <style>{globalCSS(document.globals, scope)}</style>
      {render(document.nodes)}
    </div>
  );
}
