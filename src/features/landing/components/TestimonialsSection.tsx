"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "SmileCraft غيّر طريقة عمل عيادتي تماماً. بدل الورق والسجلات اليدوية، كل شيء الآن رقمي ومنظم. الملفات الطبية في أي وقت ومن أي مكان.",
    name: "د. محمد رمزي",
    role: "طبيب أسنان — القاهرة",
    initials: "دم",
    color: "#2563EB",
  },
  {
    quote:
      "نظام المواعيد والتذكيرات التلقائية أنقذني! قل غياب المرضى بنسبة ٤٠٪ من أول شهر. والتقارير تساعدني على فهم أداء العيادة بشكل أوضح.",
    name: "د. سارة عبد الله",
    role: "طبيبة أسنان — الإسكندرية",
    initials: "سع",
    color: "#10b981",
  },
  {
    quote:
      "عندي سلسلة من ٤ عيادات وكان التنسيق بينهم صعب جداً. دلوقتي كل عيادة منظمة لوحدها ومتابعة كل العيادات من لوحة واحدة. ممتاز.",
    name: "د. أحمد الخطيب",
    role: "٤ عيادات — الرياض",
    initials: "أخ",
    color: "#6366f1",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function TestimonialsSection() {
  return (
    <section className="py-[100px] px-[5vw] bg-[#0B1525]" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center gap-2 text-[12px] font-extrabold text-[#2563EB] tracking-[0.12em] uppercase mb-3.5">
            <span className="w-6 h-0.5 bg-[#2563EB] rounded" />
            آراء العملاء
          </div>
          <h2 className="fluid-title font-black text-white tracking-[-0.5px]">
            يثق بنا <span className="text-[#6B849E] font-semibold">أطباء الأسنان</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-[60px]"
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="testi-card bg-[#0D1B2E] border border-white/[0.05] rounded-[20px] p-7 relative transition-all duration-300"
            >
              {/* Quote mark */}
              <div
                className="text-[36px] text-[#2563EB] opacity-25 leading-none mb-3"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                &ldquo;
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-[13px] w-[13px] fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>

              <p className="text-[14px] text-[#E2EAF4] font-medium leading-[1.8] mb-5">{t.quote}</p>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0"
                  style={{ background: `${t.color}26`, color: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-[13.5px] font-extrabold text-white">{t.name}</div>
                  <div className="text-[12px] text-[#6B849E] font-medium mt-0.5">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
