"use server";

// =============================================================================
// SmileCraft CMS — Settings Server Actions
// ✅ Migrated to Prisma ORM with branch isolation
// ✅ Business hours are now per-branch via branch_business_hours
// ✅ Graceful fallback on DB errors
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  DentalService,
  BusinessDay,
  ClinicInfo,
  NotificationSettings,
} from "./types";

// ---------------------------------------------------------------------------
// Auth helper — returns { clinicId, branchId } or null (never throws)
// ---------------------------------------------------------------------------
async function getClinicAndBranchId(): Promise<{ clinicId: string | null; branchId: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { clinicId: null, branchId: null };

    const publicUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true },
    });

    if (publicUser) {
      return { clinicId: publicUser.clinicId, branchId: publicUser.branchId };
    }

    // Bootstrapping support: if the app DB already has a clinic but no public user row,
    // link the current auth user to the first clinic and persist the public user record.
    const firstClinic = await prisma.clinic.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    let clinicId: string;
    if (firstClinic) {
      clinicId = firstClinic.id;
    } else {
      clinicId = crypto.randomUUID();
      await prisma.clinic.create({
        data: {
          id: clinicId,
          name: "SmileCraft Dental Clinic",
          updatedAt: new Date(),
        },
      });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const fullName = (
      meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Admin"
    ).trim();

    await prisma.users.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? `${user.id}@smilecraft.local`,
        fullName,
        clinicId,
        role: "ADMIN",
        isActive: true,
        updatedAt: new Date(),
      },
      update: {
        updatedAt: new Date(),
      },
    });

    return { clinicId, branchId: null };
  } catch (err) {
    console.warn("[getClinicAndBranchId] Unexpected error:", err);
    return { clinicId: null, branchId: null };
  }
}

