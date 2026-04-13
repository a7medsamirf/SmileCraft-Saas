"use client";

// =============================================================================
// Dashboard Widget — Weekly Revenue Chart (CSS-based Bar Chart)
// =============================================================================

import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

interface WeeklyRevenueData {
  days: Array<{
    day: string;
    date: string;
    revenue: number;
    transactionCount: number;
  }>;
  totalWeekly: number;
  growthPercentage: number;
}

interface WeeklyRevenueChartProps {
  data: WeeklyRevenueData;
}

const CURRENCY = "ج.م";

export function WeeklyRevenueChart({ data }: WeeklyRevenueChartProps) {
  const maxRevenue = Math.max(...data.days.map((d) => d.revenue), 1);
  const isPositiveGrowth = data.growthPercentage >= 0;

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-10 -inset-inline-end-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            الدخل الأسبوعي
          </h3>
          <p className="text-xs text-slate-500 mt-1">آخر ٧ أيام</p>
        </div>
        <div className="text-end">
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {data.totalWeekly.toLocaleString("ar-EG")} {CURRENCY}
          </p>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isPositiveGrowth ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {isPositiveGrowth ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {isPositiveGrowth ? "+" : ""}
            {data.growthPercentage.toLocaleString("ar-EG")}٪ عن الأسبوع الماضي
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end gap-3 h-40">
        {data.days.map((day, i) => {
          const heightPercent = (day.revenue / maxRevenue) * 100;
          const isWeekend = day.day === "الجمعة";
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              {/* Revenue Label (on hover) */}
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {day.revenue.toLocaleString("ar-EG")}
              </motion.span>
              {/* Bar */}
              <div className="w-full relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPercent * 1.2, 2)}px` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                  className={`w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80 ${
                    isWeekend ? "bg-slate-600" : "bg-blue-500"
                  }`}
                  style={{ minHeight: "8px" }}
                />
              </div>
              {/* Day Label */}
              <span className="text-[10px] font-semibold text-slate-500">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
