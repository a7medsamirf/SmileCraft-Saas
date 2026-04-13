import { z } from "zod";

export const signupSchema = z
  .object({
    clinicName: z
      .string()
      .min(1, "اسم العيادة مطلوب")
      .min(3, "يجب أن يتكون اسم العيادة من ٣ أحرف على الأقل"),
    branchName: z
      .string()
      .optional()
      .transform((val) => val || undefined),
    doctorName: z
      .string()
      .min(1, "اسم الطبيب مطلوب")
      .min(3, "يجب أن يتكون اسم الطبيب من ٣ أحرف على الأقل"),
    phone: z
      .string()
      .min(10, "رقم الهاتف يجب أن يتكون من ١٠ أرقام على الأقل")
      .regex(/^[0-9+]+$/, "صيغة رقم الهاتف غير صحيحة"),
    email: z
      .string()
      .min(1, "البريد الإلكتروني مطلوب")
      .email("صيغة البريد الإلكتروني غير صحيحة"),
    password: z
      .string()
      .min(1, "كلمة المرور مطلوبة")
      .min(8, "كلمة المرور يجب أن تكون ٨ أحرف على الأقل"),
    confirmPassword: z.string().min(1, "يرجى تأكيد كلمة المرور"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;
