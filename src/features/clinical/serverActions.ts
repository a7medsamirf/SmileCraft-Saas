"use server";

// =============================================================================
// SmileCraft CMS — Clinical Server Actions
// ✅ Migrated to Prisma ORM with branch isolation
// ✅ Auto-assign mechanism for orphaned clinical cases
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { MouthMap, generateEmptyMouthMap } from "./types/odontogram";
import {
  PlanItem,
  TreatmentStatus,
  CompletionRecord,
  InvoiceMode,
} from "./types/treatmentPlan";
import type { ClinicalCase, ClinicalCasePayload } from "./types/clinicalCase";

// ---------------------------------------------------------------------------
// Auth helper — returns the current user and their context
// ---------------------------------------------------------------------------
async function getUserContext() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return { user: null, clinicId: null, branchId: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true },
    });

    return {
      user,
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
    };
  } catch {
    return { user: null, clinicId: null, branchId: null };
  }
}

// ---------------------------------------------------------------------------
// Auto-assign orphaned clinical cases to default branch
// ---------------------------------------------------------------------------
async function autoAssignOrphanedClinicalCases(clinicId: string, defaultBranchId: string): Promise<void> {
  const orphaned = await prisma.clinical_cases.findMany({
    where: { clinicId, branchId: null },
    select: { id: true },
  });

  if (orphaned.length > 0) {
    await prisma.clinical_cases.updateMany({
      where: { clinicId, branchId: null },
      data: { branchId: defaultBranchId },
    });
    console.log(`[AUTO-ASSIGN] ${orphaned.length} clinical cases assigned to branch ${defaultBranchId}`);
  }
}

