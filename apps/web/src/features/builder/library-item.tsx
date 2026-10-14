"use client";
import type { ReactNode } from "react";
import {
  Heading,
  Image,
  Type,
  LayoutGrid,
  RectangleHorizontal,
  MousePointer2,
  GalleryHorizontal,
  PanelsTopLeft,
  ListCollapse,
  Megaphone,
  FileInput,
  BarChart3,
  Video,
  Sparkles,
  Quote,
  Container,
  Columns3,
  BookOpen,
} from "lucide-react";
const icons = {
  Heading,
  Image,
  RichText: Type,
  Container,
  Grid: Columns3,
  Button: MousePointer2,
  Gallery: LayoutGrid,
  Carousel: GalleryHorizontal,
  Tabs: PanelsTopLeft,
  Accordion: ListCollapse,
  FAQ: ListCollapse,
  Hero: RectangleHorizontal,
  CTA: Megaphone,
  DemoForm: FileInput,
  ContactForm: FileInput,
  Statistics: BarChart3,
  Video,
  Testimonials: Quote,
  ArticleList: BookOpen,
};
export function LibraryItem({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const Icon = icons[name as keyof typeof icons] || Sparkles;
  return (
    <div className="builder-library-item flex w-full items-center gap-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
