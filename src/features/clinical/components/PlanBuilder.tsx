"use client";

import React, { useActionState, useMemo, useState, startTransition, useEffect } from "react";
import {
  PlanItem,
  TreatmentStatus,
  TREATMENT_STATUS_LABELS,
  CompletionRecord,
} from "../types/treatmentPlan";
import { submitInvoiceAction, InvoiceActionState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  X,
  History,
  Printer,
  Lock,
  FileText,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { PrintableInvoice } from "./PrintableInvoice";
import { getPatientAction } from "../serverActions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanBuilderProps {
  plan: PlanItem[];
  onStatusChange: (itemId: string, newStatus: TreatmentStatus) => void;
  completionHistory: CompletionRecord[];
  patientId: string;
}

// ---------------------------------------------------------------------------
// Sub-component: Status Checkbox (3-state)
// ---------------------------------------------------------------------------

interface StatusCheckboxProps {
  status: TreatmentStatus;
  onToggle: () => void;
  locked?: boolean;
}

function StatusCheckbox({ status, onToggle, locked }: StatusCheckboxProps) {
  const baseClasses =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95";

  // Locked: item came from clinical record — cannot be toggled back
  if (locked && status === TreatmentStatus.COMPLETED) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 shadow-emerald-500/20 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-950/30 cursor-not-allowed"
        title="مكتمل عبر السجل السريري — لتغيير الحالة افتح السجل السريري للسن"
      >
        <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  switch (status) {
    case TreatmentStatus.PLANNED:
      return (
        <button
          type="button"
          onClick={onToggle}
          className={`${baseClasses} border-slate-300 bg-white hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900`}
          title="مخطط — اضغط للبدء"
        >
          <Circle className="h-3 w-3 text-slate-300 dark:text-slate-600" />
        </button>
      );

    case TreatmentStatus.IN_PROGRESS:
      return (
        <button
          type="button"
          onClick={onToggle}
          className={`${baseClasses} border-amber-400 bg-amber-50 hover:border-emerald-500 dark:border-amber-500/50 dark:bg-amber-950/30`}
          title="قيد التنفيذ — اضغط للإكمال"
        >
          <CircleDot className="h-4 w-4 text-amber-500" />
        </button>
      );

    case TreatmentStatus.COMPLETED:
      return (
        <button
          type="button"
          onClick={onToggle}
          className={`${baseClasses} border-emerald-500 bg-emerald-50 shadow-emerald-500/20 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-950/30`}
          title="مكتمل — اضغط للتراجع"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </button>
      );
  }
}

// ---------------------------------------------------------------------------
// Sub-component: Invoice Mode Dialog
// ---------------------------------------------------------------------------

interface InvoiceModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fullPlanTotal: number;
  completedTotal: number;
  completedCount: number;
  totalCount: number;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  t: ReturnType<typeof useTranslations>;
  patientId: string;
}

