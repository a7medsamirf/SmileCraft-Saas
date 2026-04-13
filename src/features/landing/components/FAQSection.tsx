"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "هل بياناتي محفوظة وآمنة؟",
    a: "نعم، نستخدم تشفيراً من أعلى المستويات (AES-256) وخوادم في مراكز بيانات معتمدة. بياناتك لا تُشارك مع أي طرف ثالث ومحمية بالكامل.",
  },
  {
    q: "هل يمكنني استيراد بيانات مرضاي القديمة؟",
    a: "بالطبع! يمكنك استيراد بيانات المرضى من ملفات Excel أو CSV. كما نوفر خدمة نقل البيانات المدفوعة من أنظمة إدارة أخرى.",
  },
  {
    q: "هل يعمل النظام بدون إنترنت؟",
    a: "النظام يعمل بشكل أساسي عبر الإنترنت لضمان مزامنة البيانات، لكن التطبيق يدعم وضع غير متصل محدود للمواعيد والمرضى الأساسيين.",
  },
  {
    q: "هل هناك عقد طويل المدى؟",
    a: "لا، الاشتراك شهري وتستطيع الإلغاء في أي وقت. نوفر أيضاً خطة سنوية بخصم ٢٠٪ لمن يريد التوفير.",
  },
  {
    q: "كيف يعمل الدعم الفني؟",
    a: "فريق الدعم متاح ٢٤/٧ عبر الدردشة المباشرة والبريد الإلكتروني. خطة المؤسسي تشمل مدير حساب مخصص على مدار الساعة.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback(
    (i: number) => setOpenIndex((prev) => (prev === i ? null : i)),
    [],
  );

  return (
    <section id="faq" className="py-[100px] px-[5vw]" dir="rtl">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-start">
        {/* Left: Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#2563EB] tracking-[0.12em] uppercase mb-3.5">
            <span className="w-6 h-0.5 bg-[#2563EB] rounded" />
            الأسئلة الشائعة
          </div>
          <h2 className="fluid-title font-black text-white tracking-[-0.5px]">
            هل عندك <span className="text-[#6B849E] font-semibold">سؤال؟</span>
          </h2>
          <p className="text-[15.5px] text-[#6B849E] font-medium leading-[1.8] mt-3.5 max-w-[560px]">
            إذا لم تجد إجابتك هنا، تواصل مع فريق الدعم الفني في أي وقت.
          </p>
          <div className="mt-7">
            <button className="btn-primary text-[14px] font-extrabold px-6 py-[11px] rounded-[10px] bg-[#2563EB] text-white cursor-pointer transition-all">
              تواصل مع الدعم الفني
            </button>
          </div>
        </motion.div>

        {/* Right: Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-2.5"
        >
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="faq-item bg-[#0D1B2E] border border-white/[0.06] rounded-[14px] overflow-hidden transition-colors duration-200"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-[22px] py-[18px] text-[14.5px] font-bold text-white cursor-pointer select-none bg-transparent border-none text-right"
                >
                  {item.q}
                  <span
                    className={`w-[26px] h-[26px] rounded-lg bg-[rgba(37,99,235,0.08)] text-[#2563EB] flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-[22px] pb-[18px] text-[13.5px] text-[#6B849E] font-medium leading-[1.8]">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
