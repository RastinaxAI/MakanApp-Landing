import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AdminProfile = {
  id: string;
  email: string;
  role: "owner" | "editor" | "sales";
  capabilities: string[];
  mfa_enabled: boolean;
};
export function backendUrl(path: string) {
  const base = new URL(process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000");
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("Invalid internal API configuration");
  return new URL(`/api/v1/${path}`, base);
}
const names = [
  "makan_session",
  "makan_challenge",
  "__Host-makan_session",
  "__Host-makan_challenge",
];
export function permittedCookies(value: string) {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => names.includes(item.split("=", 1)[0] ?? ""))
    .join("; ");
}
export async function adminGet<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const response = await fetch(backendUrl(`admin/${path}`), {
    headers: { Cookie: permittedCookies(jar.toString()) },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Admin service unavailable");
  return response.json() as Promise<T>;
}
export async function requireAdmin() {
  const profile = await adminGet<AdminProfile>("auth/me");
  if (!profile) redirect("/admin/login");
  return profile;
}
