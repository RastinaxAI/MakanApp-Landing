import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { UiProviders } from "@/components/layout/ui-providers";
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
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
