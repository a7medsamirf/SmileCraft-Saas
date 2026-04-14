"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, FileText, Search, Wallet, Printer, TrendingUp, Banknote, CreditCard, SmartphoneNfc, Dna } from "lucide-react";
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS, formatCurrency } from "@/features/finance/types";
import { getInvoicesAction } from "@/features/finance/serverActions";
import { QuickPaymentModal } from "./QuickPaymentModal";
import { InvoicePrintModal } from "./InvoicePrintModal";
import toast from "react-hot-toast";

export function InvoiceHistoryTable() {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modal states
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setMounted(true);
    const loadInvoices = async () => {
      try {
        const invoicesData = await getInvoicesAction();
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const handlePaymentSuccess = (updatedInvoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
    );
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.patientName?.toLowerCase().includes(searchLower) ||
      invoice.id.toLowerCase().includes(searchLower)
    );
  });

  // Calculate aggregates for filtered invoices
  const stats = {
    total: filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paid: filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    outstanding: filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0),
    count: filteredInvoices.length,
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const label = INVOICE_STATUS_LABELS[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${label.color}`}
      >
        {label.ar}
      </span>
    );
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.print-only-invoice-report');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const localeDir = locale === "ar" ? "rtl" : "ltr";
    const isRtl = locale === "ar";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${localeDir}" lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <title>${t("invoiceHistoryReport") || "Invoice History Report"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 20px;
            color: #000;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: 900;
            color: #059669;
          }
          .report-title {
            font-size: 18px;
            font-weight: 700;
            margin-top: 5px;
          }
          .print-date {
            text-align: ${isRtl ? 'left' : 'right'};
            margin-top: 10px;
            font-size: 12px;
            color: #666;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .stat-box {
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 16px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: ${isRtl ? 'right' : 'left'};
          }
          th {
            background: #f0f0f0;
            font-weight: 700;
          }
          .total-row {
            background: #e0e0e0;
            font-weight: 800;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px dashed #000;
          }
          .sig-box {
            width: 150px;
            text-align: center;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${t("printHeaderTitle")}</div>
          <div class="report-title">${t("invoiceHistoryReport")}</div>
          <div class="print-date">${new Date().toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">${t("totalInvoices")}</div>
            <div class="stat-value">${stats.count}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t("totalAmount")}</div>
            <div class="stat-value">${formatCurrency(stats.total)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t("paid")}</div>
            <div class="stat-value" style="color:#059669">${formatCurrency(stats.paid)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t("outstanding")}</div>
            <div class="stat-value" style="color:#dc2626">${formatCurrency(stats.outstanding)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t("invoiceId")}</th>
              <th>${t("patient")}</th>
              <th>${t("date")}</th>
              <th>${t("status")}</th>
              <th>${t("totalAmount")}</th>
              <th>${t("paidAmount")}</th>
              <th>${t("balance")}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => `
              <tr>
                <td>#${inv.id.slice(0, 8).toUpperCase()}</td>
                <td>${inv.patientName || "N/A"}</td>
                <td>${new Date(inv.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}</td>
                <td>${INVOICE_STATUS_LABELS[inv.status].ar}</td>
                <td>${formatCurrency(inv.totalAmount)}</td>
                <td>${formatCurrency(inv.paidAmount)}</td>
                <td>${formatCurrency(inv.balance)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4">${t("total")}</td>
              <td>${formatCurrency(stats.total)}</td>
              <td>${formatCurrency(stats.paid)}</td>
              <td>${formatCurrency(stats.outstanding)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">${t("doctorSignature")}</div>
          <div class="sig-box">${t("cashierSignature")}</div>
        </div>

        <div class="footer">
          ${t("autogeneratedBy")}
        </div>

        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-emerald-600 dark:text-emerald-500 animate-spin" />
          <span className="ms-3 text-sm font-medium text-slate-500">
            {t("loading") || "Loading..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card relative overflow-hidden print:hidden block transition-all duration-300">
        <div className="absolute -inset-inline-end-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20"></div>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/10">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t("invoiceHistory")}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("invoiceHistorySummary")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Print Report Button */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                {t("printReport") || "Print Report"}
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("searchInvoices") || "Search invoices..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Stats Summary */}
        {!isLoading && filteredInvoices.length > 0 && (
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-emerald-200 dark:hover:border-emerald-900 overflow-hidden">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-sm">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t("totalInvoices") || "Total Invoices"}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {stats.count}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-blue-200 dark:hover:border-blue-900 overflow-hidden">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow-sm">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t("totalAmount") || "Total Amount"}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(stats.total)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-emerald-200 dark:hover:border-emerald-900 overflow-hidden">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-sm">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t("paid") || "Paid"}</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                    {formatCurrency(stats.paid)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition hover:border-red-200 dark:hover:border-red-900 overflow-hidden">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 shadow-sm">
                  <SmartphoneNfc className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t("outstanding") || "Outstanding"}</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-500">
                    {formatCurrency(stats.outstanding)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchTerm ? t("noInvoicesFound") : t("noInvoicesYet")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("invoiceId") || "Invoice ID"}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("patient") || "Patient"}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("date") || "Date"}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("status") || "Status"}
                  </th>
                  <th className="px-6 py-4 text-end text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("totalAmount") || "Total"}
                  </th>
                  <th className="px-6 py-4 text-end text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("paidAmount") || "Paid"}
                  </th>
                  <th className="px-6 py-4 text-end text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("balance") || "Balance"}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                     {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                        #{invoice.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {invoice.patientName || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(invoice.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                        {formatCurrency(invoice.paidAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <span
                        className={`text-sm font-semibold ${
                          invoice.balance > 0
                            ? "text-red-600 dark:text-red-500"
                            : "text-emerald-600 dark:text-emerald-500"
                        }`}
                      >
                        {formatCurrency(invoice.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Pay Cash Button */}
                        {invoice.balance > 0 && invoice.status !== InvoiceStatus.PAID && (
                          <button
                            onClick={() => setPaymentInvoice(invoice)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm shadow-emerald-500/25 transition-all"
                            title={t("payCash")}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            {t("pay")}
                          </button>
                        )}
                        {/* Print Button */}
                        <button
                          onClick={() => setPrintInvoice(invoice)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm shadow-blue-500/25 transition-all"
                          title={t("printInvoice")}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {t("print")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with summary */}
        {!isLoading && filteredInvoices.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                {t("showingInvoices", { count: filteredInvoices.length })}
              </p>
              <div className="flex gap-6">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t("total") || "Total"}: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t("paid") || "Paid"}: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t("outstanding") || "Outstanding"}: </span>
                  <span className="font-bold text-red-600 dark:text-red-500">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          PRINT ONLY VERSION (Rendered via Portal)
          ========================================= */}
      {mounted &&
        createPortal(
            <div
                className="print-only-invoice-report"
                style={{ backgroundColor: 'white', color: 'black' }} 
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
<style>{`
              .print-only-invoice-report {
                display: none;
              }
              @media print {
                body > *:not(.print-only-invoice-report) {
                  display: none !important;
                }
                .print-only-invoice-report {
                  display: block !important;
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 20px !important;
                }
                .print-only-invoice-report * {
                  border-color: #000000 !important;
                }
                @page {
                  size: A4;
                  margin: 0.5cm 1cm;
                }
              }
            `}</style>

            {/* Header Section */}
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                    <Dna className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-black">
                      {t("printHeaderTitle")}
                    </h1>
                    <h2 className="text-base text-slate-600 font-medium mt-0.5">
                      {t("invoiceHistoryReport") || "Invoice History Report"}
                    </h2>
                  </div>
                </div>
                <div className="text-end">
                  <div className="inline-block rounded-lg px-4 py-2 text-sm text-slate-600">
                    <span className="font-semibold">{t("printDate") || "Date"}:</span>
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

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border border-black p-4 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-1">{t("totalInvoices") || "Total Invoices"}</p>
                <p className="text-2xl font-extrabold text-black">{stats.count}</p>
              </div>
              <div className="border border-black p-4 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-1">{t("totalAmount") || "Total Amount"}</p>
                <p className="text-2xl font-extrabold text-black">{formatCurrency(stats.total)}</p>
              </div>
              <div className="border border-black p-4 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-1">{t("paid") || "Paid"}</p>
                <p className="text-2xl font-extrabold text-emerald-600">{formatCurrency(stats.paid)}</p>
              </div>
              <div className="border border-black p-4 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-1">{t("outstanding") || "Outstanding"}</p>
                <p className="text-2xl font-extrabold text-red-600">{formatCurrency(stats.outstanding)}</p>
              </div>
            </div>

            {/* Invoices Table */}
            <table className="w-full text-left border-collapse border border-black text-sm" dir="rtl">
              <thead>
                <tr>
                  <th className="border border-black p-2 bg-gray-100">{t("invoiceId") || "Invoice ID"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("patient") || "Patient"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("date") || "Date"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("status") || "Status"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("totalAmount") || "Total"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("paidAmount") || "Paid"}</th>
                  <th className="border border-black p-2 bg-gray-100">{t("balance") || "Balance"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="border border-black p-2 font-mono">#{invoice.id.slice(0, 8).toUpperCase()}</td>
                    <td className="border border-black p-2">{invoice.patientName || "N/A"}</td>
                    <td className="border border-black p-2">
                      {new Date(invoice.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="border border-black p-2">{INVOICE_STATUS_LABELS[invoice.status].ar}</td>
                    <td className="border border-black p-2 font-bold">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="border border-black p-2">{formatCurrency(invoice.paidAmount)}</td>
                    <td className="border border-black p-2 font-bold">{formatCurrency(invoice.balance)}</td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold text-lg" colSpan={4}>
                    {t("total") || "Total"}
                  </td>
                  <td className="border border-black p-2 font-bold text-lg">{formatCurrency(stats.total)}</td>
                  <td className="border border-black p-2 font-bold text-lg">{formatCurrency(stats.paid)}</td>
                  <td className="border border-black p-2 font-bold text-lg">{formatCurrency(stats.outstanding)}</td>
                </tr>
              </tbody>
            </table>

            {/* Signatures Section */}
            <div className="mt-16 flex justify-between text-sm">
              <div className="text-center w-40 border-t border-dashed border-black pt-2">
                {t("doctorSignature") || "Doctor Signature"}
              </div>
              <div className="text-center w-40 border-t border-dashed border-black pt-2">
                {t("cashierSignature") || "Cashier Signature"}
              </div>
            </div>

            {/* Footer branding */}
            <div className="mt-16 text-center text-xs font-semibold text-slate-400">
              {t("autogeneratedBy")}
            </div>
          </div>,
          document.body,
        )}

      {/* Quick Payment Modal */}
      {paymentInvoice && (
        <QuickPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Print Invoice Modal */}
      {printInvoice && (
        <InvoicePrintModal
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </>
  );
}
