import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { UiProviders } from "@/components/layout/ui-providers";
import { siteConfig } from "@/lib/site-config";
import "@/styles/globals.css";

const vazirmatn = localFont({
  src: "../../public/fonts/vazirmatn-arabic-wght-normal.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "ماکان | ارتباط و مدیریت آموزش", template: "%s | ماکان" },
  description:
    "ماکان؛ پیام‌رسان، مدیریت کلاس، تکلیف، آزمون و گزارش‌های آموزشی در یک فضای یکپارچه برای مدرسه و خانواده.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        <UiProviders>
          <a className="skip-link" href="#main-content" tabIndex={0}>
            رفتن به محتوای اصلی
          </a>
          <SiteHeader appUrl={siteConfig.appUrl} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </UiProviders>
      </body>
    </html>
  );
}
