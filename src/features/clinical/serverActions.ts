"use server";

// =============================================================================
// SmileCraft CMS — Clinical Server Actions
// ✅ Migrated to Prisma ORM with branch isolation
// ✅ Auto-assign mechanism for orphaned clinical cases
// ✅ Admin cross-branch access
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
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Auth helper — returns the current user and their context
// ---------------------------------------------------------------------------
async function getAuthContext() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return { user: null, clinicId: null, branchId: null, role: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true, role: true },
    });

    return {
      user,
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
      role: dbUser?.role ?? null,
    };
  } catch {
    return { user: null, clinicId: null, branchId: null, role: null };
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
// ---------------------------------------------------------------------------
export async function getPatientClinicalDataAction(patientId: string): Promise<{
  mouthMap: MouthMap;
  treatments: PlanItem[];
  teethWithCases: number[];
  treatmentHistory: CompletionRecord[];
} | null> {
  try {
    const { clinicId, branchId, role } = await getAuthContext();
    if (!clinicId) {
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

    const patientWhere: any = { id: patientId, clinicId };
    // Filter by branch for non-admins
    if (role !== "ADMIN" && branchId) {
      patientWhere.branchId = branchId;
    }

    // Parallel fetch for optimal performance
    const [patient, treatmentsData, cases] = await Promise.all([
      prisma.patients.findFirst({
        where: patientWhere,
        select: { mouthMap: true, treatmentHistory: true },
      }),
      prisma.treatments.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clinical_cases.findMany({
        where: { patientId },
        select: { toothNumber: true, status: true },
      }),
    ]);

    if (!patient) return null;

    const rawMap = patient.mouthMap;
    let mouthMap: MouthMap;
    if (!rawMap) {
      mouthMap = generateEmptyMouthMap();
    } else if (Array.isArray(rawMap)) {
      mouthMap = rawMap as unknown as MouthMap;
    } else {
      mouthMap = generateEmptyMouthMap();
    }

    const treatmentHistory: CompletionRecord[] = patient.treatmentHistory
      ? (patient.treatmentHistory as unknown as CompletionRecord[])
      : [];

    const teethWithCases = cases.map((r) => r.toothNumber);
    const completedCaseTeeth = new Set(
      cases
        .filter((c) => c.status === "COMPLETED")
        .map((c) => c.toothNumber),
    );

    const statusPriority = (s: string) =>
      s === "COMPLETED" ? 2 : s === "IN_PROGRESS" ? 1 : 0;

    const bestByTooth = new Map<string, typeof treatmentsData[0]>();
    const staleDuplicateIds: string[] = [];

    for (const t of treatmentsData) {
      const key = t.toothNumber ?? "0";
      const existing = bestByTooth.get(key);
      if (!existing) {
        bestByTooth.set(key, t);
      } else if (statusPriority(t.status) > statusPriority(existing.status)) {
        staleDuplicateIds.push(existing.id);
        bestByTooth.set(key, t);
      } else {
        staleDuplicateIds.push(t.id);
      }
    }

    if (staleDuplicateIds.length > 0) {
      prisma.treatments
        .deleteMany({ where: { id: { in: staleDuplicateIds } } })
        .catch(() => {});
    }

    const treatmentsWithFlag: PlanItem[] = [...bestByTooth.values()].map((t) => ({
      id: t.id,
      toothId: t.toothNumber ? parseInt(t.toothNumber, 10) : 0,
      procedure: t.procedureName ?? "",
      procedureKey: t.procedureType ?? "",
      estimatedCost: Number(t.cost ?? 0),
      status: t.status as TreatmentStatus ?? TreatmentStatus.PLANNED,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
      fromClinicalRecord: completedCaseTeeth.has(
        t.toothNumber ? parseInt(t.toothNumber, 10) : -1,
      ),
    }));

    return { mouthMap, treatments: treatmentsWithFlag, teethWithCases, treatmentHistory };
  } catch (err) {
    console.warn("[getPatientClinicalDataAction] error:", err);
    return {
      mouthMap: generateEmptyMouthMap(),
      treatments: [],
      teethWithCases: [],
      treatmentHistory: [],
    };
  }
}

export async function saveMouthMapAction(
  patientId: string,
  mouthMap: MouthMap,
): Promise<void> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return;

    await prisma.patients.update({
      where: { id: patientId, clinicId },
      data: { mouthMap: mouthMap as unknown as any },
    });

    revalidatePath("/dashboard/clinical");
  } catch (err) {
    console.warn("[saveMouthMapAction] Could not save to DB:", err);
  }
}

