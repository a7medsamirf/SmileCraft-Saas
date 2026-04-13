"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/SharesComponent/Logo";

const NAV_LINKS = [
  { label: "المميزات", href: "#features" },
  { label: "كيف يعمل", href: "#how" },
  { label: "الأسئلة", href: "#faq" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      dir="rtl"
      className={`fixed top-0 inset-x-0 z-900 px-[5vw] h-[72px] flex items-center justify-between transition-all duration-300 border-b backdrop-blur-xl ${
        scrolled
          ? "bg-[#060D18]/90 border-[rgba(37,99,235,0.12)]"
          : "bg-[#060D18]/70 border-transparent"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">

            <Logo className="w-32 sm:w-40 md:w-44 lg:w-60 h-auto object-contain" />
        
       {/*  <span className="text-xl font-black text-white tracking-tight">
          <span className="text-[#2563EB]">Smile</span>Craft
        </span> */}
      </div>

      {/* Desktop Links */}
      <ul className="hidden md:flex items-center gap-8 list-none">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm font-semibold text-[#6B849E] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA Buttons */}
      <div className="flex items-center gap-3">
        <a
          href="/ar/login"
          className="hidden sm:inline text-[13.5px] font-bold  text-[#6B849E] transition-colors hover:text-white"
        >
          تسجيل الدخول
        </a>
        <a
          href="/ar/signup"
          className="btn-primary text-[13.5px] font-extrabold px-[22px] py-[9px] text-white rounded-[10px] bg-[#2563EB] cursor-pointer transition-all shadow-[0_0_0_0_rgba(37,99,235,0.4)]"
        >
          ابدأ مجاناً
        </a>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-1"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[72px] inset-x-0 bg-[#0D1B2E] border-b border-[rgba(37,99,235,0.12)] py-4 px-[5vw] md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-semibold text-[#6B849E] hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
