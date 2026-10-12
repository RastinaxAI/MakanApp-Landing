import type { Metadata } from "next";
import { EmptyLibrary } from "@/components/marketing/empty-library";
export const metadata: Metadata = {
  title: "مرکز آموزش",
  description:
    "راهنماهای متنی، ویدیو و مجموعه‌های آموزشی استفاده از ماکان؛ هنوز مطلبی منتشر نشده است.",
};
export default function LearnPage() {
  return <EmptyLibrary kind="learn" />;
}
