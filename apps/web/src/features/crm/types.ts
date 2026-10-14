import type { Lead, LeadDetail, Assignee } from "@/features/leads/types";
export type LeadList = Lead & { school_name: string | null };
export type { LeadDetail, Assignee };
export type PageResult<T> = {
  items: T[];
  pagination: { page: number; page_size: number; total: number; pages: number };
};
export const stages = {
  new: "جدید",
  contacted: "تماس گرفته‌شده",
  qualified: "واجد شرایط",
  demo_scheduled: "دمو برنامه‌ریزی‌شده",
  demo_completed: "دمو برگزارشده",
  proposal: "پیشنهاد",
  negotiation: "مذاکره",
  won: "موفق",
  lost: "ناموفق",
};
export const activityKinds = {
  call: "تماس",
  meeting: "جلسه",
  demo: "دمو",
  task: "کار",
  note: "یادداشت",
  followup: "پیگیری",
};
export const activityStatuses = {
  open: "باز",
  completed: "انجام‌شده",
  canceled: "لغوشده",
};
export const demoStatuses = {
  scheduled: "برنامه‌ریزی‌شده",
  completed: "برگزارشده",
  canceled: "لغوشده",
  no_show: "حاضر نشد",
};
export const noticeKinds: Record<string, string> = {
  new_lead: "درخواست جدید",
  assigned: "تخصیص لید",
  stage_changed: "تغییر مرحلهٔ فروش",
  demo_changed: "تغییر جلسهٔ دمو",
  task_assigned: "تخصیص فعالیت",
  overdue_task: "پیگیری عقب‌افتاده",
  followup_reminder: "یادآوری پیگیری",
  demo_reminder: "یادآوری دمو",
  inactive_opportunity: "فرصت بدون پیگیری",
};
export type CrmRecord = {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
};
export type School = CrmRecord & {
  name: string | null;
  city: string;
  province: string;
  students: number | null;
  interested_features: string[];
  last_activity_at: string;
  purged_at: string | null;
};
export type Contact = CrmRecord & {
  school_id: string;
  source_lead_id: string | null;
  full_name: string | null;
  contact_method: string;
  contact_value: string | null;
  job_title: string;
  is_manager: boolean;
  last_activity_at: string;
  purged_at: string | null;
};
export type Opportunity = CrmRecord & {
  lead_id: string;
  school_id: string;
  title: string;
  stage: keyof typeof stages;
  assigned_to: string | null;
  estimated_value: string;
  expected_close_date: string | null;
  lost_reason: string;
  notes: string;
  last_activity_at: string;
};
export type Activity = CrmRecord & {
  lead_id: string;
  opportunity_id: string | null;
  title: string;
  kind: keyof typeof activityKinds;
  status: keyof typeof activityStatuses;
  body: string;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  actor_id: string;
};
export type Demo = CrmRecord & {
  lead_id: string;
  opportunity_id: string | null;
  assigned_to: string;
  starts_at: string;
  ends_at: string;
  status: keyof typeof demoStatuses;
  outcome: string;
  next_action: string;
};
export type Filters = {
  q?: string;
  school_id?: string;
  assigned_to?: string;
  source?: string;
  tag?: string;
  stage?: string;
  lead_status?: string;
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
};
export type SavedView = CrmRecord & {
  name: string;
  filters: Filters;
  admin_id: string;
};
export type Notification = {
  id: string;
  kind: string;
  href: string;
  read_at: string | null;
  created_at: string;
};
export type Automations = {
  auto_assign: boolean;
  assignment_mode: "least_open" | "fixed";
  fixed_assignee: string | null;
  reminders_enabled: boolean;
  inactive_days: number;
  row_version: number;
};
export type Dashboard = {
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  demo_requests: number;
  scheduled_demos: number;
  completed_demos: number;
  lead_to_demo_percent: number;
  demo_to_opportunity_percent: number;
  overdue_followups: number;
  stages: Record<string, number>;
  sources: Record<string, number>;
  performance: {
    id: string;
    label: string;
    completed_activities: number;
    completed_demos: number;
    won_opportunities: number;
  }[];
};
export type Customer = {
  lead: LeadDetail | null;
  profile: {
    school_id: string | null;
    tags: string[];
    qualification: string;
    converted_at: string | null;
  };
  school: School | null;
  requests: PageResult<LeadDetail>;
  contacts: PageResult<Contact>;
  opportunities: PageResult<Opportunity>;
  activities: PageResult<Activity>;
  demos: PageResult<Demo>;
  timeline: PageResult<{
    id: string;
    kind: string;
    at: string;
    details: Record<string, unknown>;
  }>;
};
export type Resource =
  | "schools"
  | "contacts"
  | "opportunities"
  | "activities"
  | "demos"
  | "profile"
  | "leads";
export type AnyRecord = School | Contact | Opportunity | Activity | Demo;
export function queryString(filters: Filters, page = 1) {
  const query = new URLSearchParams({ page: String(page), page_size: "20" });
  for (const [key, value] of Object.entries(filters))
    if (
      value !== undefined &&
      value !== "" &&
      value !== null &&
      value !== false
    )
      query.set(key, String(value));
  return query.toString();
}

export function leadQueryString(filters: Filters, page = 1) {
  const query = new URLSearchParams(queryString(filters, page));
  for (const key of ["stage", "overdue"]) query.delete(key);
  if (query.has("lead_status")) {
    query.set("status", query.get("lead_status")!);
    query.delete("lead_status");
  }
  return query.toString();
}
