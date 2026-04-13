// =============================================================================
// Dashboard Widget — Birthday Reminders (Patient CRM)
// =============================================================================

import { Cake, Gift, MessageCircle } from "lucide-react";

interface BirthdayPatient {
  name: string;
  age: number;
  phone: string;
  initials: string;
  color: string;
}

const TODAYS_BIRTHDAYS: BirthdayPatient[] = [
  { name: "فاطمة أحمد", age: 34, phone: "0101234****", initials: "فا", color: "bg-pink-500" },
  { name: "عمر حسين", age: 28, phone: "0112345****", initials: "عح", color: "bg-blue-500" },
];

const UPCOMING: BirthdayPatient[] = [
  { name: "ياسمين خالد", age: 41, phone: "0109876****", initials: "يخ", color: "bg-purple-500" },
  { name: "كريم وليد", age: 22, phone: "0155432****", initials: "كو", color: "bg-emerald-500" },
];

export function BirthdayReminders() {
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute -bottom-8 -inset-inline-end-8 w-28 h-28 rounded-full bg-pink-500/10 blur-3xl" />

      <h3 className="relative text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-5">
        <Cake className="w-5 h-5 text-pink-500" />
        أعياد ميلاد المرضى
        {TODAYS_BIRTHDAYS.length > 0 && (
          <span className="text-[10px] font-bold bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
            {TODAYS_BIRTHDAYS.length} اليوم
          </span>
        )}
      </h3>

      {/* Today's Birthdays */}
      {TODAYS_BIRTHDAYS.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">🎂 اليوم</p>
          <div className="space-y-2">
            {TODAYS_BIRTHDAYS.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/10"
              >
                <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{p.name}</p>
                  <p className="text-[10px] text-slate-500">يبلغ {p.age} عاماً اليوم</p>
                </div>
                <button className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">📅 قادم هذا الأسبوع</p>
        <div className="space-y-2">
          {UPCOMING.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className={`w-7 h-7 rounded-lg ${p.color}/20 flex items-center justify-center text-[10px] font-bold shrink-0`}>
                <Gift className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-400">{p.name}</p>
              </div>
              <span className="text-[10px] text-slate-500">{p.age} عاماً</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
