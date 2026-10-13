import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { getSettings, publicGet } from "@/lib/public-api";
import type { CmsImageRef } from "@/features/cms/types";
export const dynamic = "force-dynamic";
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  const logo = settings.general.logo_media_id ? await publicGet<CmsImageRef>(`media/${settings.general.logo_media_id}`) : undefined;
  return <PublicShell settings={settings} logo={logo}>{children}</PublicShell>;
}
