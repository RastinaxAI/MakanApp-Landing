import Link from "next/link";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function RequestFormPreview({ kind }: { kind: "demo" | "contact" }) {
  const demo = kind === "demo";
  const prefix = demo ? "demo" : "contact";
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft tablet:p-8">
      <h2 className="text-2xl font-semibold">
        {demo ? "درخواست دمو و مشاوره" : "ارسال پیام"}
      </h2>
      <div
        id={`${prefix}-availability`}
        className="my-6 flex items-start gap-3 rounded-xl bg-secondary p-4 text-primary-hover"
        role="note"
      >
        <Info size={20} className="mt-1 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">ثبت درخواست فعلاً فعال نیست.</p>
          <p className="mt-2 text-sm leading-7">
            فرم پس از راه‌اندازی سامانه ثبت درخواست فعال می‌شود. در این نسخه
            اطلاعاتی از این فرم دریافت یا ذخیره نمی‌شود.
          </p>
        </div>
      </div>
      <fieldset
        disabled
        aria-describedby={`${prefix}-availability`}
        className="grid gap-5 tablet:grid-cols-2"
      >
        <legend className="sr-only">
          {demo ? "اطلاعات درخواست دمو؛ غیرفعال" : "اطلاعات تماس؛ غیرفعال"}
        </legend>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-name`}>نام و نام خانوادگی</Label>
          <Input
            id={`${prefix}-name`}
            name="full_name"
            className="min-h-12"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-phone`}>
            {demo ? "شماره تماس" : "شماره تماس یا ایمیل"}
          </Label>
          <Input
            id={`${prefix}-phone`}
            name="contact"
            type={demo ? "tel" : "text"}
            dir="ltr"
            className="min-h-12"
          />
        </div>
        {demo ? (
          <>
            <div className="space-y-2 tablet:col-span-2">
              <Label htmlFor="demo-school">نام مدرسه یا مؤسسه</Label>
              <Input id="demo-school" name="school_name" className="min-h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-city">شهر — اختیاری</Label>
              <Input id="demo-city" name="city" className="min-h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-job">سمت — اختیاری</Label>
              <Input id="demo-job" name="job_title" className="min-h-12" />
            </div>
            <div className="space-y-2 tablet:col-span-2">
              <Label htmlFor="demo-students">
                تعداد تقریبی دانش‌آموزان — اختیاری
              </Label>
              <select
                id="demo-students"
                name="student_count_range"
                className="min-h-12 w-full rounded-lg border border-input bg-card px-3 text-base disabled:opacity-50"
              >
                <option>انتخاب نشده</option>
                <option>کمتر از ۱۰۰</option>
                <option>۱۰۰ تا ۲۹۹</option>
                <option>۳۰۰ تا ۵۹۹</option>
                <option>۶۰۰ تا ۹۹۹</option>
                <option>۱۰۰۰ و بیشتر</option>
              </select>
            </div>
          </>
        ) : (
          <div className="space-y-2 tablet:col-span-2">
            <Label htmlFor="contact-subject">موضوع</Label>
            <Input id="contact-subject" name="subject" className="min-h-12" />
          </div>
        )}
        <div className="space-y-2 tablet:col-span-2">
          <Label htmlFor={`${prefix}-message`}>
            {demo ? "توضیحات — اختیاری" : "پیام"}
          </Label>
          <Textarea
            id={`${prefix}-message`}
            name="message"
            className="min-h-32"
          />
        </div>
        <div className="flex items-start gap-3 tablet:col-span-2">
          <input
            id={`${prefix}-consent`}
            type="checkbox"
            name="consent"
            className="mt-2 size-5 shrink-0 accent-primary"
          />
          <label
            htmlFor={`${prefix}-consent`}
            className="text-sm leading-8 text-muted-foreground"
          >
            با تماس درباره این درخواست و سیاست حریم خصوصی موافقم.
          </label>
        </div>
        <Button
          disabled
          className="min-h-12 tablet:col-span-2"
          aria-describedby={`${prefix}-availability`}
        >
          {demo ? "ثبت درخواست دمو — غیرفعال" : "ارسال پیام — غیرفعال"}
        </Button>
      </fieldset>
      <Link
        href="/privacy"
        className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary-hover"
      >
        مطالعه پیش‌نویس حریم خصوصی
      </Link>
    </div>
  );
}
