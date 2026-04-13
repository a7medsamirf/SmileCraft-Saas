"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Appointment, AppointmentStatus } from "../types";
import { Badge } from "@/components/ui/Badge";
import { Clock, UserCircle, Activity } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useSupabaseRealtime } from "@/hooks";
import toast from "react-hot-toast";

import { getAppointmentsByDateAction } from "../serverActions";

const statusVariantMap: Record<
  AppointmentStatus,
  {
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning";
  }
> = {
  [AppointmentStatus.SCHEDULED]: { variant: "warning" },
  [AppointmentStatus.CONFIRMED]: { variant: "default" },
  [AppointmentStatus.IN_PROGRESS]: { variant: "default" },
  [AppointmentStatus.COMPLETED]: { variant: "success" },
  [AppointmentStatus.CANCELLED]: { variant: "destructive" },
  [AppointmentStatus.NO_SHOW]: { variant: "secondary" },
};

interface DailyAgendaProps {
  selectedDate?: Date;
}

export function DailyAgenda({ selectedDate = new Date() }: DailyAgendaProps) {
  const t = useTranslations("Appointments");
  const locale = useLocale();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getAppointmentsByDateAction(selectedDate);
        if (isMounted) {
          setAppointments(data);
        }
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedDate.toDateString(), t]);

  // Realtime subscription for live updates
  const handleAppointmentChange = useCallback(async () => {
    // Refetch appointments when realtime event fires
    try {
      const data = await getAppointmentsByDateAction(selectedDate);
      setAppointments(data);
    } catch (error) {
      console.error("Failed to refetch appointments:", error);
    }
  }, [selectedDate]);

  useSupabaseRealtime("appointments", {
    onEvent: handleAppointmentChange,
    onError: (error) => {
      console.error("Realtime error:", error);
      toast.error(t("realtimeError") || "فشل في تحديث البيانات مباشرة");
    },
  });

  return (
    <div className="glass-card p-6 min-h-[400px] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("dailyAgenda")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock className="h-4 w-4" />
          <span>
            {appointments.length} {t("appointmentsCount") || "مواعيد"}
          </span>
        </div>
      </div>

      <div className="relative flex-1 overflow-x-auto hide-scrollbar">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">
            {t("loading")}
          </p>
            </div>
          </div>
        ) : (
          <table className="w-full whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("time")}</th>
                <th className="px-4 py-3 font-semibold">{t("patientName")}</th>
                <th className="px-4 py-3 font-semibold">{t("procedure")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointments.map((apt) => (
                <tr
                  key={apt.id}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group"
                >
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2 justify-start">
                      <div className="h-2 w-2 rounded-full bg-blue-500 group-hover:scale-125 transition-transform"></div>
                      {apt.time}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 justify-start">
                      <UserCircle className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {apt.patientName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap justify-start">
                      <Activity className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {apt.procedure || "—"}
                      </span>
                      {apt.toothNumber && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                          سن #{apt.toothNumber}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Badge
                      variant={statusVariantMap[apt.status].variant}
                      className="px-3 py-1"
                    >
                      {t(
                        `status${apt.status.charAt(0) + apt.status.slice(1).toLowerCase().replace(/_/g, "")}`,
                      )}
                    </Badge>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-slate-300 dark:text-slate-700">
                        <Clock className="h-12 w-12" />
                      </div>
                      <p className="text-slate-500">{t("noAppointments")}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
