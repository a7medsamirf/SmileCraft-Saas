"use client";

// =============================================================================
// Appointments Page — with Booking Form
// =============================================================================

import React, { useState } from "react";
import { Link } from "@/i18n/routing";
import { DailyAgenda } from "@/features/appointments/components/DailyAgenda";
import { BookingForm } from "@/features/appointments/components/BookingForm";
import { CalendarCheck, Plus, Activity } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { useTranslations } from "next-intl";

export default function AppointmentsPage() {
  const t = useTranslations("Appointments");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <PageTransition>
      <div className="w-full">
        
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
                   <CalendarCheck className="h-8 w-8 text-blue-600 dark:text-blue-500" />
               </div>

              {t("title")}
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {t("description")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Queue Link */}
            <Link
              href="/appointments/queue"
              className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-100 font-bold text-sm px-5 py-3 rounded-xl transition-all border border-blue-100 relative"
            >
              <Activity className="w-5 h-5" />
              {t("queueTitle")}
            </Link>

            {/* Book Appointment Button */}
            <button
              onClick={() => setIsBookingOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 relative"
            >
              <Plus className="w-5 h-5" />
              {t("bookAppointment")}
            </button>
          </div>
        </div>
        


        <div className="space-y-5">
          <DailyAgenda />

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {t("comingSoonDesc")}
            </p>
          </div>
        </div>

        {/* Booking Modal */}
        <BookingForm isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      </div>
    </PageTransition>
  );
}
