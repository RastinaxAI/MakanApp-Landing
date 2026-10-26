import { CmsDenied } from "@/features/cms/admin-data";
import { AuditPanel } from "@/features/admin/audit-panel";
import { adminGet, requireAdmin } from "@/lib/admin-api";
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await requireAdmin();
  if (profile.role !== "owner") return <CmsDenied />;
  const raw = (await searchParams).page;
  const page =
    raw && /^\d+$/.test(raw) ? Math.min(100000, Math.max(1, Number(raw))) : 1;
  const data = await adminGet<{
    items: { id: string; action: string; created_at: string }[];
    pagination: { page: number; pages: number };
  }>(`audit-logs?page=${page}&page_size=20`);
  if (!data) throw new Error("Audit data unavailable");
  return (
    <AuditPanel
      items={data.items.map(({ id, action, created_at }) => ({
        id,
        action,
        created_at,
      }))}
      page={page}
      pages={data.pagination.pages}
    />
  );
}
