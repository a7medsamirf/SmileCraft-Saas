// =============================================================================
// SmileCraft CMS — Direct Database Access (Bypasses RLS completely)
// Uses Prisma Client directly for admin operations during signup.
// =============================================================================

import { PrismaClient } from "@prisma/client";

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type DirectDBResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a clinic, branch, and user record directly via Prisma.
 * This completely bypasses Supabase RLS and auth.
 */
export async function createClinicAndUserDirectly(input: {
  userId: string;
  clinicName: string;
  branchName?: string;
  doctorName: string;
  email: string;
  phone?: string;
}): Promise<DirectDBResult<{ clinicId: string; branchId: string }>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Clinic
      const clinic = await tx.clinic.create({
        data: {
          id: crypto.randomUUID(),
          name: input.clinicName,
          email: input.email,
          subscription: "free",
          updatedAt: new Date(),
        },
      });

      // 2. Create Main Branch
      const mainBranchName = input.branchName || `${input.clinicName} - الفرع الرئيسي`;
      const branchCode = `BRANCH-${clinic.id.slice(0, 8).toUpperCase()}-MAIN`;

      const branch = await tx.clinic_branches.create({
        data: {
          clinicId: clinic.id,
          name: mainBranchName,
          code: branchCode,
          isActive: true,
        },
      });

      // 3. Create User record
      await tx.users.create({
        data: {
          id: input.userId,
          email: input.email.toLowerCase(),
          fullName: input.doctorName,
          phone: input.phone,
          role: "ADMIN",
          isActive: true,
          clinicId: clinic.id,
          branchId: branch.id,
          updatedAt: new Date(),
        },
      });

      return { clinicId: clinic.id, branchId: branch.id };
    });

    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for specific Prisma errors
    if (errorMessage.includes("Unique constraint")) {
      return {
        success: false,
        error: "User or clinic already exists",
      };
    }

    return {
      success: false,
      error: `Database error: ${errorMessage}`,
    };
  }
}

/**
 * Checks if a user has a clinic association.
 */
export async function checkUserHasClinic(userId: string): Promise<boolean> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { clinicId: true },
    });
    return !!user?.clinicId;
  } catch {
    return false;
  }
}

/**
 * Fixes an orphaned user by creating clinic and branch.
 */
export async function fixOrphanedUserViaPrisma(
  userId: string,
  metadata: {
    fullName: string;
    email: string;
    phone?: string;
    clinicName?: string;
  }
): Promise<DirectDBResult<{ clinicId: string; branchId: string }>> {
  const clinicName = metadata.clinicName || `${metadata.fullName} Clinic`;

  return createClinicAndUserDirectly({
    userId,
    clinicName,
    doctorName: metadata.fullName,
    email: metadata.email,
    phone: metadata.phone,
  });
}
