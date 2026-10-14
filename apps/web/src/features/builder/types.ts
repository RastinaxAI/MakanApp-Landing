import type { CmsContent, CmsSection, MediaAsset } from "@/features/cms/types";
import type { Audience, Feature } from "@/features/marketing/content";
import type { FaqItem } from "@/features/marketing/faq-list";
import type { LearningContent } from "@/features/learning/types";

export const widgetLabels = {
  Container: "کانتینر",
  Grid: "شبکه",
  Heading: "عنوان",
  RichText: "متن غنی",
  Image: "تصویر",
  Video: "ویدیوی آپارات",
  Button: "دکمه",
  Icon: "آیکون",
  Gallery: "گالری",
  Carousel: "اسلایدر",
  Tabs: "تب‌ها",
  Accordion: "آکاردئون",
  FAQ: "پرسش‌های متداول",
  Features: "امکانات",
  Statistics: "آمار",
  Testimonials: "نظر مشتری",
  CTA: "دعوت به اقدام",
  ContactForm: "فرم تماس",
  DemoForm: "فرم درخواست دمو",
  Pricing: "نمایش قیمت",
  ProductShowcase: "نمایش محصول",
  ArticleList: "مقالات",
  LegacySection: "بخش موجود",
  Hero: "معرفی اصلی ماکان",
  FeatureStory: "روایت محصول",
} as const;
export type WidgetType = keyof typeof widgetLabels;
export type StyleValues = {
  display?: "block" | "flex" | "grid";
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  wrap?: boolean;
  columns?: number;
  gap?: number;
  padding?: number;
  padding_inline?: number;
  padding_block?: number;
  margin?: number;
  margin_inline?: number;
  margin_block?: number;
  width?: string;
  max_width?: string;
  height?: string;
  min_height?: number;
  position?: "static" | "relative" | "absolute" | "sticky" | "fixed";
  top?: number;
  inset_start?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between" | "space-around";
  text_align?: "start" | "center" | "end" | "justify";
  color?: string;
  background?: string;
  background_media_id?: string | null;
  background_size?: "cover" | "contain" | "auto";
  gradient_from?: string;
  gradient_to?: string;
  gradient_angle?: number;
  border_color?: string;
  border_width?: number;
  border_style?: "solid" | "dashed" | "dotted" | "none";
  radius?: number;
  shadow?: "none" | "soft" | "raised";
  font_family?: "sans" | "serif" | "mono";
  font_size?: number;
  font_weight?: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  line_height?: number;
  letter_spacing?: number;
  transition_ms?: number;
  hidden?: boolean;
};
export type NodeStyles = Record<
  "base" | "tablet" | "mobile" | "hover" | "focus",
  StyleValues
>;
export type WidgetItem = {
  title?: string;
  text?: string;
  body_html?: string;
  href?: string | null;
  media_id?: string | null;
  value?: string;
  attribution?: string;
};
export type WidgetProps = {
  title?: string;
  text?: string;
  accent?: string;
  kicker?: string;
  body_html?: string;
  level?: number;
  href?: string;
  label?: string;
  media_id?: string | null;
  aparat_id?: string;
  icon?:
    | "school"
    | "message"
    | "users"
    | "book"
    | "check"
    | "shield"
    | "arrow"
    | "star";
  items?: WidgetItem[];
  faq_slugs?: string[];
  feature_slug?: string;
  category?: string;
  limit?: number;
  legacy_section?: CmsSection | null;
};
export type VisualNode = {
  id: string;
  type: WidgetType;
  version: 1;
  props: WidgetProps;
  styles: NodeStyles;
  children: VisualNode[];
};
export type DocumentGlobals = {
  inherit_site?: boolean;
  colors: Record<string, string>;
  font: "sans" | "serif" | "mono";
};
export type VisualDocument = {
  schema_version: 2;
  purpose?: "page" | "template" | "section" | "header" | "footer";
  globals: DocumentGlobals;
  nodes: VisualNode[];
};
export type BuilderSettings = {
  globals: DocumentGlobals;
  header_page_id: string | null;
  footer_page_id: string | null;
  row_version: number;
};
export type BuilderSite = {
  globals: DocumentGlobals;
  header: CmsContent | null;
  footer: CmsContent | null;
};
export const walkNodes = (nodes: VisualNode[]): VisualNode[] =>
  nodes.flatMap((node) => [node, ...walkNodes(node.children)]);
export type BuilderContext = {
  content: CmsContent;
  features: Feature[];
  audiences: Audience[];
  faqs: FaqItem[];
  articles: LearningContent[];
  privatePreview?: boolean;
  editing?: boolean;
  siteGlobals?: DocumentGlobals;
  assets?: MediaAsset[];
};
export const emptyStyles = (): NodeStyles => ({
  base: {},
  tablet: {},
  mobile: {},
  hover: {},
  focus: {},
});
export const defaultGlobals: DocumentGlobals = {
  colors: {
    brand: "#156fee",
    primary: "#1266df",
    text: "#172a4b",
    surface: "#ffffff",
  },
  font: "sans",
};
export function legacyDocument(sections: CmsSection[]): VisualDocument {
  return {
    schema_version: 2,
    globals: structuredClone(defaultGlobals),
    nodes: sections.map((section, index) => ({
      id: `legacy_${index}`,
      type: "LegacySection",
      version: 1,
      props: { legacy_section: structuredClone(section) },
      styles: emptyStyles(),
      children: [],
    })),
  };
}
