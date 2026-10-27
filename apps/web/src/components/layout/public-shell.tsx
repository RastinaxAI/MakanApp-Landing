import type { ReactNode, CSSProperties } from "react";
import type { DocumentGlobals } from "@/features/builder/types";
import { fontFamilies } from "@/features/builder/styles";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import type { CmsSettings, CmsImageRef } from "@/features/cms/types";
import { PublicHelp } from "@/features/help/public-help";

export function PublicShell({
  children,
  settings,
  logo,
  header,
  footer,
  globals,
}: {
  children: ReactNode;
  settings?: CmsSettings;
  logo?: CmsImageRef;
  header?: ReactNode;
  footer?: ReactNode;
  globals?: DocumentGlobals;
}) {
  return (
    <div
      className="public-site"
      style={
        globals
          ? ({
              "--primary": globals.colors.primary,
              "--brand": globals.colors.brand,
              "--foreground": globals.colors.text,
              "--card": globals.colors.surface,
              fontFamily: fontFamilies[globals.font],
            } as CSSProperties)
          : undefined
      }
    >
      <a className="skip-link" href="#main-content" tabIndex={0}>
        رفتن به محتوای اصلی
      </a>
      {header || (
        <SiteHeader
          appUrl={settings?.general.app_url || undefined}
          brandName={settings?.general.brand_name}
          logo={logo}
        />
      )}
      <main id="main-content" tabIndex={-1}>
        <PublicHelp />
        {children}
      </main>
      {footer || <SiteFooter settings={settings} logo={logo} />}
    </div>
  );
}
