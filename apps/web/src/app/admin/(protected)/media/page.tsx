import {
  CmsDenied,
  cmsGet,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { MediaPanel } from "@/features/cms/media-panel";
import type { CmsPage, MediaAsset } from "@/features/cms/types";
export default async function MediaPage() {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  return (
    <MediaPanel
      initial={await cmsGet<CmsPage<MediaAsset>>("media?page_size=20")}
    />
  );
}
