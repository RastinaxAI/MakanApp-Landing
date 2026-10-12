import { Mail, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
export function ContactChannels() {
  return (
    <aside className="rounded-2xl border border-border bg-secondary p-6">
      <h2 className="text-xl font-semibold">راه‌های ارتباطی رسمی</h2>
      {siteConfig.phone || siteConfig.email ? (
        <div className="mt-4 space-y-3">
          {siteConfig.phone && (
            <a
              href={`tel:${siteConfig.phone.replace(/[ ()-]/g, "")}`}
              className="flex min-h-11 items-center gap-3 rounded-lg text-primary-hover"
            >
              <Phone size={19} aria-hidden="true" />
              <bdi dir="ltr">{siteConfig.phone}</bdi>
            </a>
          )}
          {siteConfig.email && (
            <a
              href={`mailto:${siteConfig.email}`}
              className="flex min-h-11 items-center gap-3 rounded-lg text-primary-hover"
            >
              <Mail size={19} className="shrink-0" aria-hidden="true" />
              <bdi dir="ltr" className="break-all">
                {siteConfig.email}
              </bdi>
            </a>
          )}
        </div>
      ) : (
        <p className="mt-4 leading-8 text-muted-foreground">
          شماره تماس و ایمیل رسمی پس از تأیید تیم ماکان در این صفحه درج می‌شود.
        </p>
      )}
    </aside>
  );
}