function InvoiceModeDialog({
  isOpen,
  onClose,
  fullPlanTotal,
  completedTotal,
  completedCount,
  totalCount,
  formAction,
  isPending,
  t,
  patientId,
}: InvoiceModeDialogProps) {
  if (!isOpen) return null;

  const handleSubmit = (mode: "ALL" | "COMPLETED_ONLY") => {
    const formData = new FormData();
    formData.set("patientId", patientId);
    formData.set("invoiceMode", mode);
    startTransition(() => formAction(formData));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t("invoiceDialog")}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question */}
        <p className="mb-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          {t("invoiceQuestion")}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {/* Full Plan */}
          <button
            type="button"
            onClick={() => handleSubmit("ALL")}
            disabled={isPending}
            className="w-full rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-4 text-start transition hover:border-blue-300 hover:bg-blue-50 
             dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:border-blue-700 dark:text-white dark:hover:bg-blue-950/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("invoiceFullPlan")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {totalCount} {t("actions")}
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm px-3 py-1">
                {fullPlanTotal} {t("currency")}
              </Badge>
            </div>
          </button>

          {/* Completed Only */}
          <button
            type="button"
            onClick={() => handleSubmit("COMPLETED_ONLY")}
            disabled={isPending || completedCount === 0}
            className={`w-full rounded-2xl border-2 p-4 text-start transition ${
              completedCount === 0
                ? "border-slate-100 bg-slate-50/50 opacity-50 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/20"
                : "border-emerald-100 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("invoiceCompletedOnly")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {completedCount === 0
                    ? t("noCompletedItems")
                    : `${completedCount} ${t("actions")}`}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm px-3 py-1">
                {completedTotal} {t("currency")}
              </Badge>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-full mt-4 py-5 rounded-2xl"
        >
          {t("cancel") || "إلغاء"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component: PlanBuilder
// ---------------------------------------------------------------------------

export function PlanBuilder({
  plan,
  onStatusChange,
  completionHistory,
  patientId,
}: PlanBuilderProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
  const [patientInfo, setPatientInfo] = useState<{ firstName: string; lastName: string; phone: string } | null>(null);

  // Use React 19's useActionState for invoice form handling
  const [invoiceState, formAction, isPending] = useActionState(submitInvoiceAction, {
    success: null,
    message: "",
  });

  // Fetch patient info when invoice is successfully created
  useEffect(() => {
    if (invoiceState.success && invoiceState.invoiceId) {
      const fetchPatient = async () => {
        const patient = await getPatientAction(patientId);
        if (patient) {
          setPatientInfo(patient);
          setShowPrintableInvoice(true);
        }
      };
      fetchPatient();
    }
  }, [invoiceState.success, invoiceState.invoiceId, patientId]);

  // Derived computations
  const totalCost = useMemo(
    () => plan.reduce((sum, item) => sum + item.estimatedCost, 0),
    [plan],
  );

  const completedCost = useMemo(
    () =>
      plan
        .filter((item) => item.status === TreatmentStatus.COMPLETED)
        .reduce((sum, item) => sum + item.estimatedCost, 0),
    [plan],
  );

  const completedCount = useMemo(
    () => plan.filter((item) => item.status === TreatmentStatus.COMPLETED).length,
    [plan],
  );

  const progressPercent = plan.length > 0 ? (completedCount / plan.length) * 100 : 0;

  // Invoice items (for printable invoice)
  const invoiceItems = useMemo(() => {
    return plan.filter((item) => item.status === TreatmentStatus.COMPLETED);
  }, [plan]);

  // Cycle through statuses: PLANNED → IN_PROGRESS → COMPLETED → PLANNED
  // Exception: items locked via clinical record cannot be toggled back
  const handleToggleStatus = (item: PlanItem) => {
    // If COMPLETED from clinical record — block toggle
    if (item.fromClinicalRecord && item.status === TreatmentStatus.COMPLETED) {
      return;
    }
    const statusCycle: Record<TreatmentStatus, TreatmentStatus> = {
      [TreatmentStatus.PLANNED]: TreatmentStatus.IN_PROGRESS,
      [TreatmentStatus.IN_PROGRESS]: TreatmentStatus.COMPLETED,
      [TreatmentStatus.COMPLETED]: TreatmentStatus.PLANNED,
    };
    onStatusChange(item.id, statusCycle[item.status]);
  };

  // Badge variant based on status
  const getStatusBadge = (status: TreatmentStatus) => {
    const statusLabels = TREATMENT_STATUS_LABELS[status];
    const label = locale === "ar" ? statusLabels.ar : statusLabels.en;

    switch (status) {
      case TreatmentStatus.PLANNED:
        return (
          <Badge variant="warning" className="text-[10px] px-2">
            {label}
          </Badge>
        );
      case TreatmentStatus.IN_PROGRESS:
        return (
          <Badge className="text-[10px] px-2 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50">
            {label}
          </Badge>
        );
      case TreatmentStatus.COMPLETED:
        return (
          <Badge variant="success" className="text-[10px] px-2">
            {label}
          </Badge>
        );
    }
  };

  // Recent history (last 5 entries)
  const recentHistory = useMemo(
    () => completionHistory.slice(0, 5),
    [completionHistory],
  );

  return (
    <div className="glass-card p-6 transition-all duration-300 space-y-5">
      {/* Header + Total */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("proposedPlan")}
        </h3>
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {t("total")}: {totalCost} {t("currency")}
        </Badge>
      </div>

      {/* Progress Bar */}
      {plan.length > 0 && (
        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
            <span>{t("progressLabel")}</span>
            <span>
              {completedCount}/{plan.length} ({progressPercent.toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Plan Items */}
      <div className="space-y-3">
        {plan.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
            {t("noAffectedTeeth")}
          </div>
        ) : (
          plan.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                item.status === TreatmentStatus.COMPLETED
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                  : item.status === TreatmentStatus.IN_PROGRESS
                    ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10"
                    : "border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              }`}
            >
              {/* Smart Checkbox */}
              <StatusCheckbox
                status={item.status}
                onToggle={() => handleToggleStatus(item)}
                locked={item.fromClinicalRecord}
              />

              {/* Tooth ID circle */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors duration-300 ${
                  item.status === TreatmentStatus.COMPLETED
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                }`}
              >
                {item.toothId}
              </div>

              {/* Procedure info */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-sm font-bold pb-0.5 ${
                    item.status === TreatmentStatus.COMPLETED
                      ? "text-emerald-800 line-through decoration-emerald-400/50 dark:text-emerald-300"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {item.procedure}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {t("estimatedCost")}: {item.estimatedCost} {t("currency")}
                  </span>
                  {item.completedAt && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Clock className="h-3 w-3" />
                      {t("completedAt", {
                        date: new Date(item.completedAt).toLocaleDateString(
                          locale === "ar" ? "ar-EG" : "en-US",
                        ),
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              {getStatusBadge(item.status)}

              {/* Clinical record lock indicator */}
              {item.fromClinicalRecord && item.status === TreatmentStatus.COMPLETED && (
                <div
                  title="اكتمل عبر السجل السريري"
                  className="flex items-center justify-center rounded-full p-1 bg-emerald-100 dark:bg-emerald-900/30"
                >
                  <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* Invoice State Message */}
      {invoiceState.message && (
        <div
          className={`flex flex-col gap-2 rounded-xl p-3 text-sm font-semibold ${
            invoiceState.success
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {invoiceState.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>
              {invoiceState.success && invoiceState.invoiceId
                ? t(invoiceState.message, { invoiceId: invoiceState.invoiceId })
                : t(invoiceState.message)}
            </span>
          </div>
          {invoiceState.success && invoiceState.invoiceId && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded">
                {invoiceState.invoiceId}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Convert to Invoice Button */}
      <Button
        type="button"
        onClick={() => setShowInvoiceDialog(true)}
        disabled={isPending || plan.length === 0}
        className="w-full text-base font-bold shadow-blue-500/20 shadow-lg py-6 rounded-2xl"
      >
        {isPending ? (
          t("converting")
        ) : (
          <>
            <Receipt className="h-5 w-5 rtl:ml-2 ltr:mr-2" />
            {t("convertToInvoice")}
          </>
        )}
      </Button>

      {/* Invoice Mode Dialog */}
      <InvoiceModeDialog
        isOpen={showInvoiceDialog}
        onClose={() => setShowInvoiceDialog(false)}
        fullPlanTotal={totalCost}
        completedTotal={completedCost}
        completedCount={completedCount}
        totalCount={plan.length}
        formAction={formAction}
        isPending={isPending}
        t={t}
        patientId={patientId}
      />

      {/* Printable Invoice Modal */}
      {showPrintableInvoice && invoiceState.invoiceId && patientInfo && (
        <PrintableInvoice
          isOpen={showPrintableInvoice}
          onClose={() => setShowPrintableInvoice(false)}
          invoiceId={invoiceState.invoiceNumber || invoiceState.invoiceId}
          patientName={`${patientInfo.firstName} ${patientInfo.lastName}`}
          patientPhone={patientInfo.phone}
          items={invoiceItems}
          total={completedCost}
          mode="COMPLETED_ONLY"
          createdAt={new Date()}
        />
      )}

      {/* Recent Activity (Mini Timeline) */}
      {recentHistory.length > 0 && (
        <div className="pt-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-3">
            <History className="h-4 w-4 text-purple-500" />
            {t("recentActivity")}
          </h4>
          <div className="space-y-2">
            {recentHistory.map((record) => {
              const statusLabel =
                TREATMENT_STATUS_LABELS[record.newStatus][
                  locale === "ar" ? "ar" : "en"
                ];

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                    <span className="text-[9px] font-bold">
                      {record.toothId}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {record.procedure} → {statusLabel}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(record.timestamp).toLocaleTimeString(
                        locale === "ar" ? "ar-EG" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
