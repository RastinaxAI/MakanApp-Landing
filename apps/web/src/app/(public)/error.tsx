"use client";
import { Button } from "@/components/ui/button";
export default function PublicContentError({ reset }: { reset: () => void }) {
  return <div className="site-container py-24"><h1 className="text-3xl font-semibold">محتوا موقتاً در دسترس نیست.</h1><p className="my-6 leading-8 text-muted-foreground">ارتباط با سرویس محتوا برقرار نشد. کمی بعد دوباره تلاش کنید.</p><Button onClick={reset}>تلاش دوباره</Button></div>;
}
