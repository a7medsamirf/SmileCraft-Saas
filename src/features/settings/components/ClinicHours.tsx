"use client";

import React, { useEffect } from "react";
import { Clock, CalendarOff, Save, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { useClinicSettings } from "../hooks/useClinicSettings";
import { BusinessDay } from "../types";

const DEFAULT_HOURS: BusinessDay[] = [
  { day: "saturday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "sunday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "monday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "tuesday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "wednesday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "thursday", isOpen: true, start: "09:00", end: "14:00" },
  { day: "friday", isOpen: false, start: "09:00", end: "17:00" },
];

const scheduleSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.string(),
        isOpen: z.boolean(),
        start: z.string(),
        end: z.string(),
      }),
    )
    .refine(
      (days) => {
        return days.every((d) => !d.isOpen || d.start < d.end);
      },
      {
        message: "invalidTime",
      },
    ),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export function ClinicHours() {
  const t = useTranslations("Settings.clinicHours");
  const { hours, updateBusinessHours } = useClinicSettings();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { days: hours.length > 0 ? hours : DEFAULT_HOURS },
  });

  // Sync form with DB data when it loads
  useEffect(() => {
    if (hours.length > 0) {
      reset({ days: hours });
    }
  }, [hours, reset]);

  const onSubmit = (data: ScheduleFormValues) => {
    updateBusinessHours(data.days);
  };

  const watchDays = watch("days");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h2>
        {isDirty && (
          <Button
            onClick={handleSubmit(onSubmit)}
            className="rounded-2xl shadow-blue-500/20 shadow-lg"
          >
            <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("save")}
          </Button>
        )}
      </div>

      {errors.days?.root?.message && (
        <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            {t(errors.days.root.message as Parameters<typeof t>[0])}
          </span>
        </div>
      )}

      <div className="grid gap-4">
        {watchDays.map((day, index) => (
          <div
            key={day.day}
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 transition-all ${
              day.isOpen ? "glass-card" : "glass-card grayscale opacity-60"
            }`}
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div
                className={`p-3 rounded-2xl ${day.isOpen ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}
              >
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                  {t(`days.${day.day}`)}
                </span>
                {!day.isOpen && (
                  <span className="ml-3 text-xs font-semibold text-red-500 uppercase tracking-wider">
                    {t("offDay")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:block">
                  {t("start")}
                </span>
                <input
                  type="time"
                  disabled={!day.isOpen}
                  {...register(`days.${index}.start`)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:block">
                  {t("end")}
                </span>
                <input
                  type="time"
                  disabled={!day.isOpen}
                  {...register(`days.${index}.end`)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 disabled:opacity-50"
                />
              </div>
              <Button
                variant={day.isOpen ? "outline" : "primary"}
                size="sm"
                className="rounded-xl px-4"
                onClick={() =>
                  setValue(`days.${index}.isOpen`, !day.isOpen, {
                    shouldDirty: true,
                  })
                }
              >
                {day.isOpen ? (
                  <>
                    <CalendarOff className="h-4 w-4 me-2" /> {t("offDay")}
                  </>
                ) : (
                  <span className="capitalize">{t(`days.${day.day}`)}</span>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
