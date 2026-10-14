# مدل دیتابیس CRM — افزونهٔ همان Lead

این مدل با Migration غیرمخرب `0009_demo_crm` ساخته می‌شود. متن و جدول‌های قدیمی حذف نمی‌شوند.

| جدول | کلید اصلی | ارتباط‌ها | Index / Constraint |
|---|---|---|---|
| crm_schools | id |  | ix_crm_schools_name؛ students IS NULL OR students >= 0 |
| crm_notifications | id | recipient_id → admins.id (RESTRICT) | ix_crm_notifications_recipient_read |
| crm_saved_views | id | admin_id → admins.id (RESTRICT) | ix_crm_saved_views_admin_id |
| crm_contacts | id | source_lead_id → leads.id (RESTRICT)؛ school_id → crm_schools.id (RESTRICT) | ix_crm_contacts_school_value |
| crm_lead_profiles | lead_id | lead_id → leads.id (RESTRICT)؛ school_id → crm_schools.id (RESTRICT) | ix_crm_lead_profiles_school_id |
| crm_opportunities | id | school_id → crm_schools.id (RESTRICT)؛ assigned_to → admins.id (RESTRICT)؛ lead_id → leads.id (RESTRICT) | ix_crm_opportunities_stage_assignee؛ ix_crm_opportunities_lead_id؛ ix_crm_opportunities_school_id؛ stage IN ('new','contacted','qualified','demo_scheduled','demo_completed','proposal','negotiation','won','lost')؛ estimated_value >= 0؛ stage != 'lost' OR length(lost_reason) >= 2 |
| crm_activities | id | assigned_to → admins.id (RESTRICT)؛ lead_id → leads.id (RESTRICT)؛ actor_id → admins.id (RESTRICT)؛ opportunity_id → crm_opportunities.id (RESTRICT) | ix_crm_activities_due_status؛ ix_crm_activities_lead_id؛ status IN ('open','completed','canceled')؛ kind IN ('call','meeting','demo','task','note','followup') |
| crm_demos | id | lead_id → leads.id (RESTRICT)؛ opportunity_id → crm_opportunities.id (RESTRICT)؛ assigned_to → admins.id (RESTRICT) | ix_crm_demos_starts_status؛ ix_crm_demos_lead_id؛ ends_at > starts_at؛ status IN ('scheduled','completed','canceled','no_show') |
| crm_stage_history | id | actor_id → admins.id (RESTRICT)؛ opportunity_id → crm_opportunities.id (RESTRICT) | ix_crm_stage_history_opportunity_id |

کلید یکتای `crm_notifications.event_key` تحویل تکراری را رد می‌کند؛ PK پروفایل، فقط یک پروفایل برای Lead می‌پذیرد. version در رکوردهای قابل ویرایش برای If-Match است. history مجوز UPDATE/DELETE ندارد.

تماس، مدرسه و پرونده پس از retention، اطلاعات شخصی را پاک می‌کنند؛ روابط و شمارنده‌های غیرشخصی باقی می‌مانند. دلیل استفاده از purged_at همین نیاز است. نمای ذخیره‌شده و اعلان قدیمی حذف می‌شوند. سایر اطلاعات از مسیر revision/تاریخچهٔ موجود نگهداری می‌شوند.