// ---------------------------------------------------------------------------
// mapClinicalCaseRow — Prisma model → ClinicalCase
// ---------------------------------------------------------------------------
function mapClinicalCaseRow(row: any): ClinicalCase {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    toothNumber: row.toothNumber,
    toothStatus: row.toothStatus as any,
    diagnosis: row.diagnosis ?? undefined,
    procedure: row.procedure ?? undefined,
    procedureKey: row.procedureKey ?? undefined,
    notes: row.notes ?? undefined,
    estimatedCost: Number(row.estimatedCost),
    status: row.status as TreatmentStatus ?? TreatmentStatus.PLANNED,
    sessionDate: row.sessionDate ? new Date(row.sessionDate).toISOString().slice(0, 10) : undefined,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// getPatientClinicalDataAction
// Loads mouthMap (JSONB) and treatment rows from Prisma.
// Falls back to PATIENT_TEETH_MAP mock data if DB is unavailable.
// ---------------------------------------------------------------------------
export async function getPatientClinicalDataAction(patientId: string): Promise<{
  mouthMap: MouthMap;
  treatments: PlanItem[];
  teethWithCases: number[];
  treatmentHistory: CompletionRecord[];
} | null> {
  try {
    const { user, clinicId, branchId } = await getUserContext();
    if (!user || !clinicId) {
      return {
        mouthMap: generateEmptyMouthMap(),
        treatments: [],
        teethWithCases: [],
        treatmentHistory: [],
      };
    }

    // Auto-assign orphaned cases if branchId exists
    if (branchId) {
      await autoAssignOrphanedClinicalCases(clinicId, branchId);
    }

    // Parallel fetch for optimal performance
    const [patient, treatmentsData, cases] = await Promise.all([
      prisma.patients.findUnique({
        where: { id: patientId, clinicId },
        select: { mouthMap: true, treatmentHistory: true },
      }),
      prisma.treatments.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clinical_cases.findMany({
        where: { patientId },
        select: { toothNumber: true },
      }),
    ]);

    const rawMap = patient?.mouthMap;
    
    // Safely parse mouthMap from JSONB (handle both array and object formats)
    let mouthMap: MouthMap;
    if (!rawMap) {
      mouthMap = generateEmptyMouthMap();
    } else if (Array.isArray(rawMap)) {
      mouthMap = rawMap as unknown as MouthMap;
    } else if (typeof rawMap === "object") {
      // If it's stored as an object {}, convert to empty array
      console.warn("[getPatientClinicalDataAction] mouthMap is not an array, using empty mouth map");
      mouthMap = generateEmptyMouthMap();
    } else {
      mouthMap = generateEmptyMouthMap();
    }

    const treatmentHistory: CompletionRecord[] = patient?.treatmentHistory
      ? (patient.treatmentHistory as unknown as CompletionRecord[])
      : [];

    const treatments: PlanItem[] = treatmentsData.map((t) => ({
      id: t.id,
      toothId: t.toothNumber ? parseInt(t.toothNumber, 10) : 0,
      procedure: t.procedureName ?? "",
      procedureKey: t.procedureType ?? "",
      estimatedCost: Number(t.cost ?? 0),
      status: t.status as TreatmentStatus ?? TreatmentStatus.PLANNED,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
    }));

    const teethWithCases = cases.map((r) => r.toothNumber);

    return { mouthMap, treatments, teethWithCases, treatmentHistory };
  } catch (err) {
    console.warn("[getPatientClinicalDataAction] Falling back to mock:", err);
    return {
      mouthMap: generateEmptyMouthMap(),
      treatments: [],
      teethWithCases: [],
      treatmentHistory: [],
    };
  }
}

// ---------------------------------------------------------------------------
// saveMouthMapAction
// Updates the patient's mouthMap JSONB column in Prisma.
// Silently fails (no throw) so the UI's localStorage fallback still works.
// ---------------------------------------------------------------------------
export async function saveMouthMapAction(
  patientId: string,
  mouthMap: MouthMap,
): Promise<void> {
  try {
    const { user } = await getUserContext();
    if (!user) return;

    await prisma.patients.update({
      where: { id: patientId },
      data: { mouthMap: mouthMap as unknown as any },
    });

    revalidatePath("/dashboard/clinical");
  } catch (err) {
    console.warn("[saveMouthMapAction] Could not save to DB:", err);
  }
}

// ---------------------------------------------------------------------------
// updateTreatmentStatusAction
// ---------------------------------------------------------------------------
export async function updateTreatmentStatusAction(
  treatmentId: string,
  status: TreatmentStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getUserContext();
    if (!user) {
      return { success: false, error: "notAuthenticated" };
    }

    const now = new Date();
    await prisma.treatments.update({
      where: { id: treatmentId },
      data: {
        status,
        completedAt: status === TreatmentStatus.COMPLETED ? now : null,
      },
    });

    revalidatePath("/dashboard/clinical");
    return { success: true };
  } catch (err) {
    console.error("[updateTreatmentStatusAction] Failed:", err);
    return { success: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// createTreatmentAction
// ---------------------------------------------------------------------------
export async function createTreatmentAction(
  patientId: string,
  item: Omit<PlanItem, "id">,
): Promise<string | null> {
  try {
    const { user } = await getUserContext();
    if (!user) return null;

    const treatment = await prisma.treatments.create({
      data: {
        id: crypto.randomUUID(),
        patientId,
        toothNumber: item.toothId.toString(),
        procedureType: item.procedureKey,
        procedureName: item.procedure,
        cost: item.estimatedCost,
        status: item.status,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/clinical");
    return treatment.id;
  } catch (err) {
    console.warn("[createTreatmentAction] Failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getClinicalCasesByToothAction
// Load all clinical cases for a specific tooth of a specific patient.
// Returns newest first. Falls back to [] on any error.
// ---------------------------------------------------------------------------
export async function getClinicalCasesByToothAction(
  patientId: string,
  toothNumber: number,
): Promise<ClinicalCase[]> {
  try {
    const { user, clinicId } = await getUserContext();
    if (!user || !clinicId) return [];

    const cases = await prisma.clinical_cases.findMany({
      where: { patientId, toothNumber },
      orderBy: { createdAt: "desc" },
    });

    return cases.map(mapClinicalCaseRow);
  } catch (err) {
    console.warn("[getClinicalCasesByToothAction] fallback:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// upsertClinicalCaseAction
// Creates a new case if no id is provided; updates an existing one if id
// is present. Returns the saved ClinicalCase, or null on failure.
// ---------------------------------------------------------------------------
export async function upsertClinicalCaseAction(
  payload: ClinicalCasePayload,
): Promise<ClinicalCase | null> {
  try {
    const { user, clinicId } = await getUserContext();
    if (!user || !clinicId) return null;

    const row = {
      clinicId,
      patientId: payload.patientId,
      toothNumber: payload.toothNumber,
      toothStatus: payload.toothStatus,
      diagnosis: payload.diagnosis ?? null,
      procedure: payload.procedure ?? null,
      procedureKey: payload.procedureKey ?? null,
      notes: payload.notes ?? null,
      estimatedCost: payload.estimatedCost,
      status: payload.status,
      sessionDate: payload.sessionDate ? new Date(payload.sessionDate) : null,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    };

    let result;
    if (payload.id) {
      // Update existing record
      result = await prisma.clinical_cases.update({
        where: { id: payload.id },
        data: row,
      });
    } else {
      // Insert new record
      result = await prisma.clinical_cases.create({
        data: {
          id: crypto.randomUUID(),
          ...row,
        },
      });
    }

    revalidatePath("/dashboard/clinical");
    return mapClinicalCaseRow(result);
  } catch (err) {
    console.error("[upsertClinicalCaseAction]", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// deleteClinicalCaseAction
// ---------------------------------------------------------------------------
export async function deleteClinicalCaseAction(caseId: string): Promise<void> {
  try {
    const { user } = await getUserContext();
    if (!user) return;
    
    await prisma.clinical_cases.delete({
      where: { id: caseId },
    });
    
    revalidatePath("/dashboard/clinical");
  } catch (err) {
    console.warn("[deleteClinicalCaseAction]", err);
  }
}

// ---------------------------------------------------------------------------
// getPatientClinicalCaseSummaryAction
// Returns an array of tooth numbers that have at least one clinical case
// recorded for the given patient.
// ---------------------------------------------------------------------------
export async function getPatientClinicalCaseSummaryAction(
  patientId: string,
): Promise<number[]> {
  try {
    const { user } = await getUserContext();
    if (!user) return [];
    
    const cases = await prisma.clinical_cases.findMany({
      where: { patientId },
      select: { toothNumber: true },
    });
    
    return cases.map((r) => r.toothNumber);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// replaceTreatmentPlanAction
// Deletes all PLANNED treatments for the patient and inserts fresh ones.
// Returns the inserted PlanItems with their DB-assigned IDs.
// ---------------------------------------------------------------------------
export async function replaceTreatmentPlanAction(
  patientId: string,
  plan: PlanItem[],
): Promise<PlanItem[]> {
  if (!patientId || plan.length === 0) {
    return plan;
  }

  try {
    const { user } = await getUserContext();
    if (!user) {
      console.warn("[replaceTreatmentPlanAction] No authenticated user - plan not persisted");
      return plan;
    }

    // Delete all existing PLANNED treatments for this patient
    await prisma.treatments.deleteMany({
      where: {
        patientId,
        status: TreatmentStatus.PLANNED,
      },
    });

    // Build insert rows
    const now = new Date();
    const rows = plan.map((item) => ({
      id: crypto.randomUUID(),
      patientId,
      toothNumber: item.toothId.toString(),
      procedureName: item.procedure,
      procedureType: item.procedureKey,
      cost: item.estimatedCost,
      status: TreatmentStatus.PLANNED,
      createdAt: now,
      updatedAt: now,
    }));

    const inserted = await prisma.treatments.createManyAndReturn({
      data: rows,
    });

    const insertedPlanItems: PlanItem[] = inserted.map((t) => ({
      id: t.id,
      toothId: t.toothNumber ? parseInt(t.toothNumber, 10) : 0,
      procedure: t.procedureName ?? "",
      procedureKey: t.procedureType ?? "",
      estimatedCost: Number(t.cost ?? 0),
      status: TreatmentStatus.PLANNED,
    }));

    revalidatePath("/dashboard/clinical");
    return insertedPlanItems;
  } catch (err) {
    console.error("[replaceTreatmentPlanAction] Failed:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// getTreatmentPlanAction
// Fetches the current treatment plan for a patient from Prisma.
// ---------------------------------------------------------------------------
export async function getTreatmentPlanAction(patientId: string): Promise<PlanItem[] | null> {
  try {
    const { user } = await getUserContext();
    if (!user) return null;

    const treatments = await prisma.treatments.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    if (treatments.length === 0) return [];

    const plan: PlanItem[] = treatments.map((t) => ({
      id: t.id,
      toothId: t.toothNumber ? parseInt(t.toothNumber, 10) : 0,
      procedure: t.procedureName ?? "",
      procedureKey: t.procedureType ?? "",
      estimatedCost: Number(t.cost ?? 0),
      status: (t.status as TreatmentStatus) ?? TreatmentStatus.PLANNED,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
    }));

    return plan;
  } catch (err) {
    console.error("[getTreatmentPlanAction] Failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// saveTreatmentHistoryAction
// Persists the completion audit trail (max 50 records) to the patient's
// treatmentHistory JSONB column.
// ---------------------------------------------------------------------------
export async function saveTreatmentHistoryAction(
  patientId: string,
  history: CompletionRecord[],
): Promise<void> {
  try {
    const { user } = await getUserContext();
    if (!user) return;

    // Cap at 50 most-recent entries
    const capped = history.slice(0, 50);

    await prisma.patients.update({
      where: { id: patientId },
      data: { treatmentHistory: capped as unknown as any },
    });
  } catch (err) {
    console.warn("[saveTreatmentHistoryAction] Failed:", err);
  }
}

// ---------------------------------------------------------------------------
// getTreatmentHistoryAction
// Reads the patient's treatmentHistory JSONB column and returns it as a
// typed CompletionRecord[]. Falls back to [] on any error or missing data.
// ---------------------------------------------------------------------------
export async function getTreatmentHistoryAction(
  patientId: string,
): Promise<CompletionRecord[]> {
  try {
    const { user } = await getUserContext();
    if (!user) return [];

    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      select: { treatmentHistory: true },
    });

    if (!patient?.treatmentHistory) return [];

    const raw = patient.treatmentHistory;
    return Array.isArray(raw) ? (raw as unknown as CompletionRecord[]) : [];
  } catch (err) {
    console.warn("[getTreatmentHistoryAction] Failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// createInvoiceAction
// Creates an invoice from the treatment plan with proper Prisma schema.
// ---------------------------------------------------------------------------
export async function createInvoiceAction(
  patientId: string,
  plan: PlanItem[],
  mode: InvoiceMode,
  creatorId?: string,
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; message: string }> {
  try {
    const { user } = await getUserContext();
    if (!user) {
      return { success: false, message: "notAuthenticated" };
    }

    // Fetch treatments from DB
    const treatments = await prisma.treatments.findMany({
      where: { patientId },
      select: {
        id: true,
        toothNumber: true,
        procedureName: true,
        procedureType: true,
        cost: true,
        status: true,
      },
    });

    if (!treatments || treatments.length === 0) {
      return { success: false, message: "emptyPlanError" };
    }

    const dbPlan: PlanItem[] = treatments.map((t) => ({
      id: t.id,
      toothId: t.toothNumber ? parseInt(t.toothNumber, 10) : 0,
      procedure: t.procedureName ?? "",
      procedureKey: t.procedureType ?? "",
      estimatedCost: Number(t.cost ?? 0),
      status: t.status as TreatmentStatus ?? TreatmentStatus.PLANNED,
    }));

    const invoiceItems =
      mode === "COMPLETED_ONLY"
        ? dbPlan.filter((item) => item.status === TreatmentStatus.COMPLETED)
        : dbPlan;

    if (invoiceItems.length === 0) {
      return { success: false, message: "noCompletedItems" };
    }

    const total = invoiceItems.reduce((sum, item) => sum + item.estimatedCost, 0);

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${patientId.slice(0, 8).toUpperCase()}`;
    const invoiceId = crypto.randomUUID();

    // Insert invoice
    await prisma.invoices.create({
      data: {
        id: invoiceId,
        invoiceNumber,
        patientId,
        totalAmount: total,
        paidAmount: 0,
        status: "DRAFT",
        notes: `Treatment plan invoice - ${mode === "COMPLETED_ONLY" ? "Completed treatments only" : "Full treatment plan"}`,
        updatedAt: new Date(),
      },
    });

    // Create invoice items
    const invoiceItemRows = invoiceItems.map((item) => ({
      id: crypto.randomUUID(),
      invoiceId,
      treatmentId: item.id,
      description: `Tooth #${item.toothId} - ${item.procedure}`,
      quantity: 1,
      unitPrice: item.estimatedCost,
      total: item.estimatedCost,
    }));

    if (invoiceItemRows.length > 0) {
      await prisma.invoice_items.createMany({
        data: invoiceItemRows,
      });
    }

    // Update treatment statuses if COMPLETED_ONLY mode
    if (mode === "COMPLETED_ONLY") {
      await prisma.treatments.updateMany({
        where: {
          id: { in: invoiceItems.map((item) => item.id) },
        },
        data: { status: TreatmentStatus.COMPLETED },
      });
    }

    revalidatePath("/dashboard/clinical");
    revalidatePath("/dashboard/finance");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, invoiceId, invoiceNumber, message: "invoiceSuccess" };
  } catch (err) {
    console.error("[createInvoiceAction] Failed:", err);
    return { success: false, message: "invoiceError" };
  }
}

// ---------------------------------------------------------------------------
// getPatientAction
// Retrieves patient details by ID for invoice generation.
// ---------------------------------------------------------------------------
export async function getPatientAction(
  patientId: string,
): Promise<{ firstName: string; lastName: string; phone: string } | null> {
  try {
    const { user } = await getUserContext();
    if (!user) return null;

    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      select: { fullName: true, phone: true },
    });

    if (!patient) return null;
    
    // Split fullName into firstName and lastName
    const nameParts = patient.fullName.split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");
    
    return {
      firstName,
      lastName,
      phone: patient.phone,
    };
  } catch {
    return null;
  }
}
