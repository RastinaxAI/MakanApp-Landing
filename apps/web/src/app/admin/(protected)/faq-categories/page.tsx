import {
  CmsDenied,
  cmsAll,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { CategoriesPanel } from "@/features/cms/categories-panel";
import type { FaqCategory } from "@/features/cms/types";
export default async function CategoriesPage() {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  return (
    <CategoriesPanel initial={await cmsAll<FaqCategory>("faq-categories")} />
  );
}
