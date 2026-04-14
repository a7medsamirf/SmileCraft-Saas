"use client";

import React, { useState, useEffect } from "react";

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
    const w = window.open("", "_blank");
    if (!w) return;

    const localeDir = locale === "ar" ? "rtl" : "ltr";
    const isRtl = locale === "ar";
    const brand = "#155dfc";
    const now = new Date();
    const printDate = now.toLocaleString(isRtl ? "ar-EG" : "en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    });

    w.document.write(`<!DOCTYPE html>
<html dir="${localeDir}" lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${t("dailyRevenue")}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;background:#fff;position:relative}
    .side-bar{position:fixed;top:0;${isRtl ? "right" : "left"}:0;width:8px;height:100%;background:${brand}}
    .wrap{padding:32px 40px 32px ${isRtl ? "40px" : "48px"}}
    h1{font-size:28px;font-weight:900;color:#111;letter-spacing:-.5px;margin-bottom:24px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
    .info-label{font-size:11px;font-weight:700;color:${brand};text-transform:uppercase;margin-bottom:6px}
    .info-value{font-size:13px;color:#333;line-height:1.6}
    .meta-bar{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin-bottom:28px}
    .meta-cell{padding:14px 18px;border-right:1px solid #d1d5db}
    .meta-cell:last-child{border-right:none}
    .meta-key{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
    .meta-val{font-size:20px;font-weight:900;color:#111}
    .meta-val.accent{color:${brand}}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
    thead tr{background:${brand};color:#fff}
    th{padding:11px 14px;text-align:${isRtl ? "right" : "left"};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
    td{padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:${isRtl ? "right" : "left"}}
    tbody tr:nth-child(even){background:#f9fafb}
    .bottom{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;margin-top:8px}
    .notes-box{border:1px solid #d1d5db;border-radius:6px;padding:14px 16px}
    .notes-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#374151;margin-bottom:6px}
    .notes-text{font-size:12px;color:#6b7280;line-height:1.6}
    .totals{min-width:220px}
    .tot-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#374151}
    .tot-row.total{border-top:1px solid #d1d5db;margin-top:4px;padding-top:12px;font-size:20px;font-weight:900;color:#111}
    .footer{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-size:11px;color:#6b7280;line-height:1.7}
    .footer-brand{text-align:${isRtl ? "left" : "right"}}
    .footer-brand-name{font-size:15px;font-weight:900;color:#111}
    .footer-brand-sub{font-size:10px;color:#9ca3af}
  </style>
</head>
<body>
  <div class="side-bar"></div>
  <div class="wrap">
    <h1>${t("dailyRevenue")}</h1>

    <div class="two-col">
      <div>
        <div class="info-label">${t("printHeaderTitle") || "SmileCraft Dental Clinic"}</div>
        <div class="info-value">${t("revenueSummary") || "Daily Revenue Summary"}</div>
      </div>
      <div>
        <div class="info-label">${t("date") || "Date"}</div>
        <div class="info-value">${printDate}</div>
      </div>
    </div>

    <div class="meta-bar">
      <div class="meta-cell">
        <div class="meta-key">${t("cash") || "Cash"}</div>
        <div class="meta-val">${formatCurrency(stats.cash)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("card") || "Card"}</div>
        <div class="meta-val">${formatCurrency(stats.card)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("wallet") || "Wallet"}</div>
        <div class="meta-val">${formatCurrency(stats.wallet)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t("paymentMethod") || "Payment Method"}</th>
          <th>${t("date") || "Time"}</th>
          <th style="text-align:${isRtl ? "left" : "right"}">${t("amount") || "Amount"}</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map((p, i) => `
        <tr>
          <td>${p.method || "—"}</td>
          <td>${new Date(p.date).toLocaleTimeString(isRtl ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
          <td style="font-weight:700;text-align:${isRtl ? "left" : "right"}">${formatCurrency(p.amount)}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <div class="bottom">
      <div class="notes-box">
        <div class="notes-title">${t("revenueSummary") || "Summary"}</div>
        <div class="notes-text">
          ${isRtl ? "إجمالي المدفوعات المحصلة خلال اليوم" : "Total payments collected during the day"}
        </div>
      </div>
      <div class="totals">
        <div class="tot-row"><span>${t("cash") || "Cash"}</span><span>${formatCurrency(stats.cash)}</span></div>
        <div class="tot-row"><span>${t("card") || "Card"}</span><span>${formatCurrency(stats.card)}</span></div>
        <div class="tot-row"><span>${t("wallet") || "Wallet"}</span><span>${formatCurrency(stats.wallet)}</span></div>
        <div class="tot-row total"><span>${t("totalCollected") || "Total"}</span><span>${formatCurrency(stats.total)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">${isRtl ? "تقرير من نظام SmileCraft" : "Generated by SmileCraft System"}</div>
      <div class="footer-brand">
        <div class="footer-brand-name">✦ ${t("printHeaderTitle") || "SmileCraft Dental Clinic"}</div>
        <div class="footer-brand-sub">${printDate}</div>
      </div>
    </div>
  </div>
  <script>window.onload=function(){window.print()};</script>
</body>
</html>`);
    w.document.close();
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

      
    </>
  );
}
