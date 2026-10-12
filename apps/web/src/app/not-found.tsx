import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  return (
    <Container className="grid min-h-[65vh] place-items-center py-16 text-center">
      <div className="max-w-lg">
        <p className="mb-5 text-6xl font-bold text-primary" dir="ltr">
          404
        </p>
        <h1 className="text-3xl font-semibold">این صفحه پیدا نشد</h1>
        <p className="mt-4 text-muted-foreground">
          ممکن است نشانی تغییر کرده باشد. از صفحه اصلی یا بخش امکانات، مسیر خود
          را ادامه دهید.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">
            <ArrowRight aria-hidden="true" />
            بازگشت به صفحه اصلی
          </Link>
        </Button>
      </div>
    </Container>
  );
}
