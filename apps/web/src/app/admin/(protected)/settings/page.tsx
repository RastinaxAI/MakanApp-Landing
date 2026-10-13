import {
  CmsDenied,
  cmsGet,
  cmsAssets,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { SettingsPanel } from "@/features/cms/settings-panel";
import type { CmsSettings } from "@/features/cms/types";
import Link from "next/link";
export default async function SettingsPage() {
  if (!(await requireContentAdmin(true))) return <CmsDenied />;
  const [initial, assets] = await Promise.all([
    cmsGet<CmsSettings>("settings"),
    cmsAssets(),
  ]);
  return <><nav aria-label="بخش‌های تنظیمات" className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"><Link href="/admin/settings" aria-current="page" className="min-h-11 rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary">عمومی و SEO</Link><Link href="/admin/settings/sms" className="min-h-11 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-white">پنل پیامکی</Link></nav><SettingsPanel initial={initial} assets={assets} /></>;
}
