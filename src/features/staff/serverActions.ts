"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  StaffMember,
  StaffRole,
  LeaveRequest,
  LeaveType,
  PayrollRecord,
  PayrollStatus,
} from "./types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Helper to get the current user's clinic ID and branch ID.
 */
async function getClinicAndBranchId(): Promise<{ clinicId: string | null; branchId: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { clinicId: null, branchId: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true },
    });

    return {
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
    };
  } catch {
    return { clinicId: null, branchId: null };
  }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapStaffRow(row: any): StaffMember {
  return {
    id: row.id,
    fullName: row.fullName ?? "",
    role: row.role ?? "ASSISTANT",
    specialty: row.specialty ?? undefined,
    certifications:
      typeof row.certification === "string" && row.certification
        ? row.certification
            .split(",")
            .map((c: string) => c.trim())
            .filter(Boolean)
        : [],
    email: row.email ?? "",
    phone: row.phone ?? "",
    joinDate: row.joinDate ? new Date(row.joinDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    salary: Number(row.salary ?? 0),
    isActive: row.isActive === true,
    permissions: row.permissions ? (row.permissions as Record<string, unknown>) : undefined,
  };
}

function mapLeaveRow(row: any): LeaveRequest {
  return {
    id: row.id,
    staffId: row.staffId,
    type: row.type as LeaveType,
    startDate: new Date(row.startDate).toISOString().slice(0, 10),
    endDate: new Date(row.endDate).toISOString().slice(0, 10),
    reason: row.reason ?? "",
    status: row.status as "PENDING" | "APPROVED" | "REJECTED",
    requestedAt: new Date(row.requestedAt).toISOString(),
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : undefined,
    reviewedBy: row.reviewedBy ?? undefined,
  };
}

function mapPayrollRow(row: any): PayrollRecord {
  return {
    id: row.id,
    staffId: row.staffId,
    month: row.month,
    baseSalary: Number(row.baseSalary ?? 0),
    bonuses: Number(row.bonuses ?? 0),
    deductions: Number(row.deductions ?? 0),
    net: Number(row.net ?? 0),
    status: row.status as PayrollStatus,
    paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : undefined,
    paymentMethod: row.paymentMethod as "CASH" | "TRANSFER" | "CHECK" | undefined,
    note: row.note ?? undefined,
  };
}

// =============================================================================
// STAFF CRUD
// =============================================================================

export async function getStaffMembersAction(): Promise<StaffMember[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    
    // Not authenticated or no clinic → return empty array
    if (!clinicId) return [];

    const staff = await prisma.staff.findMany({
      where: { clinicId, isActive: true },
      orderBy: { fullName: "asc" },
    });

    // Return real data or empty array (no mock fallback)
    return staff.map(mapStaffRow);
  } catch (error) {
    // Log error but return empty array instead of mock data
    console.error("[getStaffMembersAction] Database error:", error);
    return [];
  }
}

