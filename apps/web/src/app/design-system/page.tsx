import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Focus, Keyboard, Monitor, Move, Smartphone, Tablet } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { MotionSurface } from "@/components/ui/motion-surface";
import { InteractionSpecimens } from "@/features/design-system/interaction-specimens";

export const metadata: Metadata = { title: "سیستم طراحی" };

const colors = [
  { name: "رنگ اصلی", value: "#087C86", variable: "--primary" },
  { name: "متن اصلی", value: "#173044", variable: "--foreground" },
  { name: "متن ثانویه", value: "#5B7081", variable: "--muted-foreground" },
  { name: "پس‌زمینه", value: "#F4F8FA", variable: "--background" },
  { name: "سطح کارت", value: "#FFFFFF", variable: "--card" },
  { name: "زمینه ملایم", value: "#EAF5F6", variable: "--secondary" },
  { name: "خطا", value: "#B42318", variable: "--destructive" },
  { name: "تأیید", value: "#176B45", variable: "--success" },
] as const;

const breakpoints = [
  { icon: Smartphone, name: "موبایل", range: "360–479 px", description: "یک ستون، منوی کشویی، اقدام تمام‌عرض و تصویر پس از متن." },
  { icon: Tablet, name: "تبلت", range: "480–1023 px", description: "دو ستون کارت، فاصله بیشتر و ناوبری فشرده." },
  { icon: Monitor, name: "دسکتاپ", range: "1024 px +", description: "Hero دو ستون، منوی کامل و شبکه چهارستونه." },
] as const;

