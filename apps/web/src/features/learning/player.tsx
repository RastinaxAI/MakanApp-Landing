"use client";
import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/features/cms/media-image";
import type { CmsImageRef } from "@/features/cms/types";

export function AparatPlayer({
  id,
  title,
  poster,
  privatePreview = false,
}: {
  id: string;
  title: string;
  poster?: CmsImageRef;
  privatePreview?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!attempt) return;
    const timeout = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timeout);
  }, [attempt]);
  const valid = /^[A-Za-z0-9]{5,24}$/.test(id);
  if (!valid) return <p role="alert">شناسه پخش معتبر نیست.</p>;
  function start() {
    setSlow(false);
    setFailed(false);
    setAttempt((a) => a + 1);
  }
  return (
    <section aria-label="پخش ویدیو" className="space-y-4">
      <p className="rounded-xl bg-secondary p-4 leading-7">
        با انتخاب «بارگذاری ویدیو»، مرورگر به آپارات، سرویس شخص ثالث، متصل
        می‌شود. پخش و حریم خصوصی آن تابع مقررات آپارات است.
      </p>
      <div
        className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-secondary"
        data-testid="aparat-player"
      >
        {attempt ? (
          <iframe
            key={attempt}
            src={`https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`}
            title={`ویدیوی ${title}`}
            className="absolute inset-0 h-full w-full border-0"
            allow="fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {poster && (
              <div className="absolute inset-0 [&_img]:h-full [&_img]:object-cover">
                <MediaImage image={poster} privatePreview={privatePreview} />
              </div>
            )}
            <Button onClick={start} className="relative z-10 shadow-lg">
              <PlayCircle aria-hidden="true" size={20} /> بارگذاری ویدیو
            </Button>
          </div>
        )}
      </div>
      {(slow || failed) && (
        <p role="status" className="leading-7">
          اگر پلیر در دسترس نیست، ممکن است ارتباط با آپارات محدود یا قطع شده
          باشد. وضعیت پخش داخل پلیر از این سایت قابل بررسی نیست؛ پیوند مستقیم یا
          تلاش دوباره را امتحان کنید.
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {attempt > 0 && (
          <Button variant="outline" onClick={start}>
            تلاش دوباره
          </Button>
        )}
        <a
          className="inline-flex min-h-11 items-center text-primary-hover underline"
          href={`https://www.aparat.com/v/${id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          مشاهده در آپارات (پنجره جدید)
        </a>
      </div>
    </section>
  );
}
