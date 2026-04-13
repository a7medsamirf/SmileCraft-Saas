// =============================================================================
// DENTAL CMS — Clinical Module: Clinical Case Types
// features/clinical/types/clinicalCase.ts
//
// Represents a clinical case record for a specific tooth of a patient.
// Backed by the `clinical_cases` Supabase table.
// =============================================================================

import type { ToothStatus } from "./odontogram";
import type { TreatmentStatus } from "./treatmentPlan";

/**
 * A full clinical case record as stored in Supabase.
 * One record = one treatment episode for one tooth of one patient.
 */
export interface ClinicalCase {
  id: string;
  clinicId: string;
  patientId: string;
  /** Universal Numbering System: 1–32 */
  toothNumber: number;
  /** Current clinical state of the tooth at the time of recording */
  toothStatus: ToothStatus;
  /** Clinical diagnosis — free text (e.g. "Deep mesial caries, root involvement") */
  diagnosis?: string;
  /** Procedure name — localised display text (e.g. "Root canal therapy") */
  procedure?: string;
  /** Machine-readable procedure key for programmatic mapping */
  procedureKey?: string;
  /** Additional clinical notes / observations */
  notes?: string;
  /** Estimated or actual cost of the procedure in EGP */
  estimatedCost: number;
  /** Workflow status: PLANNED → IN_PROGRESS → COMPLETED */
  status: TreatmentStatus;
  /** ISO date string (YYYY-MM-DD) for the scheduled or completed session */
  sessionDate?: string;
  /** ISO datetime when the procedure was marked as completed */
  completedAt?: string;
  /** ISO datetime when the record was first created */
  createdAt: string;
  /** ISO datetime of the most recent update (auto-managed by DB trigger) */
  updatedAt: string;
}

/**
 * The payload shape accepted by `upsertClinicalCaseAction`.
 * - Omit `id` to create a new record.
 * - Include `id` to update an existing one.
 * - `clinicId`, `createdAt`, and `updatedAt` are resolved server-side.
 */
export type ClinicalCasePayload = Omit<
  ClinicalCase,
  "id" | "clinicId" | "createdAt" | "updatedAt"
> & {
  /** Present when updating an existing case; absent when creating a new one. */
  id?: string;
};
