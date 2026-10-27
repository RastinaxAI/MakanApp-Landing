import { requireAdmin } from "@/lib/admin-api";
import { AdminHelpCenter } from "@/features/help/admin-help";

export default async function HelpPage() {
  return <AdminHelpCenter profile={await requireAdmin()} />;
}
