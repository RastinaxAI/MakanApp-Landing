"use client";
import { useState } from "react";
import { MediaImage } from "@/features/cms/media-image";
import { RichText } from "@/features/cms/rich-text";
import type { WidgetItem } from "@/features/builder/types";
import type { CmsImageRef } from "@/features/cms/types";
import { ArrowLeft, GraduationCap, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SourceLink as Link } from "@/features/leads/source-link";
import type { Audience } from "./content";
export function RoleStory({
  audiences,
  items,
  media = [],
  privatePreview,
  onItemSelect,
  activeIndex,
}: {
  audiences: Audience[];
  items?: WidgetItem[];
  media?: CmsImageRef[];
  privatePreview?: boolean;
  onItemSelect?: (index: number) => void;
  activeIndex?: number;
}) {
  const [selected, setSelected] = useState(() =>
    items?.length
      ? 0
      : Math.max(
          0,
          audiences.findIndex((audience) => audience.slug === "schools"),
        ),
  );
  const tabs = items?.length
    ? items.map((item) => ({
        item,
        audience: audiences.find(
          (audience) => `/solutions/${audience.slug}` === item.href,
        ),
      }))
    : audiences.map((audience) => ({
        audience,
        item: {
          title: audience.title,
          heading: audience.headline,
          eyebrow: audience.eyebrow,
          text: audience.summary,
          href: `/solutions/${audience.slug}`,
        } as WidgetItem,
      }));
  if (!tabs.length) return null;
  return (
    <Tabs
      dir="rtl"
      value={String(Math.min(activeIndex ?? selected, tabs.length - 1))}
      onValueChange={(value) => {
        setSelected(Number(value));
        onItemSelect?.(Number(value));
      }}
      className="premium-role-tabs"
    >
      <TabsList
        className="mb-7 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent"
        aria-label="ماکان برای نقش شما"
      >
        {tabs.map(({ item }, index) => (
          <TabsTrigger
            key={index}
            value={String(index)}
            className="min-h-12 rounded-xl border border-border px-5 text-base data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            {item.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(({ item, audience }, index) => {
        const image = media.find((asset) => asset.id === item.media_id);
        return (
          <TabsContent
            key={index}
            value={String(index)}
            className="premium-role-panel"
          >
            <div className="premium-role-copy">
              {(item.eyebrow || audience?.eyebrow) && (
                <p className="premium-eyebrow">
                  <Users size={18} aria-hidden="true" />
                  {item.eyebrow || audience?.eyebrow}
                </p>
              )}
              <h3>{item.heading || audience?.headline || item.title}</h3>
              {item.body_html ? (
                <RichText
                  html={item.body_html}
                  privatePreview={privatePreview}
                />
              ) : (
                <p>{item.text}</p>
              )}
              {item.href && (
                <Link href={item.href} className="premium-story-link">
                  راهکار برای {item.title}
                  <ArrowLeft size={20} aria-hidden="true" />
                </Link>
              )}
            </div>
            {image ? (
              <div className="self-center">
                <MediaImage image={image} privatePreview={privatePreview} />
              </div>
            ) : (
              audience && (
                <div className="premium-role-priorities">
                  <GraduationCap size={32} aria-hidden="true" />
                  <ol>
                    {audience.benefits.slice(0, 3).map((benefit, index) => (
                      <li key={index}>
                        <span>{(index + 1).toLocaleString("fa-IR")}</span>
                        <div>
                          <h4>{benefit.title}</h4>
                          <p>{benefit.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
