import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { RichText } from "@/features/cms/rich-text";
import { MediaImage } from "@/features/cms/media-image";
import { publicGet, pageMetadata, getPage } from "@/lib/public-api";
import { CmsRenderer } from "@/features/cms/renderer";
import type { CmsPage } from "@/features/cms/types";
import { AparatPlayer } from "./player";
import { QualifiedView } from "./view";
import {
  audiences,
  levels,
  topics,
  hrefFor,
  type LearningContent,
  type LearningDetail,
  type Taxonomy,
} from "./types";

export type Search = Record<string, string | string[] | undefined>;
export function libraryQuery(search: Search, category?: string) {
  const q = new URLSearchParams();
  for (const key of ["q", "category", "tag"]) {
    const value = search[key];
    if (typeof value === "string" && value.length <= 100 && value)
      q.set(key, value);
  }
  for (const [key, values] of Object.entries({
    audience: Object.keys(audiences),
    level: Object.keys(levels),
    topic: Object.keys(topics),
    type: ["article", "video"],
    sort: ["newest", "popular"],
  })) {
    const v = search[key];
    if (typeof v === "string" && values.includes(v)) q.set(key, v);
  }
  const page = Number(search.page);
  if (Number.isSafeInteger(page) && page > 0 && page < 100000)
    q.set("page", String(page));
  q.set("page_size", "12");
  if (category) q.set("category", category);
  return q;
}
export function LearningCards({
  items,
  series,
  privatePreview = false,
}: {
  items: LearningContent[];
  series?: string;
  privatePreview?: boolean;
}) {
  return (
    <div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
      {items.map((item) => {
        const image = item.media.find(
          (m) => m.id === item.payload.cover_media_id,
        );
        return (
          <article
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            {image && (
              <MediaImage image={image} privatePreview={privatePreview} />
            )}
            <p className="text-sm text-muted-foreground">
              {item.kind === "video"
                ? "ویدیو"
                : item.kind === "series"
                  ? "مجموعه"
                  : item.kind === "blog"
                    ? "مقاله وبلاگ"
                    : "راهنمای متنی"}{" "}
              · {levels[item.payload.level]}
            </p>
            <h3 className="text-xl font-semibold leading-8">
              <Link
                className="text-primary-hover"
                href={
                  privatePreview
                    ? `/admin/learn/preview/${item.id}?kind=${item.kind}`
                    : hrefFor(item, series)
                }
              >
                {item.payload.headline}
              </Link>
            </h3>
            <p className="flex-1 leading-8 text-muted-foreground">
              {item.payload.summary}
            </p>
            {item.kind !== "series" && (
              <p className="text-sm text-muted-foreground">
                {item.kind === "video"
                  ? `${Math.ceil((item.payload.duration_seconds || 0) / 60).toLocaleString("fa-IR")} دقیقه ویدیو`
                  : `${item.payload.estimated_minutes.toLocaleString("fa-IR")} دقیقه مطالعه`}
                {!!item.qualified_views &&
                  ` · ${item.qualified_views.toLocaleString("fa-IR")} بازدید واجد شرایط`}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
export async function Library({
  search,
  domain = "learn",
  category,
}: {
  search: Search;
  domain?: "learn" | "blog";
  category?: string;
}) {
  const query = libraryQuery(search, category);
  const seriesQuery = new URLSearchParams(query);
  seriesQuery.delete("type");
  seriesQuery.delete("page");
  const [data, categories, tags, series] = await Promise.all([
    publicGet<CmsPage<LearningContent>>(
      `${domain === "blog" ? "blog/articles" : "learn/contents"}?${query}`,
    ),
    publicGet<CmsPage<Taxonomy>>(
      `learn/categories?domain=${domain}&page_size=100`,
    ),
    publicGet<CmsPage<Taxonomy>>(`learn/tags?domain=${domain}&page_size=100`),
    domain === "learn"
      ? publicGet<CmsPage<LearningContent>>(`learn/series?${seriesQuery}`)
      : Promise.resolve(null),
  ]);
  const categoryData = category
    ? await publicGet<Taxonomy>(
        `learn/categories/${encodeURIComponent(category)}`,
      )
    : null;
  const header = await getPage(domain);
  if (header.payload.kind !== "page") notFound();
  if (categoryData)
    header.payload = { ...header.payload, headline: categoryData.title };
  function select(
    name: string,
    label: string,
    options: Record<string, string>,
  ) {
    return (
      <label className="space-y-2">
        <span className="block text-sm">{label}</span>
        <select
          name={name}
          defaultValue={query.get(name) || ""}
          className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
        >
          <option value="">همه</option>
          {Object.entries(options).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const path = category
    ? `/learn/categories/${encodeURIComponent(category)}`
    : `/${domain}`;
  return (
    <>
      <CmsRenderer content={header} />
      <section className="section-space">
        <Container>
          <form
            action={path}
            className="mb-8 grid gap-4 rounded-2xl border border-border bg-card p-5 tablet:grid-cols-2 desktop:grid-cols-4"
            aria-label="فیلتر آموزش‌ها"
          >
            <label className="space-y-2">
              <span className="block text-sm">جست‌وجو</span>
              <input
                name="q"
                defaultValue={query.get("q") || ""}
                maxLength={100}
                className="min-h-11 w-full rounded-lg border border-input px-3"
              />
            </label>
            {select("audience", "مخاطب", audiences)}
            {select("topic", "موضوع", topics)}
            {domain === "learn" &&
              select("type", "نوع محتوا", { article: "متنی", video: "ویدیو" })}
            {select("level", "سطح", levels)}
            {!category &&
              select(
                "category",
                "دسته‌بندی",
                Object.fromEntries(
                  categories.items.map((c) => [c.slug, c.title]),
                ),
              )}
            {select(
              "tag",
              "برچسب",
              Object.fromEntries(tags.items.map((c) => [c.slug, c.title])),
            )}
            {select("sort", "مرتب‌سازی", {
              newest: "جدیدترین",
              popular: "بازدید واجد شرایط",
            })}
            <button
              className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground"
              type="submit"
            >
              اعمال فیلترها
            </button>
            <Link
              href={path}
              className="inline-flex min-h-11 items-center text-primary-hover"
            >
              پاک‌کردن فیلترها
            </Link>
          </form>
          {data.items.length ? (
            <>
              <p className="mb-5 text-muted-foreground">
                {data.pagination.total.toLocaleString("fa-IR")} مطلب
              </p>
              <LearningCards items={data.items} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-input p-8">
              <h2 className="text-xl font-semibold">
                {data.pagination.total === 0 && query.size === 1
                  ? "هنوز مطلبی منتشر نشده است."
                  : "مطلبی با این فیلترها یافت نشد."}
              </h2>
              <p className="mt-3 text-muted-foreground">
                محتوای تأییدشده پس از انتشار در اینجا نمایش داده می‌شود.
              </p>
            </div>
          )}
          {data.pagination.pages > 1 && (
            <nav
              aria-label="صفحه‌بندی آموزش‌ها"
              className="my-6 flex flex-wrap gap-4"
            >
              {[data.pagination.page - 1, data.pagination.page + 1]
                .filter((p) => p >= 1 && p <= data.pagination.pages)
                .map((p) => {
                  const q = new URLSearchParams(query);
                  q.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`${path}?${q}`}
                      className="inline-flex min-h-11 items-center rounded-lg border border-input px-4"
                    >
                      صفحه {p.toLocaleString("fa-IR")}
                    </Link>
                  );
                })}
            </nav>
          )}
          {!!series?.items.length && (
            <section className="mt-12">
              <SectionHeading
                title="مجموعه‌های آموزشی"
                description="از اولین قدم تا استفاده از امکانات، به ترتیب پیش بروید."
              />
              <LearningCards items={series.items} />
              {series.pagination.pages > 1 && (
                <Link
                  className="mt-4 inline-flex min-h-11 items-center text-primary-hover"
                  href="/learn/series"
                >
                  همه مجموعه‌ها
                </Link>
              )}
            </section>
          )}
          {!!categories.items.length && domain === "learn" && (
            <nav
              className="mt-8 flex flex-wrap gap-4"
              aria-label="دسته‌های آموزش"
            >
              {categories.items.map((c) => (
                <Link
                  className="inline-flex min-h-11 items-center text-primary-hover underline"
                  key={c.id}
                  href={`/learn/categories/${encodeURIComponent(c.slug)}`}
                >
                  {c.title}
                </Link>
              ))}
            </nav>
          )}
        </Container>
      </section>
    </>
  );
}
export async function FeaturedLearning() {
  const data = await publicGet<CmsPage<LearningContent>>(
    "learn/contents?featured=true&page_size=3",
  );
  return data.items.length ? (
    <section className="section-space" data-section="learning">
      <Container>
        <SectionHeading
          title="آموزش ماکان"
          description="راهنماهای منتخب برای شروع و استفاده بهتر از ماکان."
        />
        <LearningCards items={data.items} />
        <Link
          href="/learn"
          className="mt-6 inline-flex min-h-11 items-center text-primary-hover underline"
        >
          مشاهده همه آموزش‌ها
        </Link>
      </Container>
    </section>
  ) : null;
}
export async function learningMetadata(content: LearningContent) {
  return pageMetadata(
    {
      ...content,
      kind: "page",
      payload: {
        kind: "page",
        headline: content.payload.headline,
        summary: content.payload.summary,
        sections: [],
      },
    },
    hrefFor(content),
  );
}
export function LearningArticle({
  content,
  privatePreview = false,
}: {
  content: LearningDetail;
  privatePreview?: boolean;
}) {
  const p = content.payload;
  const cover = content.media.find((m) => m.id === p.cover_media_id);
  return (
    <>
      <PageHero
        eyebrow={
          content.kind === "blog"
            ? "وبلاگ"
            : content.kind === "series"
              ? "مجموعه آموزشی"
              : "آموزش ماکان"
        }
        title={p.headline}
        description={p.summary}
      />
      <Container className="max-w-5xl">
        <nav
          aria-label="مسیر صفحه"
          className="my-5 flex flex-wrap gap-3 text-sm"
        >
          <Link href="/">خانه</Link>
          <span aria-hidden="true">/</span>
          <Link href={content.kind === "blog" ? "/blog" : "/learn"}>
            {content.kind === "blog" ? "وبلاگ" : "مرکز آموزش"}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{p.headline}</span>
        </nav>
        <p className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{p.audiences.map((role) => audiences[role]).join("، ")}</span>
          <span>
            {levels[p.level]} · {topics[p.topic]}
          </span>
          {content.kind !== "series" && (
            <span>
              {p.estimated_minutes.toLocaleString("fa-IR")} دقیقه مطالعه
            </span>
          )}
          {content.reviewed_at && (
            <span>
              آخرین بازبینی:{" "}
              {new Date(content.reviewed_at).toLocaleDateString("fa-IR")}
            </span>
          )}
          {content.published_at && (
            <span>
              انتشار:{" "}
              {new Date(content.published_at).toLocaleDateString("fa-IR")}
            </span>
          )}
        </p>
        {content.kind === "video" && p.aparat_id ? (
          <>
            <AparatPlayer
              id={p.aparat_id}
              title={p.headline}
              poster={cover}
              privatePreview={privatePreview}
            />
            <p className="my-4 text-muted-foreground">
              مدت ویدیو:{" "}
              {Math.floor((p.duration_seconds || 0) / 60).toLocaleString(
                "fa-IR",
              )}{" "}
              دقیقه و {((p.duration_seconds || 0) % 60).toLocaleString("fa-IR")}{" "}
              ثانیه
            </p>
          </>
        ) : (
          cover && <MediaImage image={cover} privatePreview={privatePreview} />
        )}
        {!!p.toc?.length && (
          <nav
            className="my-8 rounded-xl border border-border bg-card p-5"
            aria-label="فهرست مطالب"
          >
            <h2 className="mb-3 text-xl font-semibold">فهرست مطالب</h2>
            <ul className="space-y-2">
              {p.toc.map((h) => (
                <li key={h.id}>
                  <a
                    className="inline-flex min-h-11 items-center text-primary-hover underline"
                    href={`#${h.id}`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <article className="my-8">
          <RichText html={p.body_html} privatePreview={privatePreview} />
        </article>
        {p.transcript_html && (
          <section className="my-8">
            <h2 className="mb-4 text-2xl font-semibold">متن ویدیو</h2>
            <RichText
              html={p.transcript_html}
              privatePreview={privatePreview}
            />
          </section>
        )}
        {!!content.items.length && (
          <section className="my-10">
            <h2 className="mb-5 text-2xl font-semibold">قسمت‌های مجموعه</h2>
            <ol className="space-y-4">
              {content.items.map((item, i) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <Link
                    href={
                      privatePreview
                        ? `/admin/learn/preview/${item.id}?kind=${item.kind}`
                        : hrefFor(item, content.slug)
                    }
                    className="inline-flex min-h-11 items-center gap-3 text-primary-hover"
                  >
                    {(i + 1).toLocaleString("fa-IR")} · {item.payload.headline}
                  </Link>
                  <p className="leading-8 text-muted-foreground">
                    {item.payload.summary}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!p.sources.length && (
          <section className="my-8">
            <h2 className="text-xl font-semibold">منابع</h2>
            <ul>
              {p.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.href}
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-primary-hover underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="my-8 flex flex-wrap gap-3">
          {content.categories?.map((c) => (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-primary-hover"
              key={c.id}
              href={
                content.kind === "blog"
                  ? `/blog?category=${encodeURIComponent(c.slug)}`
                  : `/learn/categories/${encodeURIComponent(c.slug)}`
              }
            >
              {c.title}
            </Link>
          ))}
          {content.tags?.map((t) => (
            <Link
              className="inline-flex min-h-11 items-center text-primary-hover"
              key={t.id}
              href={`/${content.kind === "blog" ? "blog" : "learn"}?tag=${encodeURIComponent(t.slug)}`}
            >
              #{t.title}
            </Link>
          ))}
        </div>
        {!!content.series.length && (
          <nav
            className="my-6 flex flex-wrap gap-4"
            aria-label="مجموعه‌های این آموزش"
          >
            {content.series.map((s) => (
              <Link
                className="inline-flex min-h-11 items-center text-primary-hover underline"
                key={s.id}
                href={hrefFor(s)}
              >
                {s.payload.headline}
              </Link>
            ))}
          </nav>
        )}
        {(content.previous || content.next) && (
          <nav
            className="my-8 flex flex-wrap justify-between gap-4"
            aria-label="آموزش قبلی و بعدی"
          >
            {content.previous && (
              <Link
                className="inline-flex min-h-11 items-center text-primary-hover"
                href={hrefFor(content.previous, content.active_series)}
              >
                قبلی: {content.previous.payload.headline}
              </Link>
            )}
            {content.next && (
              <Link
                className="inline-flex min-h-11 items-center text-primary-hover"
                href={hrefFor(content.next, content.active_series)}
              >
                بعدی: {content.next.payload.headline}
              </Link>
            )}
          </nav>
        )}
        {!!content.related.length && (
          <section className="my-10">
            <h2 className="mb-5 text-2xl font-semibold">آموزش‌های مرتبط</h2>
            <LearningCards
              items={content.related}
              privatePreview={privatePreview}
            />
          </section>
        )}
        <aside className="my-10 rounded-2xl bg-secondary p-6">
          <p className="mb-3">با قابلیت‌های ماکان بیشتر آشنا شوید.</p>
          <Link
            href={p.cta_href}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-primary-foreground"
          >
            {p.cta_label}
          </Link>
        </aside>
        {!privatePreview && content.kind !== "series" && (
          <QualifiedView id={content.id} />
        )}
      </Container>
    </>
  );
}
export async function getLearningDetail(
  slug: string,
  kind: LearningContent["kind"],
  series?: string,
) {
  const content = await publicGet<LearningDetail>(
    `${kind === "blog" ? "blog/articles" : kind === "series" ? "learn/series" : "learn/contents"}/${encodeURIComponent(slug)}${series ? `?series=${encodeURIComponent(series)}` : ""}`,
  );
  if (content.kind !== kind) notFound();
  return content;
}
export async function PublicLearningDetail({
  slug,
  kind,
  series,
}: {
  slug: string;
  kind: LearningContent["kind"];
  series?: string;
}) {
  const content = await getLearningDetail(slug, kind, series);
  return <LearningArticle content={content} />;
}
