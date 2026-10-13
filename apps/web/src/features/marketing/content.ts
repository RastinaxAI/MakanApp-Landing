import type { AudiencePayload, FeaturePayload, CmsBlock, CmsImageRef } from "@/features/cms/types";
export type FeatureSlug = "messenger" | "school" | "reports" | "ai";
export type AudienceSlug = "schools" | "teachers" | "parents" | "students";
export type ContentBlock = Readonly<CmsBlock>;
export type Feature = Omit<FeaturePayload, "kind"> & { slug: string; media?: CmsImageRef[] };
export type Audience = Omit<AudiencePayload, "kind"> & { slug: string };
