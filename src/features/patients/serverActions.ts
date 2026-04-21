"use server";

// =============================================================================
// SmileCraft CMS — Patients Server Actions
// ✅ Migrated to Prisma ORM with branch isolation
// ✅ Auto-assign mechanism for orphaned records
// ✅ Graceful error handling
// ✅ Admin cross-branch access
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  Patient,
  PatientFilters,
  PaginatedPatients,
  Gender,
  BloodGroup,
  PatientStatus,
  UUID,
  ISODateString,
  ISODateTimeString,
  Allergy,
  VisitType,
} from "./types/index";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Auth helper — returns clinicId, branchId and role (never throws)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Auto-assign orphaned patients to default branch
// ---------------------------------------------------------------------------
async function autoAssignOrphanedPatients(clinicId: string, defaultBranchId: string): Promise<void> {
  const orphaned = await prisma.patients.findMany({
    where: { clinicId, branchId: null },
    select: { id: true },
  });

  if (orphaned.length > 0) {
    await prisma.patients.updateMany({
      where: { clinicId, branchId: null },
      data: { branchId: defaultBranchId },
    });

    console.log(`[AUTO-ASSIGN] ${orphaned.length} patients assigned to branch ${defaultBranchId}`);
  }
}

// ---------------------------------------------------------------------------
// Prisma row → UI Patient
// ---------------------------------------------------------------------------
function mapRowToPatient(row: any & { medical_histories?: any[] }): Patient {
  // Parse allergies: stored as comma-separated string in DB
  const rawAllergies =
    typeof row.allergies === "string" && row.allergies.trim()
      ? row.allergies
          .split(",")
          .map((a: string) => a.trim())
          .filter(Boolean)
      : [];

  const allergies: Allergy[] = rawAllergies.map((a: string) => ({
    allergen: a,
    reaction: "",
    severity: "MODERATE" as const,
  }));

  // Parse medical history rows from the joined table
  const historyRows = row.medical_histories ?? [];

  const conditions = historyRows.map((mh: any) => ({
    condition: String(mh.condition ?? ""),
    isActive: true,
    severity: typeof mh.severity === "string" ? mh.severity.toLowerCase() : "low",
    notes: typeof mh.notes === "string" ? mh.notes : undefined,
    diagnosedAt: undefined,
  }));

  // Compute age from dateOfBirth
  const dateOfBirth = row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().slice(0, 10) : undefined;
  const age = dateOfBirth
    ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / 31_557_600_000)
    : undefined;

  return {
    id: row.id as UUID,
    fullName: row.fullName ?? "",
    gender: (row.gender as Gender) ?? Gender.MALE,
    birthDate: (dateOfBirth ?? "") as ISODateString,
    age,
    photoUrl: typeof row.avatar === "string" ? row.avatar : undefined,

    contactInfo: {
      phone: row.phone ?? "",
      altPhone: typeof row.altPhone === "string" ? row.altPhone : undefined,
      email: typeof row.email === "string" ? row.email : undefined,
      address: typeof row.address === "string" ? row.address : undefined,
      city: typeof row.city === "string" ? row.city : undefined,
    },

    emergencyContact:
      typeof row.emergencyName === "string" && row.emergencyName.trim()
        ? {
            name: row.emergencyName,
            relationship: typeof row.emergencyRelationship === "string" ? row.emergencyRelationship : "",
            phone: typeof row.emergencyPhone === "string" ? row.emergencyPhone : "",
          }
        : undefined,

    medicalHistory: {
      conditions,
      allergies,
      currentMedications:
        typeof row.currentMedications === "string" && row.currentMedications.trim()
          ? row.currentMedications.split(",").map((m: string) => m.trim()).filter(Boolean)
          : [],
      previousDentalHistory: [],
      bloodGroup: (row.bloodGroup as BloodGroup) ?? BloodGroup.UNKNOWN,
      generalNotes: typeof row.notes === "string" ? row.notes : undefined,
    },

    xrayCount: 0,
    visits: [],

    status: row.isActive === true ? PatientStatus.ACTIVE : PatientStatus.INACTIVE,
    nationalId: typeof row.nationalId === "string" ? row.nationalId : undefined,

    createdAt: row.createdAt.toISOString() as ISODateTimeString,
    updatedAt: row.updatedAt.toISOString() as ISODateTimeString,
    lastVisit: undefined,
  };
}

