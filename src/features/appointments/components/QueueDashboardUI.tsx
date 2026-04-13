"use client";

import { useTransition } from "react";
import { Users, Clock3, CircleCheckBig, Ban, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppointmentStatus } from "../types";
import { updateAppointmentStatusAction } from "../serverActions";

interface QueueAppointment {
  id: string;
  patientName: string;
  startTime: string;
  type: string | null;
  status: AppointmentStatus;
}

interface QueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

interface QueueDashboardUIProps {
  appointments: QueueAppointment[];
  stats: QueueStats;
}

export function QueueDashboardUI({ appointments, stats }: QueueDashboardUIProps) {
  const t = useTranslations("Appointments");
  const [isPending, startTransition] = useTransition();

  const handleStatusUpdate = (id: string, status: AppointmentStatus) => {
    startTransition(async () => {
      await updateAppointmentStatusAction(id, status);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("queueTotal")}</p>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("queuePending")}</p>
            <Clock3 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("queueInProgress")}</p>
            <Play className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.inProgress}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("queueCompleted")}</p>
            <CircleCheckBig className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("queueCancelled")}</p>
            <Ban className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.cancelled}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60">
              <tr className="text-sm text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 text-right">{t("patientName")}</th>
                <th className="px-4 py-3 text-right">{t("time")}</th>
                <th className="px-4 py-3 text-right">{t("procedure")}</th>
                <th className="px-4 py-3 text-right">{t("status")}</th>
                <th className="px-4 py-3 text-right">{t("queueActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointments.map((appointment) => {
                const statusStyle = getStatusStyle(appointment.status);
                const statusLabel = getStatusLabel(t, appointment.status);

                return (
                  <tr key={appointment.id}>
                    <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{appointment.patientName}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{appointment.startTime}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{appointment.type ?? t("queueNoProcedure")}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {appointment.status === AppointmentStatus.SCHEDULED && (
                          <button
                            className="rounded-lg bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/25 disabled:opacity-50"
                            onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.CONFIRMED)}
                            disabled={isPending}
                          >
                            {t("queueStart")}
                          </button>
                        )}
                        {appointment.status === AppointmentStatus.CONFIRMED && (
                          <button
                            className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/25 disabled:opacity-50"
                            onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.COMPLETED)}
                            disabled={isPending}
                          >
                            {t("queueComplete")}
                          </button>
                        )}
                        {(appointment.status === AppointmentStatus.SCHEDULED || appointment.status === AppointmentStatus.CONFIRMED) && (
                          <button
                            className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-500/25 disabled:opacity-50"
                            onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.CANCELLED)}
                            disabled={isPending}
                          >
                            {t("queueCancel")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400">
                    {t("queueEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: AppointmentStatus): string {
  if (status === AppointmentStatus.SCHEDULED) return "bg-blue-500/10 text-blue-600";
  if (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.IN_PROGRESS) return "bg-amber-500/10 text-amber-600";
  if (status === AppointmentStatus.COMPLETED) return "bg-emerald-500/10 text-emerald-600";
  if (status === AppointmentStatus.CANCELLED) return "bg-red-500/10 text-red-600";
  return "bg-slate-500/10 text-slate-600";
}

function getStatusLabel(t: ReturnType<typeof useTranslations>, status: AppointmentStatus): string {
  if (status === AppointmentStatus.SCHEDULED) return t("statusScheduled");
  if (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.IN_PROGRESS) return t("statusInProgress");
  if (status === AppointmentStatus.COMPLETED) return t("statusCompleted");
  if (status === AppointmentStatus.CANCELLED) return t("statusCancelled");
  return t("statusNoShow");
}
