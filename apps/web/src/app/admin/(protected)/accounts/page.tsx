import { adminGet, requireAdmin } from "@/lib/admin-api";
import { AccountsPanel } from "@/features/admin/accounts-panel";
export default async function AccountsPage() {
  const profile = await requireAdmin();
  if (profile.role !== "owner")
    return (
      <h1 className="text-2xl font-semibold">برای این بخش دسترسی ندارید.</h1>
    );
  const data = await adminGet<{
    items: {
      id: string;
      email: string;
      role: "owner" | "editor" | "sales";
      is_active: boolean;
    }[];
    pagination: { page: number; pages: number; total: number };
  }>("accounts?page=1&page_size=20");
  if (!data) return null;
  return <AccountsPanel initial={data} currentId={profile.id} />;
}
