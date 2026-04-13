"use client";

import React, { useEffect, useState } from "react";
import { DailyRevenue } from "@/features/dashboard/components/DailyRevenue";
import { FinanceDashboard } from "@/features/finance/components/FinanceDashboard";
import { WalletCards, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PaymentMethod, Invoice } from "@/features/finance";
import { PageTransition } from "@/components/ui/PageTransition";
import { getInvoicesAction, getFinanceStatsAction } from "@/features/finance/serverActions";

export function FinanceClient() {
  const t = useTranslations("Finance");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesData, stats] = await Promise.all([
          getInvoicesAction(),
          getFinanceStatsAction()
        ]);
        
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Failed to load finance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <PageTransition loadingText={t("title")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ms-3 text-sm font-medium text-slate-500">
            {t("loading") || "Loading..."}
          </span>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                 <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                   <WalletCards className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
              </div>
              
              {t("title")}
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Finance Dashboard with real data */}
          <FinanceDashboard />
          <DailyRevenue />
          {/* Recent Invoices */}
          <div className="glass-card p-6 shadow-sm shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-300">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">
              {t("recentInvoices") || "Recent Invoices"}
            </h3>
            {invoices.length === 0 ? (
              <div className="h-48 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 text-sm italic">
                {t("noInvoicesYet") || "No invoices created yet"}
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 10).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {invoice.patientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {invoice.totalAmount.toLocaleString()} {t("currency") || "EGP"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {invoice.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
