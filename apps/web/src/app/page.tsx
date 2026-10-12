import Link from "next/link";
import { ArrowLeft, BookOpen, Check, GraduationCap, ImageIcon, MessageCircle, Monitor, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";

const roleLayouts = [
  { icon: Monitor, title: "مدیر مدرسه", text: "جایگاه معرفی دید کلی و مدیریت مدرسه", number: "۰۱" },
  { icon: BookOpen, title: "معلم", text: "جایگاه معرفی کلاس و ارزشیابی آموزشی", number: "۰۲" },
  { icon: Users, title: "والد", text: "جایگاه معرفی ارتباط و گزارش مجاز فرزند", number: "۰۳" },
  { icon: GraduationCap, title: "دانش‌آموز", text: "جایگاه معرفی کلاس، تکلیف و آزمون", number: "۰۴" },
] as const;

export default function LayoutPreview() {
  return (
    <>
      <section className="border-b border-border bg-card" aria-labelledby="hero-title">
        <Container className="hero-grid">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-primary-hover"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />پیش‌نمایش طراحی · مرحله ۲</p>
            <h1 id="hero-title" className="hero-heading">مدرسه هوشمندتر،<br /><span className="text-primary">ارتباط ساده‌تر.</span></h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">ماکان؛ ارتباط و مدیریت آموزش، در یک فضای یکپارچه.</p>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">این صفحه ساختار بصری وب‌سایت را نشان می‌دهد. محتوای نهایی و تصاویر واقعی محصول در مرحله بعد تکمیل می‌شوند.</p>
            <div className="mt-8 flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
              <Button asChild size="lg" className="min-h-12"><Link href="/design-system">بررسی سیستم طراحی <ArrowLeft aria-hidden="true" /></Link></Button>
              <Button asChild variant="outline" size="lg" className="min-h-12"><Link href="#layout">مشاهده ساختار صفحه</Link></Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Check size={16} className="text-primary" aria-hidden="true" />فارسی و راست‌چین</span><span className="flex items-center gap-1.5"><Check size={16} className="text-primary" aria-hidden="true" />واکنش‌گرا در سه چیدمان</span></div>
          </div>
          <div className="preview-frame" data-testid="product-placeholder">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">نمایش تجربه محصول</span><span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary-hover">جایگاه تصویر</span></div>
            <div className="product-placeholder subtle-grid">
              <div className="max-w-xs rounded-2xl bg-card/95 p-5"><ImageIcon className="mx-auto mb-4 text-primary" size={36} strokeWidth={1.4} aria-hidden="true" /><p className="font-semibold">تصویر واقعی ماکان</p><p className="mt-2 text-sm text-muted-foreground">پس از دریافت و تأیید نسخه محصول، تصویر در این جایگاه قرار می‌گیرد.</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="جایگاه حوزه‌های محصول"><span className="rounded-lg bg-background px-3 py-1 text-xs text-muted-foreground">پیام‌رسان</span><span className="rounded-lg bg-background px-3 py-1 text-xs text-muted-foreground">مدرسه</span><span className="rounded-lg bg-background px-3 py-1 text-xs text-muted-foreground">گزارش‌ها</span></div>
          </div>
        </Container>
      </section>

      <section id="layout" className="section-space" aria-labelledby="layout-title">
        <Container>
          <SectionHeading id="layout-title" kicker="ساختار پایه" title="یک زبان بصری، در تمام صفحه‌ها" description="چیدمان از هدف هر صفحه شروع می‌شود؛ متن روشن، فضای کافی و یک اقدام اصلی مشخص." />
          <div className="grid gap-6 desktop:grid-cols-[1.35fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft tablet:p-8">
              <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary-hover"><MessageCircle strokeWidth={1.6} aria-hidden="true" /></div>
              <h3 className="text-2xl font-semibold">معرفی روشن، بدون شلوغی</h3>
              <p className="mt-4 max-w-xl text-muted-foreground">ساختار صفحه اصلی از معرفی محصول به امکانات، مخاطبان و مسیر درخواست دمو می‌رسد. بخش‌های محتوایی در STEP 3 و فرم واقعی در STEP 8 تکمیل می‌شوند.</p>
              <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden="true"><div className="h-16 rounded-xl border border-border bg-background" /><div className="h-16 rounded-xl border border-border bg-secondary" /><div className="h-16 rounded-xl border border-border bg-background" /></div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-6 tablet:p-8">
              <ShieldCheck className="mb-6 text-primary-hover" size={32} strokeWidth={1.5} aria-hidden="true" />
              <h3 className="text-2xl font-semibold">خوانا، آرام و قابل استفاده</h3>
              <p className="mt-4 text-muted-foreground">فونت فارسی محلی، کنتراست مشخص، حرکت محدود و تعامل با صفحه‌کلید، بخشی از پایه طراحی هستند.</p>
              <Link href="/design-system#accessibility" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-medium text-primary-hover">مشاهده اصول دسترس‌پذیری <ArrowLeft size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </Container>
      </section>

      <section id="roles" className="section-space border-y border-border bg-card" aria-labelledby="roles-title">
        <Container>
          <SectionHeading id="roles-title" kicker="نمونه چیدمان کارت‌ها" title="برای هر نقش، یک مسیر روشن" description="این کارت‌ها جایگاه معرفی مخاطبان‌اند؛ توضیح نهایی هر نقش پس از بازبینی محصول منتشر می‌شود." />
          <div className="layout-grid" data-testid="role-grid">
            {roleLayouts.map(({ icon: Icon, title, text, number }) => <article key={title} className="min-w-0 rounded-2xl border border-border bg-background p-6"><div className="mb-6 flex items-center justify-between"><Icon className="text-primary-hover" size={28} strokeWidth={1.5} aria-hidden="true" /><span className="text-sm text-muted-foreground">{number}</span></div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm text-muted-foreground">{text}</p></article>)}
          </div>
        </Container>
      </section>

      <section className="section-space" aria-labelledby="review-title">
        <Container><div className="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-secondary p-6 tablet:p-8 desktop:flex-row desktop:items-center"><div><p className="section-kicker mb-2">جزئیات طراحی</p><h2 id="review-title" className="text-2xl font-semibold">رنگ، تایپوگرافی و تمام حالت‌های تعامل</h2><p className="mt-3 text-sm text-muted-foreground">نمونه زنده کامپوننت‌ها و قواعد استفاده را در راهنمای طراحی ببینید.</p></div><Button asChild size="lg" className="shrink-0"><Link href="/design-system">مشاهده راهنما <ArrowLeft aria-hidden="true" /></Link></Button></div></Container>
      </section>
    </>
  );
}
