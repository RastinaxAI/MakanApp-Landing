import type { Data, Slot } from "@puckeditor/core";
import type {
  VisualDocument,
  VisualNode,
  WidgetProps,
  WidgetType,
  NodeStyles,
} from "./types";
import { emptyStyles } from "./types";

export type EditorProps = WidgetProps & {
  children?: Slot;
  node_styles?: NodeStyles;
};
export type EditorMap = Record<WidgetType, EditorProps>;
export type EditorData = Data<EditorMap>;
export function canonicalJSON(value: unknown): string {
  const normalize = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(normalize)
      : item !== null && typeof item === "object"
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([, value]) => value !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => [key, normalize(value)]),
          )
        : item;
  return JSON.stringify(normalize(value));
}
export function toEditorData(document: VisualDocument): EditorData {
  const convert = (nodes: VisualNode[]): EditorData["content"] =>
    nodes.map((node) => ({
      type: node.type,
      props: {
        ...node.props,
        id: node.id,
        node_styles: node.styles,
        children: convert(node.children),
      },
    }));
  return { root: { props: {} }, content: convert(document.nodes) };
}
export function fromEditorData(
  data: EditorData,
  globals: VisualDocument["globals"],
): VisualDocument {
  const convert = (nodes: EditorData["content"]): VisualNode[] =>
    nodes.map((node) => {
      const { id, node_styles, children, ...props } = node.props;
      const clean: WidgetProps = { ...props };
      if (clean.items)
        clean.items = clean.items.map((item) => ({
          title: item.title,
          text: item.text,
          body_html: item.body_html,
          href: item.href,
          media_id: item.media_id || null,
          value: item.value,
          attribution: item.attribution,
        }));
      return {
        id,
        type: node.type,
        version: 1,
        props: clean,
        styles: node_styles || emptyStyles(),
        children: convert((children || []) as EditorData["content"]),
      };
    });
  return { schema_version: 2, globals, nodes: convert(data.content) };
}
