"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  DollarSign,
  Activity,
  FileText,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { RevenueChart } from "./RevenueChart";
import { motion } from "framer-motion";
import { getFinanceStatsAction, getMonthlyRevenueDataAction, getTopProceduresAction } from "@/features/finance/serverActions";

interface FinanceStats {
  monthlyTotal: number;
  monthlyPaid: number;
  monthlyInvoiceCount: number;
  growthPercentage: number;
  averageVisit: number;
  dailyRevenue: number;
  totalOutstanding: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  totalInvoiced: number;
  invoiceCount: number;
}

interface TopProcedure {
  name: string;
  count: number;
  revenue: number;
}

export const FinanceDashboard: React.FC = () => {
  const t = useTranslations("Finance");
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [topProcedures, setTopProcedures] = useState<TopProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, monthlyData, procedures] = await Promise.all([
          getFinanceStatsAction(),
          getMonthlyRevenueDataAction(),
          getTopProceduresAction()
        ]);
        
        setStats(statsData);
        setMonthlyData(monthlyData);
        setTopProcedures(procedures);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        <span className="ms-3 text-sm font-medium text-slate-500">
          {t("loading") || "Loading..."}
        </span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t("monthlyRevenue"),
            value: stats.monthlyTotal,
            icon: <DollarSign className="text-emerald-500" />,
            trend: `+${stats.growthPercentage}%`,
            subtext: t("vsLastMonth"),
          },
          {
            label: t("growth"),
            value: `${stats.growthPercentage}%`,
            icon: <TrendingUp className="text-blue-500" />,
            trend: stats.growthPercentage > 0 ? "Good" : "Stable",
            subtext: stats.growthPercentage > 0 ? "Growing revenue" : "Consistent performance",
          },
          {
            label: t("averageVisitValue"),
            value: stats.averageVisit,
            icon: <Activity className="text-purple-500" />,
            trend: "+5%",
            subtext: "Per patient visit",
          },
          {
            label: t("pendingInvoices"),
            value: stats.monthlyInvoiceCount,
            icon: <FileText className="text-orange-500" />,
            trend: `${stats.monthlyInvoiceCount}`,
            subtext: t("thisMonth") || "This month",
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                {stat.trend}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {stat.label}
              </p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
                {typeof stat.value === "number" && (
                  <span className="text-xs font-medium ml-1 text-slate-400">
                    {" "}
                    {t("currency") || "EGP"}
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-slate-400 italic">
                {stat.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart Card */}
        <div className="glass-card lg:col-span-2 p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {t("revenueChart")}
              </h3>
              <p className="text-sm text-slate-500">
                Performance tracking for {new Date().getFullYear()}
              </p>
            </div>
            <select className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-bold dark:bg-slate-800 outline-none">
              <option>{new Date().getFullYear()}</option>
              <option>{new Date().getFullYear() - 1}</option>
            </select>
          </div>

          <RevenueChart data={monthlyData.map(d => ({ month: d.month, amount: d.revenue }))} />
        </div>

        {/* Top Procedures Card */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
            {t("topProcedures")}
          </h3>
          <div className="space-y-5">
            {topProcedures.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                {t("noProceduresYet") || "No procedures recorded yet"}
              </p>
            ) : (
              topProcedures.map((proc, i) => (
                <div key={i} className="flex flex-col gap-2 group">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors">
                      {proc.name}
                    </span>
                    <span className="text-slate-400">
                      {proc.revenue.toLocaleString()} {t("currency") || "EGP"}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(proc.revenue / topProcedures[0].revenue) * 100}%`,
                      }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className="h-full bg-blue-600 rounded-full group-hover:bg-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
