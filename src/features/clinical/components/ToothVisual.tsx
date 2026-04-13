"use client";

import React, { useCallback, useState } from "react";
import {
  Tooth,
  ToothStatus,
  ToothType,
  TOOTH_STATUS_LABELS,
} from "../types/odontogram";
import { useTranslations, useLocale } from "next-intl";
import { Plus } from "lucide-react";

interface ColorOverride {
  fill: string;
  stroke: string;
}

interface ToothVisualProps {
  tooth: Tooth;
  onStatusChange: (id: number, newStatus: ToothStatus) => void;
  /** Optional callback fired when the user clicks a tooth — opens the case panel */
  onCaseOpen?: (tooth: Tooth) => void;
  /** Optional callback fired when the user requests a booking for this tooth */
  onBookAppointment?: (tooth: Tooth) => void;
  /** Optional color override from completed treatment (useOptimistic) */
  colorOverride?: ColorOverride;
  /** When true, renders an emerald indicator dot to signal an existing clinical case */
  hasClinicalCase?: boolean;
  /** When true, this tooth's status was pre-populated from an appointment booking */
  fromAppointment?: boolean;
}

/** Map ToothStatus enum strictly to Tailwind hex/CSS colors for the SVG fill */
const COLOR_MAP: Record<ToothStatus, { fill: string; stroke: string }> = {
  [ToothStatus.HEALTHY]: { fill: "#f8fafc", stroke: "#cbd5e1" }, // slate-50 / slate-300
  [ToothStatus.CARIOUS]: { fill: "#ef4444", stroke: "#b91c1c" }, // red-500 / red-700
  [ToothStatus.MISSING]: { fill: "transparent", stroke: "#94a3b8" }, // slate-400 dashed
  [ToothStatus.CROWN]: { fill: "#fbbf24", stroke: "#d97706" }, // amber-400 / amber-600
  [ToothStatus.FILLING]: { fill: "#3b82f6", stroke: "#1d4ed8" }, // blue-500 / blue-700
  [ToothStatus.ROOT_CANAL]: { fill: "#a855f7", stroke: "#7e22ce" }, // purple-500 / purple-700
};

/** Anatomical SVG paths for different tooth types (Universal Numbering) */
const TOOTH_PATHS: Record<ToothType, string> = {
  [ToothType.MOLAR]:
    "M 15 20 C 15 5, 85 5, 85 20 C 85 35, 95 50, 80 110 C 70 110, 65 90, 50 90 C 35 90, 30 110, 20 110 C 5 50, 15 35, 15 20 Z",
  [ToothType.PREMOLAR]:
    "M 25 20 C 25 8, 75 8, 75 20 C 75 35, 85 50, 70 110 C 60 110, 55 90, 50 90 C 45 90, 40 110, 30 110 C 15 50, 25 35, 25 20 Z",
  [ToothType.CANINE]:
    "M 30 25 C 30 10, 50 0, 70 25 C 70 45, 80 60, 60 115 C 50 115, 50 95, 50 95 C 50 95, 50 115, 40 115 C 20 60, 30 45, 30 25 Z",
  [ToothType.INCISOR]:
    "M 30 15 L 70 15 C 70 35, 80 55, 65 110 C 55 110, 50 95, 50 95 C 50 95, 45 110, 35 110 C 20 55, 30 35, 30 15 Z",
};

