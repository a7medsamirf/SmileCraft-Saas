"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { 
  DentalService, 
  ServiceCategory, 
  ProcedureType, 
  BusinessDay, 
  ClinicInfo, 
  NotificationSettings 
} from "./types";

// Validation schemas
const clinicSettingsSchema = z.object({
  name: z.string().min(2, "اسم العيادة مطلوب"),
  phone: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  address: z.string().optional(),
  slotDuration: z.number().min(5).max(120),
});

/**
 * Helper to get the current user's clinic ID, branch ID and role.
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
  } catch (err) {
    console.warn("[getAuthContext] Unexpected error:", err);
    return { clinicId: null, branchId: null, role: null };
  }
}

// =============================================================================
// CLINIC INFO
// =============================================================================

/**
 * Fetches general clinic settings.
 */
export async function getClinicInfoAction(): Promise<ClinicInfo | null> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return null;

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) return null;

    return {
      name: clinic.name,
      phone: clinic.phone || "",
      email: clinic.email || "",
      address: clinic.address || "",
      slotDuration: clinic.slotDuration || 30,
      logoUrl: clinic.logoUrl || undefined,
      logoUrlDark: clinic.logoUrlDark || undefined,
      faviconUrl: clinic.faviconUrl || undefined,
    };
  } catch (error) {
    console.error("Failed to fetch clinic settings:", error);
    return null;
  }
}

/**
 * Updates general clinic settings (internal use).
 */
export async function updateClinicInfoAction(info: ClinicInfo) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    
    if (role !== "ADMIN") {
      throw new Error("فقط مدير النظام يمكنه تعديل إعدادات العيادة");
    }

    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        name: info.name,
        phone: info.phone,
        email: info.email,
        address: info.address,
        slotDuration: info.slotDuration,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update clinic info:", error);
    throw error;
  }
}

/**
 * Updates general clinic settings via schema validation.
 */
export async function updateClinicSettingsAction(data: z.infer<typeof clinicSettingsSchema>) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    
    if (role !== "ADMIN") {
      throw new Error("فقط مدير النظام يمكنه تعديل إعدادات العيادة");
    }

    const rateLimit = await checkRateLimit("updateSettings", RATE_LIMITS.MUTATION_UPDATE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const validated = clinicSettingsSchema.parse(data);

    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email,
        address: validated.address,
        slotDuration: validated.slotDuration,
      },
    });

    await auditUpdate("clinic_settings", clinicId, {
      changedFields: Object.keys(validated),
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update clinic settings:", error);
    return { success: false, error: error instanceof Error ? error.message : "فشل في تحديث الإعدادات" };
  }
}

/**
 * Updates clinic branding (logos and favicon).
 */
export async function updateClinicBrandingAction(urls: {
  logoUrl?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
}) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    
    if (role !== "ADMIN") {
      throw new Error("فقط مدير النظام يمكنه تعديل الهوية البصرية");
    }

    await prisma.clinic.update({
      where: { id: clinicId },
      data: urls,
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update clinic branding:", error);
    return { success: false, error: "فشل في تحديث الهوية البصرية" };
  }
}

// =============================================================================
// SERVICES
// =============================================================================

export async function getServicesAction(): Promise<DentalService[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const services = await prisma.services.findMany({
      where: { clinicId },
      orderBy: { name: "asc" },
    });

    return services.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category as ServiceCategory,
      price: Number(s.price),
      duration: s.duration ?? 30,
      procedureType: (s.procedureType ?? "OTHER") as ProcedureType,
    }));
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}

export async function createServiceAction(data: Omit<DentalService, "id">) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    const service = await prisma.services.create({
      data: {
        id: crypto.randomUUID(),
        clinicId,
        code: `SVC-${Date.now()}`,
        name: data.name,
        category: data.category,
        price: data.price,
        duration: data.duration,
        procedureType: data.procedureType,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/settings");
    
    await auditCreate("service", service.id, {
      name: service.name,
      price: service.price,
    });

    return { success: true, service };
  } catch (error) {
    console.error("Failed to create service:", error);
    throw error;
  }
}

export async function updateServiceAction(id: string, data: Partial<DentalService>) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    const patch: Prisma.servicesUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.category !== undefined) patch.category = data.category;
    if (data.price !== undefined) patch.price = data.price;
    if (data.duration !== undefined) patch.duration = data.duration;
    if (data.procedureType !== undefined) patch.procedureType = data.procedureType;

    const service = await prisma.services.update({
      where: { id, clinicId },
      data: patch,
    });

    revalidatePath("/settings");

    await auditUpdate("service", id, {
      changedFields: Object.keys(patch),
    });

    return { success: true, service };
  } catch (error) {
    console.error("Failed to update service:", error);
    throw error;
  }
}

export async function deleteServiceAction(id: string) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    await prisma.services.delete({
      where: { id, clinicId },
    });

    revalidatePath("/settings");

    await auditDelete("service", id, {});

    return { success: true };
  } catch (error) {
    console.error("Failed to delete service:", error);
    throw error;
  }
}

// =============================================================================
// BUSINESS HOURS
// =============================================================================

export async function getBusinessHoursAction(): Promise<BusinessDay[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const branch = await prisma.clinic_branches.findFirst({
      where: { clinicId },
      select: { id: true },
    });

    if (!branch) return defaultBusinessHours();

    const businessHours = await prisma.branch_business_hours.findUnique({
      where: { branchId: branch.id },
    });

    if (businessHours?.hours && Array.isArray(businessHours.hours)) {
      return businessHours.hours as unknown as BusinessDay[];
    }

    return defaultBusinessHours();
  } catch (error) {
    console.error("Failed to fetch business hours:", error);
    return defaultBusinessHours();
  }
}

