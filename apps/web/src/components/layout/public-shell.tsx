import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import type { CmsSettings, CmsImageRef } from "@/features/cms/types";

export function PublicShell({ children, settings, logo }: { children: ReactNode; settings?: CmsSettings; logo?: CmsImageRef }) {
  return (
    <>
      <a className="skip-link" href="#main-content" tabIndex={0}>
        رفتن به محتوای اصلی
      </a>
      <SiteHeader appUrl={settings?.general.app_url || undefined} brandName={settings?.general.brand_name} logo={logo}/>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter settings={settings} logo={logo}/>
    </>
  );
}
