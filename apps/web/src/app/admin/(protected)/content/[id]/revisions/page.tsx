import {
  CmsDenied,
  cmsGet,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { RevisionsPanel, type Revision } from "@/features/cms/revisions-panel";
import type { AdminContent, CmsPage } from "@/features/cms/types";
export default async function RevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const { id } = await params;
  const [content, initial] = await Promise.all([
    cmsGet<AdminContent>(`content/${encodeURIComponent(id)}`),
    cmsGet<CmsPage<Revision>>(
      `content/${encodeURIComponent(id)}/revisions?page_size=20`,
    ),
  ]);
  return <RevisionsPanel content={content} initial={initial} />;
}
