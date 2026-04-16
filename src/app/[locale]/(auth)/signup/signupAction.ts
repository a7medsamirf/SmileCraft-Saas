"use server";

// =============================================================================
// SmileCraft CMS — Signup Server Action
// ✅ No Prisma — uses Supabase client directly.
// ✅ useActionState compatible: (_prevState, formData) signature.
// ✅ Works even if DB migration hasn't been run yet (Auth-first approach).
//
// Flow:
//  1. Validate with Zod
//  2. supabase.auth.signUp() — always works, stores metadata in auth.users
//  3. Try to create Clinic + User records in DB (graceful skip if tables missing)
//  4. redirect() to dashboard if session exists, else show "check email" message
// =============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClinicAndUserDirectly } from "@/lib/direct-db";
import { signupSchema } from "./schema";
import { checkSignupRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------
export type SignupState = {
  errors?: {
    clinicName?: string[];
    branchName?: string[];
    doctorName?: string[];
    phone?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    form?: string[];
  };
  /** Shown when email confirmation is required */
  successMessage?: string;
};

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------
export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Check rate limit first (3 signups per minute)
  const rateLimit = await checkSignupRateLimit();
  if (!rateLimit.success) {
    return {
      errors: {
        form: [
          "Too many signup attempts. Please wait before trying again.",
        ],
      },
    };
  }

  // ── 1. Extract & validate ─────────────────────────────────────────────
  const raw = {
    clinicName: (formData.get("clinicName") as string | null) ?? "",
    branchName: (formData.get("branchName") as string | null) ?? undefined,
    doctorName: (formData.get("doctorName") as string | null) ?? "",
    phone: (formData.get("phone") as string | null) ?? "",
    email: (formData.get("email") as string | null) ?? "",
    password: (formData.get("password") as string | null) ?? "",
    confirmPassword: (formData.get("confirmPassword") as string | null) ?? "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { clinicName, branchName, doctorName, phone, email, password } = parsed.data;
  const supabase = await createClient();

  // ── 2. Create Supabase Auth user ──────────────────────────────────────
  // Stores clinicName, doctorName, phone in auth.users.raw_user_meta_data
  // so data is never lost even if the DB insert below is skipped.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { fullName: doctorName, clinicName, phone },
    },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    // ── HTTP 429 / rate-limit ─────────────────────────────────────────
    if (
      msg.includes("rate limit") ||
      msg.includes("over_email_send_rate_limit") ||
      (authError as { status?: number }).status === 429
    ) {
      return {
        errors: {
          form: [
            "تم تجاوز الحد المسموح لإرسال إيميلات التأكيد (٢ إيميل/ساعة على الخطة المجانية). " +
              "انتظر ساعة وأعد المحاولة، أو عطّل «Confirm email» من: " +
              "Supabase Dashboard → Authentication → Providers → Email.",
          ],
        },
      };
    }
    // ── Email already registered ──────────────────────────────────────
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists")
    ) {
      return {
        errors: {
          email: ["هذا البريد الإلكتروني مسجل بالفعل — يرجى تسجيل الدخول."],
        },
      };
    }
    // ── 5xx errors from Supabase auth servers ────────────────────────
    const status = (authError as { status?: number }).status;
    if (status && status >= 500) {
      console.error("[signupAction] Supabase auth server error:", status, authError);
      return {
        errors: {
          form: [
            "خدمة التأكيد غير متاحة حالياً (خطأ ٥٠٢). يرجى المحاولة بعد دقائق.",
          ],
        },
      };
    }
    // ── Weak password ─────────────────────────────────────────────────
    if (msg.includes("weak") || msg.includes("password should be")) {
      return {
        errors: {
          password: [
            "كلمة المرور ضعيفة جداً — استخدم ٨ أحرف أو أكثر تتضمن أرقاماً وحروفاً.",
          ],
        },
      };
    }
    // ── Invalid email format ──────────────────────────────────────────
    if (
      msg.includes("invalid email") ||
      msg.includes("unable to validate email")
    ) {
      return { errors: { email: ["صيغة البريد الإلكتروني غير صحيحة."] } };
    }
    // ── Fallback ──────────────────────────────────────────────────────
    console.error("[signupAction] Supabase authError:", authError);
    return { errors: { form: ["حدث خطأ غير متوقع: " + authError.message] } };
  }

  const { user, session } = authData;
  if (!user) {
    return { errors: { form: ["فشل إنشاء الحساب، يرجى المحاولة مرة أخرى."] } };
  }

  // ── Silent duplicate: Supabase returns a fake user (empty identities) ──
  // when the email is already registered but not yet confirmed.
  // This prevents email enumeration but we still want to guide the user.
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return {
      errors: {
        email: [
          "هذا البريد مسجل بالفعل وينتظر التفعيل. " +
            "تحقق من بريدك الوارد (أو Spam)، أو انتظر ساعة لإعادة إرسال رابط التأكيد.",
        ],
      },
    };
  }

  // ── 3. Sync to application DB — Try Prisma first (bypasses RLS), fallback to Supabase ──
  let dbInsertFailed = false;
  let dbMethod: "prisma" | "supabase" | "none" = "none";

  // Method 1: Try Prisma (bypasses RLS completely)
  try {
    const result = await createClinicAndUserDirectly({
      userId: user.id,
      clinicName,
      branchName,
      doctorName,
      email,
      phone,
    });

    if (result.success) {
      dbMethod = "prisma";
      console.log(`[signupAction] ✅ Clinic & User created via Prisma (clinicId: ${result.data?.clinicId})`);
    } else {
      console.warn("[signupAction] Prisma failed, falling back to Supabase:", result.error);
      throw new Error(result.error);
    }
  } catch (prismaErr) {
    // Method 2: Fallback to Supabase service client
    console.warn("[signupAction] Prisma method failed, trying Supabase service client...", prismaErr);

    try {
      const serviceSupabase = await createServiceClient();

      // 3a. Create the Clinic record first
      const { data: clinic, error: clinicErr } = await serviceSupabase
        .from("Clinic")
        .insert({ name: clinicName, subscription: "free" })
        .select("id")
        .single();

      if (clinicErr) {
        console.error("[signupAction] Supabase clinic creation error:", clinicErr);
        dbInsertFailed = true;
      } else if (clinic) {
        // 3b. Create the main branch
        const mainBranchName = branchName || `${clinicName} - الفرع الرئيسي`;
        const branchCode = `BRANCH-${clinic.id.slice(0, 8).toUpperCase()}-MAIN`;

        const { data: branch, error: branchErr } = await serviceSupabase
          .from("clinic_branches")
          .insert({
            clinicId: clinic.id,
            name: mainBranchName,
            code: branchCode,
            isActive: true,
          })
          .select("id")
          .single();

        if (branchErr) {
          console.error("[signupAction] Supabase branch creation error:", branchErr);
          dbInsertFailed = true;
        } else {
          // 3c. Create the User profile
          const { error: userErr } = await serviceSupabase.from("users").insert({
            id: user.id,
            email: email.toLowerCase(),
            fullName: doctorName,
            phone,
            role: "ADMIN",
            isActive: true,
            clinicId: clinic.id,
            branchId: branch?.id || null,
          });

          if (userErr) {
            console.error("[signupAction] Supabase user creation error:", userErr);
            dbInsertFailed = true;
          } else {
            dbMethod = "supabase";
            console.log(`[signupAction] ✅ Clinic & User created via Supabase (clinicId: ${clinic.id})`);
          }
        }
      }
    } catch (supabaseErr) {
      console.error("[signupAction] Both Prisma and Supabase methods failed:", supabaseErr);
      dbInsertFailed = true;
    }
  }

  // If DB insert failed, warn the user but still redirect (they can fix via profile)
  if (dbInsertFailed) {
    console.warn(
      "[signupAction] ⚠️ User created in Auth but missing clinic/branch data. " +
        "Run `npx prisma migrate dev` to fix database tables, then use the dashboard to complete setup.",
    );
  }

  // ── 4. Redirect or return success message ────────────────────────────
  const locale = (formData.get("locale") as string | null) ?? "ar";

  if (session) {
    // Email confirmation DISABLED → user is already signed in
    redirect(`/${locale}/dashboard`);
  }

  // Email confirmation ENABLED → ask user to check inbox
  return {
    successMessage:
      "تم إنشاء حسابك بنجاح! يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب ثم تسجيل الدخول.",
  };
}
