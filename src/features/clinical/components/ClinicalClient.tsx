"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  MouthMap,
  ToothStatus,
} from "@/features/clinical";
import type { Tooth } from "@/features/clinical/types/odontogram";
import { OdontogramView } from "@/features/clinical/components/OdontogramView";
import { ToothCasePanel } from "@/features/clinical/components/ToothCasePanel";
import { PlanBuilder } from "@/features/clinical/components/PlanBuilder";
import { PatientSearch } from "@/features/clinical/components/PatientSearch";
import { PatientMiniProfile } from "@/features/clinical/components/PatientMiniProfile";
import { BookingForm } from "@/features/appointments/components/BookingForm";
import {
  PlanItem,
  TreatmentStatus,
  CompletionRecord,
} from "@/features/clinical/types/treatmentPlan";
import { useSessionProgress } from "@/features/clinical/hooks/useSessionProgress";
import type { ClinicalCase } from "@/features/clinical/types/clinicalCase";
import { Patient } from "@/features/patients/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Save,
  Loader2,
  CheckCircle,
  Search,
  CalendarCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  saveMouthMapAction,
  getPatientClinicalCaseSummaryAction,
} from "@/features/clinical/serverActions";
import {
  getPatientAppointmentsWithTeethAction,
  type AppointmentTooth,
} from "@/features/appointments/serverActions";
import { RealtimeClinicalHandler } from "./RealtimeClinicalHandler";

interface ClinicalClientProps {
  initialPatient?: Patient | null;
  initialClinicalData?: {
    mouthMap: MouthMap;
    treatments: PlanItem[];
    teethWithCases: number[];
    treatmentHistory: CompletionRecord[];
  } | null;
  clinicId?: string;
}

