"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";

export function InteractionSpecimens() {
  return (
    <Tabs defaultValue="states" dir="rtl">
      <TabsList aria-label="نمونه‌های کامپوننت" className="mb-6 grid h-auto w-full max-w-md grid-cols-3 rounded-xl p-1">
        <TabsTrigger value="states" className="min-h-11">حالت‌ها</TabsTrigger>
        <TabsTrigger value="fields" className="min-h-11">فرم</TabsTrigger>
        <TabsTrigger value="faq" className="min-h-11">پرسش‌ها</TabsTrigger>
      </TabsList>
      <TabsContent value="states" className="space-y-8 rounded-2xl border border-border bg-card p-5 tablet:p-8">
        <div><h3 className="mb-4 text-lg font-semibold">دکمه‌ها و پنل کشویی</h3><div className="flex flex-wrap items-center gap-3">
          <Sheet><SheetTrigger asChild><Button className="min-h-11">باز کردن نمونه پنل</Button></SheetTrigger><SheetContent side="right" dir="rtl"><SheetHeader className="text-start"><SheetTitle>نمونه پنل کشویی</SheetTitle><SheetDescription>برای خروج کلید Escape را فشار دهید. تمرکز به دکمه بازکننده برمی‌گردد.</SheetDescription></SheetHeader><p className="px-4 text-sm text-muted-foreground">این پنل نمونه تعامل است و داده‌ای ذخیره نمی‌کند.</p></SheetContent></Sheet>
          <Button asChild variant="outline" className="min-h-11"><a href="#accessibility">راهنمای دسترس‌پذیری</a></Button>
          <Button disabled className="min-h-11" aria-describedby="disabled-note">غیرفعال</Button>
          <Button disabled aria-busy="true" className="min-h-11"><LoaderCircle className="animate-spin" aria-hidden="true" />در حال بررسی</Button>
        </div><p id="disabled-note" className="mt-3 text-sm text-muted-foreground">حالت غیرفعال فقط برای نمایش طراحی است؛ هیچ درخواست دمو در این صفحه ثبت نمی‌شود.</p></div>
        <div><h3 className="mb-4 text-lg font-semibold">برچسب وضعیت قابلیت</h3><p className="mb-4 text-sm text-muted-foreground">این‌ها نمونه وضعیت‌اند و آماده‌بودن قابلیت خاصی را تأیید نمی‌کنند.</p><div className="flex flex-wrap gap-3"><StatusBadge status="available" /><StatusBadge status="partial" /><StatusBadge status="roadmap" /></div></div>
        <div role="status" className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success"><Check className="mt-1 shrink-0" size={20} aria-hidden="true" /><div><p className="font-medium">نمونه پیام تأیید</p><p className="mt-1 text-sm">در فرم واقعی، این حالت تنها پس از ذخیره موفق سمت سرور نمایش داده خواهد شد.</p></div></div>
      </TabsContent>
      <TabsContent value="fields" className="rounded-2xl border border-border bg-card p-5 tablet:p-8">
        <div className="mb-6 max-w-xl"><h3 className="text-lg font-semibold">خوانایی فرم و حالت خطا</h3><p className="mt-3 text-sm text-muted-foreground">نمونه ظاهری فرم؛ فیلدها برای بررسی تعامل قابل تغییرند، اما دکمه ثبت و ذخیره‌سازی وجود ندارد.</p></div>
        <div className="grid max-w-2xl gap-6 tablet:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="specimen-name">نام و نام خانوادگی</Label><Input id="specimen-name" autoComplete="off" placeholder="نام خود را وارد کنید" className="min-h-12 bg-card" /><p className="text-sm text-muted-foreground">برچسب همیشه قابل مشاهده است.</p></div>
          <div className="space-y-2"><Label htmlFor="specimen-phone">شماره تماس — نمونه خطا</Label><Input id="specimen-phone" type="tel" inputMode="tel" dir="ltr" aria-invalid="true" aria-describedby="specimen-phone-error" placeholder="09xxxxxxxxx" className="min-h-12 bg-card text-start" /><p id="specimen-phone-error" className="text-sm text-destructive">نمونه: شماره تماس معتبر وارد کنید.</p></div>
          <div className="space-y-2 tablet:col-span-2"><Label htmlFor="specimen-message">پیام — اختیاری</Label><Textarea id="specimen-message" placeholder="توضیح کوتاه درباره نیاز مدرسه" className="min-h-28 bg-card" /></div>
          <div className="flex items-start gap-2 tablet:col-span-2"><Checkbox id="specimen-consent" className="mt-1 size-6 shrink-0" /><Label htmlFor="specimen-consent" className="min-h-11 max-w-lg leading-7">نمونه رضایت قابل انتخاب؛ برای بررسی طراحی، بدون ثبت درخواست یا رضایت واقعی.</Label></div>
        </div>
      </TabsContent>
      <TabsContent value="faq" className="rounded-2xl border border-border bg-card p-5 tablet:p-8">
        <h3 className="mb-3 text-lg font-semibold">نمونه پرسش بازشونده</h3>
        <Accordion type="single" collapsible>
          <AccordionItem value="keyboard"><AccordionTrigger className="min-h-14 text-start">آیا می‌توان بدون ماوس از صفحه استفاده کرد؟</AccordionTrigger><AccordionContent className="text-muted-foreground">منو، تب‌ها، پرسش‌ها و فیلدها با صفحه‌کلید قابل استفاده‌اند. وضعیت تمرکز با خط دور کنترل مشخص می‌شود.</AccordionContent></AccordionItem>
          <AccordionItem value="motion"><AccordionTrigger className="min-h-14 text-start">اگر کاهش حرکت را در دستگاه فعال کنم چه می‌شود؟</AccordionTrigger><AccordionContent className="text-muted-foreground">انیمیشن‌های غیرضروری و پیمایش نرم حذف می‌شوند. محتوا و کارکرد اصلی همچنان در دسترس می‌مانند.</AccordionContent></AccordionItem>
          <AccordionItem value="brand"><AccordionTrigger className="min-h-14 text-start">آیا این رنگ‌ها و نشان، هویت نهایی ماکان‌اند؟</AccordionTrigger><AccordionContent className="text-muted-foreground">خیر. پالت پیشنهادی و نشان متنی موقت‌اند؛ دارایی‌های رسمی بعد از تأیید جایگزین می‌شوند.</AccordionContent></AccordionItem>
        </Accordion>
      </TabsContent>
    </Tabs>
  );
}