export async function updateTreatmentStatusAction(
  treatmentId: string,
  status: TreatmentStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) {
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

export async function createTreatmentAction(
  patientId: string,
  item: Omit<PlanItem, "id">,
): Promise<string | null> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return null;

    const rateLimit = await checkRateLimit("createTreatment", RATE_LIMITS.MUTATION_CREATE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

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

    await auditCreate("treatment", treatment.id, {
      patientId,
      toothNumber: item.toothId,
      procedure: item.procedure,
    });

    return treatment.id;
  } catch (err) {
    console.warn("[createTreatmentAction] Failed:", err);
    return null;
  }
}

export async function getClinicalCasesByToothAction(
  patientId: string,
  toothNumber: number,
): Promise<ClinicalCase[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const cases = await prisma.clinical_cases.findMany({
      where: { patientId, toothNumber, clinicId },
      orderBy: { createdAt: "desc" },
    });

    return cases.map(mapClinicalCaseRow);
  } catch (err) {
    console.warn("[getClinicalCasesByToothAction] fallback:", err);
    return [];
  }
}

export async function upsertClinicalCaseAction(
  payload: ClinicalCasePayload,
): Promise<ClinicalCase | null> {
  try {
    const { clinicId, branchId } = await getAuthContext();
    if (!clinicId) return null;

    const rateLimit = await checkRateLimit("upsertClinicalCase", RATE_LIMITS.MUTATION_UPDATE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const row = {
      clinicId,
      branchId: branchId || null,
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
      result = await prisma.clinical_cases.update({
        where: { id: payload.id, clinicId },
        data: row,
      });
    } else {
      result = await prisma.clinical_cases.create({
        data: {
          id: crypto.randomUUID(),
          ...row,
        },
      });
    }

    try {
      const existingTreatment = await prisma.treatments.findFirst({
        where: {
          patientId: payload.patientId,
          toothNumber: payload.toothNumber.toString(),
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingTreatment) {
        await prisma.treatments.update({
          where: { id: existingTreatment.id },
          data: {
            status: payload.status,
            completedAt: payload.status === TreatmentStatus.COMPLETED ? new Date() : payload.status === TreatmentStatus.PLANNED ? null : existingTreatment.completedAt,
            updatedAt: new Date(),
          },
        });
      } else if (payload.procedure && payload.status !== TreatmentStatus.PLANNED) {
        await prisma.treatments.create({
          data: {
            id: crypto.randomUUID(),
            patientId: payload.patientId,
            toothNumber: payload.toothNumber.toString(),
            procedureName: payload.procedure,
            procedureType: payload.procedureKey ?? "",
            cost: payload.estimatedCost,
            status: payload.status,
            completedAt: payload.status === TreatmentStatus.COMPLETED ? new Date() : null,
            updatedAt: new Date(),
          },
        });
      }
    } catch (syncErr) {
      console.warn("[upsertClinicalCaseAction] Failed to sync treatment status:", syncErr);
    }

    revalidatePath("/dashboard/clinical");

    if (payload.id) {
      await auditUpdate("clinical_case", result.id, {
        changedFields: ["toothNumber", "procedure"],
        after: { toothNumber: payload.toothNumber, procedure: payload.procedure },
      });
    } else {
      await auditCreate("clinical_case", result.id, {
        patientId: payload.patientId,
        toothNumber: payload.toothNumber,
        procedure: payload.procedure,
      });
    }

    return mapClinicalCaseRow(result);
  } catch (err) {
    console.error("[upsertClinicalCaseAction]", err);
    return null;
  }
}

export async function deleteClinicalCaseAction(caseId: string): Promise<void> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return;

    const rateLimit = await checkRateLimit("deleteClinicalCase", RATE_LIMITS.MUTATION_DELETE);
    if (!rateLimit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    await prisma.clinical_cases.delete({
      where: { id: caseId, clinicId },
    });

    await auditDelete("clinical_case", caseId, {});

    revalidatePath("/dashboard/clinical");
  } catch (err) {
    console.warn("[deleteClinicalCaseAction]", err);
  }
}

export async function getPatientClinicalCaseSummaryAction(
  patientId: string,
): Promise<number[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];
    
    const cases = await prisma.clinical_cases.findMany({
      where: { patientId, clinicId },
      select: { toothNumber: true },
    });
    
    return cases.map((r) => r.toothNumber);
  } catch {
    return [];
  }
}

