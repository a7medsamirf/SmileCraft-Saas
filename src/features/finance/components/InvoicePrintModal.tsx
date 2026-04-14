"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Printer } from "lucide-react";
import { Invoice, INVOICE_STATUS_LABELS, formatCurrency } from "@/features/finance/types";

const BRAND = "#155dfc";

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, onClose }: InvoicePrintModalProps) {
  const t = useTranslations("Finance");
  const locale = useLocale();

  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];
  const isRtl = locale === "ar";
  const invoiceNum = invoice.id.slice(0, 8).toUpperCase();

  const dueDate = new Date(invoice.createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatDateTime = (date: Date | string) =>
    new Date(date).toLocaleString(isRtl ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ── Opens a new window with fully self-contained HTML — the only reliable
     cross-browser print approach. window.print() on the current page requires
     complex portal + CSS overrides that fail in many environments. ── */
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const statusText = isRtl ? statusLabel.ar : statusLabel.en;

    w.document.write(`<!DOCTYPE html>
<html dir="${isRtl ? "rtl" : "ltr"}" lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${t("invoiceHistory") || "Medical Invoice"} #${invoiceNum}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;background:#fff;position:relative}
    .side-bar{position:fixed;top:0;${isRtl ? "right" : "left"}:0;width:8px;height:100%;background:${BRAND}}
    .wrap{padding:32px 40px 32px ${isRtl ? "40px" : "48px"}}
    h1{font-size:28px;font-weight:900;color:#111;letter-spacing:-.5px;margin-bottom:24px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
    .info-label{font-size:11px;font-weight:700;color:${BRAND};text-transform:uppercase;margin-bottom:6px}
    .info-value{font-size:13px;color:#333;line-height:1.6}
    .meta-bar{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin-bottom:28px}
    .meta-cell{padding:12px 16px;border-right:1px solid #d1d5db}
    .meta-cell:last-child{border-right:none}
    .meta-key{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
    .meta-val{font-size:15px;font-weight:800;color:#111}
    .meta-val.accent{color:${BRAND}}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
    thead tr{background:${BRAND};color:#fff}
    th{padding:11px 14px;text-align:${isRtl ? "right" : "left"};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
    td{padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:${isRtl ? "right" : "left"}}
    tr.alt{background:#f9fafb}
    tr.green td{color:#059669;font-weight:700}
    tr.red td{color:#dc2626;font-weight:700}
    .bottom{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start}
    .notes-box{border:1px solid #d1d5db;border-radius:6px;padding:14px 16px}
    .notes-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#374151;margin-bottom:6px}
    .notes-text{font-size:12px;color:#6b7280;line-height:1.6}
    .totals{min-width:220px}
    .tot-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#374151}
    .tot-row.total{border-top:1px solid #d1d5db;margin-top:4px;padding-top:12px;font-size:18px;font-weight:900;color:#111}
    .footer{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-size:11px;color:#6b7280}
    .footer-brand{text-align:${isRtl ? "left" : "right"}}
    .footer-brand-name{font-size:15px;font-weight:900;color:#111}
    .footer-brand-sub{font-size:10px;color:#9ca3af}
    @page{size:A4;margin:0.5cm 1cm}
  </style>
</head>
<body>
  <div class="side-bar"></div>
  <div class="wrap">
    <h1>${t("invoiceHistory") || "Medical Invoice"}</h1>

    <div class="two-col">
      <div>
        <div class="info-label">${t("patient") || "Patient"}</div>
        <div class="info-value"><strong>${invoice.patientName || "N/A"}</strong></div>
      </div>
      <div>
        <div class="info-label">${t("printHeaderTitle") || "SmileCraft Dental Clinic"}</div>
        <div class="info-value">${formatDate(invoice.createdAt)}</div>
      </div>
    </div>

    <div class="meta-bar">
      <div class="meta-cell">
        <div class="meta-key">${t("invoiceNumber") || "Invoice #"}</div>
        <div class="meta-val">${invoiceNum}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("date") || "Date"}</div>
        <div class="meta-val">${formatDate(invoice.createdAt)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">Due Date</div>
        <div class="meta-val">${formatDate(dueDate)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("totalAmount") || "Amount Due"}</div>
        <div class="meta-val accent">${formatCurrency(invoice.totalAmount)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t("description") || "Description"}</th>
          <th style="text-align:${isRtl ? "left" : "right"}">${t("amount") || "Amount"}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${t("totalAmount") || "Total Amount"}</td>
          <td style="font-weight:700;text-align:${isRtl ? "left" : "right"}">${formatCurrency(invoice.totalAmount)}</td>
        </tr>
        <tr class="alt green">
          <td>${t("paid") || "Paid"}</td>
          <td style="text-align:${isRtl ? "left" : "right"}">${formatCurrency(invoice.paidAmount)}</td>
        </tr>
        <tr class="${invoice.balance > 0 ? "red" : "green"}">
          <td>${t("balance") || "Balance"}</td>
          <td style="text-align:${isRtl ? "left" : "right"}">${formatCurrency(invoice.balance)}</td>
        </tr>
      </tbody>
    </table>

    <div class="bottom">
      <div class="notes-box">
        <div class="notes-title">${t("status") || "Status"}</div>
        <div class="notes-text">${statusText}</div>
      </div>
      <div class="totals">
        <div class="tot-row"><span>${t("paid") || "Paid"}</span><span>${formatCurrency(invoice.paidAmount)}</span></div>
        <div class="tot-row total"><span>${t("netPayment") || "Net Payment"}</span><span>${formatCurrency(invoice.paidAmount)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">${t("printedAt") || "Printed at"}: ${formatDateTime(new Date())}</div>
      <div class="footer-brand">
        <div class="footer-brand-name">✦ ${t("printHeaderTitle") || "SmileCraft Dental Clinic"}</div>
        <div class="footer-brand-sub">${isRtl ? "تم إنشاؤها بواسطة SmileCraft" : "Generated by SmileCraft"}</div>
      </div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
    w.document.close();
  };

  /* ── Modal preview (screen only) ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${BRAND}18` }}>
              <Printer className="h-5 w-5" style={{ color: BRAND }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("print") || "Print Invoice"}
              </h3>
              <p className="text-xs text-slate-500">#{invoiceNum}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Printer className="h-4 w-4" />
              {t("print") || "Print"}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="p-6" dir={isRtl ? "rtl" : "ltr"}>
          <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {/* Blue side bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                [isRtl ? "right" : "left"]: 0,
                width: 8,
                backgroundColor: BRAND,
              }}
            />

            <div className={`p-8 ${isRtl ? "pr-10" : "pl-10"}`}>
              <h1 className="text-2xl font-black text-slate-900 mb-6">
                {t("invoiceHistory") || "Medical Invoice"}
              </h1>

              {/* Two-column info */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: BRAND }}>
                    {t("patient")}
                  </p>
                  <p className="font-semibold text-slate-900">{invoice.patientName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: BRAND }}>
                    {t("printHeaderTitle") || "SmileCraft Dental Clinic"}
                  </p>
                  <p className="text-sm text-slate-500">{formatDate(invoice.createdAt)}</p>
                </div>
              </div>

              {/* Meta bar */}
              <div className="grid grid-cols-4 border border-slate-200 rounded-lg overflow-hidden mb-6">
                {[
                  { label: t("invoiceNumber") || "Invoice #", val: invoiceNum },
                  { label: t("date") || "Date", val: formatDate(invoice.createdAt) },
                  { label: "Due Date", val: formatDate(dueDate) },
                  {
                    label: t("totalAmount") || "Amount Due",
                    val: formatCurrency(invoice.totalAmount),
                    accent: true,
                  },
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`px-4 py-3 ${i < 3 ? "border-e border-slate-200" : ""}`}
                  >
                    <p className="text-[10px] font-bold uppercase text-slate-500">{c.label}</p>
                    <p
                      className="text-sm font-extrabold mt-0.5"
                      style={{ color: c.accent ? BRAND : "#0f172a" }}
                    >
                      {c.val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Financial Table */}
              <div className="rounded-lg overflow-hidden border border-slate-200 mb-6">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: BRAND }}>
                      <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-white">
                        {t("description") || "Description"}
                      </th>
                      <th className="px-4 py-3 text-end text-xs font-bold uppercase tracking-wider text-white">
                        {t("amount") || "Amount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">
                        {t("totalAmount") || "Total Amount"}
                      </td>
                      <td className="px-4 py-3 text-end text-sm font-bold text-slate-900 border-b border-slate-100">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">
                        {t("paid") || "Paid"}
                      </td>
                      <td className="px-4 py-3 text-end text-sm font-bold text-emerald-600 border-b border-slate-100">
                        {formatCurrency(invoice.paidAmount)}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">
                        {t("balance") || "Balance"}
                      </td>
                      <td
                        className={`px-4 py-3 text-end text-sm font-bold border-b border-slate-100 ${
                          invoice.balance > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(invoice.balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom: status + totals */}
              <div className="grid grid-cols-2 gap-6 items-start mb-8">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase text-slate-700 mb-2">
                    {t("status") || "Status"}
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusLabel.color}`}
                  >
                    {isRtl ? statusLabel.ar : statusLabel.en}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{t("paid") || "Paid"}</span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-black text-slate-900">
                    <span>{t("netPayment") || "Net Payment"}</span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  {t("printedAt") || "Printed at"}: {formatDateTime(new Date())}
                </p>
                <div className={isRtl ? "text-start" : "text-end"}>
                  <p
                    className="font-extrabold text-sm flex items-center gap-1"
                    style={{ justifyContent: isRtl ? "flex-start" : "flex-end", display: "flex" }}
                  >
                    <span style={{ color: BRAND }}>✦</span>
                    {t("printHeaderTitle") || "SmileCraft Dental Clinic"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isRtl ? "تم إنشاؤها بواسطة SmileCraft" : "Generated by SmileCraft"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}