export default function DesignSystemPage() {
  return (
    <>
      <section className="border-b border-border bg-card py-12 tablet:py-16">
        <Container><p className="section-kicker mb-4">MAKAN / DESIGN SYSTEM <span className="ms-2 text-muted-foreground">نسخه ۰.۲ · پیشنهادی</span></p><h1 className="hero-heading max-w-3xl">پایه‌ای روشن،<br /><span className="text-primary">برای تجربه‌ای یکدست.</span></h1><p className="mt-6 max-w-2xl text-lg text-muted-foreground">راهنمای زنده رنگ، تایپوگرافی، فاصله‌گذاری و کامپوننت‌های وب‌سایت فارسی ماکان.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg"><a href="#components">بررسی کامپوننت‌ها <ArrowLeft aria-hidden="true" /></a></Button><Button asChild size="lg" variant="outline"><Link href="/">پیش‌نمایش چیدمان</Link></Button></div></Container>
      </section>

      <section className="section-space" aria-labelledby="colors-title">
        <Container><SectionHeading id="colors-title" kicker="۰۱ / رنگ" title="آرام، آموزشی و خوانا" description="پالت پیشنهادشده از سند محصول؛ هویت نهایی پس از تأیید برند تثبیت می‌شود." /><div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">{colors.map((color) => <div key={color.variable} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"><span className="token-swatch" style={{ backgroundColor: `var(${color.variable})` }} aria-hidden="true" /><div className="min-w-0"><h3 className="text-sm font-semibold">{color.name}</h3><p dir="ltr" className="mt-1 text-sm text-muted-foreground">{color.value}</p></div></div>)}</div></Container>
      </section>

      <section className="section-space border-y border-border bg-card" aria-labelledby="type-title">
        <Container><SectionHeading id="type-title" kicker="۰۲ / تایپوگرافی" title="وزیرمتن؛ فارسی از ابتدا" description="فونت متغیر محلی با مجوز OFL، بدون درخواست مرورگر به سرویس فونت خارجی." /><div className="grid gap-8 desktop:grid-cols-2"><div className="rounded-2xl bg-background p-6 tablet:p-8"><p className="text-sm text-muted-foreground">تیتر اصلی · ۳۴ تا ۵۶ پیکسل</p><p className="mt-4 text-4xl font-bold leading-relaxed">آموزش، نزدیک‌تر.</p><p className="mt-6 text-sm text-muted-foreground">تیتر بخش · ۲۸ تا ۴۰ پیکسل</p><p className="mt-3 text-2xl font-semibold">یک مسیر روشن برای هر نقش</p></div><div className="rounded-2xl border border-border p-6 tablet:p-8"><p className="text-sm text-muted-foreground">متن اصلی · ۱۶ پیکسل · ارتفاع خط ۱.۹</p><p className="mt-4">متن‌ها کوتاه، روشن و قابل فهم نوشته می‌شوند. فضای بین سطرها به خوانایی فارسی کمک می‌کند و جهت متن‌ها با محتوای آن‌ها هماهنگ است.</p><p className="mt-6 text-sm text-muted-foreground">نشانی و کد در متن فارسی جدا می‌شوند: <bdi dir="ltr" className="rounded-md bg-background px-2 py-1">MakanApp / UI</bdi></p></div></div></Container>
      </section>

      <section className="section-space" aria-labelledby="spacing-title">
        <Container><SectionHeading id="spacing-title" kicker="۰۳ / فضا و سطح" title="ریتم منظم، با فضای کافی" /><div className="grid gap-6 desktop:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-6"><h3 className="mb-5 text-lg font-semibold">مقیاس فاصله‌گذاری</h3><div className="flex flex-wrap items-end gap-5">{[4, 8, 12, 16, 24, 32, 48, 64].map((space) => <div key={space} className="flex flex-col items-center gap-3"><div className="w-5 rounded-md bg-primary" style={{ height: space }} aria-hidden="true" /><span dir="ltr" className="text-xs text-muted-foreground">{space}px</span></div>)}</div><p className="mt-6 text-sm text-muted-foreground">پایه ۸ پیکسل، با نیم‌گام ۴؛ فاصله بزرگ بخش‌ها ۶۴ تا ۹۶ پیکسل.</p></div><MotionSurface><p className="section-kicker mb-3">نمونه سطح تعاملی</p><h3 className="text-xl font-semibold">حرکت کوتاه و هدفمند</h3><p className="mt-4 text-muted-foreground">این سطح در حالت عادی کمی در hover جابه‌جا می‌شود. با فعال‌بودن کاهش حرکت، همان سطح ثابت می‌ماند.</p><p className="mt-5 text-sm text-muted-foreground">کنترل: ۱۰ · کارت: ۱۶ · پنل: ۲۴ پیکسل</p></MotionSurface></div></Container>
      </section>

      <section id="components" className="section-space border-y border-border bg-background" aria-labelledby="components-title">
        <Container><SectionHeading id="components-title" kicker="۰۴ / کامپوننت‌ها" title="حالت‌های روشن برای هر تعامل" description="نمونه‌های زنده shadcn/ui با پالت ماکان: دکمه، فرم، پنل، تب، پرسش و وضعیت." /><InteractionSpecimens /></Container>
      </section>

      <section className="section-space bg-card" aria-labelledby="responsive-title">
        <Container><SectionHeading id="responsive-title" kicker="۰۵ / واکنش‌گرایی" title="بازچینش محتوا، متناسب با دستگاه" description="در هر اندازه، ساختار برای فضای همان دستگاه تنظیم می‌شود." /><div className="grid gap-6 desktop:grid-cols-3">{breakpoints.map(({ icon: Icon, name, range, description }) => <article key={name} className="rounded-2xl border border-border bg-background p-6"><Icon className="mb-5 text-primary-hover" size={28} strokeWidth={1.5} aria-hidden="true" /><h3 className="text-xl font-semibold">{name}</h3><p className="mt-2 text-sm text-primary-hover" dir="ltr">{range}</p><p className="mt-4 text-sm text-muted-foreground">{description}</p></article>)}</div></Container>
      </section>

      <section id="accessibility" className="section-space border-t border-border" aria-labelledby="accessibility-title">
        <Container><SectionHeading id="accessibility-title" kicker="۰۶ / دسترس‌پذیری" title="کارکرد اصلی، در دسترس همه" description="هدف WCAG 2.2 AA است؛ بررسی ابزار خودکار در کنار آزمون دستی تعامل‌ها انجام می‌شود." /><div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">{[{ icon: Keyboard, title: "صفحه‌کلید", text: "ترتیب طبیعی Tab، خروج از پنل با Escape و بازگشت تمرکز به کنترل آغازگر." }, { icon: Focus, title: "تمرکز و خوانایی", text: "خط دور مشخص، برچسب ثابت، خطای متنی و وضعیت‌هایی که تنها به رنگ متکی نیستند." }, { icon: Move, title: "کاهش حرکت", text: "پشتیبانی از ترجیح دستگاه، بدون پنهان‌کردن محتوا یا حذف کارکرد اصلی." }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-card p-6"><Icon size={26} className="mb-4 text-primary-hover" aria-hidden="true" /><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm text-muted-foreground">{text}</p></article>)}</div></Container>
      </section>
    </>
  );
}
