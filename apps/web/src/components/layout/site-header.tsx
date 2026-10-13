"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavigation } from "@/lib/site-navigation";
import type { CmsImageRef } from "@/features/cms/types";

export function SiteHeader({ appUrl, brandName, logo }: { appUrl?: string; brandName?: string; logo?: CmsImageRef }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-[var(--z-sticky)] border-b border-border bg-card/95 backdrop-blur-md">
      <div className="site-container flex min-h-22 items-center justify-between gap-4">
        <Brand name={brandName} logo={logo}/>
        <nav
          aria-label="ناوبری اصلی"
          className="hidden items-center gap-1 desktop:flex"
        >
          {publicNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="navigation-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {appUrl && (
            <a href={appUrl} className="navigation-link hidden desktop:flex">
              ورود به ماکان
            </a>
          )}
          <Button asChild className="hidden min-h-11 tablet:inline-flex">
            <Link href="/demo">
              درخواست دمو <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11 desktop:hidden"
                aria-label="باز کردن منو"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(88vw,360px)]"
              dir="rtl"
            >
              <SheetHeader className="border-b border-border pb-6 text-start">
                <SheetTitle>منوی ماکان</SheetTitle>
                <SheetDescription>
                  آشنایی با امکانات، راهکارها و آموزش ماکان
                </SheetDescription>
              </SheetHeader>
              <nav
                aria-label="ناوبری موبایل"
                className="flex flex-col gap-2 px-4"
              >
                {publicNavigation.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="navigation-link text-base"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button asChild className="mt-4 min-h-11">
                    <Link href="/demo">درخواست دموی ماکان</Link>
                  </Button>
                </SheetClose>
                {appUrl && (
                  <a href={appUrl} className="navigation-link">
                    ورود به ماکان
                  </a>
                )}
              </nav>
              <p className="mt-auto px-6 pb-6 text-sm text-muted-foreground">
                ارتباط و مدیریت آموزش، در یک فضای یکپارچه.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
