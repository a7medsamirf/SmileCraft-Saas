"use client";
import { motion } from "framer-motion";

export function BottomCTA() {
  return (
    <div className="py-20 px-[5vw]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="cta-inner-bg max-w-[1200px] mx-auto border border-[rgba(37,99,235,0.2)] rounded-[28px] py-[72px] px-[60px] max-sm:px-6 text-center relative overflow-hidden"
      >
        {/* Radial Glow */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(rgba(37,99,235,0.15) 0%, transparent 70%)" }}
        />
        <div className="absolute inset-0 pointer-events-none grid-bg-sm" />

        <h2
          className="relative z-10 font-black text-white leading-[1.2]"
          style={{ fontSize: "clamp(28px, 3.5vw, 46px)" }}
        >
          جاهز تطوّر عيادتك؟
          <br />
          ابدأ اليوم مجاناً
        </h2>
        <p className="relative z-10 text-[16px] text-[#6B849E] font-medium mt-4 mb-9 max-w-[500px] mx-auto">
          30 يوم تجربة مجانية كاملة. لا بطاقة ائتمان. لا التزامات.
        </p>

        <div className="relative z-10 flex items-center justify-center gap-3.5 flex-wrap">
          <a
            href="/ar/login"
            className="hero-primary-btn flex items-center gap-2 text-[15px] text-white font-extrabold px-8 py-3.5 rounded-xl bg-[#2563EB] text-[#060D18] transition-all shadow-[0_0_40px_rgba(37,99,235,0.25)]"
          >
            ابدأ تجربتك المجانية
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
        </div>

        <p className="relative z-10 text-[12.5px] text-[#6B849E] font-semibold mt-5">
          ✦ انضم لأكثر من 100 عيادة تثق بـ SmileCraft
        </p>
      </motion.div>
    </div>
  );
}
