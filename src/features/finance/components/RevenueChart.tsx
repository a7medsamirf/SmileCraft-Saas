"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface RevenueData {
  month: string;
  amount: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const t = useTranslations("Finance");
  
  const maxAmount = Math.max(...data.map(d => d.amount));
  const chartHeight = 200;
  
  return (
    <div className="w-full h-[300px] flex flex-col justify-end">
      <div className="flex items-end justify-between h-full gap-2 px-2">
        {data.map((item, index) => {
          const heightPercentage = (item.amount / maxAmount) * 100;
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[10px] font-bold py-1 px-2 rounded shadow-xl z-10 whitespace-nowrap dark:bg-blue-600">
                {item.amount.toLocaleString()} {t("currency") || "EGP"}
              </div>
              
              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPercentage}%` }}
                transition={{ delay: index * 0.05, duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[40px] rounded-t-lg bg-linear-to-t from-blue-600 to-blue-400 group-hover:from-emerald-500 group-hover:to-emerald-400 transition-all duration-300 relative shadow-lg shadow-blue-500/20"
              >
                {/* Gloss Effect */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              
              {/* Label */}
              <span className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter dark:text-slate-500 group-hover:text-blue-500 transition-colors">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
