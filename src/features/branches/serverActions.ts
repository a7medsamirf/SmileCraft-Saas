"use server";

// =============================================================================
// SmileCraft CMS — Branch Server Actions
// ✅ Migrated to Prisma ORM with branch access validation
// ✅ Rate limiting applied to all mutation actions
// ✅ Audit logging integrated
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { BranchData, BranchFull } from "./types";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// ─── Zod Schemas (must be in this file for validation) ────────────────────────

const CreateBranchSchema = z.object({
  name: z.string().min(2, "اسم الفرع مطلوب (حرفين على الأقل)"),
  code: z.string().min(2, "كود الفرع مطلوب (حرفين على الأقل)").max(20),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
});

const UpdateBranchSchema = CreateBranchSchema.extend({
  id: z.string().uuid("معرف الفرع غير صالح"),
  isActive: z.boolean().optional(),
});

const DeleteBranchSchema = z.object({
  id: z.string().uuid("معرف الفرع غير صالح"),
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function getCurrentUserClinicId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  });

  return dbUser?.clinicId || null;
}

/**
 * Auto-fix: Creates a default branch for existing clinics that don't have any branches,
 * and associates the user with it.
 */
async function autoFixMissingBranch(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return null;

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true, branchId: true },
  });

  if (!dbUser?.clinicId) return null;

  const clinicId = dbUser.clinicId;

  // Check if clinic already has branches
  const existingBranches = await prisma.clinic_branches.findFirst({
    where: { clinicId },
    select: { id: true },
  });

  if (existingBranches) {
    // ✅ FIX: Only auto-assign if user has NO branchId set
    // Don't overwrite if user already has a branch selected
    if (dbUser.branchId) {
      return dbUser.branchId; // User already has a branch, return it
    }

    const firstBranch = await prisma.clinic_branches.findFirst({
      where: { clinicId },
      select: { id: true },
    });

    if (firstBranch) {
      await prisma.users.update({
        where: { id: user.id },
        data: { branchId: firstBranch.id },
      });
      return firstBranch.id;
    }
    return null;
  }

  // No branches exist - create default branch
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true },
  });

  if (!clinic) return null;

  const branchName = `${clinic.name} - الفرع الرئيسي`;
  const branchCode = `BRANCH-${clinicId.slice(0, 8).toUpperCase()}-MAIN`;

  const newBranch = await prisma.clinic_branches.create({
    data: {
      clinicId,
      name: branchName,
      code: branchCode,
      isActive: true,
    },
    select: { id: true },
  });

  // Associate user with the new branch
  await prisma.users.update({
    where: { id: user.id },
    data: { branchId: newBranch.id },
  });

  return newBranch.id;
}

/**
 * Fetches all branches for the user's clinic.
 * Returns empty array if user is not authenticated or has no clinic.
 * Auto-fixes missing branches for existing clinics.
 */
export async function getBranchesAction(): Promise<BranchData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return [];

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  });

  if (!dbUser?.clinicId) return [];

  const clinicId = dbUser.clinicId;

  // Auto-fix: create default branch if none exists
  await autoFixMissingBranch();

  // Now fetch branches
  const branches = await prisma.clinic_branches.findMany({
    where: { clinicId },
    select: { id: true, name: true, code: true, isActive: true },
    orderBy: { name: "asc" },
  });

  return branches;
}

/**
 * Creates a new branch for the user's clinic.
 */
