"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Printer } from "lucide-react";
import { PlanItem } from "../types/treatmentPlan";

interface PrintableInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  patientName: string;
  patientPhone: string;
  items: PlanItem[];
  total: number;
  mode: "ALL" | "COMPLETED_ONLY";
  createdAt: Date;
}

export function PrintableInvoice({
  isOpen,
  onClose,
  invoiceId,
  patientName,
  patientPhone,
  items,
  total,
  mode,
  createdAt,
}: PrintableInvoiceProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="no-print flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("invoicePreview")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
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

        <div className="print:p-8 p-6">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("invoiceTitle") || "Treatment Invoice"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "COMPLETED_ONLY" ? t("completedTreatmentsOnly") : t("fullTreatmentPlan")}
            </p>
          </div>

          <div className="mb-6 flex justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("patient")}
              </p>
              <p className="text-slate-900 dark:text-white">{patientName}</p>
              <p className="text-sm text-slate-500">{patientPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("invoiceNumber")}
              </p>
              <p className="font-mono text-slate-900 dark:text-white">{invoiceId.slice(0, 8).toUpperCase()}</p>
              <p className="mt-2 text-sm text-slate-500">{formatDate(createdAt)}</p>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("tooth") || "#"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("procedure")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("amount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 dark:text-white">
                      #{item.toothId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {item.procedure}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
                      {item.estimatedCost.toLocaleString()} {t("currency") || "EGP"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                    {t("total")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                    {total.toLocaleString()} {t("currency") || "EGP"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="text-center text-sm text-slate-500">
            <p>{t("thankYou") || "Thank you for choosing our clinic!"}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
