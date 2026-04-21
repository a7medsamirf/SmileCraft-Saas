import React from "react";
import { getBusinessHoursAction } from "@/features/settings/serverActions";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageTransition } from "@/components/ui/PageTransition";

export default async function SchedulePage() {
  const t = await getTranslations("Settings.clinicHours");
  const commonT = await getTranslations("Common");
  const sidebarT = await getTranslations("Sidebar");
  
  const hours = await getBusinessHoursAction();

  const daysOrder = [
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            {sidebarT("schedule")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            جدول مواعيد عمل العيادة الرسمي لجميع الفروع.
          </p>
        </div>

        <div className="glass-card overflow-hidden shadow-xl border-slate-200/50 dark:border-slate-800/50">
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-bold">أوقات العمل الأسبوعية</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {daysOrder.map((dayKey) => {
              const dayInfo = hours.find((h) => h.day === dayKey) || {
                day: dayKey,
                isOpen: true,
                start: "09:00",
                end: "17:00",
              };

              return (
                <div
                  key={dayKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                >
                  <div className="flex items-center gap-4 mb-2 sm:mb-0">
                    <div className={`w-3 h-3 rounded-full ${dayInfo.isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[100px]">
                      {t(`days.${dayKey}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    {dayInfo.isOpen ? (
                      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100/50 dark:border-blue-800/50">
                        <span className="text-blue-700 dark:text-blue-300 font-bold tabular-nums">
                          {dayInfo.start}
                        </span>
                        <span className="text-blue-300 dark:text-blue-700">—</span>
                        <span className="text-blue-700 dark:text-blue-300 font-bold tabular-nums">
                          {dayInfo.end}
                        </span>
                      </div>
                    ) : (
                      <span className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm">
                        {t("offDay")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl p-4 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            هذا الجدول مرئي لجميع الموظفين. لتغيير أوقات العمل، يرجى مراجعة مدير النظام أو التوجه إلى صفحة الإعدادات (للمسؤولين فقط).
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
