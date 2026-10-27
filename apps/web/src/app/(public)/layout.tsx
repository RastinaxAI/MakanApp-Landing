import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { getSettings, publicGet } from "@/lib/public-api";
import type { CmsImageRef } from "@/features/cms/types";
import type { BuilderSite } from "@/features/builder/types";
import { BuilderRenderer } from "@/features/builder/renderer";
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
  const [settings, builder, analytics] = await Promise.all([
    getSettings(),
    publicGet<BuilderSite>("site/builder"),
    publicGet<{
      enabled: boolean;
      policy_version: string;
      retention_days: number;
    }>("analytics/config"),
  ]);
  const sitePart = (part: BuilderSite["header"]) =>
    part?.payload.kind === "page" && part.payload.document ? (
      <BuilderRenderer
        document={part.payload.document}
        context={{
          content: part,
          features: [],
          audiences: [],
          faqs: [],
          articles: [],
        }}
      />
    ) : null;
  const logo = settings.general.logo_media_id
    ? await publicGet<CmsImageRef>(`media/${settings.general.logo_media_id}`)
    : undefined;
  const [jar, incoming] = await Promise.all([cookies(), headers()]);
  const initialBlocked =
    incoming.get("dnt") === "1" || incoming.get("sec-gpc") === "1";
  const initialChoice = initialBlocked
    ? false
    : preferenceChoice(
        jar.get(preferenceCookie)?.value,
        analytics.policy_version,
      );
  return (
    <PublicShell
      globals={builder.globals}
      settings={settings}
      logo={logo}
      header={
        builder.header ? (
          <header aria-label="سربرگ سایت">{sitePart(builder.header)}</header>
        ) : undefined
      }
      footer={
        builder.footer ? (
          <footer aria-label="پابرگ سایت">{sitePart(builder.footer)}</footer>
        ) : undefined
      }
    >
      {children}
      <AnalyticsConsent
        config={analytics}
        initialChoice={initialChoice}
        initialBlocked={initialBlocked}
      />
    </PublicShell>
  );
}
