"use server";

// =============================================================================
// SmileCraft CMS — Fix Orphaned Users
// Creates missing clinic/branch records for users who signed up but
// failed to get their DB records created (e.g., migration not run).
// Uses Prisma directly to bypass RLS issues.
// =============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fixOrphanedUserViaPrisma } from "@/lib/direct-db";
import { redirect } from "next/navigation";

export type FixOrphanedUserResult = {
  success: boolean;
  message: string;
  redirectPath?: string;
};

/**
 * Checks if the current user has a clinic. If not, creates one.
 * This is called from the dashboard page as a fallback.
 */
export async function fixOrphanedUserAction(): Promise<FixOrphanedUserResult> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "Unauthorized: Please log in." };
  }

  // 2. Extract data from auth metadata
  const fullName = user.user_metadata?.fullName || "Doctor";
  const email = user.email || "";
  const phone = user.phone || "";
  const clinicName = user.user_metadata?.clinicName || `${fullName} Clinic`;

  console.log(`[fixOrphanedUser] Creating clinic for user ${user.id}: ${clinicName}`);

  // 3. Create Clinic + Branch + User via Prisma (bypasses RLS)
  const result = await fixOrphanedUserViaPrisma(user.id, {
    fullName,
    email,
    phone,
    clinicName,
  });

  if (!result.success) {
    console.error("[fixOrphanedUser] Failed to create clinic:", result.error);
    return {
      success: false,
      message: `Failed to create clinic: ${result.error}`,
    };
  }

  console.log(`[fixOrphanedUser] ✅ Successfully created clinic ${result.data?.clinicId} for user ${user.id}`);

  // 4. Revalidate cache and redirect
  revalidatePath("/");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Clinic created successfully! Redirecting...",
    redirectPath: "/dashboard",
  };
}
