import { z } from "zod";

export function normalizePhone(value: string) {
  const digits = value.replace(/[۰-۹٠-٩]/g, (char) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(char)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(char)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(char),
    ),
  );
  const compact = digits.replace(/[ ()-]/g, "");
  return compact.startsWith("0098")
    ? "+98" + compact.slice(4)
    : compact.startsWith("0")
      ? "+98" + compact.slice(1)
      : compact;
}
const text = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum, `حداقل ${minimum} نویسه وارد کنید.`)
    .max(maximum, `حداکثر ${maximum} نویسه مجاز است.`);
const optional = (maximum: number) => text(0, maximum);
const phone = z
  .string()
  .max(40, "شماره تماس را بررسی کنید.")
  .refine(
    (value) => /^\+98[1-9][0-9]{9}$/.test(normalizePhone(value)),
    "شماره تماس ایران را با صفر یا ‎+۹۸ وارد کنید.",
  );
const shared = {
  full_name: text(2, 120),
  consent: z
    .boolean()
    .refine((value) => value, "برای ثبت درخواست، رضایت لازم است."),
  website: optional(200),
};
export const demoSchema = z.object({
  ...shared,
  phone,
  school_name: text(2, 180),
  city: optional(100),
  job_title: optional(100),
  student_count_range: z.enum([
    "",
    "under100",
    "100-299",
    "300-599",
    "600-999",
    "1000plus",
  ]),
  message: optional(3000),
});
export const contactSchema = z
  .object({
    ...shared,
    contact_method: z.enum(["phone", "email"]),
    contact_value: text(3, 254),
    subject: text(2, 180),
    message: text(2, 3000),
  })
  .superRefine((data, context) => {
    const valid =
      data.contact_method === "phone"
        ? /^\+98[1-9][0-9]{9}$/.test(normalizePhone(data.contact_value))
        : /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(
            data.contact_value,
          );
    if (!valid)
      context.addIssue({
        code: "custom",
        path: ["contact_value"],
        message:
          data.contact_method === "phone"
            ? "شماره تماس معتبر وارد کنید."
            : "ایمیل معتبر وارد کنید.",
      });
  });

const fieldsSchema = z.object({
  ...shared,
  phone: z.string(),
  school_name: z.string(),
  city: z.string(),
  job_title: z.string(),
  student_count_range: z.enum([
    "",
    "under100",
    "100-299",
    "300-599",
    "600-999",
    "1000plus",
  ]),
  message: z.string(),
  contact_method: z.enum(["phone", "email"]),
  contact_value: z.string(),
  subject: z.string(),
});
export type FormFields = z.infer<typeof fieldsSchema>;
export function requestSchema(kind: "demo" | "contact") {
  return fieldsSchema.superRefine((data, context) => {
    const parsed = (kind === "demo" ? demoSchema : contactSchema).safeParse(
      data,
    );
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
  });
}
