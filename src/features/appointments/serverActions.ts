"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Appointment, AppointmentStatus } from "./types";
import { PROCEDURE_BY_KEY } from "./constants/procedures";
import {
  appointmentIdSchema,
  statusUpdateSchema,
  createAppointmentSchema,
} from "./schemas";
import type {
  AppointmentStatus as PrismaAppointmentStatus,
  Prisma,
} from "@prisma/client";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

/**
 * Auth helper — returns clinicId, branchId and role (never throws)
 */
async function getAuthContext(): Promise<{ 
  clinicId: string | null; 
  branchId: string | null; 
  role: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { clinicId: null, branchId: null, role: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true, role: true },
    });

    return {
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
      role: dbUser?.role ?? null,
    };
  } catch {
    return { clinicId: null, branchId: null, role: null };
  }
}

/** Shape returned by getPatientAppointmentsWithTeethAction */
export interface AppointmentTooth {
  id: string;
  /** Universal Numbering System tooth number (1–32) */
  toothNumber: number;
  /** Machine-readable procedure key (e.g. "procedureRootCanal") */
  procedureKey: string;
  /** Arabic display label */
  procedure: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  appointmentStatus: AppointmentStatus;
}

type AppointmentWithPatientName = Prisma.appointmentsGetPayload<{
  include: {
    patients: {
      select: { fullName: true };
    };
  };
}>;

/**
 * Helper to get the current user's staff ID (if they are a doctor).
 */
async function getStaffId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const staff = await prisma.staff.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return staff?.id || null;
}

// Helper to map Prisma Appointment to UI Appointment Type
function mapPrismaToUIAppointment(
  dbApt: AppointmentWithPatientName,
): Appointment {
  // Translate stored procedure key → Arabic label; fall back to raw value for old records
  const procedureLabel =
    PROCEDURE_BY_KEY[dbApt.type ?? ""]?.labelAr || dbApt.type || "";

  // Parse tooth number stored in the 'reason' column
  const rawReason = (dbApt as Record<string, unknown>).reason as
    | string
    | null
    | undefined;
  const toothNumber = rawReason
    ? parseInt(rawReason, 10) || undefined
    : undefined;

  return {
    id: dbApt.id,
    patientId: dbApt.patientId,
    patientName: dbApt.patients.fullName,
    time: dbApt.startTime, // In our DB it's a string like "10:00 ص" or HH:mm
    durationMinutes: 30, // Default if not in DB
    procedure: procedureLabel,
    toothNumber,
    status: dbApt.status as AppointmentStatus,
  };
}

