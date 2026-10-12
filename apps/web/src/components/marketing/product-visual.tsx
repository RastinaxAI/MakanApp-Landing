import { ImageIcon, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
export function ProductVisual({
  title = "نمای واقعی ماکان",
  className,
  phone = false,
}: {
  title?: string;
  className?: string;
  phone?: boolean;
}) {
  return (
    <figure
      className={cn(
        "relative min-w-0 rounded-3xl border border-border bg-card p-5 shadow-soft tablet:p-7",
        className,
      )}
      data-testid="product-placeholder"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Monitor
            size={18}
            className="text-primary-hover"
            aria-hidden="true"
          />
          {title}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary-hover">
          جایگاه تصویر
        </span>
      </div>
      <div className="subtle-grid grid aspect-[16/11] min-h-56 w-full min-w-0 grid-cols-[minmax(0,1fr)] place-items-center rounded-2xl border border-dashed border-input p-4 text-center tablet:p-6">
        <div className="w-full min-w-0 max-w-xs rounded-2xl bg-card/95 p-3 tablet:p-4">
          <ImageIcon
            size={34}
            strokeWidth={1.4}
            className="mx-auto mb-4 text-primary"
            aria-hidden="true"
          />
          <p className="font-medium">تصویر تأییدشده محصول</p>
          <p className="mt-2 text-sm text-muted-foreground">
            تصاویر واقعی پس از دریافت و بررسی نسخه محصول در این بخش قرار
            می‌گیرند.
          </p>
        </div>
      </div>
      {phone && (
        <div
          className="absolute -bottom-4 -start-3 hidden h-36 w-20 flex-col items-center justify-center gap-2 rounded-2xl border-4 border-card bg-secondary shadow-soft tablet:flex"
          aria-hidden="true"
        >
          <Smartphone size={26} className="text-primary-hover" />
          <span className="text-xs text-primary-hover">موبایل</span>
        </div>
      )}
      <figcaption className="mt-4 text-xs leading-6 text-muted-foreground">
        این جایگاه، اسکرین‌شات یا دموی عملکرد محصول نیست.
      </figcaption>
    </figure>
  );
}
