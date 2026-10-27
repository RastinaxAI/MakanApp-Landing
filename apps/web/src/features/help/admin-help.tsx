"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BookOpen, CircleHelp, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminProfile } from "@/lib/admin-api";
import { AdminPageHeader } from "@/features/admin/page-kit";
import { adminGuides, allowedGuides, guideForPath } from "./admin-guides";
import { GuideDialog } from "./guide-dialog";

export function AdminHelpButton({ profile }: { profile: AdminProfile }) {
  const path = usePathname();
  const guide = guideForPath(path, profile);
  return (
    <GuideDialog key={`${path}:${guide.id}`} guide={guide}>
      <Button
        variant="ghost"
        className="text-white hover:bg-slate-700 hover:text-white"
        aria-label="راهنمای این صفحه"
      >
        <CircleHelp className="size-5" aria-hidden="true" />
        <span className="hidden tablet:inline">راهنمای این صفحه</span>
      </Button>
    </GuideDialog>
  );
}

function searchable(value: string) {
  return value.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").trim();
}

export function CanvasHelpButton() {
  const guide = adminGuides.find((item) => item.id === "canvas")!;
  return (
    <GuideDialog guide={guide}>
      <button
        type="button"
        aria-label="راهنمای این صفحه"
        title="راهنمای صفحه‌ساز"
      >
        <CircleHelp size={20} aria-hidden="true" />
        <span>راهنما</span>
      </button>
    </GuideDialog>
  );
}

export function AdminHelpCenter({ profile }: { profile: AdminProfile }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const guides = allowedGuides(profile).filter((guide) => guide.listed);
  const filtered = guides.filter(
    (guide) =>
      (!group || guide.group === group) &&
      searchable(
        [
          guide.title,
          guide.description,
          ...guide.steps.flatMap((item) => [item.title, item.text]),
        ].join(" "),
      ).includes(searchable(query)),
  );
  return (
    <div className="admin-page admin-guide-center">
      <AdminPageHeader
        title="راهنمای تصویری پنل"
        eyebrow="از کجا شروع کنم؟"
        description="کار موردنظرتان را انتخاب کنید؛ تصویر ابزار، مراحل انجام کار و مسیر رفتن به بخش مربوط را کنار هم ببینید."
      />
      <div className="guide-orientation">
        <MapPin size={22} aria-hidden="true" />
        <div>
          <h2 className="font-bold">اینجا راهنمای مدیریت وب‌سایت است</h2>
          <p>
            برای یادگیری کار با اپلیکیشن مدرسه، پیام‌رسان و حساب‌های معلم و
            خانواده، به{" "}
            <Link href="/learn?topic=getting-started" prefetch={false}>
              آموزش کار با ماکان
            </Link>{" "}
            بروید.
          </p>
        </div>
      </div>
      <div className="guide-find-tools">
        <label className="guide-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">جست‌وجو در راهنمای پنل</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً: تغییر عکس، انتشار، ثبت دمو…"
            maxLength={100}
          />
        </label>
        <div className="guide-groups" aria-label="موضوع راهنما">
          {["", ...new Set(guides.map((guide) => guide.group))].map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={item === group}
              onClick={() => setGroup(item)}
            >
              {item || "همه"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {filtered.length.toLocaleString("fa-IR")} راهنما متناسب با دسترسی شما
      </p>
      {filtered.length ? (
        <div className="guide-chapter-list">
          {filtered.map((guide) => (
            <article className="guide-chapter" key={guide.id}>
              <div className="guide-chapter-icon" aria-hidden="true">
                <BookOpen size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs text-muted-foreground">
                  {guide.group} · {guide.steps.length.toLocaleString("fa-IR")}{" "}
                  گام
                </p>
                <h2 className="text-base font-bold">{guide.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {guide.description}
                </p>
              </div>
              <div className="guide-chapter-actions">
                <GuideDialog guide={guide}>
                  <Button
                    variant="outline"
                    aria-label={`مشاهده راهنما: ${guide.title}`}
                  >
                    مشاهده راهنما
                  </Button>
                </GuideDialog>
                <Link
                  href={guide.path}
                  prefetch={false}
                  aria-label={`رفتن به بخش: ${guide.title}`}
                >
                  رفتن به بخش <ArrowLeft size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-surface p-7 text-center">
          <p>راهنمایی با این عبارت پیدا نشد.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setGroup("");
            }}
          >
            نمایش همهٔ راهنماها
          </Button>
        </div>
      )}
    </div>
  );
}