export async function createStaffMemberAction(
  payload: Omit<StaffMember, "id">,
): Promise<StaffMember> {
  try {
    const { clinicId, branchId } = await getClinicAndBranchId();
    if (!clinicId) throw new Error("Unauthorized");

    // Check rate limit (20 creates per minute)
    const rateLimit = await checkRateLimit("createStaff", RATE_LIMITS.MUTATION_CREATE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const newId = crypto.randomUUID();
    const now = new Date();

    // If login account is requested, create Supabase Auth user first
    let authUserId: string | null = null;
    if (payload.createLoginAccount && payload.password) {
      const supabaseAdmin = createAdminClient();

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true, // Skip email confirmation for staff
        user_metadata: {
          fullName: payload.fullName,
          role: payload.role,
        },
      });

      if (authError) {
        // Check if email already exists
        if (authError.message.toLowerCase().includes("already")) {
          throw new Error("Email already has an account");
        }
        throw new Error(authError.message);
      }

      authUserId = authData.user?.id ?? null;

      // Create user record in public.users table
      await prisma.users.create({
        data: {
          id: authUserId,
          email: payload.email.toLowerCase(),
          fullName: payload.fullName,
          phone: payload.phone,
          role: payload.role === "DOCTOR" ? "DOCTOR" : "RECEPTIONIST",
          isActive: true,
          clinicId,
          branchId: branchId ?? null,
          updatedAt: now,
        },
      });
    }

    // Create staff record — bound to admin's branchId
    const staff = await prisma.staff.create({
      data: {
        id: newId,
        clinicId,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        specialty: payload.specialty ?? null,
        certification: payload.certifications.join(", "),
        salary: payload.salary,
        joinDate: payload.joinDate ? new Date(payload.joinDate) : now,
        isActive: payload.isActive,
        role: payload.role,
        employeeCode: `STF-${Date.now().toString().slice(-6)}`,
        userId: authUserId, // Link to auth user if created
        permissions: (payload.permissions ?? {}) as any,
        updatedAt: now,
      },
    });

    revalidatePath("/dashboard/staff");

    // Audit log
    await auditCreate("staff", staff.id, {
      fullName: staff.fullName,
      specialty: staff.specialty,
      role: staff.role,
    });

    return mapStaffRow(staff);
  } catch (err) {
    // Log error with details for debugging
    console.error("[createStaffMemberAction] Error:", err);
    
    // Return specific error message for known errors, generic for unknown
    const message = err instanceof Error ? err.message : "فشل في إنشاء الموظف";
    throw new Error(message);
  }
}

export async function updateStaffMemberAction(
  id: string,
  payload: Partial<StaffMember>,
): Promise<StaffMember> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) throw new Error("Unauthorized");

    // Check rate limit (50 updates per minute)
    const rateLimit = await checkRateLimit("updateStaff", RATE_LIMITS.MUTATION_UPDATE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const patch: Record<string, unknown> = {};
    if (payload.fullName !== undefined) patch.fullName = payload.fullName;
    if (payload.email !== undefined) patch.email = payload.email;
    if (payload.phone !== undefined) patch.phone = payload.phone;
    if (payload.specialty !== undefined) patch.specialty = payload.specialty;
    if (payload.certifications !== undefined)
      patch.certification = payload.certifications.join(", ");
    if (payload.salary !== undefined) patch.salary = payload.salary;
    if (payload.isActive !== undefined) patch.isActive = payload.isActive;
    if (payload.role !== undefined) patch.role = payload.role;

    const staff = await prisma.staff.update({
      where: { id, clinicId },
      data: patch,
    });

    revalidatePath("/dashboard/staff");

    // Audit log
    await auditUpdate("staff", id, {
      changedFields: Object.keys(patch),
    });

    return mapStaffRow(staff);
  } catch (err) {
    console.error("[updateStaffMemberAction] Error:", err);
    const message = err instanceof Error ? err.message : "فشل في تحديث الموظف";
    throw new Error(message);
  }
}

export async function deleteStaffMemberAction(id: string): Promise<void> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) throw new Error("Unauthorized");

    // Check rate limit (10 deletes per minute)
    const rateLimit = await checkRateLimit("deleteStaff", RATE_LIMITS.MUTATION_DELETE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    await prisma.staff.delete({
      where: { id, clinicId },
    });

    // Audit log
    await auditDelete("staff", id, {});

    revalidatePath("/dashboard/staff");
  } catch (err) {
    console.error("[deleteStaffMemberAction] Error:", err);
    const message = err instanceof Error ? err.message : "فشل في حذف الموظف";
    throw new Error(message);
  }
}

// =============================================================================
// LEAVE REQUESTS
// =============================================================================

/** Load all leave requests for the clinic, optionally filtered by staffId. */
export async function getLeaveRequestsAction(staffId?: string): Promise<LeaveRequest[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    const where: any = { clinicId };
    if (staffId) {
      where.staffId = staffId;
    }

    const leaveRequests = await prisma.leave_requests.findMany({
      where,
      orderBy: { requestedAt: "desc" },
    });

    return leaveRequests.map(mapLeaveRow);
  } catch {
    return [];
  }
}

