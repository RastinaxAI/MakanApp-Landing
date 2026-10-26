"use client";

import { useId, useState } from "react";
import { Dialog } from "radix-ui";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceLink as Link } from "@/features/leads/source-link";

export type LibraryFilter = {
  name: string;
  label: string;
  options: Record<string, string>;
};

export function LibrarySearch({
  path,
  domain,
  values,
  filters,
}: {
  path: string;
  domain: "learn" | "blog";
  values: Record<string, string>;
  filters: LibraryFilter[];
}) {
  const id = useId();
  const [q, setQ] = useState(values.q || "");
  const label = domain === "learn" ? "آموزش‌ها" : "وبلاگ";
  const active = filters.filter(
    (filter) =>
      values[filter.name] &&
      !(filter.name === "sort" && values.sort === "newest"),
  );
  function without(name: string) {
    const query = new URLSearchParams(values);
    query.delete(name);
    query.delete("page");
    query.delete("page_size");
    return query.size ? `${path}?${query}` : path;
  }

  return (
    <div className="public-library-tools mb-9">
      <div className="public-library-toolbar">
        <form
          action={path}
          role="search"
          aria-label={`جست‌وجو در ${label}`}
          className="public-library-search"
        >
          <label htmlFor={`${id}-search`} className="sr-only">
            جست‌وجو
          </label>
          <Search
            size={22}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
          <input
            id={`${id}-search`}
            type="search"
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            maxLength={100}
            placeholder={
              domain === "learn"
                ? "چه چیزی می‌خواهید یاد بگیرید؟"
                : "دنبال چه موضوعی هستید؟"
            }
          />
          {filters.map((filter) =>
            values[filter.name] ? (
              <input
                key={filter.name}
                type="hidden"
                name={filter.name}
                value={values[filter.name]}
              />
            ) : null,
          )}
          <Button type="submit" className="min-h-12 rounded-xl">
            جست‌وجو
          </Button>
        </form>

        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button
              variant="outline"
              className="public-library-filter-trigger"
              aria-label="فیلترها"
              aria-describedby={`${id}-active-count`}
            >
              <SlidersHorizontal aria-hidden="true" />
              فیلترها
              {active.length > 0 && (
                <span className="public-filter-count" aria-hidden="true">
                  {active.length.toLocaleString("fa-IR")}
                </span>
              )}
              <span id={`${id}-active-count`} className="sr-only">
                {active.length.toLocaleString("fa-IR")} فیلتر فعال
              </span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm" />
            <Dialog.Content
              dir="rtl"
              className="public-library-dialog fixed top-1/2 left-1/2 z-[101] flex max-h-[min(90dvh,52rem)] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-panel"
            >
              <div className="relative border-b border-border p-5 pe-16 tablet:p-7 tablet:pe-20">
                <Dialog.Title className="text-xl font-bold text-foreground">
                  فیلترهای {label}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
                  مطلب مناسب خود را با انتخاب موضوع، مخاطب و دسته‌بندی پیدا
                  کنید.
                </Dialog.Description>
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 rounded-xl"
                    aria-label="بستن فیلترها"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
              <form
                action={path}
                aria-label={`فیلتر ${label}`}
                className="flex min-h-0 flex-col"
              >
                <input type="hidden" name="q" value={q} />
                <div className="grid min-h-0 gap-5 overflow-y-auto p-5 tablet:grid-cols-2 tablet:p-7">
                  {filters.map((filter) => (
                    <div key={filter.name} className="space-y-2">
                      <label
                        htmlFor={`${id}-${filter.name}`}
                        className="block text-sm font-medium"
                      >
                        {filter.label}
                      </label>
                      <select
                        id={`${id}-${filter.name}`}
                        name={filter.name}
                        defaultValue={values[filter.name] || ""}
                      >
                        <option value="">
                          {filter.name === "sort"
                            ? "پیش‌فرض (جدیدترین)"
                            : "همه"}
                        </option>
                        {Object.entries(filter.options).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/40 p-5 tablet:px-7">
                  <Link
                    href={path}
                    className="inline-flex min-h-11 items-center text-sm text-primary-hover underline underline-offset-4"
                  >
                    پاک‌کردن همه
                  </Link>
                  <div className="flex gap-2">
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                      >
                        انصراف
                      </Button>
                    </Dialog.Close>
                    <Button type="submit" className="rounded-xl">
                      اعمال فیلترها
                    </Button>
                  </div>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      {(active.length > 0 || values.q) && (
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          aria-label="فیلترهای فعال"
        >
          {values.q && (
            <Link
              className="public-filter-chip"
              href={without("q")}
              aria-label={`حذف جست‌وجو: ${values.q}`}
            >
              جست‌وجو: {values.q}
              <X size={14} aria-hidden="true" />
            </Link>
          )}
          {active.map((filter) => (
            <Link
              key={filter.name}
              className="public-filter-chip"
              href={without(filter.name)}
              aria-label={`حذف فیلتر ${filter.label}`}
            >
              {filter.label}:{" "}
              {filter.options[values[filter.name] || ""] || values[filter.name]}
              <X size={14} aria-hidden="true" />
            </Link>
          ))}
          <Link
            href={path}
            className="inline-flex min-h-11 items-center px-2 text-sm text-primary-hover underline underline-offset-4"
          >
            پاک‌کردن فیلترها
          </Link>
        </div>
      )}
    </div>
  );
}
