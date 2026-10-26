import {
  CmsDenied,
  cmsAll,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { TaxonomyPanel } from "@/features/learning/taxonomy";
import type { Taxonomy } from "@/features/learning/types";
export default async function Page() {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const [categories, tags] = await Promise.all([
    cmsAll<Taxonomy>("learn/categories"),
    cmsAll<Taxonomy>("learn/tags"),
  ]);
  return (
    <TaxonomyPanel categories={categories} tags={tags} />
  );
}
