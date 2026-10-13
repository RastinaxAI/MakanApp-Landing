import "server-only";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { backendUrl, permittedCookies, requireAdmin } from "@/lib/admin-api";
import type { CmsPage, MediaAsset } from "./types";

export async function requireContentAdmin(ownerOnly = false) {
  const profile = await requireAdmin();
  if (
    ownerOnly
      ? profile.role !== "owner"
      : !profile.capabilities.includes("content")
  )
    return false;
  return true;
}
export async function cmsGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const response = await fetch(backendUrl(`admin/${path}`), {
    headers: { Cookie: permittedCookies(jar.toString()) },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) redirect("/admin/login");
  if (response.status === 404 || response.status === 422) notFound();
  if (!response.ok) throw new Error("CMS service unavailable");
  return response.json() as Promise<T>;
}
export async function cmsAll<T>(resource: string) {
  const result: T[] = [];
  for (let page = 1; ; page++) {
    const data = await cmsGet<CmsPage<T>>(
      `${resource}?page=${page}&page_size=100`,
    );
    result.push(...data.items);
    if (page >= data.pagination.pages) return result;
  }
}
export const cmsAssets = () => cmsAll<MediaAsset>("media");
export function CmsDenied() {
  return (
    <h1 className="text-2xl font-semibold">برای این بخش دسترسی ندارید.</h1>
  );
}
