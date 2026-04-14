"use client";

import React, { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  CalendarDays,
  FileText,
  Calendar,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { Tooth, TOOTH_STATUS_LABELS } from "../types/odontogram";
import {
  TreatmentStatus,
  TREATMENT_STATUS_LABELS,
} from "../types/treatmentPlan";
import { ClinicalCase, ClinicalCasePayload } from "../types/clinicalCase";
import {
  getClinicalCasesByToothAction,
  upsertClinicalCaseAction,
} from "../serverActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { AppointmentTooth } from "@/features/appointments/serverActions";
import { PROCEDURE_BY_KEY } from "@/features/appointments/constants/procedures";
import { getServicesAction } from "@/features/settings/serverActions";
import type { DentalService, ProcedureType } from "@/features/settings/types";

// Procedure type labels
const PROCEDURE_TYPE_LABELS: Record<ProcedureType, { ar: string; en: string }> = {
  TEETH_CLEANING: { ar: "تنظيف أسنان", en: "Teeth Cleaning" },
  FILLING: { ar: "حشو", en: "Filling" },
  EXTRACTION: { ar: "خلع", en: "Extraction" },
  ROOT_CANAL: { ar: "علاج عصب", en: "Root Canal" },
  CROWN: { ar: "تاج", en: "Crown" },
  BRACES: { ar: "تقويم", en: "Braces" },
  BLEACHING: { ar: "تبييض", en: "Bleaching" },
  EXAMINATION: { ar: "فحص", en: "Examination" },
  XRAY: { ar: "أشعة", en: "X-Ray" },
  OTHER: { ar: "أخرى", en: "Other" },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface ToothCasePanelProps {
  tooth: Tooth;
  patientId: string;
  onClose: () => void;
  /** Called after a case is successfully saved */
  onCaseSaved?: (saved: ClinicalCase) => void;
  /** Appointment context for this tooth — used for banner and form pre-fill */
  appointmentContext?: AppointmentTooth;
}

// ─── Form shape ───────────────────────────────────────────────────────────────
interface CaseFormState {
  diagnosis: string;
  procedure: string;
  procedureKey: string;
  notes: string;
  estimatedCost: number;
  status: TreatmentStatus;
  sessionDate: string;
  editingId: string | undefined;
}

// ─── Empty form state factory ─────────────────────────────────────────────────
function emptyForm(
  tooth: Tooth,
  existingCase?: ClinicalCase,
  appointmentCtx?: AppointmentTooth,
  services?: DentalService[],
): CaseFormState {
  // Resolve procedure and cost from appointment context
  const procedureFromApt = appointmentCtx?.procedure ?? "";
  const procedureKeyFromApt = appointmentCtx?.procedureKey ?? "";
  
  // Try to find price from services database first
  let costFromServices = 0;
  if (services && procedureKeyFromApt) {
    // Map procedureKey to procedureType (e.g., "procedureRootCanal" -> "ROOT_CANAL")
    const procedureDef = PROCEDURE_BY_KEY[procedureKeyFromApt];
    if (procedureDef) {
      // Try to match by procedureType - need to map the key to ProcedureType enum
      const procedureTypeMap: Record<string, string> = {
        procedureCleaning: "TEETH_CLEANING",
        procedureReview: "FILLING",
        procedureRootCanal: "ROOT_CANAL",
        procedureCrown: "CROWN",
        procedureExtraction: "EXTRACTION",
        procedureWisdomExtraction: "EXTRACTION",
        procedureScaling: "TEETH_CLEANING",
        procedureCheckup: "EXAMINATION",
        procedureXray: "XRAY",
        procedureFluoride: "TEETH_CLEANING",
        procedureBraces: "BRACES",
        procedureWhitening: "BLEACHING",
        procedureVeneer: "CROWN",
        procedureImplant: "OTHER",
        procedureBridge: "OTHER",
        procedureDenture: "OTHER",
        procedureGumTreatment: "OTHER",
      };
      
      const procedureType = procedureTypeMap[procedureKeyFromApt];
      if (procedureType) {
        const matchingService = services.find(
          (s) => s.procedureType === procedureType
        );
        if (matchingService) {
          costFromServices = matchingService.price;
        }
      }
    }
  }
  
  // Fall back to hardcoded cost from PROCEDURE_DEFINITIONS
  const costFromHardcoded = procedureKeyFromApt && PROCEDURE_BY_KEY[procedureKeyFromApt]
    ? PROCEDURE_BY_KEY[procedureKeyFromApt].estimatedCost
    : 0;
  
  // Use services price if available, otherwise hardcoded, otherwise 0
  const autoCost = costFromServices || costFromHardcoded;

  return {
    diagnosis: existingCase?.diagnosis ?? "",
    procedure: existingCase?.procedure ?? procedureFromApt,
    procedureKey:
      existingCase?.procedureKey ?? procedureKeyFromApt,
    notes:
      existingCase?.notes ??
      (appointmentCtx
        ? `موعد محجوز: ${appointmentCtx.procedure} — ${appointmentCtx.date}`
        : ""),
    estimatedCost: existingCase?.estimatedCost ?? autoCost,
    status: existingCase?.status ?? TreatmentStatus.PLANNED,
    sessionDate:
      existingCase?.sessionDate ??
      appointmentCtx?.date ??
      new Date().toISOString().slice(0, 10),
    editingId: existingCase?.id,
  };
}

// ─── Status badge colour map ──────────────────────────────────────────────────
const STATUS_COLOR: Record<TreatmentStatus, string> = {
  [TreatmentStatus.PLANNED]:
    "bg-amber-50  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
  [TreatmentStatus.IN_PROGRESS]:
    "bg-blue-50   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  [TreatmentStatus.COMPLETED]:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

// ─── Shared input / label class helpers ──────────────────────────────────────
const INPUT_CLS =
  "relative w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 transition-colors";

const LABEL_CLS =
  "block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5";

// =============================================================================
// ToothCasePanel
// =============================================================================
export function ToothCasePanel({
  tooth,
  patientId,
  onClose,
  onCaseSaved,
  appointmentContext,
}: ToothCasePanelProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();

  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [availableServices, setAvailableServices] = useState<DentalService[]>([]);
  // `loadedForTooth` tracks the last tooth.id for which data finished loading.
  // Deriving `isLoading` from it means it becomes true the instant tooth.id
  // changes — without any synchronous setState call inside the effect.
  const [loadedForTooth, setLoadedForTooth] = useState<number | null>(null);
  const isLoading = loadedForTooth !== tooth.id;
  const [showHistory, setShowHistory] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  // Form state — pre-filled with most recent case if one exists
  const [form, setForm] = useState<CaseFormState>(() => emptyForm(tooth));

  // Ref to access appointmentContext inside the useEffect without adding to deps.
  // useLayoutEffect keeps it in sync before any useEffect fires (runs synchronously
  // after DOM mutations, before the browser paints and before useEffects).
  const aptCtxRef = React.useRef(appointmentContext);
  React.useLayoutEffect(() => {
    aptCtxRef.current = appointmentContext;
  });

  // Load available services once on mount for pricing lookup
  React.useEffect(() => {
    let cancelled = false;
    getServicesAction()
      .then((services) => {
        if (!cancelled && services) {
          setAvailableServices(services);
        }
      })
      .catch(() => {
        // Silently fail — will fall back to hardcoded costs
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Load existing cases on mount / tooth change ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    getClinicalCasesByToothAction(patientId, tooth.id)
      .then((data) => {
        if (cancelled) return;
        setCases(data);
        setSaveMsg(null);
        setForm(
          data.length > 0
            ? emptyForm(tooth, data[0], undefined, availableServices)
            : emptyForm(tooth, undefined, aptCtxRef.current, availableServices),
        );
        setLoadedForTooth(tooth.id);
      })
      .catch(() => {
        if (cancelled) return;
        setCases([]);
        setSaveMsg(null);
        setLoadedForTooth(tooth.id);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, tooth.id, availableServices]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generic field updater ────────────────────────────────────────────────
  function field<K extends keyof CaseFormState>(
    name: K,
    value: CaseFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Status label helper ──────────────────────────────────────────────────
  const lang = locale === "ar" ? "ar" : "en";

  const toothStatusLabel = TOOTH_STATUS_LABELS[tooth.status][lang];

  // ── Save handler ─────────────────────────────────────────────────────────
  function handleSave() {
    setSaveMsg(null);

    startTransition(async () => {
      const payload: ClinicalCasePayload = {
        id: form.editingId,
        patientId,
        toothNumber: tooth.id,
        toothStatus: tooth.status,
        diagnosis: form.diagnosis || undefined,
        procedure: form.procedure || undefined,
        procedureKey: form.procedureKey || undefined,
        notes: form.notes || undefined,
        estimatedCost: Number(form.estimatedCost),
        status: form.status,
        sessionDate: form.sessionDate || undefined,
        completedAt:
          form.status === TreatmentStatus.COMPLETED
            ? new Date().toISOString()
            : undefined,
      };

      const result = await upsertClinicalCaseAction(payload);

      if (result) {
        setSaveMsg({ ok: true, text: t("caseSaved") });
        // Merge into local list (upsert semantics)
        setCases((prev) => {
          const idx = prev.findIndex((c) => c.id === result.id);
          return idx >= 0
            ? [result, ...prev.filter((_, i) => i !== idx)]
            : [result, ...prev];
        });
        setForm(emptyForm(tooth, result));
        onCaseSaved?.(result);
      } else {
        setSaveMsg({ ok: false, text: t("caseError") });
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800"
    >
      {/* ─── Panel Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/60 dark:bg-slate-800/40">
        {/* Tooth number badge */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-xl font-black text-blue-700 dark:text-blue-300 shadow-sm">
          {tooth.id}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {t("casePanelTitle", { toothNumber: tooth.id })}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">
              {toothStatusLabel}
            </span>
            {cases.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
              >
                {cases.length} {t("casesForTooth")}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-slate-400" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t("closeCase")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ─── Panel Body ────────────────────────────────────────────────────── */}
      <div className="p-6 space-y-5">
        {isLoading ? (
          /* Loading spinner */
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">{t("loadingRecords")}</span>
          </div>
        ) : (
          <>
            {/* ── Appointment context banner ──────────────────────────── */}
            {appointmentContext && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/15 px-4 py-3">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {t("appointmentBooked")}: {appointmentContext.procedure}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-500 dark:text-amber-500">
                    {new Date(appointmentContext.date).toLocaleDateString(
                      locale === "ar" ? "ar-EG" : "en-US",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                    {" · "}
                    {appointmentContext.appointmentStatus === "SCHEDULED"
                      ? "منتظر"
                      : appointmentContext.appointmentStatus === "CONFIRMED"
                        ? "مؤكد"
                        : appointmentContext.appointmentStatus === "IN_PROGRESS"
                          ? "جارٍ"
                          : appointmentContext.appointmentStatus === "COMPLETED"
                            ? "مكتمل"
                            : appointmentContext.appointmentStatus}
                  </p>
                </div>
              </div>
            )}

            {/* ── Context hint ────────────────────────────────────────────── */}
            {cases.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                <PlusCircle className="h-4 w-4 shrink-0" />
                {t("newCase")}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                <FileText className="h-4 w-4 shrink-0" />
                {t("existingCase")}
              </div>
            )}

            {/* ── Form Grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Diagnosis — full width */}
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>{t("caseDiagnosis")}</label>
                <input
                  type="text"
                  value={form.diagnosis}
                  onChange={(e) => field("diagnosis", e.target.value)}
                  placeholder={t("caseDiagnosisPlaceholder")}
                  className={INPUT_CLS}
                />
              </div>

              {/* Procedure Type Dropdown */}
              <div>
                <label className={LABEL_CLS}>{t("procedureType")}</label>
                <select
                  value={form.procedureKey}
                  onChange={(e) => {
                    const selectedKey = e.target.value;
                    const procDef = PROCEDURE_BY_KEY[selectedKey];
                    if (procDef) {
                      // Update procedure name and key
                      field("procedureKey", selectedKey);
                      field("procedure", locale === "ar" ? procDef.labelAr : procDef.labelEn);
                      
                      // Auto-update cost from services or hardcoded value
                      const serviceMatch = availableServices.find(
                        (s) => {
                          const procedureTypeMap: Record<string, string> = {
                            procedureCleaning: "TEETH_CLEANING",
                            procedureReview: "FILLING",
                            procedureRootCanal: "ROOT_CANAL",
                            procedureCrown: "CROWN",
                            procedureExtraction: "EXTRACTION",
                            procedureWisdomExtraction: "EXTRACTION",
                            procedureScaling: "TEETH_CLEANING",
                            procedureCheckup: "EXAMINATION",
                            procedureXray: "XRAY",
                            procedureFluoride: "TEETH_CLEANING",
                            procedureBraces: "BRACES",
                            procedureWhitening: "BLEACHING",
                            procedureVeneer: "CROWN",
                            procedureImplant: "OTHER",
                            procedureBridge: "OTHER",
                            procedureDenture: "OTHER",
                            procedureGumTreatment: "OTHER",
                          };
                          return s.procedureType === procedureTypeMap[selectedKey];
                        }
                      );
                      
                      if (serviceMatch) {
                        field("estimatedCost", serviceMatch.price);
                      } else if (procDef) {
                        field("estimatedCost", procDef.estimatedCost);
                      }
                    }
                  }}
                  className={INPUT_CLS}
                >
                  <option value="">{t("selectProcedure")}</option>
                  {Object.values(PROCEDURE_BY_KEY).map((proc) => (
                    <option key={proc.key} value={proc.key}>
                      {locale === "ar" ? proc.labelAr : proc.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Procedure Name (auto-filled) */}
              <div>
                <label className={LABEL_CLS}>{t("caseProcedure")}</label>
                <input
                  type="text"
                  value={form.procedure}
                  onChange={(e) => field("procedure", e.target.value)}
                  placeholder={t("caseProcedurePlaceholder")}
                  className={`${INPUT_CLS} bg-slate-100 dark:bg-slate-800`}
                  readOnly={!!form.procedureKey} // Read-only if auto-filled
                />
              </div>

              {/* Estimated Cost */}
              <div>
                <label className={LABEL_CLS}>{t("caseCost")}</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={form.estimatedCost}
                  onChange={(e) =>
                    field("estimatedCost", Number(e.target.value))
                  }
                  className={INPUT_CLS}
                />
              </div>

              {/* Session Date */}
              <div>
                <label className={LABEL_CLS}>{t("caseDate")}</label>
                <Input
                  type="date"
                  value={form.sessionDate}
                  icon={<Calendar className="h-4 w-4" />}
                  onChange={(e) => field("sessionDate", e.target.value)}
                  className={INPUT_CLS}
                />
              </div>

              {/* Case Status */}
              <div>
                <label className={LABEL_CLS}>{t("caseStatus")}</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    field("status", e.target.value as TreatmentStatus)
                  }
                  className={INPUT_CLS}
                >
                  {Object.values(TreatmentStatus).map((s) => (
                    <option key={s} value={s}>
                      {TREATMENT_STATUS_LABELS[s][lang]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes — full width */}
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>{t("caseNotes")}</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => field("notes", e.target.value)}
                  placeholder={t("caseNotesPlaceholder")}
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>
            </div>

            {/* ── Save feedback message ────────────────────────────────────── */}
            <AnimatePresence>
              {saveMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={[
                    "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border",
                    saveMsg.ok
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300",
                  ].join(" ")}
                >
                  {saveMsg.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {saveMsg.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Action buttons ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-2xl"
              >
                {t("cancel")}
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 shadow-lg px-8 min-w-35"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin rtl:ml-2 ltr:mr-2" />
                    {t("savingCase")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                    {t("saveCase")}
                  </>
                )}
              </Button>
            </div>

            {/* ── Case History ─────────────────────────────────────────────── */}
            {cases.length > 1 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                {/* Toggle button */}
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("sessionHistory")} ({cases.length - 1})
                  </span>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {/* Collapsible history list */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {cases.slice(1).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3"
                          >
                            {/* Tooth badge */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs font-bold text-blue-700 dark:text-blue-300">
                              {tooth.id}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {c.diagnosis && (
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  {c.diagnosis}
                                </p>
                              )}
                              {c.procedure && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {c.procedure}
                                </p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                {c.sessionDate && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <CalendarDays className="h-3 w-3" />
                                    {new Date(c.sessionDate).toLocaleDateString(
                                      locale === "ar" ? "ar-EG" : "en-US",
                                    )}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}
                                >
                                  {TREATMENT_STATUS_LABELS[c.status][lang]}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
