// =============================================================================
// SmileCraft CMS — Today's Queue with Optimistic Updates
// Client Component wrapper that adds optimistic UI for:
//   1. Status transitions (SCHEDULED → CONFIRMED → COMPLETED/CANCELLED)
//   2. New appointment insertions from Realtime events
//
// Uses React 19's useOptimistic hook for instant UI feedback before
// the Server Action resolves and Realtime syncs the final state.
//
// src/features/appointments/components/TodayQueueWithOptimism.tsx
// =============================================================================
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
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

import { PatientOdontogramModal } from "@/features/clinical/components/PatientOdontogramModal";
import { updateAppointmentStatusAction } from "../actions/updateStatusAction";
import type { QueueAppointment, QueueStats } from "../services/queue";
import type { AppointmentStatus } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Optimistic state types
// ---------------------------------------------------------------------------
interface OptimisticUpdate {
  type: "statusChange" | "newAppointment";
  appointmentId?: string;
  newStatus?: AppointmentStatus;
  newAppointment?: QueueAppointment;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TodayQueueWithOptimismProps {
  appointments: QueueAppointment[];
  stats: QueueStats;
  locale: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TodayQueueWithOptimism({
  appointments: serverAppointments,
  stats: serverStats,
  locale,
}: TodayQueueWithOptimismProps) {
  const t = useTranslations("Appointments");
  const [isPending, startTransition] = useTransition();

  // ── Optimistic state ────────────────────────────────────────────────────
  const [optimisticUpdates, addOptimistic] = useOptimistic<
    OptimisticUpdate[],
    OptimisticUpdate
  >([], (_state, update) => [..._state, update]);

  // ── Odontogram Modal State ─────────────────────────────────────────────
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);

  const openMapModal = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setIsMapModalOpen(true);
  };

  // ── Compute merged appointments (server + optimistic) ───────────────────
  const mergedAppointments = mergeOptimisticUpdates(
    serverAppointments,
    optimisticUpdates,
  );

  // ── Compute merged stats ────────────────────────────────────────────────
  const mergedStats = computeStats(mergedAppointments);

