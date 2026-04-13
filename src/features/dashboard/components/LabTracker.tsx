// =============================================================================
// Dashboard Widget — Lab Tracker (Dental Lab Work Status)
// =============================================================================

import { FlaskConical, Clock, CheckCircle2, Truck } from "lucide-react";

interface LabOrder {
  patient: string;
  type: string;
  lab: string;
  sentDate: string;
  expectedDate: string;
  status: "sent" | "in_progress" | "ready" | "delivered";
}

const STATUS_CONFIG = {
  sent: {
    label: "تم الإرسال",
    icon: <Clock className="w-3 h-3" />,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/20",
    dotColor: "bg-blue-500",
    step: 1,
  },
  in_progress: {
    label: "قيد التنفيذ",
    icon: <FlaskConical className="w-3 h-3" />,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/20",
    dotColor: "bg-amber-500",
    step: 2,
  },
  ready: {
    label: "جاهز للاستلام",
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-500",
    step: 3,
  },
  delivered: {
    label: "تم التسليم",
    icon: <Truck className="w-3 h-3" />,
    color: "bg-slate-500/20 text-slate-400 border-slate-500/20",
    dotColor: "bg-slate-500",
    step: 4,
  },
};

const LAB_ORDERS: LabOrder[] = [
  {
    patient: "أحمد السيد",
    type: "تاج زيركونيا",
    lab: "معمل الأمل",
    sentDate: "٢٥ مارس",
    expectedDate: "١ أبريل",
    status: "in_progress",
  },
  {
    patient: "سارة محمود",
    type: "جسر ٣ وحدات",
    lab: "معمل النور",
    sentDate: "٢٧ مارس",
    expectedDate: "٣ أبريل",
    status: "sent",
  },
  {
    patient: "خالد إبراهيم",
    type: "طقم أسنان كامل",
    lab: "معمل الأمل",
    sentDate: "٢٠ مارس",
    expectedDate: "٢٩ مارس",
    status: "ready",
  },
];

export function LabTracker() {
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute -top-10 -inset-inline-start-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-cyan-500" />
          تتبع المعمل
        </h3>
        <span className="text-[11px] font-bold text-slate-500">
          {LAB_ORDERS.length} طلبات نشطة
        </span>
      </div>

      <div className="space-y-3">
        {LAB_ORDERS.map((order, i) => {
          const config = STATUS_CONFIG[order.status];
          return (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">
                    {order.patient}
                  </p>
                  <p className="text-[11px] text-slate-500">{order.type} — {order.lab}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-1 rounded-full transition-all ${
                      step <= config.step
                        ? config.dotColor
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-500">أُرسل: {order.sentDate}</span>
                <span className="text-[10px] text-slate-500">متوقع: {order.expectedDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
