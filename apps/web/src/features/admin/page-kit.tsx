import Link from "next/link";
import { ChevronLeft, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  back,
}: {
  title: string;
  description: string;
  eyebrow: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="admin-page-heading">
      <nav
        aria-label="مسیر صفحه"
        className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          href={back?.href || "/admin"}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded hover:text-primary"
        >
          {back?.label || "پیشخوان"}
        </Link>
        <ChevronLeft className="size-3" aria-hidden="true" />
        <span>{eyebrow}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-primary">{eyebrow}</p>
          <h1 className="text-2xl font-bold tracking-tight tablet:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
export function AdminPanel({
  title,
  description,
  children,
  className = "",
  action,
  id,
  count,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  id?: string;
  count?: number;
}) {
  return (
    <section id={id} className={`admin-surface ${className}`}>
      <div className="admin-surface-heading">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-bold">{title}</h2>
            {count !== undefined && (
              <span className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground">
                {count.toLocaleString("fa-IR")} مورد
              </span>
            )}
          </div>
          {description && (
            <p className="mt-2 text-xs leading-7 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="admin-surface-body">{children}</div>
    </section>
  );
}
export function AdminEmpty({
  title,
  description,
  children,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid justify-items-center px-5 py-12 text-center">
      <span className="admin-page-symbol mb-4">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-7 text-muted-foreground">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
export function AdminNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="admin-notice">
      {children}
    </p>
  );
}
