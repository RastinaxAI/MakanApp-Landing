import type { Metadata } from "next";
import { EmptyLibrary } from "@/components/marketing/empty-library";
export const metadata: Metadata = {
  title: "وبلاگ",
  description:
    "محتوای آموزشی و تجربه ارتباط مدرسه و خانواده؛ وبلاگ بازاریابی ماکان.",
};
export default function BlogPage() {
  return <EmptyLibrary kind="blog" />;
}
