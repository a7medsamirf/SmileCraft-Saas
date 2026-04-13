// =============================================================================
// Dashboard Widget — Inventory Alerts (Low Stock Warnings)
// =============================================================================

import { AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  name: string;
  current: number;
  minimum: number;
  unit: string;
  severity: "critical" | "warning" | "ok";
}

const INVENTORY_ITEMS: InventoryItem[] = [
  { name: "مخدر موضعي (ليدوكايين)", current: 3, minimum: 20, unit: "أمبول", severity: "critical" },
  { name: "مادة الحشو الضوئي", current: 5, minimum: 15, unit: "أنبوب", severity: "critical" },
  { name: "قفازات طبية (M)", current: 45, minimum: 100, unit: "زوج", severity: "warning" },
  { name: "أقماع ورقية (F2)", current: 80, minimum: 200, unit: "قطعة", severity: "warning" },
];

const severityConfig = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
    bar: "bg-red-500",
    badge: "bg-red-500/20 text-red-400",
    label: "حرج",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    bar: "bg-amber-500",
    badge: "bg-amber-500/20 text-amber-400",
    label: "منخفض",
  },
  ok: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-500",
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-400",
    label: "جيد",
  },
};

export function InventoryAlerts() {
  const criticalCount = INVENTORY_ITEMS.filter((i) => i.severity === "critical").length;

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute -top-10 -inset-inline-end-10 w-32 h-32 rounded-full bg-red-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          تنبيهات المخزون
        </h3>
        {criticalCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {criticalCount} حرج
          </span>
        )}
      </div>

      <div className="space-y-3">
        {INVENTORY_ITEMS.map((item, i) => {
          const config = severityConfig[item.severity];
          const percent = Math.min((item.current / item.minimum) * 100, 100);

          return (
            <div
              key={i}
              className={`p-3 rounded-xl border ${config.bg} ${config.border} transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                  {item.name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                  {item.current}/{item.minimum} {item.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
