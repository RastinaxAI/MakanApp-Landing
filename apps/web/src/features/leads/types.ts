export type Lead = {
  id: string;
  reference_id: string;
  kind: "demo" | "contact";
  full_name: string | null;
  contact_method: "phone" | "email";
  contact_value: string | null;
  source: string;
  status: string;
  outcome: string | null;
  assigned_to: string | null;
  created_at: string;
  last_activity_at: string;
  purged_at: string | null;
  version: number;
};
export type LeadDetail = Lead & {
  details: Record<string, string>;
  consent_version: string;
  consent_at: string;
};
export type Assignee = { id: string; email: string | null; phone: string | null };
export type Note = {
  id: string;
  actor_id: string;
  body: string;
  created_at: string;
};
export type History = {
  id: string;
  actor_id: string | null;
  changes: Record<string, { from: string | null; to: string | null }>;
  created_at: string;
};
export type Metrics = {
  total: number;
  demo: number;
  contact: number;
  qualified: number;
  contracts: number;
  by_source: Record<string, number>;
};
export const statuses: Record<string, string> = {
  new: "جدید",
  contacted: "تماس گرفته‌شده",
  qualified: "واجد شرایط",
  closed: "بسته‌شده",
};
export const outcomes: Record<string, string> = {
  won: "نتیجهٔ موفق ثبت‌شده",
  lost: "عدم توافق",
  no_response: "بدون پاسخ",
  duplicate: "تکراری",
  resolved: "رسیدگی‌شده",
};
export const sources: Record<string, string> = {
  direct: "مستقیم",
  home: "صفحه اصلی",
  features: "امکانات",
  solutions: "مخاطبان",
  learn: "آموزش",
  blog: "وبلاگ",
  demo: "صفحه دمو",
  contact: "صفحه تماس",
};
export const date = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
