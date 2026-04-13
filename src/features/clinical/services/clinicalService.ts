// =============================================================================
// DENTAL CMS — Clinical Module: Clinical Service (DEPRECATED STUB)
// features/clinical/services/clinicalService.ts
//
// ⚠️  DEPRECATED: This file is intentionally a no-op stub.
//     All persistence is now handled by serverActions.ts via Supabase/Prisma.
//     These exports are kept ONLY for backward-compatibility with any remaining
//     import sites (e.g. clinicalApiService.ts) while the migration is in
//     progress.  DO NOT add new localStorage logic here.
//
// Replacements:
//   saveMouthMap()         → saveMouthMapAction(patientId, mouthMap)
//   fetchMouthMap()        → getPatientClinicalDataAction(patientId).mouthMap
//   saveTreatmentPlan()    → replaceTreatmentPlanAction(patientId, plan)
//   fetchTreatmentPlan()   → getPatientClinicalDataAction(patientId).treatments
//   saveCompletionRecord() → saveTreatmentHistoryAction(patientId, history)
//   fetchCompletionHistory()→ getTreatmentHistoryAction(patientId)
// =============================================================================

import { MouthMap, generateEmptyMouthMap } from "../types/odontogram";
import { PlanItem, CompletionRecord } from "../types/treatmentPlan";

// ---------------------------------------------------------------------------
// Mouth Map — no-ops
// ---------------------------------------------------------------------------

/**
 * @deprecated Use saveMouthMapAction(patientId, mouthMap) from serverActions.ts
 */
export async function saveMouthMap(_mouthMap: MouthMap): Promise<void> {
  // no-op: persistence is handled by saveMouthMapAction in serverActions.ts
}

/**
 * @deprecated Use getPatientClinicalDataAction(patientId) from serverActions.ts
 */
export async function fetchMouthMap(): Promise<MouthMap> {
  // no-op: returns a safe empty map so callers don't crash
  return generateEmptyMouthMap();
}

// ---------------------------------------------------------------------------
// Treatment Plan — no-ops
// ---------------------------------------------------------------------------

/**
 * @deprecated Use replaceTreatmentPlanAction(patientId, plan) from serverActions.ts
 */
export async function saveTreatmentPlan(_plan: PlanItem[]): Promise<void> {
  // no-op: persistence is handled by replaceTreatmentPlanAction in serverActions.ts
}

/**
 * @deprecated Use getPatientClinicalDataAction(patientId) from serverActions.ts
 */
export async function fetchTreatmentPlan(): Promise<PlanItem[] | null> {
  // no-op: always returns null so callers fall through to DB-backed logic
  return null;
}

// ---------------------------------------------------------------------------
// Completion History — no-ops
// ---------------------------------------------------------------------------

/**
 * @deprecated Use saveTreatmentHistoryAction(patientId, history) from serverActions.ts
 */
export async function saveCompletionRecord(
  _record: CompletionRecord,
): Promise<void> {
  // no-op: persistence is handled by saveTreatmentHistoryAction in serverActions.ts
}

/**
 * @deprecated Use getTreatmentHistoryAction(patientId) from serverActions.ts
 */
export async function fetchCompletionHistory(): Promise<CompletionRecord[]> {
  // no-op: returns empty array so callers don't crash
  return [];
}
