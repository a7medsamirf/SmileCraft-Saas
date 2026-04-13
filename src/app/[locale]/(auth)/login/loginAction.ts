"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loginSchema } from "./schema";

export type LoginState = {
  errors?: {
    email?: string[];
    password?: string[];
    form?: string[];
  };
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: (formData.get("email") as string | null) ?? "",
    password: (formData.get("password") as string | null) ?? "",
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createClient();
  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { errors: { form: ["البريد الإلكتروني أو كلمة المرور غير صحيحة"] } };
  }

  // ── Sync user to application DB if not exists ─────────────────────
  // After successful auth, ensure the user has a record in the `users` table.
  // This handles cases where a user exists in Supabase Auth but was never
  // synced to the application database (e.g., manually created in Supabase Dashboard).
  try {
    const user = authData?.user;
    if (user) {
      const serviceSupabase = await createServiceClient();

      // Check if user record exists
      const { data: existingUser } = await serviceSupabase
        .from("users")
        .select("id, clinicId")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingUser) {
        // User exists in Auth but not in DB — create the record
        const metadata = user.user_metadata || {};
        const fullName = metadata.fullName || metadata.full_name || metadata.name || "";
        const phone = metadata.phone || "";
        const clinicName = metadata.clinicName || "";

        // Try to find or create a Clinic record
        let clinicId: string | null = null;

        if (clinicName) {
          // Try to find existing clinic by name
          const { data: existingClinic } = await serviceSupabase
            .from("Clinic")
            .select("id")
            .eq("name", clinicName)
            .maybeSingle();

          if (existingClinic) {
            clinicId = existingClinic.id;
          } else {
            // Create new clinic
            const { data: newClinic, error: clinicErr } = await serviceSupabase
              .from("Clinic")
              .insert({ name: clinicName, subscription: "free" })
              .select("id")
              .single();

            if (!clinicErr && newClinic) {
              clinicId = newClinic.id;
            }
          }
        } else {
          // No clinicName in metadata — assign to the first existing clinic
          const { data: firstClinic } = await serviceSupabase
            .from("Clinic")
            .select("id")
            .limit(1)
            .single();

          if (firstClinic) {
            clinicId = firstClinic.id;
          } else {
            throw new Error("No clinic available. Please contact support.");
          }
        }

        // Create the user record
        const { error: userErr } = await serviceSupabase.from("users").insert({
          id: user.id,
          email: user.email?.toLowerCase() || parsed.data.email.toLowerCase(),
          fullName: fullName || parsed.data.email.split("@")[0],
          phone,
          role: "ADMIN",
          isActive: true,
          clinicId,
          branchId: null, // Will be set below
        });

        if (userErr) {
          console.warn("[loginAction] Failed to sync user to DB:", userErr.message);
          // Non-fatal: allow login to proceed
        } else if (clinicId) {
          // Auto-assign default branch for new users
          await autoAssignDefaultBranch(serviceSupabase, user.id, clinicId);
        }
      } else if (existingUser?.clinicId) {
        // User exists in DB - ensure they have a branch assigned
        await ensureUserHasBranch(serviceSupabase, user.id, existingUser.clinicId);
      }
    }
  } catch (syncError) {
    // Non-fatal: don't block login if sync fails
    console.warn(
      "[loginAction] User sync failed:",
      syncError instanceof Error ? syncError.message : syncError
    );
  }

  const locale = (formData.get("locale") as string | null) ?? "ar";
  redirect(`/${locale}/dashboard`);
}

/**
 * Auto-assigns the first active branch (or creates one if none exists) for a new user.
 */
async function autoAssignDefaultBranch(
  serviceSupabase: any,
  userId: string,
  clinicId: string
) {
  try {
    // Find first active branch for this clinic
    const { data: branch } = await serviceSupabase
      .from("clinic_branches")
      .select("id")
      .eq("clinicId", clinicId)
      .eq("isActive", true)
      .order("createdAt", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (branch) {
      // Assign user to this branch
      await serviceSupabase
        .from("users")
        .update({ branchId: branch.id })
        .eq("id", userId);
    } else {
      // No branches exist - create a default branch
      const { data: newBranch } = await serviceSupabase
        .from("clinic_branches")
        .insert({
          clinicId,
          name: "الفرع الرئيسي",
          code: `MAIN-${clinicId.slice(0, 8).toUpperCase()}`,
          isActive: true,
        })
        .select("id")
        .single();

      if (newBranch) {
        await serviceSupabase
          .from("users")
          .update({ branchId: newBranch.id })
          .eq("id", userId);
      }
    }
  } catch (err) {
    console.warn("[autoAssignDefaultBranch] Failed to assign branch:", err);
  }
}

/**
 * Ensures an existing user has a branch assigned (for users who logged in before branch assignment was enforced).
 */
async function ensureUserHasBranch(
  serviceSupabase: any,
  userId: string,
  clinicId: string | null
) {
  try {
    if (!clinicId) return;

    // Check if user already has a branch
    const { data: user } = await serviceSupabase
      .from("users")
      .select("branchId")
      .eq("id", userId)
      .maybeSingle();

    if (user?.branchId) return; // Already has a branch

    // Find first active branch for this clinic
    const { data: branch } = await serviceSupabase
      .from("clinic_branches")
      .select("id")
      .eq("clinicId", clinicId)
      .eq("isActive", true)
      .order("createdAt", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (branch) {
      await serviceSupabase
        .from("users")
        .update({ branchId: branch.id })
        .eq("id", userId);
    }
  } catch (err) {
    console.warn("[ensureUserHasBranch] Failed to ensure branch:", err);
  }
}
