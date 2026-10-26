"use client";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import {
  Archive,
  ArrowLeft,
  Eye,
  FileText,
  History,
  Home,
  Layers3,
  MessageCircleQuestion,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminContent } from "./types";

export const contentKinds = {
  page: "صفحه",
  home: "صفحه اصلی",
  feature: "امکان محصول",
  audience: "مخاطب",
  faq: "پرسش متداول",
};
export const contentStatuses = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  scheduled: "زمان‌بندی‌شده",
  archived: "بایگانی",
};
const icons = {
  page: FileText,
  home: Home,
  feature: Layers3,
  audience: Users,
  faq: MessageCircleQuestion,
};
const stateStyles = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-success-soft text-success",
  scheduled: "bg-blue-50 text-primary-hover",
  archived: "bg-amber-50 text-amber-800",
};

export function ContentRow({
  item,
  busy,
  confirming,
  onConfirm,
  onCancel,
  onArchive,
}: {
  item: AdminContent;
  busy: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onArchive: () => void;
}) {
  const Icon = icons[item.kind];
  return (
    <li className="content-row" aria-label={item.title}>
      <div className="content-row-grid">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${item.kind === "home" ? "border-blue-100 bg-secondary text-primary" : "border-slate-200 bg-slate-50 text-slate-500"}`}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold leading-7">
              <Link
                href={`/admin/content/${item.id}`}
                className="rounded hover:text-primary-hover"
              >
                {item.title}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {contentKinds[item.kind]}
              <span className="mx-2 text-slate-300" aria-hidden="true">
                /
              </span>
              نسخهٔ {item.revision_no.toLocaleString("fa-IR")}
            </p>
            <p
              dir="ltr"
              className="mt-1.5 break-all text-start text-[11px] leading-5 text-slate-500"
            >
              {item.slug}
            </p>
          </div>
        </div>
        <div className="content-row-state">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${stateStyles[item.publication_state]}`}
          >
            <span
              className="size-1.5 rounded-full bg-current"
              aria-hidden="true"
            />
            {contentStatuses[item.publication_state]}
          </span>
        </div>
        <div className="content-row-date text-xs leading-6 text-muted-foreground">
          <span className="min-[1200px]:hidden">آخرین ویرایش: </span>
          <time dateTime={item.updated_at}>
            {new Date(item.updated_at).toLocaleDateString("fa-IR", {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "Asia/Tehran",
            })}
          </time>
        </div>
        <div className="content-row-actions flex items-center gap-1">
          <Link
            href={`/admin/content/${item.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary-hover hover:bg-secondary"
          >
            ویرایش
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </Link>
          <Link
            href={`/admin/preview/${item.id}`}
            aria-label="پیش‌نمایش"
            title="پیش‌نمایش خصوصی"
            className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-primary-hover"
          >
            <Eye className="size-4" aria-hidden="true" />
          </Link>
          <DropdownMenu.Root dir="rtl">
            <DropdownMenu.Trigger asChild>
              <Button
                disabled={busy}
                size="icon"
                variant="ghost"
                aria-label={`گزینه‌های ${item.title}`}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                align="end"
                className="z-[70] min-w-44 rounded-xl border border-border bg-white p-1.5 text-sm text-foreground shadow-lg"
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/admin/content/${item.id}/revisions`}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none focus:bg-secondary"
                  >
                    <History className="size-4" aria-hidden="true" />
                    تاریخچهٔ نسخه‌ها
                  </Link>
                </DropdownMenu.Item>
                {!item.is_archived && (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      disabled={busy}
                      onSelect={onArchive}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-destructive outline-none focus:bg-red-50"
                    >
                      <Archive className="size-4" aria-hidden="true" />
                      بایگانی
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      {confirming && (
        <div
          role="group"
          aria-label={`تأیید بایگانی ${item.title}`}
          className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 tablet:mx-5"
        >
          <p className="mb-3 text-sm leading-7 text-amber-900">
            بایگانی، نمایش عمومی و برنامهٔ انتشار این محتوا را متوقف می‌کند.
            تاریخچهٔ نسخه‌ها حفظ می‌شود.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={onConfirm}
              variant="destructive"
              className="text-xs"
            >
              تأیید بایگانی
            </Button>
            <Button
              disabled={busy}
              onClick={onCancel}
              variant="outline"
              className="text-xs"
            >
              انصراف
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
