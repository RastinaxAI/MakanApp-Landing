"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "./client";
import { normalizeDigits } from "./login-form";
export function OtpConfirmation({
  value,
  onChange,
  prefix = "confirm",
}: {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!remaining) return;
    const id = setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  async function send() {
    setBusy(true);
    setMessage("");
    onChange("");
    try {
      const result = await adminRequest<{
        debug: boolean;
        retry_after: number;
      }>("auth/otp/reauth", "POST");
      setRemaining(result.retry_after);
      setMessage(
        result.debug
          ? "حالت توسعه: کد تأیید تغییرات 111111 است."
          : "کد تأیید به شماره همراه حساب شما ارسال شد.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "کد ارسال نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="admin-security-section min-w-0 space-y-4 rounded-2xl border border-border bg-white p-5">
      <legend className="px-2 text-sm font-semibold">تأیید تغییر حساس</legend>
      <p className="text-sm leading-7 text-muted-foreground">
        برای هر تغییر، یک کد جدید به شماره حساب خود دریافت کنید. کد فقط یک بار
        معتبر است.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy || remaining > 0}
        onClick={send}
      >
        {busy
          ? "در حال ارسال…"
          : remaining > 0
            ? `دریافت دوباره (${remaining.toLocaleString("fa-IR")})`
            : "دریافت کد تأیید تغییرات"}
      </Button>
      <div className="grid min-w-0 gap-4">
        <div className="space-y-2">
          <Label htmlFor={prefix + "-otp"}>کد تأیید تغییرات</Label>
          <Input
            id={prefix + "-otp"}
            disabled={busy}
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={value}
            onChange={(e) => onChange(normalizeDigits(e.target.value))}
          />
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-secondary p-3 text-sm leading-7 text-secondary-foreground"
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}
