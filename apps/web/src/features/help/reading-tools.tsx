"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageViewer, type GuideImage } from "./image-viewer";

type Heading = { id: string; text: string; level: number };

export function ReadingSteps({ toc }: { toc: Heading[] }) {
  const [current, setCurrent] = useState(0);
  const tools = useRef<HTMLDivElement>(null);
  const navigationFrame = useRef(0);
  const navigating = useRef(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (navigating.current) return;
      let active = 0;
      const firstHeading = document.getElementById(toc[0]?.id || "");
      // scrollIntoView adds the document's padding and the heading's margin.
      // Track that same reading line instead of assuming a fixed header height.
      const readingLine = firstHeading
        ? (parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingBlockStart,
          ) || 0) +
          (parseFloat(getComputedStyle(firstHeading).scrollMarginBlockStart) ||
            0) +
          4
        : 320;
      toc.forEach((item, index) => {
        const heading = document.getElementById(item.id);
        if (heading && heading.getBoundingClientRect().top <= readingLine)
          active = index;
      });
      setCurrent(active);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(navigationFrame.current);
      navigating.current = false;
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [toc]);
  function go(index: number) {
    const target = toc[index];
    if (!target) return;
    const heading = document.getElementById(target.id);
    if (!heading) return;
    const contentsMenu = tools.current?.querySelector("details");
    if (contentsMenu) contentsMenu.open = false;
    cancelAnimationFrame(navigationFrame.current);
    navigating.current = true;
    setCurrent(index);
    window.history.replaceState(
      window.history.state,
      "",
      `#${encodeURIComponent(target.id)}`,
    );
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    // Let the native contents menu collapse before aligning the heading.
    // An instant jump keeps successive previous/next actions deterministic;
    // intermediate scroll events must not overwrite the selected section.
    navigationFrame.current = requestAnimationFrame(() => {
      heading.scrollIntoView({ behavior: "instant", block: "start" });
      navigationFrame.current = requestAnimationFrame(() => {
        navigating.current = false;
      });
    });
  }
  const activeIndex = Math.min(current, toc.length - 1);
  const active = toc[activeIndex];
  if (!active) return null;
  return (
    <div className="guide-reading-tools" ref={tools}>
      <nav aria-label="فهرست مطالب">
        <details>
          <summary>
            <ListOrdered size={20} aria-hidden="true" />
            <h2 className="text-sm font-semibold">بخش‌های این راهنما</h2>
            <span className="text-xs text-muted-foreground">
              {toc.length.toLocaleString("fa-IR")} بخش
            </span>
          </summary>
          <ol className="guide-reading-index">
            {toc.map((item, index) => (
              <li key={item.id} data-level={item.level}>
                <a
                  href={`#${item.id}`}
                  aria-current={current === index ? "location" : undefined}
                  onClick={(event) => {
                    if (document.getElementById(item.id)) {
                      event.preventDefault();
                      go(index);
                    }
                  }}
                >
                  {(index + 1).toLocaleString("fa-IR")} · {item.text}
                </a>
              </li>
            ))}
          </ol>
        </details>
      </nav>
      <div className="guide-reading-position">
        <p>
          <span>
            بخش {(activeIndex + 1).toLocaleString("fa-IR")} از{" "}
            {toc.length.toLocaleString("fa-IR")}:
          </span>{" "}
          <strong>{active.text}</strong>
        </p>
        {toc.length > 1 && (
          <nav className="flex gap-2" aria-label="جابجایی بین بخش‌های راهنما">
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === 0}
              onClick={() => go(activeIndex - 1)}
              aria-label="بخش قبلی راهنما"
            >
              <ArrowRight size={16} aria-hidden="true" />
              <span>قبلی</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === toc.length - 1}
              onClick={() => go(activeIndex + 1)}
              aria-label="بخش بعدی راهنما"
            >
              <span>بعدی</span>
              <ArrowLeft size={16} aria-hidden="true" />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}

export function GuideImages({ images }: { images: GuideImage[] }) {
  if (!images.length) return null;
  return (
    <section
      className="learning-guide-images"
      aria-labelledby="guide-images-title"
    >
      <h2 id="guide-images-title" className="text-base font-bold">
        تصاویر این آموزش
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        برای خواندن نوشته‌ها و دیدن محل ابزارها، تصویر را باز کنید و «اندازهٔ
        اصلی» را بزنید.
      </p>
      <div className="guide-image-gallery">
        {images.map((image, index) => (
          <figure key={image.src}>
            <ImageViewer
              image={image}
              label={`باز کردن تصویر ${(index + 1).toLocaleString("fa-IR")}: ${image.alt}`}
            />
            <figcaption>
              {(index + 1).toLocaleString("fa-IR")} · {image.alt}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
