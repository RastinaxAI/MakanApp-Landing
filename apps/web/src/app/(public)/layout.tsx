import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { getSettings, publicGet } from "@/lib/public-api";
import type { CmsImageRef } from "@/features/cms/types";
import { AnalyticsConsent } from "@/features/analytics/consent";
import { cookies, headers } from "next/headers";
import {
  preferenceChoice,
  preferenceCookie,
} from "@/features/analytics/preference";
export const dynamic = "force-dynamic";
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSettings();
  const logo = settings.general.logo_media_id
    ? await publicGet<CmsImageRef>(`media/${settings.general.logo_media_id}`)
    : undefined;
  const analytics = await publicGet<{
    enabled: boolean;
    policy_version: string;
    retention_days: number;
  }>("analytics/config");
  const jar = await cookies();
  const incoming = await headers();
  const initialBlocked =
    incoming.get("dnt") === "1" || incoming.get("sec-gpc") === "1";
  const initialChoice = initialBlocked
    ? false
    : preferenceChoice(
        jar.get(preferenceCookie)?.value,
        analytics.policy_version,
      );
  return (
    <PublicShell settings={settings} logo={logo}>
      {children}
      <AnalyticsConsent
        config={analytics}
        initialChoice={initialChoice}
        initialBlocked={initialBlocked}
      />
    </PublicShell>
  );
}
