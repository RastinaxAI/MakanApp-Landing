"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminRequest } from "@/features/admin/client";
import { CmsReady } from "@/features/cms/ready";
import type { AdminContent, CmsPage } from "@/features/cms/types";
import {
  defaultGlobals,
  emptyStyles,
  type BuilderSettings,
  type VisualDocument,
} from "./types";
import { GlobalFields } from "./theme";
export const purposeLabels = {
  page: "برگهٔ عمومی",
  template: "قالب برگه",
  section: "بخش قابل استفادهٔ مجدد",
  header: "سربرگ",
  footer: "پابرگ",
};
export function BuilderLibrary({
  initial,
  settings,
  canManageSettings,
  parts,
}: {
  initial: CmsPage<AdminContent>;
  settings: BuilderSettings;
  canManageSettings: boolean;
  parts: AdminContent[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] =
    useState<NonNullable<VisualDocument["purpose"]>>("template");
  const [current, setCurrent] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold">قالب‌ها و طراحی سراسری سایت</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          قالب‌ها، بخش‌های آماده و سربرگ/پابرگ با همان رسانه و تاریخچهٔ نسخه‌های
          CMS نگهداری می‌شوند. این موارد URL عمومی ندارند.
        </p>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-success-soft p-4 text-success"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-warning-soft p-4 text-destructive"
        >
          {error}
        </p>
      )}
      <form
        className="rounded-xl border border-border bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const row = await adminRequest<AdminContent>("content", "POST", {
              title,
              slug: `builder-${purpose}-${crypto.randomUUID()}`,
              payload: {
                kind: "page",
                headline: title,
                summary: "",
                sections: [],
                document: {
                  schema_version: 2,
                  purpose,
                  globals: defaultGlobals,
                  nodes: [
                    {
                      id: `Container_${crypto.randomUUID()}`,
                      type: "Container",
                      version: 1,
                      props: {},
                      styles: {
                        ...emptyStyles(),
                        base: {
                          display: "flex",
                          direction: "column",
                          gap: 24,
                          padding: 24,
                        },
                      },
                      children: [],
                    },
                  ],
                },
              },
              seo: { title: "", description: "", indexable: false },
              visibility: true,
              sort_order: 0,
            });
            router.push(`/admin/content/${row.id}/builder`);
          });
        }}
      >
        <CmsReady disabled={busy} legend="ایجاد قالب یا بخش">
          <div className="grid gap-4 tablet:grid-cols-3">
            <label className="grid gap-2 text-sm">
              نام
              <Input
                aria-label="نام قالب تازه"
                required
                maxLength={180}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              کاربرد
              <select
                aria-label="کاربرد قالب تازه"
                className="min-h-11 rounded-lg border border-input bg-white px-3"
                value={purpose}
                onChange={(event) =>
                  setPurpose(event.target.value as typeof purpose)
                }
              >
                {Object.entries(purposeLabels)
                  .filter(([name]) => name !== "page")
                  .map(([name, label]) => (
                    <option key={name} value={name}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <Button
              className="self-end"
              type="submit"
              disabled={busy || !title.trim()}
            >
              ساخت و بازکردن صفحه‌ساز
            </Button>
          </div>
        </CmsReady>
      </form>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[550px] text-start text-sm">
          <caption className="p-4 text-start font-semibold">
            کتابخانه · {initial.pagination.total.toLocaleString("fa-IR")} مورد
          </caption>
          <thead className="border-y border-border bg-slate-50">
            <tr>
              {["نام", "کاربرد", "نسخه", "وضعیت", "عملیات"].map((item) => (
                <th key={item} scope="col" className="p-4 text-start">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initial.items.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="p-4 font-medium">{row.title}</td>
                <td className="p-4">
                  {row.payload.kind === "page"
                    ? purposeLabels[row.payload.document?.purpose || "page"]
                    : ""}
                </td>
                <td className="p-4">
                  {row.revision_no.toLocaleString("fa-IR")}
                </td>
                <td className="p-4">
                  {row.published_revision_id
                    ? "دارای نسخهٔ منتشرشده"
                    : "پیش‌نویس"}
                </td>
                <td className="p-4">
                  <Link
                    className="inline-flex min-h-11 items-center text-primary-hover"
                    href={`/admin/content/${row.id}/builder`}
                  >
                    ویرایش
                  </Link>{" "}
                  ·{" "}
                  <Link
                    className="inline-flex min-h-11 items-center text-primary-hover"
                    href={`/admin/content/${row.id}/revisions`}
                  >
                    نسخه‌ها
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!initial.items.length && (
          <p className="p-5 text-sm text-muted-foreground">
            هنوز قالبی ذخیره نشده است. یک قالب تازه بسازید یا در Canvas، عنصر
            منتخب را به‌عنوان بخش ذخیره کنید.
          </p>
        )}
        {initial.pagination.pages > 1 && (
          <nav className="flex gap-2 p-4" aria-label="صفحات کتابخانه">
            {Array.from({ length: initial.pagination.pages }, (_, index) => (
              <Link
                key={index}
                className="grid size-11 place-items-center rounded-lg border border-input"
                href={`/admin/builder?page=${index + 1}`}
              >
                {(index + 1).toLocaleString("fa-IR")}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {canManageSettings && (
        <form
          className="space-y-5 rounded-xl border border-border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const { row_version, ...payload } = current;
              setCurrent(
                await adminRequest<BuilderSettings>(
                  "builder/settings",
                  "PATCH",
                  payload,
                  row_version,
                ),
              );
              setNotice("رنگ‌ها، فونت و اتصال سربرگ/پابرگ ذخیره شدند.");
              router.refresh();
            });
          }}
        >
          <h2 className="text-lg font-semibold">رنگ، فونت و اتصال به سایت</h2>
          <CmsReady disabled={busy} legend="تنظیمات طراحی سایت">
            <div className="space-y-5">
              <GlobalFields
                value={current.globals}
                allowInheritance={false}
                onChange={(globals) => setCurrent({ ...current, globals })}
              />
              <div className="grid gap-4 tablet:grid-cols-2">
                {(["header", "footer"] as const).map((role) => (
                  <label className="grid gap-2 text-sm" key={role}>
                    {purposeLabels[role]}
                    <select
                      aria-label={`اتصال ${purposeLabels[role]}`}
                      className="min-h-11 rounded-lg border border-input bg-white px-3"
                      value={current[`${role}_page_id`] || ""}
                      onChange={(event) =>
                        setCurrent({
                          ...current,
                          [`${role}_page_id`]: event.target.value || null,
                        })
                      }
                    >
                      <option value="">طرح فعلی سایت</option>
                      {parts
                        .filter(
                          (row) =>
                            row.payload.kind === "page" &&
                            row.payload.document?.purpose === role &&
                            row.published_revision_id,
                        )
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.title}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-xs leading-7 text-muted-foreground">
                ابتدا سربرگ یا پابرگ را منتشر کنید، سپس اینجا وصل کنید. نسخهٔ
                منتشرشده نمایش داده می‌شود؛ پیش‌نویس در سایت عمومی دیده نمی‌شود.
                برداشتن اتصال، طرح فعلی برند را برمی‌گرداند.
              </p>
              <Button type="submit" disabled={busy}>
                ذخیره طراحی سراسری
              </Button>
            </div>
          </CmsReady>
        </form>
      )}
    </div>
  );
}
