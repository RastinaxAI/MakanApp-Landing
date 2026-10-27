import { adminGet, requireAdmin } from "@/lib/admin-api";
import { SecurityPanel } from "@/features/admin/security-panel";
export default async function SecurityPage() {
  const profile = await requireAdmin();
  const sessions =
    await adminGet<
      {
        id: string;
        created_at: string;
        last_seen_at: string;
        expires_at: string;
        current: boolean;
      }[]
    >("auth/sessions");
  return (
    <SecurityPanel
      legacy={profile.login_method === "password"}
      initialSessions={sessions ?? []}
    />
  );
}