// ---------------------------------------------------------------------------
// Design Decision (Performance): React.memo
// Mapping 32 complex SVG elements causes heavy React reconciliation if the
// parent array state updates. Using memo ensures ONLY the clicked tooth re-renders.
// ---------------------------------------------------------------------------
export const ToothVisual = React.memo(
  ({
    tooth,
    onStatusChange,
    onCaseOpen,
    onBookAppointment,
    colorOverride,
    hasClinicalCase = false,
    fromAppointment = false,
  }: ToothVisualProps) => {
    const t = useTranslations("Clinical");
    const appointmentT = useTranslations("Appointments");
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);

    // Use colorOverride if provided, otherwise fall back to status-based colors
    const colors = colorOverride ?? COLOR_MAP[tooth.status];
    const toothPath = TOOTH_PATHS[tooth.type] || TOOTH_PATHS[ToothType.INCISOR];

    // Track if this tooth was recently overridden (for pulse animation)
    const hasOverride = !!colorOverride;

    // Toggle the status-picker popover AND notify parent to open the case panel
    const togglePopover = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
        onCaseOpen?.(tooth);
      },
      [tooth, onCaseOpen],
    );

    const handleSelect = useCallback(
      (status: ToothStatus, e: React.MouseEvent) => {
        e.stopPropagation();
        onStatusChange(tooth.id, status);
        setIsOpen(false);
      },
      [tooth.id, onStatusChange],
    );

    const handleBookClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onBookAppointment?.(tooth);
      },
      [onBookAppointment, tooth],
    );

    // Click-outside listener for the popover
    React.useEffect(() => {
      if (!isOpen) return;
      const close = () => setIsOpen(false);
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }, [isOpen]);

    const isMissing = tooth.status === ToothStatus.MISSING;

    return (
      <div className="relative inline-flex flex-col items-center group">
        {/* ── Appointment-sourced indicator (amber, start side) ── */}
        {fromAppointment && !colorOverride && (
          <span
            className="absolute top-0 z-10 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 shadow-sm"
            title="مُحدَّث من موعد محجوز"
          />
        )}

        {/* ── Clinical case indicator (emerald, end side) ── */}
        {hasClinicalCase && (
          <span className="absolute top-0 z-10 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm" />
        )}

        {/* ── Status-picker popover ───────────────────────────────────────── */}
        {isOpen && (
          <div
            className="absolute z-50 mb-2 bottom-full w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 border-b border-slate-100 px-2 pb-1 text-center text-[10px] font-bold text-slate-400 dark:border-slate-800">
              {t("selectStatus")}
            </div>
            {Object.values(ToothStatus).map((st) => (
              <button
                key={st}
                onClick={(e) => handleSelect(st, e)}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-right text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {TOOTH_STATUS_LABELS[st][locale === "ar" ? "ar" : "en"]}
              </button>
            ))}
          </div>
        )}

        {/* ── Book appointment quick action ───────────────────────────── */}
        {onBookAppointment && (
          <button
            type="button"
            onClick={handleBookClick}
            title={appointmentT("bookAppointment")}
            className="absolute top-0 inset-inline-end-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm opacity-0 transition-opacity duration-200 hover:bg-blue-500 hover:text-white focus:opacity-100 focus:outline-none dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-blue-500 group-hover:opacity-100"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* ── SVG Tooth element ───────────────────────────────────────────── */}
        <div
          onClick={togglePopover}
          className={`cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
            hasOverride ? "animate-pulse" : ""
          }`}
          role="button"
          title={`${t("toothLabel")} ${tooth.id} - ${TOOTH_STATUS_LABELS[tooth.status][locale === "ar" ? "ar" : "en"]}`}
        >
          <svg
            viewBox="0 0 100 120"
            width="40"
            height="48"
            className="drop-shadow-sm transition-colors duration-500"
            style={{ opacity: isMissing ? 0.3 : 1 }}
          >
            {/* Glow ring for overridden teeth */}
            {hasOverride && (
              <circle
                cx="50"
                cy="60"
                r="55"
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                opacity="0.3"
                className="animate-ping"
                style={{ transformOrigin: "center", animationDuration: "2s" }}
              />
            )}
            {/* Anatomically correct path based on tooth type */}
            <path
              d={toothPath}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={isMissing ? "4" : "3"}
              strokeDasharray={isMissing ? "5,5" : "none"}
              strokeLinejoin="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>

        {/* ── Universal ID label ──────────────────────────────────────────── */}
        <span
          className={`mt-1 text-[10px] font-bold ${
            hasOverride
              ? "text-emerald-600 dark:text-emerald-400"
              : hasClinicalCase
                ? "text-blue-600 dark:text-blue-400"
                : fromAppointment
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {tooth.id}
        </span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom equality: re-render only when the relevant props actually change
    return (
      prevProps.tooth.status === nextProps.tooth.status &&
      prevProps.tooth.id === nextProps.tooth.id &&
      prevProps.colorOverride?.fill === nextProps.colorOverride?.fill &&
      prevProps.colorOverride?.stroke === nextProps.colorOverride?.stroke &&
      prevProps.hasClinicalCase === nextProps.hasClinicalCase &&
      prevProps.fromAppointment === nextProps.fromAppointment &&
      prevProps.onBookAppointment === nextProps.onBookAppointment
    );
  },
);

// Setting displayName for fast-refresh debugging
ToothVisual.displayName = "ToothVisual";
