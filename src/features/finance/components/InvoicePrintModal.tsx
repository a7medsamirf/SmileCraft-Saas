"use client";

import React, { useRef } from "react";
import { X, Printer, Building2, Phone, Calendar } from "lucide-react";
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS, formatCurrency } from "@/features/finance/types";

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, onClose }: InvoicePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة #${invoice.id.slice(0, 8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 40px;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: 900;
            color: #059669;
            margin-bottom: 8px;
          }
          .invoice-title {
            font-size: 20px;
            font-weight: 700;
            color: #475569;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 30px;
          }
          .meta-item {
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .meta-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .meta-value {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .summary-table th {
            background: #f1f5f9;
            padding: 12px 16px;
            text-align: right;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
          }
          .summary-table td {
            padding: 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 15px;
          }
          .summary-table .amount {
            text-align: left;
            font-weight: 700;
          }
          .total-row td {
            background: #f0fdf4;
            font-weight: 900;
            font-size: 18px;
            color: #059669;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            color: #94a3b8;
            font-size: 12px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">SmileCraft Dental Clinic</div>
          <div class="invoice-title">فاتورة طبية</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">رقم الفاتورة</div>
            <div class="meta-value">#${invoice.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">التاريخ</div>
            <div class="meta-value">${new Date(invoice.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">اسم المريض</div>
            <div class="meta-value">${invoice.patientName || "N/A"}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">الحالة</div>
            <div class="meta-value">
              <span class="status-badge" style="background: ${invoice.status === "PAID" ? "#d1fae5" : invoice.status === "PARTIAL" ? "#fef3c7" : "#f1f5f9"}; color: ${invoice.status === "PAID" ? "#059669" : invoice.status === "PARTIAL" ? "#d97706" : "#475569"}">
                ${statusLabel.ar}
              </span>
            </div>
          </div>
        </div>

        <table class="summary-table">
          <thead>
            <tr>
              <th>البيان</th>
              <th style="text-align: left">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>إجمالي الفاتورة</td>
              <td class="amount">${formatCurrency(invoice.totalAmount)}</td>
            </tr>
            <tr>
              <td>المدفوع</td>
              <td class="amount" style="color: #059669">${formatCurrency(invoice.paidAmount)}</td>
            </tr>
            <tr>
              <td>المتبقي</td>
              <td class="amount" style="color: ${invoice.balance > 0 ? "#dc2626" : "#059669"}">${formatCurrency(invoice.balance)}</td>
            </tr>
            <tr class="total-row">
              <td>صافي الدفع</td>
              <td class="amount">${formatCurrency(invoice.paidAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>SmileCraft Dental Clinic — شكراً لثقتكم بنا</p>
          <p>تم الطباعة بتاريخ: ${new Date().toLocaleString("ar-EG")}</p>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/10">
              <Printer className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                طباعة الفاتورة
              </h3>
              <p className="text-xs text-slate-500">
                #{invoice.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold shadow-lg shadow-blue-500/25 transition-all"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Print Preview */}
        <div ref={printRef} className="p-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-8">
            {/* Clinic Header */}
            <div className="text-center border-b-2 border-emerald-500 pb-6 mb-6">
              <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
                SmileCraft Dental Clinic
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                فاتورة طبية
              </p>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase">رقم الفاتورة</p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white font-mono">
                  #{invoice.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> التاريخ
                </p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {new Date(invoice.createdAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase">المريض</p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {invoice.patientName || "N/A"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase">الحالة</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusLabel.color}`}>
                    {statusLabel.ar}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-bold uppercase text-slate-500">البيان</th>
                    <th className="px-4 py-3 text-end text-xs font-bold uppercase text-slate-500">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">إجمالي الفاتورة</td>
                    <td className="px-4 py-4 text-end text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                    <td className="px-4 py-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">المدفوع</td>
                    <td className="px-4 py-4 text-end text-sm font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-red-700 dark:text-red-400">المتبقي</td>
                    <td className={`px-4 py-4 text-end text-sm font-bold ${invoice.balance > 0 ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                      {formatCurrency(invoice.balance)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-emerald-500 dark:bg-emerald-600">
                  <tr>
                    <td className="px-4 py-4 text-base font-black text-white">صافي الدفع</td>
                    <td className="px-4 py-4 text-end text-base font-black text-white">{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 font-medium">
                SmileCraft Dental Clinic — شكراً لثقتكم بنا
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                تم الطباعة بتاريخ: {new Date().toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
