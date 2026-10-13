import "server-only";
import { cmsAll, cmsAssets, cmsGet } from "@/features/cms/admin-data";
import type { LearningAdmin, LearningPayload, Taxonomy } from "./types";
import { resourceFor } from "./types";
export function adminKind(value: string | undefined): LearningPayload["kind"] {
  return value === "video" || value === "blog" || value === "series"
    ? value
    : "article";
}
export async function editorData(kind: LearningPayload["kind"], id?: string) {
  const [assets, categories, tags, learn, blog, initial] = await Promise.all([
    cmsAssets(),
    cmsAll<Taxonomy>("learn/categories"),
    cmsAll<Taxonomy>("learn/tags"),
    cmsAll<LearningAdmin>("learn/contents"),
    kind === "blog"
      ? cmsAll<LearningAdmin>("blog/articles")
      : Promise.resolve([]),
    id
      ? cmsGet<LearningAdmin>(`${resourceFor(kind)}/${id}`)
      : Promise.resolve(undefined),
  ]);
  return { assets, categories, tags, contents: [...learn, ...blog], initial };
}