export function ClinicalClient({
  initialPatient,
  initialClinicalData,
  clinicId,
}: ClinicalClientProps) {
  const t = useTranslations("Clinical");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Debug logging
  console.log("[ClinicalClient] Props received - patient:", initialPatient?.fullName || "null", "- clinicalData:", initialClinicalData ? "present" : "null");

  // ── Inline mapping: procedureKey → ToothStatus ────────────────────────────
  const PROCEDURE_KEY_TO_STATUS: Record<string, ToothStatus> = {
    procedureCleaning: ToothStatus.CARIOUS,
    procedureReview: ToothStatus.FILLING,
    procedureRootCanal: ToothStatus.ROOT_CANAL,
    procedureCrown: ToothStatus.CROWN,
    procedureExtraction: ToothStatus.MISSING,
    procedureWisdomExtraction: ToothStatus.MISSING,
  };

  // ── State ──────────────────────────────────────────────────────────────
  // Patient is now derived directly from initialPatient prop (Source of Truth: URL)
  const patient = initialPatient;

  const [mouthMap, setMouthMap] = useState<MouthMap>(
    initialClinicalData?.mouthMap || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialPlan, setInitialPlan] = useState<PlanItem[] | undefined>(
    initialClinicalData?.treatments,
  );
  const [teethWithCases, setTeethWithCases] = useState<Set<number>>(
    new Set(initialClinicalData?.teethWithCases || []),
  );

  // Note: We don't need to sync state with props in useEffect anymore.
  // The parent uses a `key` prop to remount the component when patient changes,
  // which ensures fresh data on each mount.

  // ── Clinical case state ────────────────────────────────────────────────────
  const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);

  // ── Appointment overlay state ──────────────────────────────────────────────
  const [appointmentTeeth, setAppointmentTeeth] = useState<AppointmentTooth[]>(
    [],
  );
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDefaults, setBookingDefaults] = useState<{
    patientName?: string;
    phone?: string;
    toothNumber?: number;
  }>({});

  // Session Progress Tracking hook
  const {
    optimisticPlan,
    completionHistory,
    updateItemStatus,
    odontogramOverrides,
    regeneratePlan,
    savePlan,
    hasUnsavedChanges,
    reloadPlan,
  } = useSessionProgress(mouthMap, patient?.id ?? "", initialPlan);

  // ── Reload mouthMap from DB ──────────────────────────────────────────────
  const reloadMouthMapFromDB = React.useCallback(async () => {
    if (!patient?.id) return;
    
    try {
      const { getPatientClinicalDataAction } = await import('../serverActions');
      const data = await getPatientClinicalDataAction(patient.id);
      if (data?.mouthMap && data.mouthMap.length > 0) {
        setMouthMap(data.mouthMap);
      }
    } catch (err) {
      console.error('[ClinicalClient] Failed to reload mouthMap:', err);
    }
  }, [patient?.id]);

  // ── Update mouthMap with appointment overlay ─────────────────────────────
  const updateMouthMapFromAppointments = React.useCallback((aptTeeth: AppointmentTooth[]) => {
    if (aptTeeth.length === 0) return;

    setMouthMap((prev) =>
      prev.map((tooth) => {
        // Only overlay on HEALTHY teeth
        if (tooth.status !== ToothStatus.HEALTHY) return tooth;
        
        const apt = aptTeeth.find((a) => a.toothNumber === tooth.id);
        if (!apt) return tooth;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedStatus = (PROCEDURE_KEY_TO_STATUS as any)[
          apt.procedureKey
        ] as ToothStatus | undefined;
        
        if (!mappedStatus) return tooth;
        
        return {
          ...tooth,
          status: mappedStatus,
          notes: `موعد: ${apt.procedure} — ${apt.date}${tooth.notes ? " | " + tooth.notes : ""}`,
        };
      }),
    );
  }, []);

  // ── Realtime reload functions ──────────────────────────────────────────────
  // Debounce ref to prevent rapid successive calls from multiple realtime events
  const reloadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const reloadClinicalData = React.useCallback(async () => {
    if (!patient?.id) return;

    // Clear any pending reload to debounce rapid calls
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    // Execute immediately if no timeout is pending, otherwise wait
    const executeReload = async () => {
      try {
        // 1. Fetch all clinical data in parallel (single DB round-trip)
        const { getPatientClinicalDataAction } = await import('../serverActions');
        const [freshData, aptTeeth, casesNums] = await Promise.all([
          getPatientClinicalDataAction(patient.id),
          getPatientAppointmentsWithTeethAction(patient.id),
          getPatientClinicalCaseSummaryAction(patient.id),
        ]);

        setAppointmentTeeth(aptTeeth);
        setTeethWithCases(new Set(casesNums));

        if (freshData?.mouthMap) {
          // Apply appointment overlay to fresh mouthMap
          const updatedMouthMap = freshData.mouthMap.map((tooth) => {
            if (tooth.status !== ToothStatus.HEALTHY) return tooth;
            const apt = aptTeeth.find((a) => a.toothNumber === tooth.id);
            if (!apt) return tooth;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedStatus = (PROCEDURE_KEY_TO_STATUS as any)[
              apt.procedureKey
            ] as ToothStatus | undefined;

            if (!mappedStatus) return tooth;

            return {
              ...tooth,
              status: mappedStatus,
              notes: `موعد: ${apt.procedure} — ${apt.date}${tooth.notes ? " | " + tooth.notes : ""}`,
            };
          });

          setMouthMap(updatedMouthMap);

          // 2. Regenerate plan from updated mouthMap
          regeneratePlan(updatedMouthMap, t);
        }

        // 3. Reload plan from DB
        await reloadPlan();

        console.log('[ClinicalClient] Realtime data reloaded - teeth, appointments, and plan updated');
      } catch (err) {
        console.error('[ClinicalClient] Realtime reload error:', err);
      }
    };

    // Debounce with 150ms delay to batch multiple realtime events
    reloadTimeoutRef.current = setTimeout(executeReload, 150);
  }, [patient?.id, reloadPlan, regeneratePlan, t]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  // Load supplemental data (appointments/cases) when patient changes
  React.useEffect(() => {
    if (!patient?.id) return;

    const loadSupplementalData = async () => {
      setIsLoading(true);
      try {
        const [aptTeeth, casesNums] = await Promise.all([
          getPatientAppointmentsWithTeethAction(patient.id),
          getPatientClinicalCaseSummaryAction(patient.id),
        ]);
        setAppointmentTeeth(aptTeeth);
        setTeethWithCases(new Set(casesNums));

        // Overlay appointment data onto HEALTHY teeth
        updateMouthMapFromAppointments(aptTeeth);
      } catch (err) {
        console.error("Failed to load supplemental clinical data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSupplementalData();
  }, [patient?.id, updateMouthMapFromAppointments]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Patient selection ──
  const handleSelectPatient = useCallback(
    (patientObj: Patient) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("patientId", patientObj.id);
        router.push(`?${params.toString()}`);
      });
      // NOTE: We don't update local state here. 
      // The router.push triggers a server re-render, supplying the new data via props.
    },
    [router, searchParams],
  );

  const handleDeselectPatient = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("patientId");
      router.push(`?${params.toString()}`);
    });
  }, [router, searchParams]);

  // ── Odontogram interactions ────────────────────────────────────────────────
  const handleStatusChange = (id: number, newStatus: ToothStatus) => {
    startTransition(() => {
      // 1. Calculate the new map first
      const updatedMap = mouthMap.map((tooth) =>
        tooth.id === id ? { ...tooth, status: newStatus } : tooth,
      );

      // 2. Update local state
      setMouthMap(updatedMap);

      // 3. Trigger side effects (plan regeneration) separately from the updater
      regeneratePlan(updatedMap, t);
    });
  };

  // ── Case panel handlers ────────────────────────────────────────────────────
  const handleCaseOpen = useCallback((tooth: Tooth) => {
    setSelectedTooth(tooth);
  }, []);

  const handleBookAppointment = useCallback(
    (tooth: Tooth) => {
      setBookingDefaults({
        patientName: patient?.fullName ?? "",
        phone: patient?.contactInfo.phone ?? "",
        toothNumber: tooth.id,
      });
      setIsBookingOpen(true);
    },
    [patient],
  );

  const handleCaseSaved = useCallback(async (saved: ClinicalCase) => {
    setTeethWithCases((prev) => new Set([...prev, saved.toothNumber]));
    
    // Reload clinical data to update odontogram and plan
    await reloadClinicalData();
    
    console.log('[ClinicalClient] Case saved, realtime reload triggered');
  }, [reloadClinicalData]);

  // ── Persist mouthMap and treatment plan ─────────────────────────────────────
  const handleSave = async () => {
    if (!patient) return;
    setIsSaving(true);
    try {
      await saveMouthMapAction(patient.id, mouthMap);
      if (hasUnsavedChanges) {
        const result = await savePlan();
        if (!result.success) {
          console.error("[ClinicalClient] Plan save failed:", result.error);
        } else {
          await reloadPlan();
        }
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error("[ClinicalClient] Save failed:", err);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const mappedAptCount = appointmentTeeth.filter(
    (a) => PROCEDURE_KEY_TO_STATUS[a.procedureKey],
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Realtime Handler */}
      {clinicId && (
        <RealtimeClinicalHandler
          clinicId={clinicId}
          patientId={patient?.id}
          onClinicalCasesUpdate={reloadClinicalData}
          onTreatmentsUpdate={reloadClinicalData}
          onAppointmentsUpdate={reloadClinicalData}
        />
      )}

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-600/10 dark:bg-purple-500/10">
                   <Stethoscope className="h-8 w-8 text-purple-600 dark:text-purple-500" />
               </div>

        
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        {patient && (
          <div className="flex items-center gap-3">
            {lastSaved && !isSaving && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                <CheckCircle className="h-3 w-3" />
                {t("lastSaved", {
                  time: lastSaved.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              variant="outline"
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin rtl:ml-2 ltr:mr-2" />
              ) : (
                <Save className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              )}
              {isSaving ? t("saving") : t("savePlan")}
            </Button>
          </div>
        )}
      </div>

      <PatientSearch
        onSelect={handleSelectPatient}
        selectedPatientId={patient?.id}
      />

      <AnimatePresence mode="wait">
        {!patient ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/30 mb-6"
            >
              <Search className="h-12 w-12 text-blue-400 dark:text-blue-500" />
            </motion.div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
              {t("welcomeDoctor")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              {t("welcomeMessage")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`patient-${patient.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <PatientMiniProfile
              patient={patient}
              onDeselect={handleDeselectPatient}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ms-3 text-sm font-medium text-slate-500">
                  {t("loadingRecords")}
                </span>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-5">
                    <div className="glass-card p-8 transition-all duration-300">
                      <div className="mb-8 text-center">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                          {t("odontogram")}
                        </h2>
                        <div className="flex justify-center gap-4 text-xs font-semibold text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-slate-100 border border-slate-300" />
                            {t("statusReady")}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            {t("statusCaries")}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            {t("statusFilling")}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                            {t("statusEndo")}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            {t("casePanel")}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-amber-400" />
                            {t("fromAppointment")}
                          </span>
                        </div>
                      </div>

                      {mappedAptCount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-3"
                        >
                          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                              {t("appointmentMapUpdated")}
                            </p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 opacity-80">
                              {t("appointmentMapUpdatedDetail", {
                                count: mappedAptCount,
                              })}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <OdontogramView
                        mouthMap={mouthMap}
                        teethWithCases={teethWithCases}
                        odontogramOverrides={odontogramOverrides}
                        appointmentTeeth={appointmentTeeth}
                        procedureKeyToStatus={PROCEDURE_KEY_TO_STATUS}
                        onStatusChange={handleStatusChange}
                        onCaseOpen={handleCaseOpen}
                        onBookAppointment={handleBookAppointment}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <PlanBuilder
                      plan={optimisticPlan}
                      onStatusChange={updateItemStatus}
                      completionHistory={completionHistory}
                      patientId={patient.id}
                    />
                  </div>
                </motion.div>

                <AnimatePresence>
                  {selectedTooth && (
                    <ToothCasePanel
                      key={selectedTooth.id}
                      tooth={selectedTooth}
                      patientId={patient.id}
                      onClose={() => setSelectedTooth(null)}
                      onCaseSaved={handleCaseSaved}
                      appointmentContext={appointmentTeeth.find(
                        (a) => a.toothNumber === selectedTooth.id,
                      )}
                    />
                  )}
                </AnimatePresence>

                <BookingForm
                  key={isBookingOpen ? "open" : "closed"}
                  isOpen={isBookingOpen}
                  onClose={() => {
                    setIsBookingOpen(false);
                    // Reload data after booking to update odontogram
                    reloadClinicalData();
                  }}
                  defaultValues={bookingDefaults}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
