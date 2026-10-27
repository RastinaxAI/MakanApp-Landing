"use client";

import { useState, type ReactNode } from "react";
import { SourceLink as Link } from "@/features/leads/source-link";
import { Dialog } from "radix-ui";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  MapPin,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminGuide } from "./admin-guides";
import { ImageViewer } from "./image-viewer";
import { useGuideEscape } from "./use-guide-escape";

export function GuideDialog({
  guide,
  children,
  publicSite = false,
}: {
  guide: Pick<
    AdminGuide,
    "title" | "description" | "group" | "steps" | "image"
  >;
  children: ReactNode;
  publicSite?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  useGuideEscape(open, setOpen, true);
  const current = guide.steps[step] ?? guide.steps[0];
  const image = current.image || guide.image;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setStep(0);
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="guide-dialog-overlay" />
        <Dialog.Content
          className="guide-dialog"
          dir="rtl"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (document.querySelector("[data-guide-image-dialog]"))
              event.preventDefault();
          }}
        >
          <div className="guide-dialog-heading">
            <div>
              <p className="mb-2 text-xs font-medium text-primary">
                {publicSite
                  ? "راهنمای وب‌سایت ماکان"
                  : "راهنمای مدیریت وب‌سایت"}
              </p>
              <Dialog.Title className="text-lg font-bold">
                {guide.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
                {guide.description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن راهنما">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="guide-location">
            <MapPin size={16} aria-hidden="true" />
            <span>
              مسیر این راهنما: {publicSite ? "وب‌سایت ماکان" : "پیشخوان"}{" "}
              <ChevronLeft size={12} aria-hidden="true" /> {guide.group}{" "}
              <ChevronLeft size={12} aria-hidden="true" />{" "}
              <strong>{guide.title}</strong>
            </span>
          </div>
          <div
            className={`guide-dialog-body ${image ? "guide-dialog-illustrated" : ""}`}
          >
            <div>
              <ol className="guide-step-list" aria-label="گام‌های راهنما">
                {guide.steps.map((item, index) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      aria-current={step === index ? "step" : undefined}
                      onClick={() => setStep(index)}
                    >
                      <span className="guide-step-number" aria-hidden="true">
                        {index < step ? (
                          <Check size={15} />
                        ) : (
                          (index + 1).toLocaleString("fa-IR")
                        )}
                      </span>
                      <span>{item.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div
                className="guide-current-step"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-xs font-medium text-primary">
                  گام {(step + 1).toLocaleString("fa-IR")} از{" "}
                  {guide.steps.length.toLocaleString("fa-IR")}
                </p>
                <h2 className="mt-3 text-base font-bold">{current.title}</h2>
                <p className="mt-3 text-sm leading-8 text-muted-foreground">
                  {current.text}
                </p>
                {current.href && (
                  <Link
                    href={current.href}
                    prefetch={false}
                    className="guide-all-link mt-4"
                    onClick={() => setOpen(false)}
                  >
                    {current.action || "رفتن به این بخش"}
                    <ArrowLeft size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
            {image && (
              <figure className="guide-screenshot">
                <ImageViewer
                  image={{
                    src: `/guides/${publicSite ? "site" : "admin"}/${image}.png`,
                    alt: `نمای ${guide.title}`,
                    width: 1440,
                    height: 960,
                  }}
                  caption={
                    publicSite
                      ? "تصویر واقعی وب‌سایت ماکان؛ اطلاعات شخصی وارد نشده و فرمی ارسال نشده است."
                      : "تصویر واقعی رابط پنل با حساب و اطلاعات محیط آموزشی؛ دادهٔ مشتری واقعی نمایش داده نشده است."
                  }
                />
                <figcaption>
                  {publicSite
                    ? "تصویر واقعی وب‌سایت؛ برای دیدن جزئیات بزرگنمایی کنید."
                    : "تصویر محیط آموزشی پنل؛ برای دیدن جزئیات بزرگنمایی کنید."}{" "}
                  در موبایل چیدمان ابزارها ممکن است متفاوت باشد.
                </figcaption>
              </figure>
            )}
          </div>
          <div className="guide-dialog-footer">
            <Link
              href={publicSite ? "/learn?topic=getting-started" : "/admin/help"}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="guide-all-link"
            >
              <BookOpen size={17} aria-hidden="true" />{" "}
              {publicSite ? "مرکز آموزش" : "همهٔ راهنماها"}
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                <ArrowRight aria-hidden="true" /> قبلی
              </Button>
              {step === guide.steps.length - 1 ? (
                <Button onClick={() => setOpen(false)}>
                  <Check aria-hidden="true" /> پایان راهنما
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)}>
                  بعدی <ArrowLeft aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
