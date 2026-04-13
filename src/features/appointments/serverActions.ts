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

/**
 * Auth helper — returns clinicId and branchId or null (never throws)
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
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    // Create date range for the day using local timezone consistently
    // Use the same approach as booking: new Date(year, month, day) for local time
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const dbAppointments = await prisma.appointments.findMany({
      where: {
        clinicId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return { monthlyTotal: 0, todayTotal: 0 };

    // Use local timezone consistently
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);

    const [monthlyTotal, todayTotal] = await Promise.all([
      prisma.appointments.count({
        where: {
          clinicId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.appointments.count({
        where: {
          clinicId,
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

  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");
  
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

  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  // Verify ownership
  const existing = await prisma.appointments.findFirst({
    where: { id, clinicId },
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

  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");
  
  const existing = await prisma.appointments.findFirst({
    where: { id, clinicId },
  });
  if (!existing) throw new Error("Unauthorized or not found");

  await prisma.appointments.delete({ where: { id } });
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/appointments/queue");
  revalidatePath("/appointments/queue");
}

// ---------------------------------------------------------------------------
// getPatientAppointmentsWithTeethAction
// Returns all active (non-cancelled, non-no-show) appointments for a patient
// that have a tooth number stored in the `reason` column.
// Results are deduplicated per tooth — only the LATEST appointment per tooth.
// Falls back to [] on any error (never throws).
// ---------------------------------------------------------------------------
export async function getPatientAppointmentsWithTeethAction(
  patientId: string,
): Promise<AppointmentTooth[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    const dbApts = await prisma.appointments.findMany({
      where: {
        clinicId,
        patientId,
        reason: { not: null },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { date: "desc" }, // newest first → dedup keeps the latest per tooth
    });

    // Deduplicate: one entry per tooth number (keep the latest)
    const seen = new Set<number>();

    return dbApts.reduce<AppointmentTooth[]>((acc, apt) => {
      const rawReason = (apt as Record<string, unknown>).reason as
        | string
        | null;
      if (!rawReason) return acc;

      const toothNumber = parseInt(rawReason, 10);
      if (isNaN(toothNumber) || toothNumber < 1 || toothNumber > 32) return acc;
      if (seen.has(toothNumber)) return acc; // older duplicate — skip
      seen.add(toothNumber);

      const procedureKey = apt.type ?? "";
      acc.push({
        id: apt.id,
        toothNumber,
        procedureKey,
        procedure: PROCEDURE_BY_KEY[procedureKey]?.labelAr || apt.type || "",
        date:
          apt.date instanceof Date
            ? apt.date.toISOString().slice(0, 10)
            : String(apt.date).slice(0, 10),
        appointmentStatus: apt.status as AppointmentStatus,
      });
      return acc;
    }, []);
  } catch (err) {
    console.warn("[getPatientAppointmentsWithTeethAction] failed:", err);
    return [];
  }
}
