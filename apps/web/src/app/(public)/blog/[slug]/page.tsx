import {
  PublicLearningDetail,
  learningMetadata,
  getLearningDetail,
} from "@/features/learning/public";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return learningMetadata(await getLearningDetail((await params).slug, "blog"));
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ series?: string }>;
}) {
  return (
    <PublicLearningDetail
      kind="blog"
      slug={(await params).slug}
      series={(await searchParams).series}
    />
  );
}
