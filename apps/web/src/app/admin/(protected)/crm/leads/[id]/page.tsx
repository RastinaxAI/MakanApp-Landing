import { requireAdmin } from "@/lib/admin-api";
import { cmsGet, CmsDenied } from "@/features/cms/admin-data";
import { Customer360 } from "@/features/crm/customer";
import type { Customer, Assignee } from "@/features/crm/types";
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await requireAdmin()).capabilities.includes("leads"))
    return <CmsDenied />;
  const { id } = await params;
  const input = await searchParams;
  const page = /^[1-9]\d{0,5}$/.test(input.page || "") ? Number(input.page) : 1;
  const [data, assignees] = await Promise.all([
    cmsGet<Customer>(`leads/${id}/customer?page=${page}`),
    cmsGet<Assignee[]>("leads/assignees"),
  ]);
  return <Customer360 data={data} assignees={assignees} page={page} />;
}