export async function replaceTreatmentPlanAction(
  patientId: string,
  plan: PlanItem[],
): Promise<PlanItem[]> {
  if (!patientId || plan.length === 0) {
    return plan;
  }

  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return plan;

    const activeTreatments = await prisma.treatments.findMany({
      where: {
        patientId,
        status: { in: [TreatmentStatus.IN_PROGRESS, TreatmentStatus.COMPLETED] },
        toothNumber: { in: plan.map((p) => p.toothId.toString()) },
      },
      select: { toothNumber: true },
    });
    const activeToothSet = new Set(activeTreatments.map((t) => t.toothNumber));

    const safeToInsert = plan.filter(
      (item) => !activeToothSet.has(item.toothId.toString()),
    );

    if (safeToInsert.length === 0) {
      return plan;
    }

    await prisma.treatments.deleteMany({
      where: {
        patientId,
        status: TreatmentStatus.PLANNED,
        toothNumber: { in: safeToInsert.map((p) => p.toothId.toString()) },
      },
    });

    const now = new Date();
    const rows = safeToInsert.map((item) => ({
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

export async function getTreatmentPlanAction(patientId: string): Promise<PlanItem[] | null> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return null;

    const treatments = await prisma.treatments.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    if (treatments.length === 0) return [];

    const statusPriority = (s: string) =>
      s === "COMPLETED" ? 2 : s === "IN_PROGRESS" ? 1 : 0;

    const bestByTooth = new Map<string, typeof treatments[0]>();
    const staleDuplicateIds: string[] = [];

    for (const t of treatments) {
      const key = t.toothNumber ?? "0";
      const existing = bestByTooth.get(key);
      if (!existing) {
        bestByTooth.set(key, t);
      } else if (statusPriority(t.status) > statusPriority(existing.status)) {
        staleDuplicateIds.push(existing.id);
        bestByTooth.set(key, t);
      } else {
        staleDuplicateIds.push(t.id);
      }
    }

    if (staleDuplicateIds.length > 0) {
      prisma.treatments
        .deleteMany({ where: { id: { in: staleDuplicateIds } } })
        .catch((err) =>
          console.warn("[getTreatmentPlanAction] Duplicate cleanup failed:", err),
        );
    }

    const dedupedTreatments = [...bestByTooth.values()];

    const plan: PlanItem[] = dedupedTreatments.map((t) => ({
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

export async function saveTreatmentHistoryAction(
  patientId: string,
  history: CompletionRecord[],
): Promise<void> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return;

    const capped = history.slice(0, 50);

    await prisma.patients.update({
      where: { id: patientId, clinicId },
      data: { treatmentHistory: capped as unknown as any },
    });
  } catch (err) {
    console.warn("[saveTreatmentHistoryAction] Failed:", err);
  }
}

export async function getTreatmentHistoryAction(
  patientId: string,
): Promise<CompletionRecord[]> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return [];

    const patient = await prisma.patients.findUnique({
      where: { id: patientId, clinicId },
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

export async function createInvoiceAction(
  patientId: string,
  plan: PlanItem[],
  mode: InvoiceMode,
  creatorId?: string,
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; message: string }> {
  try {
    const { clinicId, branchId } = await getAuthContext();
    if (!clinicId) {
      return { success: false, message: "notAuthenticated" };
    }

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
    const invoiceNumber = `INV-${Date.now()}-${patientId.slice(0, 8).toUpperCase()}`;
    const invoiceId = crypto.randomUUID();

    await prisma.invoices.create({
      data: {
        id: invoiceId,
        clinicId,
        branchId: branchId || null,
        invoiceNumber,
        patientId,
        totalAmount: total,
        paidAmount: 0,
        status: "DRAFT",
        notes: `Treatment plan invoice - ${mode === "COMPLETED_ONLY" ? "Completed treatments only" : "Full treatment plan"}`,
        updatedAt: new Date(),
      },
    });

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

export async function getPatientAction(
  patientId: string,
): Promise<{ firstName: string; lastName: string; phone: string } | null> {
  try {
    const { clinicId } = await getAuthContext();
    if (!clinicId) return null;

    const patient = await prisma.patients.findFirst({
      where: { id: patientId, clinicId },
      select: { fullName: true, phone: true },
    });

    if (!patient) return null;
    
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
