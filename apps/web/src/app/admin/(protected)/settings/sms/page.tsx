import { adminGet, requireAdmin } from "@/lib/admin-api";
import { SmsPanel, type SmsSettings } from "@/features/admin/sms-panel";
export default async function SmsSettingsPage() {
  const profile=await requireAdmin();
  if(profile.role!=="owner")return <h1>برای این بخش دسترسی ندارید.</h1>;
  const initial=await adminGet<SmsSettings>("settings/sms");
  if(!initial)throw new Error("SMS settings unavailable");
  return <SmsPanel initial={initial} />;
}
