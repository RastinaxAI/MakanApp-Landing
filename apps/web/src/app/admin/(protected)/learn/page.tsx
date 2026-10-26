import {
  CmsDenied,
  cmsGet,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { LearningList } from "@/features/learning/admin";
import { adminKind } from "@/features/learning/server";
import { resourceFor, type LearningAdmin } from "@/features/learning/types";
import type { CmsPage } from "@/features/cms/types";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const search = await searchParams;
  const kind = adminKind(search.kind);
  const q = new URLSearchParams({ kind, page_size: "20" });
  const page = Number(search.page);
  if (Number.isSafeInteger(page) && page > 0) q.set("page", String(page));
  if (search.q && search.q.length <= 100) q.set("q", search.q);
  if (
    search.status &&
    ["draft", "published", "scheduled", "archived"].includes(search.status)
  )
    q.set("status", search.status);
  const data = await cmsGet<CmsPage<LearningAdmin>>(
    `${resourceFor(kind)}?${q}`,
  );
  return (
    <LearningList
      kind={kind}
      data={data}
      query={q.get("q") || ""}
      status={q.get("status") || ""}
    />
  );
}
