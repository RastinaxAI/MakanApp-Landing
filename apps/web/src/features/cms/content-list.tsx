"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "@/features/admin/client";
import type { AdminContent, CmsPage, CmsPayload } from "./types";
const kinds = {
  page: "صفحه",
  home: "صفحه اصلی",
  feature: "امکان محصول",
  audience: "مخاطب",
  faq: "پرسش متداول",
};
export function ContentList({ initial }: { initial: CmsPage<AdminContent> }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createKind, setCreateKind] = useState<keyof typeof kinds>("page");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  async function load(page = 1) {
    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: "20",
        q: search,
      });
      if (kind) query.set("kind", kind);
      if (status) query.set("status", status);
      setData(await adminRequest<CmsPage<AdminContent>>(`content?${query}`));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فهرست بارگذاری نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setMessage("");
    try {
      let payload: CmsPayload;
      if (createKind === "faq")
        payload = {
          kind: "faq",
          question: title,
          answer: "پاسخ را در ویرایشگر کامل کنید.",
        };
      else if (createKind === "feature")
        payload = {
          kind: "feature",
          title,
          eyebrow: "",
          headline: title,
          summary: "",
          readiness: "roadmap",
          benefits: [],
          workflow: [],
          boundary: "",
          audience: "schools",
        };
      else if (createKind === "audience")
        payload = {
          kind: "audience",
          title,
          eyebrow: "",
          headline: title,
          summary: "",
          pains: [],
          benefits: [],
          journey: [],
          related: [],
          cta: "آشنایی با امکانات",
          cta_href: "/features",
          boundary: "",
        };
      else
        payload = {
          kind: createKind,
          headline: title,
          summary: "",
          sections:
            createKind === "home"
              ? [{ type: "hero", title, description: "", items: [] }]
              : [],
        };
      const result = await adminRequest<AdminContent>("content", "POST", {
        title,
        slug,
        payload,
      });
      router.push(`/admin/content/${result.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "محتوا ایجاد نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function archive(item: AdminContent) {
    setBusy(true);
    try {
      await adminRequest(
        `content/${item.id}`,
        "DELETE",
        undefined,
        item.row_version,
      );
      setArchiveId(null);
      await load(data.pagination.page);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "بایگانی انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">مدیریت محتوای سایت</h1>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4 leading-8">
            {message}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="grid items-end gap-4 rounded-2xl border border-border bg-card p-5 tablet:grid-cols-2 desktop:grid-cols-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cms-q">جست‌وجوی عنوان</Label>
            <Input
              id="cms-q"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cms-kind">نوع محتوا</Label>
            <select
              id="cms-kind"
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">همه انواع</option>
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cms-status">وضعیت انتشار</Label>
            <select
              id="cms-status"
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="draft">پیش‌نویس</option>
              <option value="published">منتشرشده</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="archived">بایگانی</option>
            </select>
          </div>
          <Button disabled={busy} type="submit">
            اعمال فیلتر
          </Button>
        </form>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">محتوای جدید</h2>
          <div className="grid gap-4 tablet:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-content-kind">نوع محتوای جدید</Label>
              <select
                id="new-content-kind"
                className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                value={createKind}
                onChange={(e) =>
                  setCreateKind(e.target.value as keyof typeof kinds)
                }
              >
                {Object.entries(kinds).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-content-title">عنوان محتوای جدید</Label>
              <Input
                id="new-content-title"
                value={title}
                maxLength={180}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-content-slug">آدرس محتوای جدید</Label>
              <Input
                id="new-content-slug"
                value={slug}
                maxLength={160}
                dir="ltr"
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={busy || !title.trim() || !slug.trim()}
            onClick={create}
          >
            ایجاد پیش‌نویس
          </Button>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            محتواها ({data.pagination.total.toLocaleString("fa-IR")})
          </h2>
          {!data.items.length && (
            <p className="rounded-xl border border-dashed border-input p-6">
              محتوایی مطابق این فیلتر ثبت نشده است.
            </p>
          )}
          <ul className="space-y-4">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {kinds[item.kind]} · نسخه{" "}
                    {item.revision_no.toLocaleString("fa-IR")} ·{" "}
                    {
                      {
                        archived: "بایگانی",
                        published: "منتشرشده",
                        scheduled: "زمان‌بندی‌شده",
                        draft: "پیش‌نویس",
                      }[item.publication_state]
                    }
                  </p>
                  <p
                    dir="ltr"
                    className="mt-2 break-all text-sm text-muted-foreground"
                  >
                    {item.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/content/${item.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-primary-hover"
                  >
                    ویرایش
                  </Link>
                  <Link
                    href={`/admin/preview/${item.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-primary-hover"
                  >
                    پیش‌نمایش
                  </Link>
                  {!item.is_archived && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setArchiveId(item.id)}
                    >
                      بایگانی
                    </Button>
                  )}
                </div>
                {archiveId === item.id && (
                  <div className="w-full space-y-3 rounded-xl bg-warning-soft p-4">
                    <p className="leading-8 text-warning">
                      بایگانی، نسخه عمومی و برنامه انتشار را متوقف می‌کند. سابقه
                      نسخه‌ها حفظ می‌شود.
                    </p>
                    <Button disabled={busy} onClick={() => archive(item)}>
                      تأیید بایگانی
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setArchiveId(null)}
                    >
                      انصراف
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              disabled={busy || data.pagination.page <= 1}
              onClick={() => load(data.pagination.page - 1)}
            >
              صفحه قبل
            </Button>
            <span className="self-center">
              صفحه {data.pagination.page.toLocaleString("fa-IR")}
            </span>
            <Button
              variant="outline"
              disabled={busy || data.pagination.page >= data.pagination.pages}
              onClick={() => load(data.pagination.page + 1)}
            >
              صفحه بعد
            </Button>
          </div>
        </section>
      </div>
    </CmsReady>
  );
}
