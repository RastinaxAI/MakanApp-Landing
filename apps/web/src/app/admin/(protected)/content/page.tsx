import {
  CmsDenied,
  cmsGet,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { ContentList } from "@/features/cms/content-list";
import type { CmsPage, AdminContent } from "@/features/cms/types";
export default async function ContentPage() {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  return (
    <ContentList
      initial={await cmsGet<CmsPage<AdminContent>>("content?page_size=20")}
    />
  );
}
