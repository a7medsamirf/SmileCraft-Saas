// =============================================================================
// Dashboard Widget — Recent Activity Feed (Timeline)
// =============================================================================

import { Clock, UserPlus, CreditCard, FileEdit, CalendarCheck, Pill } from "lucide-react";

interface Activity {
  icon: React.ReactNode;
  iconBg: string;
  text: string;
  detail: string;
  time: string;
}

const ACTIVITIES: Activity[] = [
  {
    icon: <CreditCard className="w-3.5 h-3.5" />,
    iconBg: "bg-emerald-500/20 text-emerald-400",
    text: "دفعة مستلمة",
    detail: "أحمد سالم — ٣٥٠ ج.م (نقدي)",
    time: "منذ ٥ دقائق",
  },
  {
    icon: <CalendarCheck className="w-3.5 h-3.5" />,
    iconBg: "bg-blue-500/20 text-blue-400",
    text: "موعد مؤكد",
    detail: "سارة محمود — حشو عصب، الثلاثاء ١٠ صباحاً",
    time: "منذ ١٥ دقيقة",
  },
  {
    icon: <FileEdit className="w-3.5 h-3.5" />,
    iconBg: "bg-purple-500/20 text-purple-400",
    text: "تحديث ملف طبي",
    detail: "نور خالد — إضافة أشعة بانوراما",
    time: "منذ ٣٠ دقيقة",
  },
  {
    icon: <UserPlus className="w-3.5 h-3.5" />,
    iconBg: "bg-cyan-500/20 text-cyan-400",
    text: "مريض جديد",
    detail: "محمد عبدالله — تسجيل أول زيارة",
    time: "منذ ساعة",
  },
  {
    icon: <Pill className="w-3.5 h-3.5" />,
    iconBg: "bg-amber-500/20 text-amber-400",
    text: "وصفة طبية",
    detail: "هدى إبراهيم — مضاد حيوي ومسكن",
    time: "منذ ساعتين",
  },
  {
    icon: <UserPlus className="w-3.5 h-3.5" />,
    iconBg: "bg-cyan-500/20 text-cyan-400",
    text: "مريض جديد",
    detail: "محمد مصطفى — تسجيل أول زيارة",
    time: "منذ ٣٠ دقيقة",
  },
];

export function RecentActivity() {
  return (
    <div className="glass-card p-6 h-full">
      <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-5">
        <Clock className="w-5 h-5 text-slate-400" />
        آخر النشاطات
      </h3>

      <div className="space-y-0">
        {ACTIVITIES.map((activity, i) => (
          <div key={i} className="flex gap-3 group">
            {/* Timeline Line + Dot */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-lg ${activity.iconBg} flex items-center justify-center shrink-0`}>
                {activity.icon}
              </div>
              {i < ACTIVITIES.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700/50 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">
                  {activity.text}
                </p>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">
                  {activity.time}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">{activity.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
