import { z } from "@/lib/validation";
import { widgetLabels, walkNodes, type VisualDocument } from "./types";
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const globals = z
  .object({
    colors: z.record(z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/), hex),
    font: z.enum(["sans", "serif", "mono"]),
    inherit_site: z.boolean().optional(),
  })
  .strict();
const node: z.ZodType = z.lazy(() =>
  z
    .object({
      id: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-zA-Z0-9_-]+$/),
      type: z.enum(
        Object.keys(widgetLabels) as [
          keyof typeof widgetLabels,
          ...Array<keyof typeof widgetLabels>,
        ],
      ),
      version: z.literal(1),
      props: z.record(z.string(), z.unknown()),
      styles: z
        .object({
          base: z.record(z.string(), z.unknown()),
          tablet: z.record(z.string(), z.unknown()),
          mobile: z.record(z.string(), z.unknown()),
          hover: z.record(z.string(), z.unknown()),
          focus: z.record(z.string(), z.unknown()),
        })
        .strict(),
      children: z.array(node).max(100),
    })
    .strict(),
);
export function validateDocument(value: VisualDocument) {
  z.object({
    schema_version: z.literal(2),
    purpose: z
      .enum(["page", "template", "section", "header", "footer"])
      .optional(),
    globals,
    nodes: z.array(node).max(100),
  })
    .strict()
    .parse(value);
  const nodes = walkNodes(value.nodes);
  if (
    nodes.length > 300 ||
    new Set(nodes.map((item) => item.id)).size !== nodes.length
  )
    throw new Error("تعداد یا شناسهٔ المان‌ها معتبر نیست.");
  if (new TextEncoder().encode(JSON.stringify(value)).length > 230000)
    throw new Error("حجم برگه زیاد است؛ آن را به چند برگه تقسیم کنید.");
  return value;
}
