import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/marketing/page-hero";
import { publicGet, getPage, pageMetadata } from "@/lib/public-api";
import {
  LearningCards,
  libraryQuery,
  type Search,
} from "@/features/learning/public";
import type { CmsPage } from "@/features/cms/types";
import type { LearningContent } from "@/features/learning/types";
import Link from "next/link";
export async function generateMetadata() {
  const content = await getPage("learn");
  return pageMetadata(
    {
      ...content,
      title: "مجموعه‌های آموزشی",
      seo: {
        ...content.seo,
        title: "مجموعه‌های آموزشی",
        description:
          "مقاله‌ها و ویدیوهای منتشرشده، به ترتیب برای یادگیری بهتر.",
      },
    },
    "/learn/series",
    { noindex: true },
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = libraryQuery(await searchParams);
  const data = await publicGet<CmsPage<LearningContent>>(
    `learn/series?${query}`,
  );
  return (
    <>
      <PageHero
        title="مجموعه‌های آموزشی"
        description="راهنماها و ویدیوها، به ترتیب برای یادگیری بهتر."
      />
      <Container className="my-10">
        {data.items.length ? (
          <LearningCards items={data.items} />
        ) : (
          <p>هنوز مجموعه‌ای منتشر نشده است.</p>
        )}
        <nav aria-label="صفحه‌بندی مجموعه‌ها" className="mt-6 flex gap-4">
          {[data.pagination.page - 1, data.pagination.page + 1]
            .filter((p) => p > 0 && p <= data.pagination.pages)
            .map((p) => (
              <Link
                className="inline-flex min-h-11 items-center text-primary-hover"
                key={p}
                href={`/learn/series?page=${p}`}
              >
                صفحه {p.toLocaleString("fa-IR")}
              </Link>
            ))}
        </nav>
      </Container>
    </>
  );
}
