"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest, resetAdminNavigation } from "./client";

const schema = z.object({
  email: z.email("ایمیل معتبر وارد کنید.").max(254),
  password: z
    .string()
    .min(1, "رمز را وارد کنید.")
    .max(128, "رمز بیش از حد طولانی است."),
  mfa_code: z.string().max(48).optional(),
});
type Values = z.infer<typeof schema>;
export function LegacyLoginForm() {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      await adminRequest("auth/login", "POST", {
        ...values,
        email: values.email.trim().toLowerCase(),
        mfa_code: values.mfa_code?.trim() || null,
      });
      resetAdminNavigation("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "ورود انجام نشد.");
    }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="admin-email">ایمیل مدیر</Label>
        <Input
          id="admin-email"
          type="email"
          dir="ltr"
          autoComplete="username"
          maxLength={254}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">رمز عبور</Label>
        <Input
          id="admin-password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          maxLength={128}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-mfa">کد دومرحله‌ای یا کد بازیابی</Label>
        <Input
          id="admin-mfa"
          dir="ltr"
          autoComplete="one-time-code"
          maxLength={48}
          aria-describedby="mfa-help"
          {...register("mfa_code")}
        />
        <p id="mfa-help" className="text-sm leading-7 text-muted-foreground">
          اگر ورود دومرحله‌ای را فعال کرده‌اید، کد برنامه Authenticator یا یکی
          از کدهای بازیابی را وارد کنید.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft p-4 text-sm leading-7 text-destructive"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "در حال بررسی…" : "ورود به پنل"}
      </Button>
    </form>
  );
}