// ===========================================================================
// SERVICES ACTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// getServicesAction
// ---------------------------------------------------------------------------
export async function getServicesAction(): Promise<DentalService[]> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    const services = await prisma.services.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: "asc" },
    });

    return services.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as DentalService["category"],
      price: Number(row.price),
      duration: row.duration ?? 30,
      procedureType: (row.description ?? "OTHER") as DentalService["procedureType"],
    }));
  } catch (err) {
    console.error("[getServicesAction] Unexpected error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// createServiceAction
// ---------------------------------------------------------------------------
export async function createServiceAction(
  payload: Omit<DentalService, "id">,
): Promise<DentalService> {
  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  const code = `SVC-${Date.now()}`;

  const service = await prisma.services.create({
    data: {
      id: crypto.randomUUID(),
      clinicId,
      name: payload.name,
      code,
      category: payload.category,
      price: payload.price,
      duration: payload.duration,
      description: payload.procedureType,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/settings");

  return {
    id: service.id,
    name: service.name,
    category: service.category as DentalService["category"],
    price: Number(service.price),
    duration: service.duration ?? 30,
    procedureType: (service.description ?? "OTHER") as DentalService["procedureType"],
  };
}

// ---------------------------------------------------------------------------
// updateServiceAction
// ---------------------------------------------------------------------------
export async function updateServiceAction(
  id: string,
  payload: Partial<DentalService>,
): Promise<void> {
  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.price !== undefined) updateData.price = payload.price;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.duration !== undefined) updateData.duration = payload.duration;
  if (payload.procedureType !== undefined) updateData.description = payload.procedureType;

  await prisma.services.update({
    where: { id, clinicId },
    data: updateData,
  });

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// deleteServiceAction — soft delete (sets isActive = false)
// ---------------------------------------------------------------------------
export async function deleteServiceAction(id: string): Promise<void> {
  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized");

  await prisma.services.update({
    where: { id, clinicId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/settings");
}

// ===========================================================================
// BUSINESS HOURS ACTIONS (Per-Branch)
// ===========================================================================

// ---------------------------------------------------------------------------
// getBusinessHoursAction
// ---------------------------------------------------------------------------
export async function getBusinessHoursAction(): Promise<BusinessDay[]> {
  try {
    const { clinicId, branchId } = await getClinicAndBranchId();
    if (!clinicId || !branchId) return [];

    const branchHours = await prisma.branch_business_hours.findUnique({
      where: { branchId },
      select: { hours: true },
    });

    if (!branchHours) return [];

    const hours = branchHours.hours as unknown;
    return Array.isArray(hours) ? (hours as BusinessDay[]) : [];
  } catch (err) {
    console.error("[getBusinessHoursAction] Unexpected error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getBusinessHoursForBookingAction — returns hours optimized for booking UI
// ---------------------------------------------------------------------------
export async function getBusinessHoursForBookingAction(): Promise<{
  hours: BusinessDay[];
  slotDuration: number;
}> {
  try {
    const { clinicId, branchId } = await getClinicAndBranchId();
    if (!clinicId) {
      return { hours: [], slotDuration: 30 };
    }

    // Fetch branch business hours if branchId exists
    let hours: BusinessDay[] = [];
    if (branchId) {
      const branchHours = await prisma.branch_business_hours.findUnique({
        where: { branchId },
        select: { hours: true },
      });

      if (branchHours) {
        const rawHours = branchHours.hours as unknown;
        hours = Array.isArray(rawHours) ? (rawHours as BusinessDay[]) : [];
      }
    }

    // Fetch clinic slot duration
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { slotDuration: true },
    });

    const slotDuration = clinic?.slotDuration ?? 30;

    return { hours, slotDuration };
  } catch (err) {
    console.error("[getBusinessHoursForBookingAction] Unexpected error:", err);
    return { hours: [], slotDuration: 30 };
  }
}

// ---------------------------------------------------------------------------
// saveBusinessHoursAction — upsert on unique(branchId)
// ---------------------------------------------------------------------------
export async function saveBusinessHoursAction(
  hours: BusinessDay[],
): Promise<void> {
  const { clinicId, branchId } = await getClinicAndBranchId();
  if (!clinicId || !branchId) throw new Error("Unauthorized: clinic or branch not found");

  await prisma.branch_business_hours.upsert({
    where: { branchId },
    create: {
      branchId,
      hours: hours as unknown as any,
      updatedAt: new Date(),
    },
    update: {
      hours: hours as unknown as any,
    },
  });

  revalidatePath("/dashboard/settings");
}

// ===========================================================================
// CLINIC INFO ACTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// getClinicInfoAction
// ---------------------------------------------------------------------------
export async function getClinicInfoAction(): Promise<ClinicInfo | null> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return null;

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        logoUrl: true,
        logoUrlDark: true,
        faviconUrl: true,
        slotDuration: true,
      },
    });

    if (!clinic) return null;

    return {
      name: clinic.name,
      address: clinic.address ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      logoUrl: clinic.logoUrl ?? undefined,
      logoUrlDark: clinic.logoUrlDark ?? undefined,
      faviconUrl: clinic.faviconUrl ?? undefined,
      slotDuration: clinic.slotDuration ?? 30,
    };
  } catch (err) {
    console.error("[getClinicInfoAction] Unexpected error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// updateClinicInfoAction
// ---------------------------------------------------------------------------
export async function updateClinicInfoAction(
  payload: Partial<ClinicInfo>,
): Promise<void> {
  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.address !== undefined) updateData.address = payload.address;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.logoUrl !== undefined) updateData.logoUrl = payload.logoUrl;
  if (payload.logoUrlDark !== undefined) updateData.logoUrlDark = payload.logoUrlDark;
  if (payload.faviconUrl !== undefined) updateData.faviconUrl = payload.faviconUrl;
  if (payload.slotDuration !== undefined) updateData.slotDuration = payload.slotDuration;

  await prisma.clinic.update({
    where: { id: clinicId },
    data: updateData,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
}

// ===========================================================================
// NOTIFICATION SETTINGS ACTIONS
// ===========================================================================

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  smsEnabled: true,
  whatsappEnabled: true,
  emailEnabled: false,
  reminderTiming: 24,
};

// ---------------------------------------------------------------------------
// getNotificationSettingsAction
// ---------------------------------------------------------------------------
export async function getNotificationSettingsAction(): Promise<NotificationSettings> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return DEFAULT_NOTIFICATIONS;

    const settings = await prisma.clinic_notification_settings.findUnique({
      where: { clinicId },
      select: {
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
        reminderTiming: true,
      },
    });

    if (!settings) return DEFAULT_NOTIFICATIONS;

    return {
      smsEnabled: settings.smsEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      emailEnabled: settings.emailEnabled,
      reminderTiming: settings.reminderTiming,
    };
  } catch (err) {
    console.error("[getNotificationSettingsAction] Unexpected error:", err);
    return DEFAULT_NOTIFICATIONS;
  }
}

// ---------------------------------------------------------------------------
// saveNotificationSettingsAction — upsert on unique(clinicId)
// ---------------------------------------------------------------------------
export async function saveNotificationSettingsAction(
  settings: NotificationSettings,
): Promise<void> {
  const { clinicId } = await getClinicAndBranchId();
  if (!clinicId) throw new Error("Unauthorized");

  await prisma.clinic_notification_settings.upsert({
    where: { clinicId },
    create: {
      clinicId,
      smsEnabled: settings.smsEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      emailEnabled: settings.emailEnabled,
      reminderTiming: settings.reminderTiming,
    },
    update: {
      smsEnabled: settings.smsEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      emailEnabled: settings.emailEnabled,
      reminderTiming: settings.reminderTiming,
    },
  });

  revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// getStaffPermissionsAction — get permissions for all staff
// ---------------------------------------------------------------------------
export async function getStaffPermissionsAction(): Promise<
  Array<{ id: string; fullName: string; role: string; permissions: Record<string, unknown> }>
> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) return [];

    const staff = await prisma.staff.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, fullName: true, role: true, permissions: true },
      orderBy: { fullName: "asc" },
    });

    return staff.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      role: row.role,
      permissions: (row.permissions as Record<string, unknown>) ?? {},
    }));
  } catch (err) {
    console.warn("[getStaffPermissionsAction]", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// updateStaffPermissionsAction — update permissions for a staff member
// ---------------------------------------------------------------------------
export async function updateStaffPermissionsAction(
  staffId: string,
  permissions: Record<string, boolean>,
): Promise<void> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) throw new Error("Unauthorized");

    // Verify staff belongs to this clinic
    const staff = await prisma.staff.findUnique({
      where: { id: staffId, clinicId },
      select: { id: true },
    });

    if (!staff) {
      throw new Error("Staff member not found or unauthorized");
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: {
        permissions: permissions as unknown as any,
      },
    });

    revalidatePath("/dashboard/settings");
  } catch (err) {
    console.error("[updateStaffPermissionsAction]", err);
    throw err;
  }
}

