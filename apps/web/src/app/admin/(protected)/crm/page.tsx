import { requireAdmin } from "@/lib/admin-api";
import { cmsGet, CmsDenied } from "@/features/cms/admin-data";
import { CrmWorkbench } from "@/features/crm/workbench";
import type {
  Dashboard,
  Automations,
  PageResult,
  SavedView,
  Assignee,
} from "@/features/crm/types";
export default async function CrmPage() {
  const admin = await requireAdmin();
  if (!admin.capabilities.includes("leads")) return <CmsDenied />;
  const [initial, assignees, settings, views] = await Promise.all([
    cmsGet<Dashboard>("crm/dashboard"),
    cmsGet<Assignee[]>("leads/assignees"),
    cmsGet<Automations>("crm/automations"),
    cmsGet<PageResult<SavedView>>("crm/views"),
  ]);
  return (
    <CrmWorkbench
      initial={initial}
      assignees={assignees}
      initialSettings={settings}
      initialViews={views.items}
      owner={admin.role === "owner"}
    />
  );
}
