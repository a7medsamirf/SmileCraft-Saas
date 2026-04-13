// =============================================================================
// DENTAL CMS — Clinical Module: useSessionProgress Hook
// features/clinical/hooks/useSessionProgress.ts
//
// Custom hook managing treatment plan state with React 19 useOptimistic.
// Provides instant visual feedback on the Odontogram when status changes.
//
// Persistence is fully DB-backed via serverActions.ts — zero localStorage.
// =============================================================================

"use client";

import {
  useOptimistic,
  useCallback,
  useState,
  useEffect,
  startTransition,
} from "react";
import { MouthMap, ToothStatus } from "../types/odontogram";
import {
  PlanItem,
  TreatmentStatus,
  CompletionRecord,
} from "../types/treatmentPlan";
import {
  replaceTreatmentPlanAction,
  saveTreatmentHistoryAction,
  getTreatmentHistoryAction,
  updateTreatmentStatusAction,
} from "../serverActions";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils/id";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OdontogramColorOverride {
  fill: string;
  stroke: string;
}

interface SessionProgressState {
  plan: PlanItem[];
  history: CompletionRecord[];
}

interface UseSessionProgressReturn {
  /** Optimistic plan items (immediately reflects user actions) */
  optimisticPlan: PlanItem[];
  /** Completion history records */
  completionHistory: CompletionRecord[];
  /** Update a plan item's status (triggers optimistic update + server action) */
  updateItemStatus: (itemId: string, newStatus: TreatmentStatus) => void;
  /** Map of toothId → color override for completed treatments */
  odontogramOverrides: Map<number, OdontogramColorOverride>;
  /** Whether the hook has loaded initial data */
  isLoaded: boolean;
  /** Generate a fresh plan from the current mouthMap and persist to DB */
  regeneratePlan: (
    mouthMap: MouthMap,
    t: ReturnType<typeof useTranslations>,
  ) => void;
  /** Save the current plan to DB (persists all status changes) */
  savePlan: () => Promise<{ success: boolean; error?: string; savedPlan?: PlanItem[] }>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Reload plan from database */
  reloadPlan: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Procedure Key → Target Color mapping
// When a procedure is COMPLETED, the tooth should visually reflect
// the treatment that was applied (e.g., caries → filling = blue).
// ---------------------------------------------------------------------------

const COMPLETED_COLOR_MAP: Record<string, OdontogramColorOverride> = {
  procedureCleaning: { fill: "#3b82f6", stroke: "#1d4ed8" }, // Blue  → Filling done
  procedureReview: { fill: "#3b82f6", stroke: "#1d4ed8" }, // Blue  → Filling reviewed
  procedureRootCanal: { fill: "#a855f7", stroke: "#7e22ce" }, // Purple→ Root canal done
  procedureCrown: { fill: "#fbbf24", stroke: "#d97706" }, // Amber → Crown placed
};

// ---------------------------------------------------------------------------
// Procedure Key → Target ToothStatus mapping
// Used to calculate the final odontogram color when a procedure completes.
// ---------------------------------------------------------------------------

const PROCEDURE_TO_STATUS: Record<string, ToothStatus> = {
  procedureCleaning: ToothStatus.FILLING,
  procedureReview: ToothStatus.FILLING,
  procedureRootCanal: ToothStatus.ROOT_CANAL,
  procedureCrown: ToothStatus.CROWN,
};

// ---------------------------------------------------------------------------
// Helper: Generate plan from mouthMap
// ---------------------------------------------------------------------------

function generatePlanFromMouthMap(
  mouthMap: MouthMap,
  t: ReturnType<typeof useTranslations>,
): PlanItem[] {
  // Safety check: ensure mouthMap is an array
  const safeMouthMap = Array.isArray(mouthMap) ? mouthMap : [];
  
  return safeMouthMap
    .filter(
      (tooth) =>
        tooth.status !== ToothStatus.HEALTHY &&
        tooth.status !== ToothStatus.MISSING,
    )
    .map((tooth) => {
      let procedure = "";
      let procedureKey = "";
      let cost = 0;

      switch (tooth.status) {
        case ToothStatus.CARIOUS:
          procedureKey = "procedureCleaning";
          procedure = t("procedureCleaning");
          cost = 400;
          break;
        case ToothStatus.FILLING:
          procedureKey = "procedureReview";
          procedure = t("procedureReview");
          cost = 150;
          break;
        case ToothStatus.ROOT_CANAL:
          procedureKey = "procedureRootCanal";
          procedure = t("procedureRootCanal");
          cost = 1200;
          break;
        case ToothStatus.CROWN:
          procedureKey = "procedureCrown";
          procedure = t("procedureCrown");
          cost = 2500;
          break;
      }

      return {
        id: `plan-${tooth.id}-${tooth.status}`,
        toothId: tooth.id,
        procedure,
        procedureKey,
        estimatedCost: cost,
        status: TreatmentStatus.PLANNED,
      };
    });
}

// ---------------------------------------------------------------------------
// Hook: useSessionProgress
// ---------------------------------------------------------------------------

export function useSessionProgress(
  mouthMap: MouthMap,
  patientId: string,
  initialPlan?: PlanItem[],
): UseSessionProgressReturn {
  const t = useTranslations("Clinical");
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<SessionProgressState>({
    plan: [],
    history: [],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedPlan, setSavedPlan] = useState<PlanItem[]>([]);

  // React 19 useOptimistic for instant UI feedback
  const [optimisticState, addOptimisticUpdate] = useOptimistic(
    state,
    (currentState, update: { itemId: string; newStatus: TreatmentStatus }) => {
      const updatedPlan = currentState.plan.map((item) => {
        if (item.id === update.itemId) {
          return {
            ...item,
            status: update.newStatus,
            completedAt:
              update.newStatus === TreatmentStatus.COMPLETED
                ? new Date().toISOString()
                : undefined,
          };
        }
        return item;
      });

      const changedItem = currentState.plan.find((p) => p.id === update.itemId);
      const newRecord: CompletionRecord = {
        id: `opt-${Date.now()}`,
        planItemId: update.itemId,
        toothId: changedItem?.toothId ?? 0,
        procedure: changedItem?.procedure ?? "",
        previousStatus: changedItem?.status ?? TreatmentStatus.PLANNED,
        newStatus: update.newStatus,
        timestamp: new Date().toISOString(),
      };

      return {
        plan: updatedPlan,
        history: [newRecord, ...currentState.history],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Load initial data from DB
  // Priority: initialPlan prop (from getPatientClinicalDataAction) → generate
  //           from mouthMap if no plan exists for this patient.
  // History is always loaded from DB regardless of plan source.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Reset state if patient is de-selected
    if (!patientId) {
      if (state.plan.length > 0 || state.history.length > 0) {
        setState({ plan: [], history: [] });
      }
      setIsLoaded(false);
      return;
    }

    // 2. Prevent re-running if already loaded for this patient 
    // and we have an initialPlan provided from props.
    if (isLoaded && initialPlan && state.plan === initialPlan) return;

    let cancelled = false;

    const load = async () => {
      try {
        let plan: PlanItem[] = [];

        if (initialPlan && initialPlan.length > 0) {
          plan = initialPlan;
        } else {
          // Only auto-generate if we're truly starting fresh for this patient
          if (state.plan.length === 0) {
            // Safety check: ensure mouthMap is an array before calling .filter()
            const safeMouthMap = Array.isArray(mouthMap) ? mouthMap : [];
            const nonHealthyTeeth = safeMouthMap.filter(
              (tooth) =>
                tooth.status !== ToothStatus.HEALTHY &&
                tooth.status !== ToothStatus.MISSING,
            );

            if (nonHealthyTeeth.length > 0) {
              const freshPlan = generatePlanFromMouthMap(safeMouthMap, t);
              try {
                plan = await replaceTreatmentPlanAction(patientId, freshPlan);
              } catch (persistErr) {
                console.error("[useSessionProgress] Failed to persist plan, using local plan:", persistErr);
                plan = freshPlan;
              }
            }
          } else {
            plan = state.plan;
          }
        }

        const treatmentHistory = await getTreatmentHistoryAction(patientId);

        if (!cancelled) {
          setState({ plan, history: treatmentHistory });
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("[useSessionProgress] load error:", err);
        if (!cancelled) setIsLoaded(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [patientId, initialPlan, t]); // REMOVED mouthMap to prevent periodic re-generation loops

  // ---------------------------------------------------------------------------
  // regeneratePlan
  // Called when the clinician manually edits the odontogram (handleStatusChange).
  // Discards the old PLANNED treatments and writes fresh ones to the DB.
  // ---------------------------------------------------------------------------
  const regeneratePlan = useCallback(
    async (
      newMouthMap: MouthMap,
      translator: ReturnType<typeof useTranslations>,
    ) => {
      if (!patientId) return;

      const freshPlan = generatePlanFromMouthMap(newMouthMap, translator);

      if (freshPlan.length === 0) return;

      // Optimistically set the generated plan so the UI updates instantly
      setState((prev) => ({ ...prev, plan: freshPlan }));

      try {
        // Persist to DB — returns items with real UUIDs from the database
        const persistedPlan = await replaceTreatmentPlanAction(
          patientId,
          freshPlan,
        );
        // Only update if we got valid persisted items with DB IDs
        if (persistedPlan && persistedPlan.length > 0 && persistedPlan[0].id) {
          setState((prev) => ({ ...prev, plan: persistedPlan }));
        }
      } catch (err) {
        console.error(
          "[useSessionProgress] regeneratePlan persist failed:",
          err,
        );
        // Keep the optimistic state so the UI stays functional
      }
    },
    [patientId],
  );

  // ---------------------------------------------------------------------------
  // updateItemStatus
  // Applies an optimistic update immediately and marks changes for saving.
  // The actual DB persistence happens when savePlan() is called.
  // ---------------------------------------------------------------------------
  const updateItemStatus = useCallback(
    (itemId: string, newStatus: TreatmentStatus) => {
      const targetItem = state.plan.find((p) => p.id === itemId);
      if (!targetItem) return;

      const newRecord: CompletionRecord = {
        id: generateId(),
        planItemId: itemId,
        toothId: targetItem.toothId,
        procedure: targetItem.procedure,
        previousStatus: targetItem.status,
        newStatus,
        timestamp: new Date().toISOString(),
      };

      const updatedPlan = state.plan.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: newStatus,
              completedAt:
                newStatus === TreatmentStatus.COMPLETED
                  ? new Date().toISOString()
                  : undefined,
            }
          : item,
      );

      const updatedHistory: CompletionRecord[] = [
        newRecord,
        ...state.history,
      ];

      startTransition(() => {
        addOptimisticUpdate({ itemId, newStatus });
        setState({ plan: updatedPlan, history: updatedHistory });
        setHasUnsavedChanges(true);
      });
    },
    [state.plan, state.history, addOptimisticUpdate],
  );

  // ---------------------------------------------------------------------------
  // savePlan
  // Persists all current plan items and their statuses to the database.
  // This is called when the user clicks "Save Plan" button.
  // ---------------------------------------------------------------------------
  const savePlan = useCallback(async (): Promise<{ success: boolean; error?: string; savedPlan?: PlanItem[] }> => {
    if (!patientId) {
      return { success: false, error: "noPatient" };
    }

    if (state.plan.length === 0) {
      return { success: true };
    }

    try {
      const needsInsert = state.plan.filter(
        (item) => item.id.startsWith("plan-") || !item.id.includes("-"),
      );

      let planToSave = state.plan;

      if (needsInsert.length > 0) {
        const persistedPlan = await replaceTreatmentPlanAction(patientId, state.plan);
        if (persistedPlan && persistedPlan.length > 0 && persistedPlan[0].id) {
          planToSave = persistedPlan;
        }
      }

      for (const item of planToSave) {
        if (!item.id.startsWith("plan-")) {
          const result = await updateTreatmentStatusAction(item.id, item.status);
          if (!result.success) {
            console.error(`[savePlan] Failed to update item ${item.id}:`, result.error);
          }
        }
      }

      await saveTreatmentHistoryAction(patientId, state.history);

      setSavedPlan([...planToSave]);
      setHasUnsavedChanges(false);
      return { success: true, savedPlan: planToSave };
    } catch (err) {
      console.error("[savePlan] Failed:", err);
      return { success: false, error: String(err) };
    }
  }, [patientId, state.plan, state.history]);

  // ---------------------------------------------------------------------------
  // reloadPlan
  // Fetches the latest plan from the database.
  // ---------------------------------------------------------------------------
  const reloadPlan = useCallback(async () => {
    if (!patientId) return;

    try {
      // Import prisma dynamically to avoid client-side issues
      const { getTreatmentPlanAction } = await import("../serverActions");
      
      const treatmentsData = await getTreatmentPlanAction(patientId);
      
      if (!treatmentsData) {
        console.warn("[reloadPlan] No treatment plan data found");
        return;
      }

      setState((prev) => ({ ...prev, plan: treatmentsData }));
      setSavedPlan([...treatmentsData]);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("[reloadPlan] Error:", err);
    }
  }, [patientId]);

  // ---------------------------------------------------------------------------
  // Derive odontogram color overrides from all COMPLETED items
  // ---------------------------------------------------------------------------
  const odontogramOverrides = new Map<number, OdontogramColorOverride>();
  for (const item of optimisticState.plan) {
    if (item.status === TreatmentStatus.COMPLETED && item.procedureKey) {
      const override = COMPLETED_COLOR_MAP[item.procedureKey];
      if (override) {
        odontogramOverrides.set(item.toothId, override);
      }
    }
  }

  return {
    optimisticPlan: optimisticState.plan,
    completionHistory: optimisticState.history,
    updateItemStatus,
    odontogramOverrides,
    isLoaded,
    regeneratePlan,
    savePlan,
    hasUnsavedChanges,
    reloadPlan,
  };
}

// ---------------------------------------------------------------------------
// Named re-exports consumed by other modules
// ---------------------------------------------------------------------------
export { generatePlanFromMouthMap, PROCEDURE_TO_STATUS };