export async function getAppointmentsByDateAction(
  date: Date,
): Promise<Appointment[]> {
  try {
    const { clinicId, branchId, role } = await getAuthContext();
    if (!clinicId) return [];

    // Create date range for the day using local timezone consistently
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const where: any = {
      clinicId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    // Filter by branch if user has a branch selected AND is not ADMIN
    if (role !== "ADMIN" && branchId) {
      where.branchId = branchId;
    }

    const dbAppointments = await prisma.appointments.findMany({
      where,
      include: {
        patients: {
          select: { fullName: true },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return dbAppointments.map((apt) =>
      mapPrismaToUIAppointment({
        ...apt,
        patients: apt.patients!,
      })
    );
  } catch (error) {
    console.error("Error in getAppointmentsByDateAction:", error);
    return [];
  }
}

export async function getAppointmentStatsAction(
  monthDate: Date,
  selectedDate: Date
): Promise<{ monthlyTotal: number; todayTotal: number }> {
  try {
    const { clinicId, branchId, role } = await getAuthContext();
    if (!clinicId) return { monthlyTotal: 0, todayTotal: 0 };

    // Use local timezone consistently
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);

    const where: any = { clinicId };
    if (role !== "ADMIN" && branchId) {
      where.branchId = branchId;
    }

    const [monthlyTotal, todayTotal] = await Promise.all([
      prisma.appointments.count({
        where: {
          ...where,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.appointments.count({
        where: {
          ...where,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    return { monthlyTotal, todayTotal };
  } catch (error) {
    console.error("Error in getAppointmentStatsAction:", error);
    return { monthlyTotal: 0, todayTotal: 0 };
  }
}


export async function createAppointmentActionDB(payload: {
  patientId: string;
  date: Date;
  startTime: string;
  type: string;
  notes?: string;
}): Promise<Appointment> {
  // Server-side re-validation
  const validation = createAppointmentSchema.safeParse(payload);
  if (!validation.success) {
    throw new Error(`Invalid appointment data: ${validation.error.flatten().formErrors.join(", ")}`);
  }

  const { clinicId, branchId } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createAppointment", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const staffId = await getStaffId();

  // Verify patient belongs to this clinic
  const patient = await prisma.patients.findUnique({
    where: { id: payload.patientId, clinicId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found or access denied");
  }

  const dbApt = await prisma.appointments.create({
    data: {
      clinicId,
      branchId: branchId ?? null,
      patientId: payload.patientId,
      staffId: staffId,
      date: payload.date,
      startTime: payload.startTime,
      type: payload.type,
      notes: payload.notes,
      status: "SCHEDULED",
    } as unknown as Prisma.appointmentsUncheckedCreateInput,
    include: {
      patients: {
        select: { fullName: true },
      },
    },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");

  // Audit log
  await auditCreate("appointment", dbApt.id, {
    patientId: payload.patientId,
    date: payload.date.toISOString(),
    startTime: payload.startTime,
    type: payload.type,
  });

  return mapPrismaToUIAppointment(dbApt as AppointmentWithPatientName);
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  // Server-side re-validation
  const validation = statusUpdateSchema.safeParse({ id, status });
  if (!validation.success) {
    throw new Error(`Invalid status update data: ${validation.error.flatten().formErrors.join(", ")}`);
  }

  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  // Check rate limit (50 updates per minute)
  const rateLimit = await checkRateLimit("updateAppointment", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Verify ownership
  const where: any = { id, clinicId };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.appointments.findFirst({
    where,
  });
  if (!existing) throw new Error("Unauthorized or not found");

  const normalizedStatus: PrismaAppointmentStatus =
    status === "IN_PROGRESS"
      ? "CONFIRMED"
      : (status as PrismaAppointmentStatus);

  const dbApt = await prisma.appointments.update({
    where: { id },
    data: { status: normalizedStatus },
    include: {
      patients: {
        select: { fullName: true },
      },
    },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/appointments/queue");
  revalidatePath("/appointments/queue");

  // Audit log
  await auditUpdate("appointment", id, {
    before: { status: existing.status },
    after: { status },
  });

  return mapPrismaToUIAppointment({
    ...dbApt,
    patients: dbApt.patients!,
  });
}

export async function deleteAppointmentAction(id: string): Promise<void> {
  // Server-side re-validation
  const validation = appointmentIdSchema.safeParse({ id });
  if (!validation.success) {
    throw new Error(`Invalid appointment ID: ${validation.error.flatten().formErrors.join(", ")}`);
  }

  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  // Check rate limit (10 deletes per minute)
  const rateLimit = await checkRateLimit("deleteAppointment", RATE_LIMITS.MUTATION_DELETE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const where: any = { id, clinicId };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.appointments.findFirst({
    where,
  });
  if (!existing) throw new Error("Unauthorized or not found");

  await prisma.appointments.delete({ where: { id } });

  // Audit log
  await auditDelete("appointment", id, {
    patientId: existing.patientId,
    date: existing.date.toISOString(),
    status: existing.status,
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/appointments/queue");
  revalidatePath("/appointments/queue");
}

/** Load all active appointments for a patient with tooth info */
export async function getPatientAppointmentsWithTeethAction(
  patientId: string,
): Promise<AppointmentTooth[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const dbApts = await prisma.appointments.findMany({
      where: {
        clinicId,
        patientId,
        reason: { not: null },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { date: "desc" },
    });

    const seen = new Set<number>();

    return dbApts.reduce<AppointmentTooth[]>((acc, apt) => {
      const rawReason = (apt as Record<string, unknown>).reason as string | null;
      if (!rawReason) return acc;

      const toothNumber = parseInt(rawReason, 10);
      if (isNaN(toothNumber) || toothNumber < 1 || toothNumber > 32) return acc;
      if (seen.has(toothNumber)) return acc;
      seen.add(toothNumber);

      const procedureKey = apt.type ?? "";
      acc.push({
        id: apt.id,
        toothNumber,
        procedureKey,
        procedure: PROCEDURE_BY_KEY[procedureKey]?.labelAr || apt.type || "",
        date: apt.date instanceof Date ? apt.date.toISOString().slice(0, 10) : String(apt.date).slice(0, 10),
        appointmentStatus: apt.status as AppointmentStatus,
      });
      return acc;
    }, []);
  } catch (err) {
    console.warn("[getPatientAppointmentsWithTeethAction] failed:", err);
    return [];
  }
}