export async function getBusinessHoursForBookingAction(): Promise<{
  hours: BusinessDay[];
  slotDuration: number;
}> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return { hours: [], slotDuration: 30 };

    const [clinic, branch] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { slotDuration: true },
      }),
      prisma.clinic_branches.findFirst({
        where: { clinicId },
        select: { id: true },
      }),
    ]);

    const slotDuration = clinic?.slotDuration ?? 30;

    if (!branch) {
      return { hours: defaultBusinessHours(), slotDuration };
    }

    const businessHours = await prisma.branch_business_hours.findUnique({
      where: { branchId: branch.id },
    });

    if (businessHours?.hours && Array.isArray(businessHours.hours)) {
      return {
        hours: businessHours.hours as unknown as BusinessDay[],
        slotDuration,
      };
    }

    return { hours: defaultBusinessHours(), slotDuration };
  } catch (error) {
    console.error("Failed to fetch business hours for booking:", error);
    return { hours: defaultBusinessHours(), slotDuration: 30 };
  }
}

function defaultBusinessHours(): BusinessDay[] {
  return [
    { day: "saturday", isOpen: true, start: "09:00", end: "17:00" },
    { day: "sunday", isOpen: true, start: "09:00", end: "17:00" },
    { day: "monday", isOpen: true, start: "09:00", end: "17:00" },
    { day: "tuesday", isOpen: true, start: "09:00", end: "17:00" },
    { day: "wednesday", isOpen: true, start: "09:00", end: "17:00" },
    { day: "thursday", isOpen: true, start: "09:00", end: "14:00" },
    { day: "friday", isOpen: false, start: "09:00", end: "17:00" },
  ];
}

export async function saveBusinessHoursAction(hours: BusinessDay[]) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    const branch = await prisma.clinic_branches.findFirst({
      where: { clinicId },
      select: { id: true },
    });

    if (!branch) throw new Error("No branch found");

    await prisma.branch_business_hours.upsert({
      where: { branchId: branch.id },
      update: { hours: hours as any, updatedAt: new Date() },
      create: { branchId: branch.id, hours: hours as any, updatedAt: new Date() },
    });

    revalidatePath("/settings");
    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Failed to save business hours:", error);
    throw error;
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export async function getNotificationSettingsAction(): Promise<NotificationSettings> {
  const defaultSettings: NotificationSettings = {
    smsEnabled: false,
    emailEnabled: false,
    whatsappEnabled: false,
    reminderTiming: 24,
  };

  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return defaultSettings;

    const settings = await prisma.clinic_notification_settings.findUnique({
      where: { clinicId },
    });

    if (!settings) return defaultSettings;

    return {
      smsEnabled: settings.smsEnabled,
      emailEnabled: settings.emailEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      reminderTiming: settings.reminderTiming,
    };
  } catch (error) {
    console.error("Failed to fetch notification settings:", error);
    return defaultSettings;
  }
}

export async function saveNotificationSettingsAction(settings: NotificationSettings) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    await prisma.clinic_notification_settings.upsert({
      where: { clinicId },
      create: {
        clinicId,
        ...settings,
      },
      update: settings,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save notification settings:", error);
    throw error;
  }
}

// =============================================================================
// PERMISSIONS
// =============================================================================

export async function getStaffPermissionsAction(staffId: string) {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return null;

    const staff = await prisma.staff.findUnique({
      where: { id: staffId, clinicId },
      select: { permissions: true },
    });

    return staff?.permissions || {};
  } catch (error) {
    console.error("Failed to fetch staff permissions:", error);
    return null;
  }
}

export async function getAllStaffPermissionsAction() {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const staff = await prisma.staff.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, fullName: true, role: true, permissions: true },
      orderBy: { fullName: "asc" },
    });

    return staff.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      role: s.role,
      permissions: (s.permissions as Record<string, unknown>) || {},
    }));
  } catch (error) {
    console.error("Failed to fetch all staff permissions:", error);
    return [];
  }
}

export async function updateStaffPermissionsAction(staffId: string, permissions: any) {
  try {
    const { clinicId, role } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");
    if (role !== "ADMIN") throw new Error("Unauthorized");

    await prisma.staff.update({
      where: { id: staffId, clinicId },
      data: { permissions },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update staff permissions:", error);
    return { success: false, error: "فشل في تحديث الصلاحيات" };
  }
}

// =============================================================================
// EXPORT / BACKUP
// =============================================================================

export async function exportPatientsAction() {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");

    const patients = await prisma.patients.findMany({
      where: { clinicId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        phone: true,
        altPhone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = ["ID", "Full Name", "Phone", "Alt Phone", "Email", "Date of Birth", "Gender", "City", "Address", "Created At"];
    const rows = patients.map(p => [
      p.id,
      p.fullName,
      p.phone,
      p.altPhone || "",
      p.email || "",
      p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "",
      p.gender || "",
      p.city || "",
      p.address || "",
      new Date(p.createdAt).toLocaleDateString(),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const base64 = Buffer.from(csv).toString("base64");

    return {
      success: true,
      file: `data:text/csv;base64,${base64}`,
      fileName: `patients-export-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function exportSystemBackupAction() {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) throw new Error("Unauthorized");

    // Mock backup logic
    return {
      success: true,
      file: "data:application/json;base64,e30=",
      fileName: `system-backup-${new Date().toISOString().slice(0, 10)}.json`,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
