import {
  CmsDenied,
  cmsGet,
  cmsAssets,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { SettingsPanel } from "@/features/cms/settings-panel";
import type { CmsSettings } from "@/features/cms/types";
export default async function SettingsPage() {
  if (!(await requireContentAdmin(true))) return <CmsDenied />;
  const [initial, assets] = await Promise.all([
    cmsGet<CmsSettings>("settings"),
    cmsAssets(),
  ]);
  return <SettingsPanel initial={initial} assets={assets} />;
}
