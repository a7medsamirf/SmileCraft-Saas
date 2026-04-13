// =============================================================================
// SmileCraft CMS — Today's Queue UI
// Client Component — renders the full queue table with status badges
// and action buttons. Receives data as props from the Server Component.
//
// Status Badge color scheme:
//   SCHEDULED  → Gray  (waiting outside)
//   CONFIRMED  → Blue  (inside the clinic / in-progress)
//   COMPLETED  → Green (done)
//   CANCELLED  → Red   (cancelled)
//   NO_SHOW    → Amber (didn't show up)
//
// src/features/appointments/components/TodayQueueUI.tsx
// =============================================================================
"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Clock3,
  CircleCheckBig,
  Ban,
  Play,
  CheckCircle2,
  Stethoscope,
  CalendarX2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PatientOdontogramModal } from "@/features/clinical/components/PatientOdontogramModal";
import { updateAppointmentStatusAction } from "../actions/updateStatusAction";
import type { QueueAppointment, QueueStats } from "../services/queue";
import type { AppointmentStatus } from "@/types/database.types";
import { toast } from "react-hot-toast";

// ---------------------------------------------------------------------------
// Status Badge Configuration
// Scheduled = Gray, Confirmed = Blue, Completed = Green, Cancelled = Red, No-Show = Amber
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  AppointmentStatus,
  { labelKey: string; badge: string; dot: string; row: string }
