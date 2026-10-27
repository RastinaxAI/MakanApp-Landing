import {
  BookOpen,
  GraduationCap,
  HeartHandshake,
  School,
  Users,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { SourceLink as Link } from "@/features/leads/source-link";
import { audiences } from "@/features/learning/types";

const paths = [
  {
    role: "manager",
    label: "مدیر مدرسه‌ام",
    text: "راهنماهای شروع کار برای مدیران",
    icon: School,
  },
  {
    role: "teacher",
    label: "معلم هستم",
    text: "راهنماهای شروع کار برای معلم‌ها",
    icon: Users,
  },
  {
    role: "student",
    label: "دانش‌آموزم",
    text: "راهنماهای شروع کار برای دانش‌آموزان",
    icon: GraduationCap,
  },
  {
    role: "parent",
    label: "والد هستم",
    text: "راهنماهای شروع کار برای خانواده‌ها",
    icon: HeartHandshake,
  },
] as const;

export function LearningStartGuide({
  audience,
  topic,
}: {
  audience?: string;
  topic?: string;
}) {
  const role = paths.find((item) => item.role === audience);
  return (
    <section
      className="learning-start-guide"
      aria-labelledby="learning-start-title"
    >
      <div className="learning-guide-intro">
        <span className="learning-guide-symbol">
          <BookOpen size={24} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium text-primary">از کجا شروع کنم؟</p>
          <h2 id="learning-start-title" className="mt-2 text-xl font-bold">
            راهنمای کار با ماکان، از نگاه شما
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            نقش خود را انتخاب کنید تا آموزش‌های منتشرشدهٔ شروع کار را ببینید.
            راهنماهای متنی می‌توانند تصویر هر مرحله را کنار توضیح همان کار نشان
            دهند.
          </p>
        </div>
      </div>
      <nav
        className="learning-role-paths"
        aria-label="انتخاب مسیر شروع کار ماکان"
      >
        {paths.map((item) => (
          <Link
            key={item.role}
            href={`/learn?audience=${item.role}&topic=getting-started&level=beginner`}
            aria-current={
              audience === item.role && topic === "getting-started"
                ? "page"
                : undefined
            }
          >
            <item.icon size={22} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.text}</small>
            </span>
            <ArrowLeft size={17} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      {role && (
        <p className="learning-current-path">
          <MapPin size={17} aria-hidden="true" />
          مسیر فعلی: آموزش ماکان / {audiences[role.role]}
          {topic === "getting-started" ? " / شروع کار" : ""}
          <Link href="/learn">دیدن همهٔ مسیرها</Link>
        </p>
      )}
    </section>
  );
}
