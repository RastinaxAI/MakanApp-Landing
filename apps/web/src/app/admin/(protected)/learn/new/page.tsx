import { CmsDenied, requireContentAdmin } from "@/features/cms/admin-data";
import { LearningEditor } from "@/features/learning/admin";
import { adminKind, editorData } from "@/features/learning/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const kind = adminKind((await searchParams).kind);
  return <LearningEditor kind={kind} {...await editorData(kind)} />;
}
