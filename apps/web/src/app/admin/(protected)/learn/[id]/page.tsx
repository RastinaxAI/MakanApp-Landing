import { CmsDenied, requireContentAdmin } from "@/features/cms/admin-data";
import { LearningEditor } from "@/features/learning/admin";
import { adminKind, editorData } from "@/features/learning/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; created?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const search = await searchParams;
  const kind = adminKind(search.kind);
  return (
    <LearningEditor
      kind={kind}
      created={search.created === "1"}
      {...await editorData(kind, (await params).id)}
    />
  );
}