  // ── Status change handler with optimistic update ────────────────────────
  function handleStatusChange(id: string, newStatus: AppointmentStatus) {
    // Add optimistic update immediately
    addOptimistic({
      type: "statusChange",
      appointmentId: id,
      newStatus,
    });

    startTransition(async () => {
      const result = await updateAppointmentStatusAction(id, newStatus);
      if (!result.success) {
        console.error("[TodayQueueWithOptimism] Status update failed:", result.error);
        toast.error(t("queueError") || "فشل في تحديث الحالة", {
          icon: "❌",
          duration: 4000,
        });
        // Note: Realtime will eventually sync the correct state from DB
        // No need to rollback manually — the server re-fetch will override
      } else {
        // Show localized success notification with appointment details
        const appointment = mergedAppointments.find(a => a.id === id);
        const patientName = appointment?.patientName || t("queuePatient");

        // Status change notifications with icons and colors
        const statusNotifications: Record<AppointmentStatus, { message: string; icon: string; type: "success" | "error" | "info" }> = {
          SCHEDULED: {
            message: t("notificationScheduled", { name: patientName, defaultValue: `تم جدولة موعد جديد لـ ${patientName}` }),
            icon: "📅",
            type: "info",
          },
          CONFIRMED: {
            message: t("notificationConfirm", { name: patientName, defaultValue: `تم تأكيد موعد ${patientName}` }),
            icon: "🏥",
            type: "success",
          },
          COMPLETED: {
            message: t("notificationCompleted", { name: patientName, defaultValue: `تم إكمال موعد ${patientName}` }),
            icon: "✅",
            type: "success",
          },
          CANCELLED: {
            message: t("notificationCancelled", { name: patientName, defaultValue: `تم إلغاء موعد ${patientName}` }),
            icon: "🚫",
            type: "error",
          },
          NO_SHOW: {
            message: t("notificationNoShow", { name: patientName, defaultValue: `لم يحضر ${patientName} للموعد` }),
            icon: "❌",
            type: "error",
          },
        };

        const notification = statusNotifications[newStatus];
        
        if (notification.type === "success") {
          toast.success(notification.message, {
            icon: notification.icon,
            className: "font-bold",
            duration: 4000,
          });
        } else if (notification.type === "error") {
          toast.error(notification.message, {
            icon: notification.icon,
            className: "font-bold border-red-100 dark:border-red-900/30",
            duration: 4000,
          });
        } else {
          toast(notification.message, {
            icon: notification.icon,
            className: "font-bold",
            duration: 4000,
          });
        }
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={t("queueTotal")}
          value={mergedStats.total}
          icon={<Users className="h-4 w-4 text-slate-400" />}
        />
        <StatCard
          label={t("queuePending")}
          value={mergedStats.scheduled}
          icon={<Clock3 className="h-4 w-4 text-slate-400" />}
          highlight="slate"
        />
        <StatCard
          label={t("queueInProgress")}
          value={mergedStats.confirmed}
          icon={<Play className="h-4 w-4 text-blue-500" />}
          highlight="blue"
        />
        <StatCard
          label={t("queueCompleted")}
          value={mergedStats.completed}
          icon={<CircleCheckBig className="h-4 w-4 text-emerald-500" />}
          highlight="emerald"
        />
        <StatCard
          label={t("queueCancelled")}
          value={mergedStats.cancelled}
          icon={<Ban className="h-4 w-4 text-red-500" />}
          highlight="red"
        />
      </div>

      {/* ── Queue Table ─────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-215">
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

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {mergedAppointments.length === 0 ? (
                <EmptyRow colSpan={7} label={t("queueEmpty")} />
              ) : (
                mergedAppointments.map((apt, idx) => {
                  const cfg = STATUS_CONFIG[apt.status];

                  const canSummon = apt.status === "SCHEDULED";
                  const canComplete = apt.status === "CONFIRMED";
                  const canCancel =
                    apt.status === "SCHEDULED" || apt.status === "CONFIRMED";
                  const isTerminal =
                    apt.status === "COMPLETED" ||
                    apt.status === "CANCELLED" ||
                    apt.status === "NO_SHOW";

                  // Check if this appointment has a pending optimistic update
                  const hasPendingUpdate = optimisticUpdates.some(
                    (u) => u.type === "statusChange" && u.appointmentId === apt.id,
                  );

                  return (
                    <tr
                      key={apt.id}
                      className={`transition-all duration-300 hover:bg-slate-50/60 dark:hover:bg-white/2 ${cfg.row} ${
                        hasPendingUpdate ? "" : ""
                      }`}
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merges server appointments with optimistic updates.
 * For statusChange: updates the status of the matching appointment.
 * For newAppointment: appends the new appointment to the list.
 */
function mergeOptimisticUpdates(
  serverAppointments: QueueAppointment[],
  optimisticUpdates: OptimisticUpdate[],
): QueueAppointment[] {
  // Start with a copy of server appointments
  const merged = [...serverAppointments];

  // Apply each optimistic update in order
  for (const update of optimisticUpdates) {
    if (update.type === "statusChange" && update.appointmentId && update.newStatus) {
      // Find and update the appointment status
      const idx = merged.findIndex((a) => a.id === update.appointmentId);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], status: update.newStatus };
      }
    } else if (update.type === "newAppointment" && update.newAppointment) {
      // Add new appointment to the list
      merged.push(update.newAppointment);
    }
  }

  // Sort by startTime ascending
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Computes queue stats from the merged appointments list.
 */
function computeStats(appointments: QueueAppointment[]): QueueStats {
  return {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === "SCHEDULED").length,
    confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
    cancelled: appointments.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW",
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Status Badge Configuration (copied from TodayQueueUI to keep self-contained)
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
// Sub-components
// ---------------------------------------------------------------------------

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
