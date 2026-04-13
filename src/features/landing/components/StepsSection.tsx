"use client";

import React from "react";
import { motion } from "framer-motion";

const STEPS = [
  { num: "١", title: "أنشئ حسابك", desc: "سجّل بياناتك وبيانات عيادتك في دقيقتين. لا بطاقة ائتمان مطلوبة." },
  { num: "٢", title: "أضف مرضاك", desc: "استورد بيانات مرضاك الحاليين أو أضفهم يدوياً. يدعم ملفات Excel." },
  { num: "٣", title: "حدد المواعيد", desc: "جدول المواعيد وأرسل تذكيرات تلقائية لمرضاك بنقرة واحدة." },
  { num: "٤", title: "تابع النتائج", desc: "شاهد تقارير الإيرادات والنمو في لوحة تحكم بصرية متكاملة." },
];

export function StepsSection() {
  return (
    <section id="how" className="py-[100px] px-[5vw] bg-[#0B1525]" dir="rtl">
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
            كيف يعمل
          </div>
          <h2 className="fluid-title font-black text-white tracking-[-0.5px]">
            ابدأ في دقائق <span className="text-[#6B849E] font-semibold">لا ساعات</span>
          </h2>
          <p className="text-[15.5px] text-[#6B849E] font-medium leading-[1.8] mt-3.5 max-w-[560px] mx-auto text-center">
            لا تحتاج لخبرة تقنية. النظام مصمم ليكون سهلاً وبديهياً لكل طبيب أسنان.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mt-[60px] relative"
        >
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-[30px] right-[60px] left-[60px] h-px bg-gradient-to-r from-transparent via-[rgba(37,99,235,0.12)] to-transparent" />

          {STEPS.map((step, i) => (
            <div key={i} className="step-item text-center sm:px-4 relative z-10">
              <div className="step-circle w-[60px] h-[60px] rounded-full bg-[#0F1E30] border-2 border-[rgba(37,99,235,0.12)] flex items-center justify-center text-[20px] font-black text-[#2563EB] mx-auto mb-5 shadow-[0_0_0_6px_#0B1525] transition-all duration-300">
                {step.num}
              </div>
              <h4 className="text-[15px] font-extrabold text-white mb-2">{step.title}</h4>
              <p className="text-[13px] text-[#6B849E] font-medium leading-[1.7]">{step.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
