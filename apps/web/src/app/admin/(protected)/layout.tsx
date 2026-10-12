import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-api";
import { AdminShell } from "@/features/admin/admin-shell";
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireAdmin();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