export async function createBranchAction(name: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Please log in.");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  });

  if (!dbUser?.clinicId) {
    throw new Error("Unauthorized: No clinic associated with user.");
  }

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createBranch", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (!name.trim()) {
    throw new Error("اسم الفرع مطلوب");
  }

  const clinicId = dbUser.clinicId;

  // Generate unique code
  const branchCode = `BRANCH-${clinicId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  await prisma.clinic_branches.create({
    data: {
      clinicId,
      name: name.trim(),
      code: branchCode,
      isActive: true,
    },
  });

  // Audit log
  await auditCreate("branch", crypto.randomUUID(), {
    name: name.trim(),
    code: branchCode,
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Switches the user's active branch.
 * ✅ Includes branch access validation
 */
export async function switchBranchAction(branchId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Please log in.");
  }

  // Check rate limit (10 updates per minute)
  const rateLimit = await checkRateLimit("switchBranch", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  });

  if (!dbUser?.clinicId) {
    throw new Error("Unauthorized: No clinic associated with user.");
  }

  const clinicId = dbUser.clinicId;

  // Verify the branch belongs to the user's clinic and is active
  const branch = await prisma.clinic_branches.findFirst({
    where: {
      id: branchId,
      clinicId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!branch) {
    throw new Error("فرع غير صالح أو غير متاح");
  }

  // Update user's active branch
  await prisma.users.update({
    where: { id: user.id },
    data: { branchId },
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Fetches all branches with full details and counts for management.
 */
export async function getBranchesFullAction(): Promise<BranchFull[]> {
  const clinicId = await getCurrentUserClinicId();
  if (!clinicId) return [];

  const branches = await prisma.clinic_branches.findMany({
    where: { clinicId },
    include: {
      _count: {
        select: {
          patients: true,
          appointments: true,
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return branches;
}

/**
 * Updates an existing branch with full validation.
 */
export async function updateBranchAction(
  data: z.infer<typeof UpdateBranchSchema>
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  const clinicId = await getCurrentUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  // Check rate limit (50 updates per minute)
  const rateLimit = await checkRateLimit("updateBranch", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const validation = UpdateBranchSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: "بيانات غير صالحة",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { id, name, code, address, phone, managerName, isActive } = validation.data;

  // Verify branch belongs to user's clinic
  const existingBranch = await prisma.clinic_branches.findFirst({
    where: { id, clinicId },
    select: { id: true },
  });

  if (!existingBranch) {
    return { success: false, error: "الفرع غير موجود أو غير مصرح" };
  }

  // Check if code is unique (excluding current branch)
  const codeExists = await prisma.clinic_branches.findFirst({
    where: {
      code,
      clinicId,
      id: { not: id },
    },
  });

  if (codeExists) {
    return { success: false, error: "كود الفرع مستخدم بالفعل", fieldErrors: { code: ["كود الفرع مستخدم بالفعل"] } };
  }

  try {
    await prisma.clinic_branches.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        managerName: managerName?.trim() || null,
        isActive: isActive ?? true,
      },
    });

    // Audit log
    await auditUpdate("branch", id, {
      changedFields: ["name", "code"],
      after: { name: name.trim(), code: code.trim() },
    });

    revalidatePath("/branches");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update branch:", error);
    return { success: false, error: "فشل في تحديث الفرع. حاول مرة أخرى." };
  }
}

/**
 * Deletes a branch with safety checks.
 */
export async function deleteBranchAction(
  data: z.infer<typeof DeleteBranchSchema>
): Promise<{ success: boolean; error?: string }> {
  const clinicId = await getCurrentUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  // Check rate limit (10 deletes per minute)
  const rateLimit = await checkRateLimit("deleteBranch", RATE_LIMITS.MUTATION_DELETE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const validation = DeleteBranchSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "معرف الفرع غير صالح" };
  }

  const { id } = validation.data;

  // Verify branch belongs to user's clinic
  const branch = await prisma.clinic_branches.findFirst({
    where: { id, clinicId },
    include: {
      _count: {
        select: {
          patients: true,
          appointments: true,
          users: true,
        },
      },
    },
  });

  if (!branch) {
    return { success: false, error: "الفرع غير موجود أو غير مصرح" };
  }

  // Safety check: Don't delete branches with associated data
  const hasPatients = branch._count.patients > 0;
  const hasAppointments = branch._count.appointments > 0;
  const hasUsers = branch._count.users > 0;

  if (hasPatients || hasAppointments || hasUsers) {
    return {
      success: false,
      error: `لا يمكن حذف الفرع لوجود بيانات مرتبطة: ${hasPatients ? `${hasPatients} مريض` : ""} ${hasAppointments ? `${hasAppointments} موعد` : ""} ${hasUsers ? `${hasUsers} مستخدم` : ""}`,
    };
  }

  try {
    await prisma.clinic_branches.delete({
      where: { id },
    });

    // Audit log
    await auditDelete("branch", id, {
      name: branch.name,
      code: branch.code,
    });

    revalidatePath("/branches");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete branch:", error);
    return { success: false, error: "فشل في حذف الفرع. حاول مرة أخرى." };
  }
}
