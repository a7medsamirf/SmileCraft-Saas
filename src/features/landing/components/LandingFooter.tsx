"use client";

import { Logo } from "@/components/SharesComponent/Logo";

export function LandingFooter() {
  return (
    <footer className="bg-[#0B1525] border-t border-[rgba(37,99,235,0.12)] py-8 px-[5vw]" dir="rtl">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Logo */}
        <div className="flex flex-col items-center md:items-start gap-2">
         <Logo className="w-32 sm:w-40 md:w-44 lg:w-60 h-auto object-contain" />
          <p className="text-[12.5px] text-[#6B849E] font-medium text-center md:text-right">
            نظام إدارة عيادات الأسنان
          </p>
        </div>

        {/* Copyright */}
        <span className="text-[12px] text-[#6B849E] font-medium order-last md:order-none">
          © ٢٠٢٦ SmileCraft . جميع الحقوق محفوظة.
        </span>

        {/* Social */}
        <div className="flex items-center gap-2.5">
          <a
            href="mailto:support@smilecraft.com"
            className="social-btn h-[34px] px-3 rounded-[9px] bg-white/[0.04] border border-white/[0.07] flex items-center gap-1.5 text-[#6B849E] text-[12px] font-semibold cursor-pointer transition-all"
          >
            ✉ الدعم
          </a>
          <a
            href="#"
            className="social-btn w-[34px] h-[34px] rounded-[9px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[#6B849E] text-sm cursor-pointer transition-all"
          >
            𝕏
          </a>
          <a
            href="#"
            className="social-btn w-[34px] h-[34px] rounded-[9px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[#6B849E] text-sm cursor-pointer transition-all"
          >
            f
          </a>
        </div>
      </div>
    </footer>
  );
}