// ===========================================================================
// PUBLIC ACTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// getPatientsAction
// ---------------------------------------------------------------------------
export async function getPatientsAction(
  filters: PatientFilters = {},
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedPatients> {
  try {
    const { clinicId, branchId, role } = await getAuthContext();

    // No clinic yet → return empty list
    if (!clinicId) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    // Auto-assign orphaned patients if branchId exists
    if (branchId) {
      await autoAssignOrphanedPatients(clinicId, branchId);
    }

    // Build where clause
    const where: any = {
      clinicId,
      deletedAt: null,
    };

    // Filter by branch if user has a branch selected AND is not ADMIN
    if (role !== "ADMIN" && branchId) {
      where.branchId = branchId;
    }

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.gender) {
      where.gender = filters.gender;
    }

    if (filters.status) {
      where.isActive = filters.status === PatientStatus.ACTIVE;
    }

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      prisma.patients.findMany({
        where,
        include: { medical_histories: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.patients.count({ where }),
    ]);

    const mappedPatients = patients.map(mapRowToPatient);

    return {
      data: mappedPatients,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error("[getPatientsAction] Unexpected error:", err);
    return { data: [], total: 0, page, totalPages: 0 };
  }
}

// ---------------------------------------------------------------------------
// getPatientByIdAction
// ---------------------------------------------------------------------------
export async function getPatientByIdAction(id: string): Promise<Patient | null> {
  try {
    const { clinicId } = await getAuthContext();

    if (!clinicId) return null;

    const where: any = {
      id,
      clinicId,
      deletedAt: null,
    };

    // Patients accessible across branches for all roles within the same clinic
    const patient = await prisma.patients.findFirst({
      where,
      include: { medical_histories: true },
    });

    if (!patient) {
      console.warn("[getPatientByIdAction] Patient not found with ID:", id, "clinicId:", clinicId);
      return null;
    }

    return mapRowToPatient(patient);
  } catch (err) {
    console.error("[getPatientByIdAction] Error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// createPatientActionDB
// ---------------------------------------------------------------------------
export async function createPatientActionDB(
  payload: Omit<Patient, "id" | "createdAt" | "updatedAt">,
): Promise<Patient> {
  const { clinicId, branchId } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized: no clinic found for this user.");

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createPatient", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Use full timestamp + 4-char random suffix → collision probability ≈ 0
  const fileNumber = `PT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const patient = await prisma.patients.create({
    data: {
      id: crypto.randomUUID(),
      clinicId,
      branchId: branchId || null,
      fileNumber,
      fullName: payload.fullName,
      nationalId: payload.nationalId ?? null,
      phone: payload.contactInfo.phone,
      altPhone: payload.contactInfo.altPhone ?? null,
      email: payload.contactInfo.email ?? null,
      dateOfBirth: payload.birthDate ? new Date(payload.birthDate) : new Date(),
      gender: payload.gender,
      bloodGroup: payload.medicalHistory.bloodGroup,
      city: payload.contactInfo.city ?? null,
      address: payload.contactInfo.address ?? null,
      notes: payload.medicalHistory.generalNotes ?? null,
      isActive: payload.status === PatientStatus.ACTIVE,
      allergies: payload.medicalHistory.allergies.map((a) => a.allergen).join(", "),
      currentMedications: payload.medicalHistory.currentMedications.join(", "),
      // Emergency contact
      emergencyName: payload.emergencyContact?.name ?? null,
      emergencyRelationship: payload.emergencyContact?.relationship ?? null,
      emergencyPhone: payload.emergencyContact?.phone ?? null,
    },
    include: { medical_histories: true },
  });

  // Insert medical history rows
  if (payload.medicalHistory.conditions.length > 0) {
    await prisma.medical_histories.createMany({
      data: payload.medicalHistory.conditions.map((c) => ({
        id: crypto.randomUUID(),
        patientId: patient.id,
        condition: c.condition,
        severity: (c as any).severity?.toUpperCase() ?? "LOW",
        notes: c.notes ?? null,
      })),
    });
  }

  revalidatePath("/dashboard/patients");
  revalidatePath("/patients");

  // Audit log
  await auditCreate("patient", patient.id, {
    fullName: patient.fullName,
    phone: patient.phone,
    gender: patient.gender,
  });

  return mapRowToPatient(patient);
}

// ---------------------------------------------------------------------------
// updatePatientActionDB
// ---------------------------------------------------------------------------
export async function updatePatientActionDB(
  id: string,
  payload: Partial<Patient>,
): Promise<Patient> {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  // Check rate limit (50 updates per minute)
  const rateLimit = await checkRateLimit("updatePatient", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Verify ownership
  const where: any = {
    id,
    clinicId,
  };

  // Also verify branch if user has one selected AND is not ADMIN
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.patients.findFirst({ where });

  if (!existing) throw new Error("Patient not found or access denied.");

  const updateData: Record<string, unknown> = {};

  if (payload.fullName) updateData.fullName = payload.fullName;
  if (payload.contactInfo?.phone) updateData.phone = payload.contactInfo.phone;
  if (payload.contactInfo?.altPhone !== undefined) updateData.altPhone = payload.contactInfo.altPhone;
  if (payload.contactInfo?.email !== undefined) updateData.email = payload.contactInfo.email;
  if (payload.contactInfo?.city !== undefined) updateData.city = payload.contactInfo.city;
  if (payload.contactInfo?.address !== undefined) updateData.address = payload.contactInfo.address;
  if (payload.birthDate) updateData.dateOfBirth = new Date(payload.birthDate);
  if (payload.gender) updateData.gender = payload.gender;
  if (payload.medicalHistory?.bloodGroup) updateData.bloodGroup = payload.medicalHistory.bloodGroup;
  if (payload.medicalHistory?.generalNotes !== undefined) updateData.notes = payload.medicalHistory.generalNotes;
  if (payload.status) updateData.isActive = payload.status === PatientStatus.ACTIVE;
  if (payload.medicalHistory?.allergies) {
    updateData.allergies = payload.medicalHistory.allergies.map((a) => a.allergen).join(", ");
  }
  if (payload.medicalHistory?.currentMedications) {
    updateData.currentMedications = payload.medicalHistory.currentMedications.join(", ");
  }

  // Emergency contact — always overwrite so clearing the fields works too
  if ("emergencyContact" in payload) {
    updateData.emergencyName = payload.emergencyContact?.name ?? null;
    updateData.emergencyRelationship = payload.emergencyContact?.relationship ?? null;
    updateData.emergencyPhone = payload.emergencyContact?.phone ?? null;
  }

  const patient = await prisma.patients.update({
    where: { id },
    data: updateData,
    include: { medical_histories: true },
  });

  // Replace medical history if provided
  if (payload.medicalHistory?.conditions) {
    await prisma.medical_histories.deleteMany({ where: { patientId: id } });

    if (payload.medicalHistory.conditions.length > 0) {
      await prisma.medical_histories.createMany({
        data: payload.medicalHistory.conditions.map((c) => ({
          id: crypto.randomUUID(),
          patientId: id,
          condition: c.condition,
          severity: (c as any).severity?.toUpperCase() ?? "LOW",
          notes: c.notes ?? null,
        })),
      });
    }
  }

  revalidatePath("/dashboard/patients");
  revalidatePath(`/dashboard/patients/${id}`);
  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);

  // Audit log
  await auditUpdate("patient", id, {
    changedFields: Object.keys(updateData),
    after: updateData,
  });

  return mapRowToPatient(patient);
}

// ---------------------------------------------------------------------------
// deletePatientAction
// ---------------------------------------------------------------------------
export async function deletePatientAction(id: string): Promise<void> {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  // Check rate limit (10 deletes per minute)
  const rateLimit = await checkRateLimit("deletePatient", RATE_LIMITS.MUTATION_DELETE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Verify ownership before deleting
  const where: any = {
    id,
    clinicId,
  };

  // Also verify branch if user has one selected AND is not ADMIN
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.patients.findFirst({ where });

  if (!existing) throw new Error("Patient not found or access denied.");

  // Soft delete: set deletedAt to current timestamp
  await prisma.patients.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  // Audit log
  await auditDelete("patient", id, {
    fullName: existing.fullName,
    phone: existing.phone,
  });

  // Revalidate to update UI
  revalidatePath("/dashboard/patients");
  revalidatePath("/patients");
}
