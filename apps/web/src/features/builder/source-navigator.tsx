"use client";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import type { AdminContent, CmsPage } from "@/features/cms/types";

export function SourceNavigator({
  kind,
  slug,
}: {
  kind: "feature" | "audience" | "faq" | "learning";
  slug?: string;
}) {
  const [rows, setRows] = useState<AdminContent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<CmsPage<AdminContent>>(
        `content?kind=${kind}&page_size=100`,
      );
      setRows(
        slug ? result.items.filter((item) => item.slug === slug) : result.items,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "محتوای مرجع بارگذاری نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-3">
      <p className="text-sm font-semibold">ویرایش محتوای مرجع</p>
      <p className="text-xs leading-6 text-muted-foreground">
        این عنصر از محتوای منتشرشدهٔ سایت استفاده می‌کند. متن و تصویر را در
        برگهٔ مرجع تغییر دهید و آن را منتشر کنید؛ سپس صفحه‌ساز را تازه‌سازی
        کنید. پیش‌نویس این برگه را پیش از خروج ذخیره کنید.
      </p>
      {kind === "learning" ? (
        <a
          href="/admin/learn"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
        >
          مدیریت آموزش‌ها
          <ExternalLink size={15} />
        </a>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? "در حال بارگذاری…" : "نمایش برگه‌های مرتبط"}
          </Button>
          {rows?.map((row) => (
            <a
              key={row.id}
              href={`/admin/content/${row.id}?mode=metadata`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 text-sm text-primary"
            >
              {row.title}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
          {rows?.length === 0 && (
            <p className="text-xs">برگهٔ مرتبطی پیدا نشد.</p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
