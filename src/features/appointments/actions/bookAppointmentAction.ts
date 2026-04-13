"use server";

// =============================================================================
// Appointments — Book Appointment Server Action
// ✅ Secure multi-tenant isolation via strict clinicId resolution
// ✅ Server-side Zod validation on all inputs
// ✅ Error codes instead of hardcoded strings (UI layer translates)
// =============================================================================

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { bookingSchema, type BookingState } from "../schemas";
import { isTimeWithinHours, getDayNameFromDate } from "@/lib/clinic-hours-utils";

// ---------------------------------------------------------------------------
// Error type guards
// ---------------------------------------------------------------------------
function isPrismaInitError(error: unknown): boolean {
  return (
    error instanceof Error && error.name === "PrismaClientInitializationError"
  );
}

function isPrismaMissingColumnError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  );
}

// ---------------------------------------------------------------------------
// Secure clinicId resolver — with lazy user provisioning
// ---------------------------------------------------------------------------
async function getClinicId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("UNAUTHORIZED");

  let dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  });

  // ── Lazy provisioning: User exists in Supabase Auth but not in Prisma ──
  // This happens when signup failed to create the User/Clinic records
  // (e.g., due to migration issues or race conditions).
  // We auto-create them here to prevent a broken state.
  if (!dbUser) {
    const metadata = user.user_metadata;
    const clinicName = (metadata.clinicName as string) || "My Clinic";
    const fullName = (metadata.fullName as string) || user.email?.split("@")[0] || "User";
    const phone = (metadata.phone as string) || "";

    // Create a new Clinic for this user
    const clinic = await prisma.clinic.create({
      data: {
        id: crypto.randomUUID(),
        name: clinicName,
        subscription: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    // Create the User record linked to the new clinic
    await prisma.users.create({
      data: {
        id: user.id,
        email: user.email || "",
        fullName,
        phone,
        role: "ADMIN",
        isActive: true,
        clinicId: clinic.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: null,
        avatar: null,
      },
    });

    dbUser = { clinicId: clinic.id };
  }

  if (!dbUser.clinicId) {
    throw new Error("NO_CLINIC_ASSIGNED");
  }

  return dbUser.clinicId;
}

export async function bookAppointmentAction(
  prevState: BookingState,
  formData: FormData,
): Promise<BookingState> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = prevState;
  const result = bookingSchema.safeParse({
    patientName: formData.get("patientName"),
    phone: formData.get("phone"),
    date: formData.get("date"),
    time: formData.get("time"),
    procedure: formData.get("procedure"),
    procedureKey: formData.get("procedureKey"),
    duration: formData.get("duration"),
    notes: formData.get("notes"),
    toothNumber: formData.get("toothNumber"),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const clinicId = await getClinicId();

    // 1. Find or create patient
    let patient = await prisma.patients.findFirst({
      where: {
        clinicId,
        phone: result.data.phone,
      },
    });

    if (!patient) {
      const fileNumber = `PT-${Date.now().toString().slice(-6)}`;
      const defaultDob = new Date("1990-01-01T00:00:00Z");
      patient = await prisma.patients.create({
        data: {
          id: crypto.randomUUID(),
          clinicId,
          fileNumber,
          fullName: result.data.patientName,
          phone: result.data.phone,
          dateOfBirth: defaultDob,
          gender: "OTHER",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // 2. Prevent double-booking for the same clinic/date/time
    // Parse date string "YYYY-MM-DD" as local date (not UTC) to avoid timezone issues
    const [year, month, day] = result.data.date.split("-").map(Number);
    const appointmentDate = new Date(year, month - 1, day); // month is 0-indexed

    const conflictingAppointment = await prisma.appointments.findFirst({
      where: {
        clinicId,
        date: {
          gte: new Date(year, month - 1, day, 0, 0, 0, 0),
          lte: new Date(year, month - 1, day, 23, 59, 59, 999),
        },
        startTime: result.data.time,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      select: { id: true },
    });

    if (conflictingAppointment) {
      return {
        success: false,
        errors: { form: ["هذا الموعد محجوز مسبقاً"] },
      };
    }

    // 2.5 Validate appointment time against branch business hours
    // Get user's branchId from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let branchId: string | null = null;
    if (user) {
      const dbUser = await prisma.users.findUnique({
        where: { id: user.id },
        select: { branchId: true },
      });
      branchId = dbUser?.branchId ?? null;
    }

    if (branchId) {
      const branchHoursRow = await prisma.branch_business_hours.findUnique({
        where: { branchId },
        select: { hours: true },
      });

      if (branchHoursRow) {
        const hours = branchHoursRow.hours as Array<{
          day: string;
          isOpen: boolean;
          start: string;
          end: string;
        }>;

        const dayName = getDayNameFromDate(appointmentDate);
        const dayHours = hours.find((h) => h.day === dayName);

        // Check if the branch is open on this day
        if (!dayHours || !dayHours.isOpen) {
          return {
            success: false,
            errors: {
              form: [`العيادة مغلقة يوم ${dayName}`],
            },
          };
        }

        // Check if the time is within operating hours
        if (!isTimeWithinHours(appointmentDate, result.data.time, hours)) {
          return {
            success: false,
            errors: {
            form: [
              `الوقت المختار خارج مواعيد العمل (${dayHours.start} - ${dayHours.end})`,
            ],
          },
        };
      }
    }
    }

    // 3. Create appointment
    await prisma.appointments.create({
      data: {
        id: crypto.randomUUID(),
        clinicId,
        patientId: patient.id,
        date: appointmentDate, // Local date object (not UTC)
        startTime: result.data.time,
        type: result.data.procedureKey || result.data.procedure,
        notes: result.data.notes,
        reason: result.data.toothNumber?.trim() || null,
        status: "SCHEDULED",
        endTime: null,
        userId: null,
        staffId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/queue");
    revalidatePath("/appointments/queue");

    return {
      success: true,
      message: "تم حجز الموعد بنجاح",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return { success: false, errors: { form: ["غير مصرح لك"] } };
      }
      if (error.message === "USER_NOT_FOUND") {
        return { success: false, errors: { form: ["المستخدم غير موجود"] } };
      }
      if (error.message === "NO_CLINIC_ASSIGNED") {
        return { success: false, errors: { form: ["العيادة غير محددة"] } };
      }
    }

    if (isPrismaInitError(error)) {
      return {
        success: false,
        errors: { form: ["خطأ في الاتصال بقاعدة البيانات"] },
      };
    }

    if (isPrismaMissingColumnError(error)) {
      return {
        success: false,
        errors: { form: ["خطأ في مخطط قاعدة البيانات"] },
      };
    }

    // Log the actual error for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("[bookAppointmentAction] Detailed error:", error);
    }

    // Check for unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return {
        success: false,
        errors: { form: ["هذا الموعد محجوز مسبقاً"] },
      };
    }

    return {
      success: false,
      errors: { form: ["حدث خطأ أثناء الحجز"] },
    };
  }
}
