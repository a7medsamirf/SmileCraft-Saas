"use client";

import React from "react";
import { motion } from "framer-motion";

const STATS = [
  { value: "+١٠٠", accent: true, label: "عيادة اسنان نشطة" },
  { value: "٩٨٪", accent: true, label: "معدل رضا العملاء" },
  { value: "٦٠٪", accent: true, label: "تقليل الأعباء الإدارية" },
  { value: "٢٤/٧", accent: true, label: "دعم فني متواصل" },
];

export function StatsSection() {
  return (
    <div className="px-[5vw]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="max-w-[1200px] mx-auto bg-[#0D1B2E] border border-[rgba(37,99,235,0.12)] rounded-[20px] px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-5 relative overflow-hidden"
      >
        {/* Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB] to-transparent opacity-50" />

        {STATS.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-[36px] font-black text-white leading-none">
              {stat.accent ? (
                <span className="text-[#2563EB]">{stat.value}</span>
              ) : (
                stat.value
              )}
            </div>
            <div className="text-[13px] text-[#6B849E] font-semibold mt-1.5">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