/** Submit a new leave request. Returns the created record (or optimistic on failure). */
export async function createLeaveRequestAction(
  payload: Omit<LeaveRequest, "id" | "status" | "requestedAt">,
): Promise<LeaveRequest> {
  const optimistic: LeaveRequest = {
    id: crypto.randomUUID(),
    status: "PENDING",
    requestedAt: new Date().toISOString(),
    ...payload,
  };

  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return optimistic;

    const leaveRequest = await prisma.leave_requests.create({
      data: {
        id: optimistic.id,
        clinicId,
        staffId: payload.staffId,
        type: payload.type,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        reason: payload.reason,
        status: "PENDING",
      },
    });

    revalidatePath("/dashboard/staff");
    return mapLeaveRow(leaveRequest);
  } catch (err) {
    console.error("[createLeaveRequestAction]", err);
    return optimistic;
  }
}

/** Approve or reject a leave request. */
export async function updateLeaveStatusAction(
  leaveId: string,
  status: "APPROVED" | "REJECTED",
  reviewedBy?: string,
): Promise<void> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return;

    await prisma.leave_requests.update({
      where: { id: leaveId, clinicId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: reviewedBy ?? null,
      },
    });

    revalidatePath("/dashboard/staff");
  } catch (err) {
    console.warn("[updateLeaveStatusAction]", err);
  }
}

// =============================================================================
// PAYROLL RECORDS
// =============================================================================

/** Load all payroll records for a specific month. */
export async function getPayrollByMonthAction(month: string): Promise<PayrollRecord[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    const payrollRecords = await prisma.payroll_records.findMany({
      where: { clinicId, month },
      orderBy: { createdAt: "asc" },
    });

    return payrollRecords.map(mapPayrollRow);
  } catch {
    return [];
  }
}

/**
 * Upsert a payroll record (create if new id, update if existing).
 * Uses the `id` field as the upsert key.
 */
export async function savePayrollRecordAction(record: PayrollRecord): Promise<PayrollRecord> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return record;

    const payrollRecord = await prisma.payroll_records.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        clinicId,
        staffId: record.staffId,
        month: record.month,
        baseSalary: record.baseSalary,
        bonuses: record.bonuses,
        deductions: record.deductions,
        net: record.net,
        status: record.status,
        paidAt: record.paidAt ? new Date(record.paidAt) : null,
        paymentMethod: record.paymentMethod ?? null,
        note: record.note ?? null,
      },
      update: {
        baseSalary: record.baseSalary,
        bonuses: record.bonuses,
        deductions: record.deductions,
        net: record.net,
        status: record.status,
        paidAt: record.paidAt ? new Date(record.paidAt) : null,
        paymentMethod: record.paymentMethod ?? null,
        note: record.note ?? null,
      },
    });

    revalidatePath("/dashboard/staff");
    return mapPayrollRow(payrollRecord);
  } catch (err) {
    console.error("[savePayrollRecordAction]", err);
    return record;
  }
}

/**
 * Generate payroll records for all active staff for the given month.
 * Staff that already have a record are skipped (UNIQUE constraint).
 * Returns all records for that month after generation.
 */
export async function generateMonthlyPayrollAction(
  month: string,
  staffList: StaffMember[],
): Promise<PayrollRecord[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    // Find which staff already have a record this month
    const existing = await prisma.payroll_records.findMany({
      where: { clinicId, month },
      select: { staffId: true },
    });

    const existingIds = new Set(existing.map((r) => r.staffId));

    const toCreate = staffList.filter((s) => s.isActive && !existingIds.has(s.id));

    if (toCreate.length > 0) {
      await prisma.payroll_records.createMany({
        data: toCreate.map((s) => ({
          id: crypto.randomUUID(),
          clinicId,
          staffId: s.id,
          month,
          baseSalary: s.salary,
          bonuses: 0,
          deductions: 0,
          net: s.salary,
          status: "PENDING",
        })),
      });
    }

    // Return all records for the month
    return getPayrollByMonthAction(month);
  } catch (err) {
    console.warn("[generateMonthlyPayrollAction]", err);
    return [];
  }
}
