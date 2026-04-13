// =============================================================================
// DENTAL CMS — Clinical Module: Client Action Coordinators
// features/clinical/actions.ts
//
// "use client" async functions that coordinate UI state updates.
// Actual DB writes are delegated to serverActions.ts (Supabase/Prisma).
// Zero localStorage usage — all persistence goes through server actions.
// =============================================================================

"use client";

import {
  PlanItem,
  TreatmentStatus,
  CompletionRecord,
  InvoiceMode,
} from "./types/treatmentPlan";
import { generateId } from "@/lib/utils/id";
import { updateTreatmentStatusAction, createInvoiceAction } from "./serverActions";

// ---------------------------------------------------------------------------
// Action State Types
// ---------------------------------------------------------------------------

export interface StatusUpdateState {
  success: boolean | null;
  message: string;
  updatedItem?: PlanItem;
}

export interface InvoiceActionState {
  success: boolean | null;
  message: string;
  invoiceId?: string;
  invoiceNumber?: string;
  mode?: InvoiceMode;
  total?: number;
}

// ---------------------------------------------------------------------------
// updateTreatmentItemStatus
//
// Finds the item in the local plan snapshot, builds the updated PlanItem,
// then delegates the actual DB write to updateTreatmentStatusAction.
// The caller (useSessionProgress) is responsible for building and persisting
// the CompletionRecord via saveTreatmentHistoryAction.
// ---------------------------------------------------------------------------

export async function updateTreatmentItemStatus(
  plan: PlanItem[],
  itemId: string,
  newStatus: TreatmentStatus,
): Promise<StatusUpdateState> {
  const itemIndex = plan.findIndex((p) => p.id === itemId);
  if (itemIndex === -1) {
    return { success: false, message: "itemNotFound" };
  }

  const item = plan[itemIndex];

  const updatedItem: PlanItem = {
    ...item,
    status: newStatus,
    completedAt:
      newStatus === TreatmentStatus.COMPLETED
        ? new Date().toISOString()
        : undefined,
  };

  // Persist to DB via server action (handles Supabase write + revalidatePath)
  await updateTreatmentStatusAction(itemId, newStatus);

  return {
    success: true,
    message: "statusUpdated",
    updatedItem,
  };
}

// ---------------------------------------------------------------------------
// submitInvoiceAction
//
// Converts the current treatment plan into an invoice.
// Supports two modes: "ALL" (full plan) or "COMPLETED_ONLY".
// ---------------------------------------------------------------------------

export async function submitInvoiceAction(
  prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  try {
    const patientId = formData.get("patientId") as string;
    const mode = (formData.get("invoiceMode") as InvoiceMode) || "ALL";

    if (!patientId) {
      return { success: false, message: "emptyPlanError" };
    }

    const result = await createInvoiceAction(
      patientId,
      [], // Plan is passed via local state; DB query handled in server action
      mode,
    );

    if (!result.success) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      message: "invoiceSuccess",
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      mode,
    };
  } catch (error) {
    console.error("Failed to submit invoice:", error);
    return { success: false, message: "invoiceError" };
  }
}

// ---------------------------------------------------------------------------
// Re-export generateId so callers that previously imported it from here
// don't need to update their import paths.
// ---------------------------------------------------------------------------
export { generateId };
