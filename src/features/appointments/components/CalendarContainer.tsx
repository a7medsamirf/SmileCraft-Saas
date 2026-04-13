"use client";

import React, { useState, useEffect } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { DailyAgenda } from "./DailyAgenda";
import { useTranslations } from "next-intl";
import { getAppointmentStatsAction } from "../serverActions";
import { Loader2 } from "lucide-react";

interface CalendarContainerProps {
  locale: string;
}

export function CalendarContainer({ locale }: CalendarContainerProps) {
  const t = useTranslations("Appointments");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({ monthlyTotal: 0, todayTotal: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await getAppointmentStatsAction(currentDate, selectedDate);
        if (isMounted) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch appointment stats:", error);
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [currentDate, selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 xl:col-span-4 sticky top-4">
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          locale={locale}
        />

        <div className="mt-6 glass-card p-5 border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10">
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>{t("appointmentStats")}</span>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
                day: "numeric",
                month: "short",
              }).format(selectedDate)}
            </span>
          </h4>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-tight">
                {t("monthlyTotal")}
              </p>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  stats.monthlyTotal
                )}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-tight">
                {t("todayTotal")}
              </p>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                ) : (
                  stats.todayTotal
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 xl:col-span-8">
        <DailyAgendaWrapper selectedDate={selectedDate} locale={locale} />
      </div>
    </div>
  );
}

function DailyAgendaWrapper({
  selectedDate,
  locale,
}: {
  selectedDate: Date;
  locale: string;
}) {
  const t = useTranslations("Appointments");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t("agendaFor")}{" "}
          {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(selectedDate)}
        </h3>
      </div>
      <DailyAgenda selectedDate={selectedDate} />
    </div>
  );
}
