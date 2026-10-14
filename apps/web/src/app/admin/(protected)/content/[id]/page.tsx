import {
  CmsDenied,
  cmsGet,
  cmsAll,
  cmsAssets,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { ContentEditor } from "@/features/cms/editor";
import type { AdminContent, FaqCategory } from "@/features/cms/types";
import { redirect } from "next/navigation";
export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const { id } = await params;
  const [initial, assets, categories] = await Promise.all([
    cmsGet<AdminContent>(`content/${encodeURIComponent(id)}`),
    cmsAssets(),
    cmsAll<FaqCategory>("faq-categories"),
  ]);
  if (initial.payload.kind !== "faq" && initial.payload.document && (await searchParams).mode !== "metadata") redirect(`/admin/content/${initial.id}/builder`);
  return (
    <ContentEditor initial={initial} assets={assets} categories={categories} />
  );
}