> = {
  SCHEDULED: {
    labelKey: "statusScheduled",
    badge:
      "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300",
    dot: "bg-slate-400",
    row: "",
  },
  CONFIRMED: {
    labelKey: "statusConfirmed",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500 animate-pulse",
    row: "bg-blue-50/40 dark:bg-blue-900/10",
  },
  COMPLETED: {
    labelKey: "statusCompleted",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    row: "",
  },
  CANCELLED: {
    labelKey: "statusCancelled",
    badge: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
    row: "opacity-60",
  },
  NO_SHOW: {
    labelKey: "statusNoShow",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    row: "opacity-60",
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TodayQueueUIProps {
  appointments: QueueAppointment[];
  stats: QueueStats;
  /** Current locale string, e.g. "ar" or "en" — used to build patient links */
  locale: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function TodayQueueUI({
  appointments,
  stats,
  locale,
}: TodayQueueUIProps) {
  const t = useTranslations("Appointments");
  const [isPending, startTransition] = useTransition();

  // ── Odontogram Modal State ─────────────────────────────────────────────
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);

  const openMapModal = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setIsMapModalOpen(true);
  };

  // ── Status change handler ───────────────────────────────────────────────
  function handleStatusChange(id: string, newStatus: AppointmentStatus) {
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(id, newStatus);
      if (!result.success) {
        // Non-blocking — the Realtime listener will keep the UI in sync.
        console.error("[TodayQueueUI] Status update failed:", result.error);
        toast.error(t("queueError") || "Status update failed");
      } else {
        // Show localized success notification
        if (newStatus === "CONFIRMED") {
          toast.success(t("notificationStarted"), {
            icon: "🏥",
            className: "font-bold",
          });
        } else if (newStatus === "COMPLETED") {
          toast.success(t("notificationCompleted"), {
            icon: "✅",
            className: "font-bold",
          });
        } else if (newStatus === "CANCELLED") {
          toast.error(t("notificationCancelled"), {
            icon: "🚫",
            className: "font-bold border-red-100",
          });
        }
      }
      // No need to call router.refresh() here — the RealtimeAppointmentHandler
      // will receive the DB change event and call router.refresh() automatically.
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={t("queueTotal")}
          value={stats.total}
          icon={<Users className="h-4 w-4 text-slate-400" />}
        />
        <StatCard
          label={t("queuePending")}
          value={stats.scheduled}
          icon={<Clock3 className="h-4 w-4 text-slate-400" />}
          highlight="slate"
        />
        <StatCard
          label={t("queueInProgress")}
          value={stats.confirmed}
          icon={<Play className="h-4 w-4 text-blue-500" />}
          highlight="blue"
        />
        <StatCard
          label={t("queueCompleted")}
          value={stats.completed}
          icon={<CircleCheckBig className="h-4 w-4 text-emerald-500" />}
          highlight="emerald"
        />
        <StatCard
          label={t("queueCancelled")}
          value={stats.cancelled}
          icon={<Ban className="h-4 w-4 text-red-500" />}
          highlight="red"
        />
      </div>

      {/* ── Queue Table ─────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-215">
            {/* Table head */}
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <th className="w-10 px-5 py-4 text-start">#</th>
                <th className="px-5 py-4 text-start">{t("patientName")}</th>
                <th className="px-5 py-4 text-start">{t("queuePhone")}</th>
                <th className="px-5 py-4 text-start">{t("time")}</th>
                <th className="px-5 py-4 text-start">{t("procedure")}</th>
                <th className="px-5 py-4 text-start">{t("status")}</th>
                <th className="px-5 py-4 text-start">{t("queueActions")}</th>
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {appointments.length === 0 ? (
                <EmptyRow colSpan={7} label={t("queueEmpty")} />
              ) : (
                appointments.map((apt, idx) => {
                  const cfg = STATUS_CONFIG[apt.status];

                  const canSummon = apt.status === "SCHEDULED";
                  const canComplete = apt.status === "CONFIRMED";
                  const canCancel =
                    apt.status === "SCHEDULED" || apt.status === "CONFIRMED";
                  const isTerminal =
                    apt.status === "COMPLETED" ||
                    apt.status === "CANCELLED" ||
                    apt.status === "NO_SHOW";

                  return (
                    <tr
                      key={apt.id}
                      className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-white/2 ${cfg.row}`}
                    >
                      {/* Row index */}
                      <td className="px-5 py-4 text-sm font-medium text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Patient name */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {apt.patientName}
                        </span>
                      </td>

                      {/* Phone — always LTR */}
                      <td
                        className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400"
                        dir="ltr"
                      >
                        {apt.patientPhone || "—"}
                      </td>

                      {/* Start time — monospace + LTR */}
                      <td
                        className="px-5 py-4 font-mono text-sm font-medium text-slate-700 dark:text-slate-300"
                        dir="ltr"
                      >
                        {apt.startTime}
                      </td>

                      {/* Procedure type */}
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {apt.type ?? (
                          <span className="italic text-slate-400">
                            {t("queueNoProcedure")}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <StatusBadge
                          config={cfg}
                          label={t(cfg.labelKey as Parameters<typeof t>[0])}
                        />
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* SCHEDULED → CONFIRMED: Summon patient into the clinic */}
                          {canSummon && (
                            <ActionButton
                              label={t("queueStart")}
                              icon={<Play className="h-3.5 w-3.5" />}
                              colorClass="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                              disabled={isPending}
                              onClick={() =>
                                handleStatusChange(apt.id, "CONFIRMED")
                              }
                            />
                          )}

                          {/* CONFIRMED → COMPLETED: End the visit */}
                          {canComplete && (
                            <ActionButton
                              label={t("queueComplete")}
                              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                              colorClass="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                              disabled={isPending}
                              onClick={() =>
                                handleStatusChange(apt.id, "COMPLETED")
                              }
                            />
                          )}

                          {/* SCHEDULED | CONFIRMED → CANCELLED */}
                          {canCancel && (
                            <ActionButton
                              label={t("queueCancel")}
                              icon={<CalendarX2 className="h-3.5 w-3.5" />}
                              colorClass="bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                              disabled={isPending}
                              onClick={() =>
                                handleStatusChange(apt.id, "CANCELLED")
                              }
                            />
                          )}

                          {/* View Patient MouthMap → Clinical module */}
                          {!isTerminal && (
                            <button
                              type="button"
                              onClick={() => openMapModal(apt.patientId, apt.patientName)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-400"
                              title="عرض خريطة الأسنان في الوحدة السريرية"
                            >
                              <Stethoscope className="h-3.5 w-3.5" />
                              {t("queueViewMap")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PatientOdontogramModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        patientId={selectedPatientId}
        patientName={selectedPatientName}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single KPI stat card */
function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: "slate" | "blue" | "emerald" | "red";
}) {
  const valueColor: Record<string, string> = {
    slate: "text-slate-700 dark:text-slate-200",
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
  };
  const color = highlight
    ? valueColor[highlight]
    : "text-slate-900 dark:text-white";

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/** Animated status badge with leading dot */
function StatusBadge({
  config,
  label,
}: {
  config: (typeof STATUS_CONFIG)[AppointmentStatus];
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}

/** Reusable icon + label button */
function ActionButton({
  label,
  icon,
  colorClass,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${colorClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Full-width empty state row */
function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-20 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-600">
          <CalendarX2 className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">{label}</p>
        </div>
      </td>
    </tr>
  );
}
