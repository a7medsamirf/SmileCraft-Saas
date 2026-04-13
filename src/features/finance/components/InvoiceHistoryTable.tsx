"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, FileText, Search, Wallet, Printer } from "lucide-react";
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS, formatCurrency } from "@/features/finance/types";
import { getInvoicesAction } from "@/features/finance/serverActions";
import { QuickPaymentModal } from "./QuickPaymentModal";
import { InvoicePrintModal } from "./InvoicePrintModal";
import toast from "react-hot-toast";

export function InvoiceHistoryTable() {
  const t = useTranslations("Finance");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
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
    <div className="glass-card">
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

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
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
      </div>

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
                  الإجراءات
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
                      {new Date(invoice.createdAt).toLocaleDateString("ar-EG", {
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
                          title="دفع كاش"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          دفع
                        </button>
                      )}
                      {/* Print Button */}
                      <button
                        onClick={() => setPrintInvoice(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm shadow-blue-500/25 transition-all"
                        title="طباعة الفاتورة"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        طباعة
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
    </div>
  );
}
