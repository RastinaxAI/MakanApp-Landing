import { CmsDenied } from "@/features/cms/admin-data";
import { adminGet, requireAdmin } from "@/lib/admin-api";
import { AccountsPanel } from "@/features/admin/accounts-panel";
export default async function AccountsPage() {
  const profile = await requireAdmin();
  if (profile.role !== "owner") return <CmsDenied />;
  const data = await adminGet<{
    items: {
      id: string;
      email: string | null;
      phone: string | null;
      role: "owner" | "editor" | "sales";
      is_active: boolean;
    }[];
    pagination: { page: number; pages: number; total: number };
  }>("accounts?page=1&page_size=20");
  if (!data) return null;
  return (
    <AccountsPanel
      initial={data}
      currentId={profile.id}
      legacy={profile.login_method === "password"}
    />
  );
}
