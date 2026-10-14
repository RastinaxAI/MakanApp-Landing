"use client";
import { ArrowLeft, GraduationCap, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SourceLink as Link } from "@/features/leads/source-link";
import type { Audience } from "./content";
export function RoleStory({ audiences }: { audiences: Audience[] }) {
  if (!audiences.length) return null;
  return (
    <Tabs
      dir="rtl"
      defaultValue={
        audiences.find((audience) => audience.slug === "schools")?.slug ||
        audiences[0]!.slug
      }
      className="premium-role-tabs"
    >
      <TabsList
        className="mb-7 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent"
        aria-label="ماکان برای نقش شما"
      >
        {audiences.map((audience) => (
          <TabsTrigger
            key={audience.slug}
            value={audience.slug}
            className="min-h-12 rounded-xl border border-border px-5 text-base data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            {audience.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {audiences.map((audience) => (
        <TabsContent
          key={audience.slug}
          value={audience.slug}
          className="premium-role-panel"
        >
          <div className="premium-role-copy">
            <p className="premium-eyebrow">
              <Users size={18} aria-hidden="true" />
              {audience.eyebrow}
            </p>
            <h3>{audience.headline}</h3>
            <p>{audience.summary}</p>
            <Link
              href={`/solutions/${audience.slug}`}
              className="premium-story-link"
            >
              راهکار برای {audience.title}
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
          </div>
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
        </TabsContent>
      ))}
    </Tabs>
  );
}
