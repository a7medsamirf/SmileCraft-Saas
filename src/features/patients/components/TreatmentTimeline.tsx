import React from "react";
import { VisitSummary } from "../types";
import { VISIT_TYPE_LABELS } from "../constants";
import { CircleDot, Calendar, DollarSign, User } from "lucide-react";

interface TreatmentTimelineProps {
  visits: VisitSummary[];
}

export function TreatmentTimeline({ visits }: TreatmentTimelineProps) {
  if (!visits || visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/30">
        <Calendar className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد زيارات سابقة</h3>
        <p className="mt-1 text-sm text-slate-500">لم يقم هذا المريض بأي زيارة للعيادة حتى الآن.</p>
      </div>
    );
  }

  // Sort visits newest first
  const sortedVisits = [...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  return (
  <div className="relative border-s-2 border-slate-200 ms-4 pe-2 dark:border-slate-800 w-full mx-auto">
      {sortedVisits.map((visit, index) => {
        const dateObj = new Date(visit.visitDate);
        const day = dateObj.toLocaleDateString("ar-EG", { day: "numeric" });
        const month = dateObj.toLocaleDateString("ar-EG", { month: "short" });
        const year = dateObj.toLocaleDateString("ar-EG", { year: "numeric" });
        
        const typeLabel = VISIT_TYPE_LABELS[visit.type]?.ar || visit.type;

        return (
          <div key={visit.id} className="relative mb-10 last:mb-0 group">
            {/* Timeline Node / Circle */}
            <span className="absolute -start-[11px] top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-slate-50 transition-all group-hover:bg-blue-500 group-hover:ring-blue-100 dark:bg-slate-900 dark:ring-slate-950 dark:group-hover:ring-blue-900/30">
                  <CircleDot className="h-3 w-3 text-slate-400 group-hover:text-white" />
                </span>

            {/* Timeline Content Box */}
 <div className="ms-8 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              
              {/* Decorative Date Tag */}
              <div className="absolute -top-3 start-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 shadow-sm dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span dir="ltr">{`${day} ${month} ${year}`}</span>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {visit.chiefComplaint}
                  </h4>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {typeLabel}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>تم العلاج بواسطة: <span className="font-semibold text-slate-900 dark:text-slate-200">{visit.dentistName}</span></span>
                  </div>
                  
                  {visit.totalBilled !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span>
                        التكلفة: <span className="font-semibold text-slate-900 dark:text-slate-200">{visit.totalBilled} ج.م</span>
                        {" "}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${visit.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {visit.isPaid ? "مدفوع" : "غير مدفوع"}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
