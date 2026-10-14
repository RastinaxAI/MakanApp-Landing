import type { VisualDocument } from "@/features/builder/types";
export type CmsBlock = {
  title: string;
  description: string;
  href?: string | null;
  media_id?: string | null;
};
export type CmsSection = {
  type: string;
  schema_version?: 1;
  faq_slugs?: string[];
  title: string;
  accent?: string;
  kicker?: string;
  description: string;
  body_html?: string;
  items: CmsBlock[];
  media_id?: string | null;
  cta_label?: string;
  cta_href?: string;
};
export type LandingPayload = {
  kind: "home" | "page";
  eyebrow?: string;
  headline: string;
  summary: string;
  sections: CmsSection[];
  legal_draft?: boolean;
  document?: VisualDocument | null;
};
export type FeaturePayload = {
  kind: "feature";
  title: string;
  eyebrow: string;
  headline: string;
  summary: string;
  readiness: "available" | "partial" | "roadmap";
  benefits: CmsBlock[];
  workflow: CmsBlock[];
  boundary: string;
  audience: string;
  icon?: "messenger" | "school" | "reports" | "ai";
  evidence_reference?: string;
  image_media_id?: string | null;
  body_html?: string;
  document?: VisualDocument | null;
};
export type AudiencePayload = {
  kind: "audience";
  title: string;
  eyebrow: string;
  headline: string;
  summary: string;
  pains: string[];
  benefits: CmsBlock[];
  journey: CmsBlock[];
  related: string[];
  cta: string;
  cta_href: string;
  boundary: string;
  body_html?: string;
  document?: VisualDocument | null;
};
export type FaqPayload = {
  kind: "faq";
  question: string;
  answer: string;
  answer_html?: string;
};
export type CmsPayload =
  LandingPayload | FeaturePayload | AudiencePayload | FaqPayload;
export type CmsSeo = {
  title: string;
  description: string;
  indexable: boolean;
  og_media_id: string | null;
};
export type CmsImageRef = {
  id: string;
  width: number;
  height: number;
  alt_text: string;
};
export type CmsContent = {
  id: string;
  slug: string;
  kind: CmsPayload["kind"];
  title: string;
  revision_id: string;
  revision_no: number;
  payload: CmsPayload;
  seo: CmsSeo;
  visibility: boolean;
  sort_order: number;
  category_id: string | null;
  published_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  media: CmsImageRef[];
};
export type AdminContent = CmsContent & {
  publication_state: "draft" | "published" | "scheduled" | "archived";
  row_version: number;
  working_revision_id: string;
  published_revision_id: string | null;
  scheduled_revision_id: string | null;
  scheduled_at: string | null;
  is_archived: boolean;
};
export type CmsPage<T> = {
  items: T[];
  pagination: { page: number; page_size: number; pages: number; total: number };
};
export type FaqCategory = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
};
export type CmsSettings = {
  row_version: number;
  general: {
    brand_name: string;
    tagline: string;
    app_url: string | null;
    site_url: string | null;
    phone: string | null;
    email: string | null;
    logo_media_id: string | null;
    logo_approved: boolean;
  };
  seo: {
    default_title: string;
    default_description: string;
    og_media_id: string | null;
  };
};
export type MediaAsset = CmsImageRef & {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  visibility: "private" | "public";
  created_at: string;
};
