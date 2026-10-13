import {
  CmsDenied,
  cmsGet,
  cmsAll,
  cmsAssets,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { ContentEditor } from "@/features/cms/editor";
import type { AdminContent, FaqCategory } from "@/features/cms/types";
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const { id } = await params;
  const [initial, assets, categories] = await Promise.all([
    cmsGet<AdminContent>(`content/${encodeURIComponent(id)}`),
    cmsAssets(),
    cmsAll<FaqCategory>("faq-categories"),
  ]);
  return (
    <ContentEditor initial={initial} assets={assets} categories={categories} />
  );
}
