"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { X, Printer } from "lucide-react";
import { PlanItem } from "../types/treatmentPlan";

const BRAND = "#155dfc";

interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  taxNumber?: string;
  registrationNumber?: string;
}

interface PrintableInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  patientName: string;
  patientPhone: string;
  patientId?: string;
  items: PlanItem[];
  total: number;
  mode: "ALL" | "COMPLETED_ONLY";
  createdAt: Date;
  clinic?: ClinicInfo;
}

export function PrintableInvoice({
  isOpen,
  onClose,
  invoiceId,
  patientName,
  patientPhone,
  patientId,
  items,
  total,
  mode,
  createdAt,
  clinic,
}: PrintableInvoiceProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatDateTime = (date: Date) =>
    date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const clinicName = clinic?.name || t("clinicName") || "SmileCraft Dental Clinic";
  const isRtl = locale === "ar";
  const invoiceNum = invoiceId.slice(0, 8).toUpperCase();
  const currency = t("currency") || "EGP";
  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html dir="${isRtl ? "rtl" : "ltr"}" lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${t("medicalInvoice")} #${invoiceNum}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;background:#fff;position:relative}
    .side-bar{position:fixed;top:0;${isRtl ? "right" : "left"}:0;width:8px;height:100%;background:${BRAND}}
    .wrap{padding:32px 40px 32px ${isRtl ? "40px" : "48px"}}
    h1{font-size:28px;font-weight:900;color:#111;letter-spacing:-0.5px;margin-bottom:24px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
    .info-label{font-size:11px;font-weight:700;color:${BRAND};text-transform:uppercase;margin-bottom:6px}
    .info-value{font-size:13px;color:#333;line-height:1.6}
    .meta-bar{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin-bottom:28px}
    .meta-cell{padding:12px 16px;border-right:1px solid #d1d5db}
    .meta-cell:last-child{border-right:none}
    .meta-key{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
    .meta-val{font-size:15px;font-weight:800;color:#111}
    .meta-val.accent{color:${BRAND}}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead tr{background:${BRAND};color:#fff}
    th{padding:11px 14px;text-align:${isRtl ? "right" : "left"};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
    td{padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:${isRtl ? "right" : "left"}}
    tbody tr:nth-child(even){background:#f9fafb}
    .bottom{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;margin-top:8px}
    .notes-box{border:1px solid #d1d5db;border-radius:6px;padding:14px 16px}
    .notes-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#374151;margin-bottom:6px}
    .notes-text{font-size:12px;color:#6b7280;line-height:1.6}
    .totals{min-width:220px}
    .tot-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#374151}
    .tot-row.divider{border-top:1px solid #d1d5db;margin-top:4px;padding-top:12px}
    .tot-row.total{font-size:18px;font-weight:900;color:#111}
    .footer{margin-top:36px;border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}
    .footer-left{font-size:11px;color:#6b7280;line-height:1.7}
    .footer-left a{color:${BRAND};font-weight:600}
    .footer-brand{text-align:${isRtl ? "left" : "right"}}
    .footer-brand-name{font-size:15px;font-weight:900;color:#111;display:flex;align-items:center;gap:6px;justify-content:${isRtl ? "flex-start" : "flex-end"}}
    .footer-brand-name::before{content:'✦';color:${BRAND};font-size:14px}
    .footer-brand-sub{font-size:10px;color:#9ca3af}
  </style>
</head>
<body>
  <div class="side-bar"></div>
  <div class="wrap">
    <h1>${t("medicalInvoice")}</h1>

    <div class="two-col">
      <div>
        <div class="info-label">${t("patientInformation")}</div>
        <div class="info-value">
          <strong>${patientName}</strong><br>
          ${patientPhone || ""}<br>
          ${patientId ? `#${patientId.slice(0,8).toUpperCase()}` : ""}
        </div>
      </div>
      <div>
        <div class="info-label">${clinicName}</div>
        <div class="info-value">
          ${clinic?.address || ""}<br>
          ${clinic?.phone ? `${t("phone")}: ${clinic.phone}` : ""}<br>
          ${clinic?.email || ""}
        </div>
      </div>
    </div>

    <div class="meta-bar">
      <div class="meta-cell">
        <div class="meta-key">${t("invoiceNumber")}</div>
        <div class="meta-val">${invoiceNum}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("date")}</div>
        <div class="meta-val">${formatDate(createdAt)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("invoiceDate") || "Due Date"}</div>
        <div class="meta-val">${formatDate(dueDate)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-key">${t("totalAmount")}</div>
        <div class="meta-val accent">${total.toLocaleString()} ${currency}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t("toothNumber")}</th>
          <th>${t("procedure")}</th>
          <th style="text-align:${isRtl ? "left" : "right"}">${t("amount")}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>#${item.toothId}</td>
          <td>${item.procedure}</td>
          <td style="font-weight:700;text-align:${isRtl ? "left" : "right"}">${item.estimatedCost.toLocaleString()} ${currency}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <div class="bottom">
      <div class="notes-box">
        <div class="notes-title">${t("paymentNote") || "Notes"}</div>
        <div class="notes-text">
          ${mode === "COMPLETED_ONLY" ? (t("completedTreatmentsOnly") || "Completed treatments only") : (t("fullTreatmentPlan") || "Full treatment plan")}
        </div>
      </div>
      <div class="totals">
        <div class="tot-row"><span>${t("subtotal")}</span><span>${total.toLocaleString()} ${currency}</span></div>
        <div class="tot-row"><span>${t("tax") || "Tax (0%)"}</span><span>0 ${currency}</span></div>
        <div class="tot-row divider total"><span>${t("totalAmount")}</span><span>${total.toLocaleString()} ${currency}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        ${clinic?.email ? `${t("email")}: <a>${clinic.email}</a><br>` : ""}
        ${t("wishingYouHealth") || "Wishing you a speedy recovery"}
      </div>
      <div class="footer-brand">
        <div class="footer-brand-name">${clinicName}</div>
        <div class="footer-brand-sub">${locale === "ar" ? "تم إنشاؤها بواسطة SmileCraft" : "Generated by SmileCraft"}</div>
      </div>
    </div>
  </div>
  <script>window.onload=function(){window.print()};</script>
</body>
</html>`);
    w.document.close();
  };

  /* ─── Preview Modal ─────────────────────────────────────────── */
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900 rounded-t-3xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("invoicePreview")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                <Printer className="h-4 w-4" />
                {t("print")}
              </button>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview body */}
          <div className="p-6" dir={isRtl ? "rtl" : "ltr"}>
            {/* Side-bar accent preview */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white overflow-hidden">
              {/* Blue left bar */}
              <div
                className="absolute top-0 bottom-0 w-2"
                style={{ [isRtl ? "right" : "left"]: 0, backgroundColor: BRAND }}
              />
              <div className={`p-8 ${isRtl ? "pr-10" : "pl-10"}`}>
                {/* Title */}
                <h1 className="text-2xl font-black text-slate-900 mb-6">
                  {t("medicalInvoice")}
                </h1>

                {/* Two columns: patient | clinic */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: BRAND }}>
                      {t("patientInformation")}
                    </p>
                    <p className="font-semibold text-slate-900">{patientName}</p>
                    {patientPhone && <p className="text-sm text-slate-600">{patientPhone}</p>}
                    {patientId && (
                      <p className="text-sm text-slate-500 font-mono">
                        #{patientId.slice(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: BRAND }}>
                      {clinicName}
                    </p>
                    {clinic?.address && <p className="text-sm text-slate-600">{clinic.address}</p>}
                    {clinic?.phone && <p className="text-sm text-slate-600">{t("phone")}: {clinic.phone}</p>}
                    {clinic?.email && <p className="text-sm text-slate-600">{clinic.email}</p>}
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid grid-cols-4 border border-slate-200 rounded-lg overflow-hidden mb-6">
                  {[
                    { label: t("invoiceNumber"), val: invoiceNum },
                    { label: t("date"), val: formatDate(createdAt) },
                    { label: t("invoiceDate") || "Due Date", val: formatDate(dueDate) },
                    { label: t("totalAmount"), val: `${total.toLocaleString()} ${currency}`, accent: true },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`px-4 py-3 ${i < 3 ? "border-e border-slate-200" : ""}`}
                    >
                      <p className="text-[10px] font-bold uppercase text-slate-500">{c.label}</p>
                      <p
                        className="text-sm font-extrabold mt-0.5"
                        style={{ color: c.accent ? BRAND : "#111" }}
                      >
                        {c.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="rounded-lg overflow-hidden border border-slate-200 mb-6">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: BRAND }}>
                        <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-white">
                          {t("toothNumber")}
                        </th>
                        <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-white">
                          {t("procedure")}
                        </th>
                        <th className="px-4 py-3 text-end text-xs font-bold uppercase tracking-wider text-white">
                          {t("amount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr
                          key={item.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-slate-700">
                            #{item.toothId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {item.procedure}
                          </td>
                          <td className="px-4 py-3 text-end text-sm font-bold text-slate-900">
                            {item.estimatedCost.toLocaleString()} {currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom: notes + totals */}
                <div className="grid grid-cols-2 gap-6 items-start mb-8">
                  {/* Notes */}
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-700 mb-2">
                      {t("paymentNote") || "Notes"}
                    </p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {mode === "COMPLETED_ONLY"
                        ? t("completedTreatmentsOnly")
                        : t("fullTreatmentPlan")}
                    </p>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>{t("subtotal")}</span>
                      <span>{total.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>{t("tax") || "Tax (0%)"}</span>
                      <span>0 {currency}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-black text-slate-900">
                      <span>{t("totalAmount")}</span>
                      <span>{total.toLocaleString()} {currency}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    {clinic?.email && (
                      <span style={{ color: BRAND }} className="font-semibold">{clinic.email}</span>
                    )}
                  </p>
                  <div className="text-end">
                    <p className="font-extrabold text-slate-900 flex items-center gap-1 justify-end">
                      <span style={{ color: BRAND }}>✦</span> {clinicName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {locale === "ar" ? "تم إنشاؤها بواسطة SmileCraft" : "Generated by SmileCraft"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal for browser print */}
      {mounted &&
        createPortal(
          <div
            className="print-only-clinical-invoice"
            style={{ backgroundColor: "white", color: "black" }}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <style>{`
              .print-only-clinical-invoice { display: none; }
              @media print {
                body > *:not(.print-only-clinical-invoice) { display: none !important; }
                .print-only-clinical-invoice {
                  display: block !important;
                  background: #fff !important;
                  color: #000 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 32px 40px 32px ${isRtl ? "40px" : "48px"} !important;
                  position: relative !important;
                }
                @page { size: A4; margin: 0.5cm 1cm; }
              }
            `}</style>

            {/* Side accent bar via border */}
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              [isRtl ? "right" : "left"]: 0,
              width: 8, backgroundColor: BRAND,
            }} />

            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24 }}>
              {t("medicalInvoice")}
            </h1>

            {/* 2-col info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: BRAND, textTransform: "uppercase", marginBottom: 6 }}>
                  {t("patientInformation")}
                </p>
                <p style={{ fontWeight: 600 }}>{patientName}</p>
                {patientPhone && <p style={{ fontSize: 13, color: "#444" }}>{patientPhone}</p>}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: BRAND, textTransform: "uppercase", marginBottom: 6 }}>
                  {clinicName}
                </p>
                {clinic?.address && <p style={{ fontSize: 13, color: "#444" }}>{clinic.address}</p>}
                {clinic?.phone && <p style={{ fontSize: 13, color: "#444" }}>{t("phone")}: {clinic.phone}</p>}
              </div>
            </div>

            {/* Meta bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
              {[
                { l: t("invoiceNumber"), v: invoiceNum },
                { l: t("date"), v: formatDate(createdAt) },
                { l: t("invoiceDate") || "Due Date", v: formatDate(dueDate) },
                { l: t("totalAmount"), v: `${total.toLocaleString()} ${currency}`, accent: true },
              ].map((c, i) => (
                <div key={i} style={{ padding: "12px 16px", borderRight: i < 3 ? "1px solid #d1d5db" : "none" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>{c.l}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: c.accent ? BRAND : "#111" }}>{c.v}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: BRAND, color: "#fff" }}>
                  <th style={{ padding: "11px 14px", textAlign: isRtl ? "right" : "left" }}>{t("toothNumber")}</th>
                  <th style={{ padding: "11px 14px", textAlign: isRtl ? "right" : "left" }}>{t("procedure")}</th>
                  <th style={{ padding: "11px 14px", textAlign: isRtl ? "left" : "right" }}>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb" }}>#{item.toothId}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb" }}>{item.procedure}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, textAlign: isRtl ? "left" : "right" }}>
                      {item.estimatedCost.toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom notes + totals */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
              <div style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#374151", marginBottom: 6 }}>
                  {t("paymentNote") || "Notes"}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  {mode === "COMPLETED_ONLY" ? t("completedTreatmentsOnly") : t("fullTreatmentPlan")}
                </p>
              </div>
              <div style={{ minWidth: 200 }}>
                {[
                  { l: t("subtotal"), v: `${total.toLocaleString()} ${currency}` },
                  { l: t("tax") || "Tax (0%)", v: `0 ${currency}` },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", color: "#374151" }}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d1d5db", marginTop: 4, paddingTop: 10, fontSize: 18, fontWeight: 900, color: "#111" }}>
                  <span>{t("totalAmount")}</span>
                  <span>{total.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 36, borderTop: "1px solid #e5e7eb", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 11, color: "#6b7280" }}>
                {clinic?.email && <span style={{ color: BRAND, fontWeight: 600 }}>{clinic.email}</span>}
              </p>
              <div style={{ textAlign: isRtl ? "left" : "right" }}>
                <p style={{ fontWeight: 900, fontSize: 14 }}>✦ {clinicName}</p>
                <p style={{ fontSize: 10, color: "#9ca3af" }}>
                  {locale === "ar" ? "تم إنشاؤها بواسطة SmileCraft" : "Generated by SmileCraft"}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
