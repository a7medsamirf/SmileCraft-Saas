// =============================================================================
// DENTAL CMS — Clinical Module: Treatment Plan Types
// features/clinical/types/treatmentPlan.ts
//
// Defines the data structures for session progress tracking:
// - TreatmentStatus enum (Planned → In-Progress → Completed)
// - PlanItem interface (individual procedure in a plan)
// - CompletionRecord (audit log entry for status changes)
// =============================================================================

export enum TreatmentStatus {
  PLANNED     = "PLANNED",      // مخطط
  IN_PROGRESS = "IN_PROGRESS",  // قيد التنفيذ
  COMPLETED   = "COMPLETED",    // مكتمل
}

export interface PlanItem {
  /** Unique identifier for this plan item */
  id: string;
  /** Universal tooth number (1-32) */
  toothId: number;
  /** Procedure description (localized) */
  procedure: string;
  /** Raw procedure key for programmatic use */
  procedureKey: string;
  /** Estimated cost in EGP */
  estimatedCost: number;
  /** Current execution status */
  status: TreatmentStatus;
  /** ISO date string when the procedure was completed */
  completedAt?: string;
  /**
   * True when the status was set from a clinical case record (ToothCasePanel).
   * When true, the PlanBuilder should not allow toggling back to PLANNED
   * unless the clinical record is explicitly re-opened and edited.
   */
  fromClinicalRecord?: boolean;
}

/**
 * Audit trail record for every status change.
 * Used to build the Treatment Timeline view.
 */
export interface CompletionRecord {
  id: string;
  planItemId: string;
  toothId: number;
  procedure: string;
  previousStatus: TreatmentStatus;
  newStatus: TreatmentStatus;
  /** ISO date string of the change */
  timestamp: string;
}

/** Bilingual labels for treatment statuses */
export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, { ar: string; en: string }> = {
  [TreatmentStatus.PLANNED]:     { ar: "مخطط",       en: "Planned" },
  [TreatmentStatus.IN_PROGRESS]: { ar: "قيد التنفيذ", en: "In Progress" },
  [TreatmentStatus.COMPLETED]:   { ar: "مكتمل",      en: "Completed" },
};

/** Invoice conversion mode */
export type InvoiceMode = "ALL" | "COMPLETED_ONLY";
