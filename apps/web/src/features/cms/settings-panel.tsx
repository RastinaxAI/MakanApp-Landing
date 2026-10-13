"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import { TextField, MediaPicker } from "./fields";
import type { CmsSettings, MediaAsset } from "./types";
export function SettingsPanel({
  initial,
  assets,
}: {
  initial: CmsSettings;
  assets: MediaAsset[];
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const general = (patch: Partial<CmsSettings["general"]>) =>
    setData({ ...data, general: { ...data.general, ...patch } });
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest<CmsSettings>(
        "settings",
        "PATCH",
        { general: data.general, seo: data.seo },
        data.row_version,
      );
      setData(result);
      setMessage("تنظیمات سایت ذخیره شد.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تنظیمات ذخیره نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">تنظیمات عمومی و SEO</h1>
        <p className="leading-8 text-muted-foreground">
          این تنظیمات عمومی‌اند و ذخیره آن‌ها در سایت اثر می‌گذارد. اطلاعات ورود
          و کلید سرویس‌ها در این فرم قرار نمی‌گیرند.
        </p>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4 leading-8">
            {message}
          </p>
        )}
        <fieldset
          disabled={busy}
          className="space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <legend className="px-3 font-semibold">برند و راه‌های ارتباطی</legend>
          <TextField
            label="نام برند"
            value={data.general.brand_name}
            onChange={(brand_name) => general({ brand_name })}
            maxLength={100}
          />
          <TextField
            label="پیام کوتاه برند"
            value={data.general.tagline}
            onChange={(tagline) => general({ tagline })}
            maxLength={300}
          />
          <TextField
            label="نشانی HTTPS ورود به ماکان"
            value={data.general.app_url || ""}
            onChange={(v) => general({ app_url: v || null })}
            dir="ltr"
            maxLength={500}
          />
          <TextField
            label="دامنه رسمی HTTPS سایت"
            value={data.general.site_url || ""}
            onChange={(v) => general({ site_url: v || null })}
            dir="ltr"
            maxLength={500}
          />
          <TextField
            label="شماره تماس رسمی"
            value={data.general.phone || ""}
            onChange={(v) => general({ phone: v || null })}
            dir="ltr"
            maxLength={30}
          />
          <TextField
            label="ایمیل رسمی"
            value={data.general.email || ""}
            onChange={(v) => general({ email: v || null })}
            dir="ltr"
            maxLength={254}
          />
          <MediaPicker
            label="لوگوی رسمی"
            value={data.general.logo_media_id}
            onChange={(logo_media_id) =>
              general({ logo_media_id, logo_approved: false })
            }
            assets={assets}
          />
          {data.general.logo_media_id && (
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={data.general.logo_approved}
                onChange={(e) => general({ logo_approved: e.target.checked })}
              />
              استفاده از این فایل به‌عنوان لوگوی رسمی تأیید شده است
            </label>
          )}
        </fieldset>
        <fieldset
          disabled={busy}
          className="space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <legend className="px-3 font-semibold">پیش‌فرض‌های SEO</legend>
          <TextField
            label="عنوان پیش‌فرض SEO"
            value={data.seo.default_title}
            onChange={(default_title) =>
              setData({ ...data, seo: { ...data.seo, default_title } })
            }
            maxLength={180}
          />
          <TextField
            label="توضیح پیش‌فرض SEO"
            value={data.seo.default_description}
            onChange={(default_description) =>
              setData({ ...data, seo: { ...data.seo, default_description } })
            }
            multiline
            maxLength={500}
          />
          <MediaPicker
            label="تصویر پیش‌فرض اشتراک‌گذاری"
            value={data.seo.og_media_id}
            onChange={(og_media_id) =>
              setData({ ...data, seo: { ...data.seo, og_media_id } })
            }
            assets={assets}
          />
        </fieldset>
        <Button disabled={busy} onClick={save}>
          ذخیره تنظیمات
        </Button>
      </div>
    </CmsReady>
  );
}
