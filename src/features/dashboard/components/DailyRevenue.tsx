"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Payment, PaymentMethod, formatCurrency } from "@/features/finance";
import { getTodayPaymentsAction } from "@/features/finance/serverActions";
import {
  Printer,
  TrendingUp,
  CreditCard,
  Banknote,
  SmartphoneNfc,
  Dna,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations, useLocale } from "next-intl";

export function DailyRevenue() {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const [isPrinting, setIsPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const loadPayments = async () => {
      try {
        const data = await getTodayPaymentsAction();
        setPayments(data.map((p) => ({
          id: p.id,
          invoiceId: "",
          amount: p.amount,
          date: p.createdAt,
          method: p.method as PaymentMethod,
          notes: p.notes || undefined,
        })));
      } catch (error) {
        console.error("Failed to load today's payments:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPayments();
  }, []);

  // Calculate Aggregates
  const stats = {
    total: 0,
    cash: 0,
    card: 0,
    wallet: 0,
  };

  payments.forEach((p) => {
    stats.total += p.amount;
    if (p.method === PaymentMethod.CASH) stats.cash += p.amount;
    if (p.method === PaymentMethod.CARD) stats.card += p.amount;
    if (p.method === PaymentMethod.WALLET) stats.wallet += p.amount;
  });

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("printing-revenue");

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setIsPrinting(false);
        document.body.classList.remove("printing-revenue");
      }, 500);
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <span className="ms-3 text-sm font-medium text-slate-500">
            {t("loading") || "Loading..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card relative overflow-hidden p-6 print:hidden block transition-all duration-300">
        {/* Background glow for premium feel */}
        <div className="absolute -inset-inline-end-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20" />

        <div className="relative flex items-center justify-between mb-8 text-slate-800 dark:text-slate-100">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {t("dailyRevenue")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t("revenueSummary")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Printer className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 text-slate-500" />
            {t("printReport")}
          </Button>
        </div>

        <div className="relative mb-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-8 border border-slate-100 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-500 mb-2">
            {t("totalCollected")}
          </p>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.total)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-blue-200 dark:hover:border-blue-900 overflow-hidden">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-sm">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">{t("cash")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(stats.cash)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-blue-200 dark:hover:border-blue-900 overflow-hidden">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow-sm">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">{t("card")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(stats.card)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-blue-200 dark:hover:border-blue-900 overflow-hidden">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shadow-sm">
              <SmartphoneNfc className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">{t("wallet")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(stats.wallet)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          PRINT ONLY VERSION (Rendered via Portal to avoid layout issues)
          ========================================= */}
      {mounted &&
        createPortal(
         <div
                className={`text-black bg-white ${isPrinting ? "block" : "hidden"} print-only-revenue pb-10`}
                style={{ backgroundColor: 'white', color: 'black' }} 
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
              <style>{`
              .print-only-revenue {
                  display: none;
                }
                @media print {
                  /* إجبار الـ html والـ body على الأبيض حتى لو كان مفعل كلاس dark */
                  html, html.dark, body, body.dark, :root {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    color-scheme: light !important;
                    print-color-adjust: exact; 
                    -webkit-print-color-adjust: exact;
                  }
                    .dark, [data-theme='dark'] {
                        background-color: transparent !important;
                        color: #000000 !important;
                    }
                  body > *:not(.print-only-revenue) {
                    display: none !important;
                  }

                  /* ضمان أن التقرير يغطي أي مساحة فارغة قد تظهر بلون غامق */
                  .print-only-revenue {
                    display: block !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }

                  /* فرض اللون الأسود على كل النصوص والحدود داخل التقرير */
                  .print-only-revenue * {
                    border-color: #000000 !important;
                  }

                  @page {
                    size: auto;
                    margin: 0.5cm 1cm;
                  }
                }
              `}</style>
            {/*      <div className="border-b-2 border-black pb-4 mb-4 text-center">
          <h1 className="text-2xl font-bold">{t("printHeaderTitle")}</h1>
          <h2 className="text-lg">{t("printHeaderSubtitle")}</h2>
          <p className="text-sm mt-1">{t("printDate")} {new Date().toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</p>
        </div> */}
            {/* Header Section */}
            <div className="border-b border-slate-200 pb-6 mb-8 mt-4">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white shadow-lg shadow-blue-500/30  rounded-xl flex items-center justify-center">
                    <Dna className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                      {t("printHeaderTitle")}
                    </h1>
                    <h2 className="text-base text-slate-500 font-medium mt-0.5">
                      {t("printHeaderSubtitle")}
                    </h2>
                  </div>
                </div>
                <div className="text-end">
                  {/*   <p className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">SmileCraft</p> */}
                  <div className="inline-block rounded-lg px-4 py-2 text-sm text-slate-600">
                    <span className="font-semibold">{t("printDate")}</span>
                    <span className="mx-1">
                      {new Date().toLocaleString(
                        locale === "ar" ? "ar-EG" : "en-GB",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Table Section */}
            <table
              className="w-full text-left border-collapse border border-black text-sm rtl:text-right"
              dir="rtl"
            >
              <thead>
                <tr>
                  <th className="border border-black p-2 bg-gray-100">
                    {t("paymentMethod")}
                  </th>
                  <th className="border border-black p-2 bg-gray-100">
                    {t("totalCollected")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2">{t("cash")}</td>
                  <td className="border border-black p-2 font-bold">
                    {formatCurrency(stats.cash)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2">{t("card")}</td>
                  <td className="border border-black p-2 font-bold">
                    {formatCurrency(stats.card)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2">{t("wallet")}</td>
                  <td className="border border-black p-2 font-bold">
                    {formatCurrency(stats.wallet)}
                  </td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold text-lg">
                    {t("total")}
                  </td>
                  <td className="border border-black p-2 font-bold text-lg">
                    {formatCurrency(stats.total)}
                  </td>
                </tr>
              </tbody>
            </table>
            {/* Table Section */}
            {/*          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-8">
            <table className="w-full text-left text-sm rtl:text-right border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-5 text-slate-600 font-bold uppercase tracking-wider text-xs">{t("paymentMethod")}</th>
                  <th className="p-5 text-slate-600 font-bold uppercase tracking-wider text-xs">{t("totalCollected")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-white">
                  <td className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-700 text-base">{t("cash")}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-900 text-base">{formatCurrency(stats.cash)}</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-700 text-base">{t("card")}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-900 text-base">{formatCurrency(stats.card)}</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/50">
                      <SmartphoneNfc className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-700 text-base">{t("wallet")}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-900 text-base">{formatCurrency(stats.wallet)}</td>
                </tr>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="p-6 font-bold text-lg text-slate-800">{t("total")}</td>
                  <td className="p-6 font-black text-2xl text-emerald-600">{formatCurrency(stats.total)}</td>
                </tr>
              </tbody>
            </table>
          </div> */}
            {/* Signatures Section */}
            {/*      <div className="mt-20 pt-8 flex justify-between px-10">
            <div className="text-center w-56">
              <div className="border-t-[3px] border-dotted border-slate-300 pt-4 text-slate-700 font-bold text-sm">
                {t("doctorSignature")}
              </div>
            </div>
            <div className="text-center w-56">
              <div className="border-t-[3px] border-dotted border-slate-300 pt-4 text-slate-700 font-bold text-sm">
                {t("cashierSignature")}
              </div>
            </div>
          </div>  */}

            <div className="mt-10 flex justify-between text-sm">
              <div className="text-center w-40 border-t border-dashed border-black pt-2">
                {t("doctorSignature")}
              </div>
              <div className="text-center w-40 border-t border-dashed border-black pt-2">
                {t("cashierSignature")}
              </div>
            </div>
            {/* Footer branding */}
            <div className="mt-16 text-center text-xs font-semibold text-slate-400">
              {locale === "ar"
                ? "تم إنشاء هذا التقرير آلياً بواسطة نظام SmileCraft"
                : "Autogenerated report via SmileCraft System"}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
