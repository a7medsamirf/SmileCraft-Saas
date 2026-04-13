// =============================================================================
// SmileCraft CMS — Shared Supabase Utilities
// Type-safe helpers for authenticated Supabase queries.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Re-export the Supabase types we use everywhere
// ---------------------------------------------------------------------------
export type Tables = Database["public"]["Tables"];

export type PatientRow = Tables["patients"]["Row"];
export type PatientInsert = Tables["patients"]["Insert"];
export type PatientUpdate = Tables["patients"]["Update"];

export type AppointmentRow = Tables["appointments"]["Row"];
export type AppointmentInsert = Tables["appointments"]["Insert"];
export type AppointmentUpdate = Tables["appointments"]["Update"];

export type ClinicalCaseRow = Tables["clinical_cases"]["Row"];
export type ClinicalCaseInsert = Tables["clinical_cases"]["Insert"];
export type ClinicalCaseUpdate = Tables["clinical_cases"]["Update"];

export type PaymentRow = Tables["payments"]["Row"];
export type PaymentInsert = Tables["payments"]["Insert"];
export type PaymentUpdate = Tables["payments"]["Update"];

export type UserRow = Tables["users"]["Row"];
export type UserInsert = Tables["users"]["Insert"];
export type UserUpdate = Tables["users"]["Update"];

export type ClinicRow = Tables["Clinic"]["Row"];

// Enum types
export type AppointmentStatus = Database["public"]["Enums"]["AppointmentStatus"];
export type UserRole = Database["public"]["Enums"]["UserRole"];
export type Gender = Database["public"]["Enums"]["Gender"];
export type TreatmentStatus = Database["public"]["Enums"]["TreatmentStatus"];
export type Severity = Database["public"]["Enums"]["Severity"];
export type PaymentMethod = Database["public"]["Enums"]["PaymentMethod"];
export type PaymentStatus = Database["public"]["Enums"]["PaymentStatus"];

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user, or null if not logged in.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/**
 * Returns the clinicId for the authenticated user, or null.
 * This is the primary multi-tenant guard used across all server actions.
 */
export async function resolveClinicId(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("clinicId")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { clinicId?: string } | null)?.clinicId ?? null;
}

/**
 * Returns the branchId for the authenticated user, or null.
 * Users can switch between branches, this returns their current active branch.
 */
export async function resolveBranchId(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("branchId")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { branchId?: string } | null)?.branchId ?? null;
}

/**
 * Returns both clinicId and branchId for the authenticated user.
 * Useful for server actions that need to filter by both.
 */
export async function resolveUserContext(): Promise<{ clinicId: string; branchId: string | null } | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("clinicId, branchId")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  const typedData = data as { clinicId?: string; branchId?: string | null };
  
  return {
    clinicId: typedData.clinicId ?? null,
    branchId: typedData.branchId ?? null,
  } as { clinicId: string; branchId: string | null };
}

/**
 * Returns the authenticated user's role, or null.
 */
export async function resolveUserRole(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { role?: string } | null)?.role ?? null;
}

/**
 * Returns the authenticated user's full name, or null.
 */
export async function resolveUserFullName(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Use Prisma to bypass RLS
  const prisma = (await import("@/lib/prisma")).default;
  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });

  return dbUser?.fullName ?? null;
}

/**
 * Returns the authenticated user's staff information (specialty and role).
 * Used to display appropriate title in the sidebar.
 */
export async function resolveUserStaffInfo(): Promise<{ specialty?: string | null; role?: string | null } | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();

  // First get the user's userId to find their staff record
  const { data: userData } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userData) return null;

  const userRole = (userData as { role?: string }).role;

  // Then find the staff record linked to this user (PRIMARY SOURCE for role & specialty)
  const { data: staffData } = await supabase
    .from("staff")
    .select("specialty, role")
    .eq("userId", userData.id)
    .maybeSingle();

  if (staffData) {
    const { specialty, role } = staffData as { specialty?: string | null; role?: string };
    console.log("[resolveUserStaffInfo] From staff table:", { specialty, role });
    return { specialty, role };
  }

  // Fallback: use the user role from users table (for users without staff records)
  console.log("[resolveUserStaffInfo] No staff record found, using user role:", userRole);
  return { specialty: null, role: userRole };
}

/**
 * Throws if the user is not authenticated.
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized: Please log in.");
  return user;
}

/**
 * Throws if the user is not authenticated or has no clinic.
 */
export async function requireClinicId() {
  const user = await requireAuth();
  const clinicId = await resolveClinicId();
  
  if (!clinicId) {
    // Log diagnostic info
    console.error(
      `[requireClinicId] User ${user.id} (${user.email}) has no clinic. ` +
      `Check: 1) users table has record for this user, 2) clinicId is not null`
    );
    
    throw new Error("Unauthorized: No clinic associated with user.");
  }
  
  return clinicId;
}

/**
 * Throws if the user is not authenticated or has no branch.
 * Use this for actions that require branch context.
 */
export async function requireBranchId(): Promise<string> {
  await requireAuth();
  const branchId = await resolveBranchId();
  if (!branchId) throw new Error("Unauthorized: No branch selected. Please select a branch first.");
  return branchId;
}

/**
 * Updates the user's active branch.
 * This allows users to switch between branches within their clinic.
 */
export async function switchBranch(branchId: string): Promise<void> {
  const user = await requireAuth();
  const clinicId = await requireClinicId();
  
  const supabase = await createClient();
  
  // Verify the branch belongs to the user's clinic
  const { data: branch, error: branchError } = await supabase
    .from("clinic_branches")
    .select("id")
    .eq("id", branchId)
    .eq("clinicId", clinicId)
    .eq("isActive", true)
    .maybeSingle();
  
  if (branchError || !branch) {
    throw new Error("Invalid branch or branch not accessible");
  }
  
  // Update user's active branch
  const { error: updateError } = await supabase
    .from("users")
    .update({ branchId })
    .eq("id", user.id);
  
  if (updateError) {
    throw new Error("Failed to switch branch: " + updateError.message);
  }
}

// ---------------------------------------------------------------------------
// Supabase query builder helpers
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase query pre-scoped to the user's clinic.
 * Usage:
 *   const { data, error } = await scopedQuery("patients")
 *     .select("*")
 *     .eq("isActive", true);
 */
export async function scopedQuery<
  T extends keyof Tables & string,
>(table: T) {
  const clinicId = await requireClinicId();
  const supabase = await createClient();

  return {
    select: <R extends string = "*">(columns?: R) => {
      const query = supabase.from(table).select(columns as any).eq("clinicId", clinicId);
      return query;
    },
    count: async () => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("clinicId", clinicId);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the date range for a given date as ISO datetime strings.
 */
export function getDateRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}
