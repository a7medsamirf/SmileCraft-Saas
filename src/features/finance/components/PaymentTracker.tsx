"use client";

import React, { useActionState, useOptimistic, useState } from "react";
import { Invoice, Payment, PaymentMethod, PAYMENT_METHOD_LABELS, formatCurrency, InvoiceStatus, INVOICE_STATUS_LABELS } from "../types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Receipt, Wallet, Plus, X, AlertCircle } from "lucide-react";

interface PaymentTrackerProps {
  initialInvoice: Invoice;
  initialPayments: Payment[];
}

interface ActionState {
  success: boolean | null;
  error?: string;
}

// Simulated Server Action
async function addPaymentAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const amountStr = formData.get("amount") as string;
  const balanceStr = formData.get("currentBalance") as string;
  
  const amount = Number(amountStr);
  const balance = Number(balanceStr);

  // Fake Network Delay
  await new Promise((res) => setTimeout(res, 600));

  if (!amount || amount <= 0) {
    return { success: false, error: "يجب إدخال مبلغ صالح أكبر من الصفر." };
  }
  if (amount > balance) {
    return { success: false, error: `المبلغ المدخل (${formatCurrency(amount)}) أكبر من الرصيد المتبقي (${formatCurrency(balance)}).` };
  }

  return { success: true };
}

export function PaymentTracker({ initialInvoice, initialPayments }: PaymentTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, formAction, isPending] = useActionState(addPaymentAction, { success: null });

  // useOptimistic to instantly update UI while the server processes the payment
  const [optimisticState, addOptimisticPayment] = useOptimistic(
    { invoice: initialInvoice, payments: initialPayments },
    (state, newPayment: Payment) => {
      const newPaidAmount = state.invoice.paidAmount + newPayment.amount;
      const newBalance = state.invoice.totalAmount - newPaidAmount;
      let newStatus = state.invoice.status;
      
      if (newBalance <= 0) newStatus = InvoiceStatus.PAID;
      else if (newPaidAmount > 0) newStatus = InvoiceStatus.PARTIAL;

      return {
        invoice: { ...state.invoice, paidAmount: newPaidAmount, balance: newBalance, status: newStatus },
        payments: [newPayment, ...state.payments], // Latest first
      };
    }
  );

  const { invoice, payments } = optimisticState;
  const progressPercent = Math.min((invoice.paidAmount / invoice.totalAmount) * 100, 100);
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];

  // Intercept form submission to add optimistic state
  const handleFormAction = (formData: FormData) => {
    const amount = Number(formData.get("amount"));
    const method = formData.get("method") as PaymentMethod;
    const balance = Number(formData.get("currentBalance"));

    if (amount > 0 && amount <= balance) {
      addOptimisticPayment({
        id: `opt-${Date.now()}`,
        invoiceId: invoice.id,
        amount,
        method,
        date: new Date().toISOString(),
      });
      setIsModalOpen(false); // Close modal instantly for the user
    }
    
    // Continue actual server action
    React.startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-t-4 border-t-emerald-500">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            تتبع المدفوعات (Payment Tracker)
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-medium">
            فاتورة رقم: <span dir="ltr">#{invoice.id.slice(-6)}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusLabel.color}`}>
              {statusLabel.ar}
            </span>
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)} 
          disabled={invoice.status === InvoiceStatus.PAID}
          variant={invoice.status === InvoiceStatus.PAID ? "ghost" : "primary"}
          className="rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800"
        >
          {invoice.status === InvoiceStatus.PAID ? "تم إكتمال الدفع" : (
            <>
              <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              إضافة دفعة
            </>
          )}
        </Button>
      </div>

      {/* Financial Summary & Progress */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50 text-center border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500">الإجمالي</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30 text-center border border-emerald-100 dark:border-emerald-900/50">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">المدفوع</p>
          <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(invoice.paidAmount)}</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-950/30 text-center border border-red-100 dark:border-red-900/50">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">المتبقي</p>
          <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(invoice.balance)}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
          <span>نسبة التحصيل</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>

      {/* Payment History Log */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">سجل الدفعات السابقة</h4>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">لا توجد أي مدفوعات مسجلة حتى الآن.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700">
                    <Receipt className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(payment.date).toLocaleDateString("ar-EG")} • {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.id.startsWith('opt-') && <span className="text-[10px] text-emerald-600 mr-2">(جاري الحفظ...)</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline Modal (Popover replacement for strict modularity) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">تسجيل دفعة نقدية</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formState.error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4" />
                {formState.error}
              </div>
            )}

            <form action={handleFormAction} className="flex flex-col gap-5">
              <input type="hidden" name="currentBalance" value={invoice.balance} />
              
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  المبلغ (الرصيد المتاح: {formatCurrency(invoice.balance)})
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="amount" 
                    step="0.01"
                    max={invoice.balance} // UI validation layer 
                    required 
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg font-bold focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    placeholder="مثال: 500"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">EGP</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  طريقة الدفع
                </label>
                <select 
                  name="method"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value={PaymentMethod.CASH}>كاش (نقدي)</option>
                  <option value={PaymentMethod.CARD}>فيزا / بطاقة إئتمان</option>
                  <option value={PaymentMethod.WALLET}>محفظة إلكترونية (فودافون كاش)</option>
                </select>
              </div>

              <div className="mt-4 flex gap-3">
                <Button type="button" variant="outline" className="w-1/3 py-6 rounded-2xl" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={isPending} className="w-2/3 py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-base shadow-emerald-500/20 shadow-lg">
                  {isPending ? "جاري الحفظ..." : "تأكيد الدفع"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
