// =============================================================================
// Dashboard Widget — Outstanding Balances (Overdue Payments)
// =============================================================================

import { Wallet, AlertCircle, Phone } from "lucide-react";

interface OutstandingPatient {
  name: string;
  initials: string;
  amount: number;
  lastPayment: string;
  daysOverdue: number;
  phone: string;
}

const OUTSTANDING: OutstandingPatient[] = [
  {
    name: "منى محمد",
    initials: "مم",
    amount: 2500,
    lastPayment: "١٥ مارس",
    daysOverdue: 14,
    phone: "01012345678",
  },
  {
    name: "حسن علي",
    initials: "حع",
    amount: 1800,
    lastPayment: "١٠ مارس",
    daysOverdue: 19,
    phone: "01098765432",
  },
  {
    name: "ريم سعيد",
    initials: "رس",
    amount: 950,
    lastPayment: "٢٢ مارس",
    daysOverdue: 7,
    phone: "01155443322",
  },
  {
    name: "طارق حسين",
    initials: "طح",
    amount: 3200,
    lastPayment: "٥ مارس",
    daysOverdue: 24,
    phone: "01234567890",
  },
];

const TOTAL_OUTSTANDING = OUTSTANDING.reduce((s, p) => s + p.amount, 0);

function getSeverity(days: number) {
  if (days >= 20) return { label: "متأخر جداً", color: "text-red-400 bg-red-500/10" };
  if (days >= 14) return { label: "متأخر", color: "text-amber-400 bg-amber-500/10" };
  return { label: "تذكير", color: "text-blue-400 bg-blue-500/10" };
}

export function OutstandingBalances() {
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute -bottom-10 -inset-inline-end-10 w-36 h-36 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-500" />
          المديونيات المعلقة
        </h3>
        <span className="text-[11px] font-bold text-slate-500">
          {OUTSTANDING.length} مرضى
        </span>
      </div>

      {/* Total Banner */}
      <div className="relative mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-500">إجمالي المستحقات</span>
        <span className="text-lg font-extrabold text-amber-400">
          {TOTAL_OUTSTANDING.toLocaleString("ar-EG")} ج.م
        </span>
      </div>

      {/* Patient List */}
      <div className="space-y-2">
        {OUTSTANDING.map((patient, i) => {
          const severity = getSeverity(patient.daysOverdue);
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                {patient.initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {patient.name}
                  </p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${severity.color}`}>
                    {severity.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  آخر دفعة: {patient.lastPayment} • متأخر {patient.daysOverdue} يوم
                </p>
              </div>

              {/* Amount + Call */}
              <div className="text-end flex items-center gap-2">
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                  {patient.amount.toLocaleString("ar-EG")} ج.م
                </span>
                <button className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors opacity-0 group-hover:opacity-100">
                  <Phone className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