// =============================================================================
// EXPORT ACTIONS — Export patients as Excel and full system backup as JSON
// =============================================================================

export async function exportPatientsAction(): Promise<{
  success: boolean;
  file?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) {
      return { success: false, error: "Unauthorized" };
    }

    const patients = await prisma.patients.findMany({
      where: { clinicId, isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const csvHeaders = [
      "File Number",
      "Full Name",
      "Phone",
      "Alt Phone",
      "Email",
      "Date of Birth",
      "Gender",
      "Blood Group",
      "City",
      "Address",
      "Job",
      "Notes",
      "Allergies",
      "National ID",
      "Emergency Name",
      "Emergency Relationship",
      "Emergency Phone",
      "Current Medications",
      "Created At",
      "Updated At",
    ];

    const csvRows = patients?.map((p) => [
      p.fileNumber,
      p.fullName,
      p.phone,
      p.altPhone || "",
      p.email || "",
      p.dateOfBirth ? p.dateOfBirth.toISOString().split("T")[0] : "",
      p.gender || "",
      p.bloodGroup || "",
      p.city || "",
      p.address || "",
      p.job || "",
      p.notes || "",
      p.allergies || "",
      p.nationalId || "",
      p.emergencyName || "",
      p.emergencyRelationship || "",
      p.emergencyPhone || "",
      p.currentMedications || "",
      p.createdAt.toISOString(),
      p.updatedAt.toISOString(),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...(csvRows?.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ) || []),
    ].join("\n");

    return {
      success: true,
      file: csvContent,
      fileName: `patients_export_${new Date().toISOString().split("T")[0]}.csv`,
    };
  } catch (err) {
    console.error("[exportPatientsAction]", err);
    return { success: false, error: "Export failed" };
  }
}

export async function exportSystemBackupAction(): Promise<{
  success: boolean;
  file?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const { clinicId } = await getClinicAndBranchId();
    if (!clinicId) {
      return { success: false, error: "Unauthorized" };
    }

    const [
      clinic,
      patients,
      staff,
      services,
      appointments,
      invoices,
      treatments,
      inventoryItems,
    ] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.patients.findMany({ where: { clinicId } }),
      prisma.staff.findMany({ where: { clinicId } }),
      prisma.services.findMany({ where: { clinicId } }),
      prisma.appointments.findMany({ where: { clinicId } }),
      prisma.invoices.findMany({ where: { patientId: { in: [] } } }),
      prisma.treatments.findMany({ where: { patientId: { in: [] } } }),
      prisma.inventory_items.findMany({ where: { clinicId } }),
    ]);

    // Now fetch invoices and treatments for the patients we just fetched
    const [invoicesData, treatmentsData] = await Promise.all([
      prisma.invoices.findMany({ where: { patientId: { in: patients.map((p: any) => p.id) } } }),
      prisma.treatments.findMany({ where: { patientId: { in: patients.map((p: any) => p.id) } } }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      clinicId,
      data: {
        clinic,
        patients,
        staff,
        services,
        appointments,
        invoices: invoicesData,
        treatments: treatmentsData,
        inventoryItems,
      },
    };

    return {
      success: true,
      file: JSON.stringify(backup, null, 2),
      fileName: `system_backup_${new Date().toISOString().split("T")[0]}.json`,
    };
  } catch (err) {
    console.error("[exportSystemBackupAction]", err);
    return { success: false, error: "Backup failed" };
  }
}

