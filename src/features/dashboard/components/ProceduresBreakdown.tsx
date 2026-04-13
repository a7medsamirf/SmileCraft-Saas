"use client";

// =============================================================================
// Dashboard Widget — Procedures Breakdown (Donut Chart)
// =============================================================================

const PROCEDURES = [
  { name: "حشو عصب", count: 42, percent: 28, color: "#3b82f6" },
  { name: "تنظيف وتلميع", count: 35, percent: 23, color: "#10b981" },
  { name: "تركيب تقويم", count: 25, percent: 17, color: "#f59e0b" },
  { name: "خلع ضرس", count: 20, percent: 13, color: "#ef4444" },
  { name: "حشو تجميلي", count: 18, percent: 12, color: "#8b5cf6" },
  { name: "أخرى", count: 10, percent: 7, color: "#64748b" },
];

const TOTAL = PROCEDURES.reduce((s, p) => s + p.count, 0);

function buildConicGradient(): string {
  let angle = 0;
  const stops: string[] = [];
  for (const p of PROCEDURES) {
    const start = angle;
    const end = angle + (p.percent / 100) * 360;
    stops.push(`${p.color} ${start}deg ${end}deg`);
    angle = end;
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export function ProceduresBreakdown() {
  return (
    <div className="glass-card p-6 relative overflow-hidden h-full">
      <div className="absolute -bottom-10 -inset-inline-start-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />

      <h3 className="relative text-base font-bold text-slate-800 dark:text-white mb-5">
        📊 توزيع الإجراءات
        <span className="text-xs font-medium text-slate-500 ms-2">هذا الشهر</span>
      </h3>

      <div className="relative flex items-center gap-6">
        {/* Donut Chart */}
        <div className="shrink-0 relative">
          <div
            className="w-28 h-28 rounded-full"
            style={{ background: buildConicGradient() }}
          />
          {/* Center Hole */}
          <div className="absolute inset-3 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{TOTAL}</p>
              <p className="text-[9px] font-semibold text-slate-500">إجراء</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {PROCEDURES.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-400">
                  {p.name}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
