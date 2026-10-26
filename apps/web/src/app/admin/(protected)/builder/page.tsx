import { BuilderLibrary } from "@/features/builder/library-panel";
import type { BuilderSettings } from "@/features/builder/types";
import {
  CmsDenied,
  cmsGet,
  cmsAll,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { requireAdmin } from "@/lib/admin-api";
import type { AdminContent, CmsPage } from "@/features/cms/types";
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; purpose?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const purpose = ["template", "section", "header", "footer"].includes(
    params.purpose || "",
  )
    ? params.purpose!
    : "";
  const [library, settings, profile, headers, footers] = await Promise.all([
    cmsGet<CmsPage<AdminContent>>(
      `builder/library?page_size=50&page=${page}${purpose ? `&purpose=${purpose}` : ""}`,
    ),
    cmsGet<BuilderSettings>("builder/settings"),
    requireAdmin(),
    cmsAll<AdminContent>("builder/library?purpose=header"),
    cmsAll<AdminContent>("builder/library?purpose=footer"),
  ]);
  return (
    <BuilderLibrary
      key={purpose}
      activePurpose={purpose}
      initial={library}
      settings={settings}
      canManageSettings={profile.capabilities.includes("settings")}
      parts={[...headers, ...footers]}
    />
  );
}
