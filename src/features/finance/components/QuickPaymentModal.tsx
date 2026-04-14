"use client";

import React, { useState, useTransition } from "react";
import { X, Wallet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Invoice, formatCurrency } from "@/features/finance/types";
import { quickCashPaymentAction } from "@/features/finance/serverActions";
import toast from "react-hot-toast";

interface QuickPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoice) => void;
}

export function QuickPaymentModal({ invoice, onClose, onSuccess }: QuickPaymentModalProps) {
  const t = useTranslations("Finance");
  const [amount, setAmount] = useState<string>(invoice.balance.toFixed(0));
  const [notes, setNotes] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const remainingBalance = invoice.balance;
  const enteredAmount = parseFloat(amount) || 0;
  const isValid = enteredAmount > 0 && enteredAmount <= remainingBalance;

  const handleSubmit = async () => {
    setError("");

    if (!isValid) {
      setError(t("invalidAmount"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await quickCashPaymentAction({
          invoiceId: invoice.id,
          amount: enteredAmount,
          notes: notes || undefined,
        });

        if (result.success) {
          const updatedInvoice: Invoice = {
            ...result.invoice,
            createdAt: result.invoice.createdAt,
          };
          onSuccess(updatedInvoice);
          toast.success(t("paymentSuccess", { amount: formatCurrency(enteredAmount) }));
          onClose();
        }
      } catch (err) {
        // Graceful error handling - prevent page reloads
        console.error("[QuickPaymentModal] Payment failed:", err);
        const message = err instanceof Error ? err.message : t("paymentError");
        setError(message);
        toast.error(`${t("paymentError")}: ${message}`, {
          duration: 4000,
        });
        // Don't close modal on error - let user retry
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("recordCashPayment")}
              </h3>
              <p className="text-xs text-slate-500">
                {t("invoiceNumber")} #{invoice.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Patient Info */}
        <div className="mb-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{t("patient")}:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{invoice.patientName}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-500">{t("totalAmount")}:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-500">{t("paidAmount")}:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-500">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-700 dark:text-slate-300">{t("remaining")}:</span>
            <span className="font-bold text-red-600 dark:text-red-500">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-sm font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            المبلغ (EGP)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              step="0.01"
              max={remainingBalance}
              min="0.01"
              required
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-lg font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
              placeholder="0"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              EGP
            </span>
          </div>
          {!isValid && amount && (
            <p className="mt-1.5 text-xs text-red-500">
              {enteredAmount > remainingBalance
                ? t("amountExceedsBalance")
                : t("amountGreaterThanZero")}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("notes")} ({t("optional")})
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
            placeholder={t("notesPlaceholder")}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !isValid}
            className="w-2/3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("confirmPayment")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
