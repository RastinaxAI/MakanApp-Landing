import type { AdminContent, CmsContent } from "@/features/cms/types";
export const audiences = {
  manager: "مدیر مدرسه",
  teacher: "معلم",
  parent: "والد",
  student: "دانش‌آموز",
} as const;
export const levels = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
} as const;
export const topics = {
  "getting-started": "شروع کار",
  messenger: "پیام‌رسان",
  class: "کلاس",
  assignment: "تکلیف",
  exam: "آزمون",
  reports: "گزارش‌ها",
} as const;
export type Taxonomy = {
  id: string;
  slug: string;
  title: string;
  domain: "learn" | "blog";
  sort_order: number;
};
export type LearningPayload = {
  kind: "article" | "video" | "blog" | "series";
  headline: string;
  summary: string;
  body_html: string;
  cover_media_id: string | null;
  audiences: (keyof typeof audiences)[];
  level: keyof typeof levels;
  topic: keyof typeof topics;
  estimated_minutes: number;
  category_ids: string[];
  tag_ids: string[];
  related_ids?: string[];
  item_ids?: string[];
  featured: boolean;
  aparat_id: string | null;
  duration_seconds: number | null;
  video_uploaded_at: string | null;
  transcript_html: string;
  sources: { title: string; href: string }[];
  cta_label: string;
  cta_href: string;
  toc?: { id: string; text: string; level: number }[];
};
export type LearningContent = Omit<CmsContent, "kind" | "payload"> & {
  kind: LearningPayload["kind"];
  payload: LearningPayload;
  qualified_views?: number;
  categories?: Taxonomy[];
  tags?: Taxonomy[];
};
export type LearningAdmin = Omit<AdminContent, "kind" | "payload"> & {
  kind: LearningPayload["kind"];
  payload: LearningPayload;
};
export type LearningDetail = LearningContent & {
  related: LearningContent[];
  items: LearningContent[];
  series: LearningContent[];
  previous: LearningContent | null;
  next: LearningContent | null;
  active_series?: string | null;
};
export const resourceFor = (kind: LearningPayload["kind"]) =>
  kind === "blog"
    ? "blog/articles"
    : kind === "series"
      ? "learn/series"
      : "learn/contents";
export const hrefFor = (
  item: Pick<LearningContent, "kind" | "slug">,
  series?: string | null,
) =>
  (item.kind === "blog"
    ? `/blog/${encodeURIComponent(item.slug)}`
    : `/learn/${item.kind === "series" ? "series" : item.kind === "video" ? "videos" : "articles"}/${encodeURIComponent(item.slug)}`) +
  (series && item.kind !== "series"
    ? `?series=${encodeURIComponent(series)}`
    : "");
export function initialPayload(kind: LearningPayload["kind"]): LearningPayload {
  return {
    kind,
    headline: "",
    summary: "",
    body_html: "",
    cover_media_id: null,
    audiences: [],
    level: "beginner",
    topic: "getting-started",
    estimated_minutes: 5,
    category_ids: [],
    tag_ids: [],
    related_ids: [],
    item_ids: [],
    featured: false,
    aparat_id: null,
    duration_seconds: null,
    video_uploaded_at: null,
    transcript_html: "",
    sources: [],
    cta_label: "مشاهده امکانات ماکان",
    cta_href: "/features",
  };
}
