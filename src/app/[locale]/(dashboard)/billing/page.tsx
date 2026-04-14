import React from "react";
import { DailyRevenue } from "@/features/dashboard/components/DailyRevenue";
import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FinanceDashboard } from "@/features/finance/components/FinanceDashboard";
import { PageTransition } from "@/components/ui/PageTransition";
import { InvoiceHistoryTable } from "@/features/finance/components/InvoiceHistoryTable";
import { WeeklyRevenueChartServer } from "@/features/dashboard/components/WeeklyRevenueChartServer";

export const metadata = {
  title: "الحسابات | SmileCraft CMS",
};

export default async function BillingPage() {
  const t = await getTranslations("Finance");

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full space-y-5 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                <Wallet className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
              </div>
              {t("title")}
            </h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
              {t("revenueSummary")}
            </p>
          </div>
        </div>

        {/* Premium Analytics Dashboard */}
        <section className="animate-in slide-in-from-bottom-4 duration-1000">
          <FinanceDashboard />
          
        </section>

       {/* Weekly Revenue Chart */}
        <section className="animate-in slide-in-from-bottom-4 duration-1000">
           <InvoiceHistoryTable />
        </section>

        <div className="grid gap-5 grid-cols-1 xl:grid-cols-2">
          {/* Daily Cashflow View */}
          <div className="">
            <DailyRevenue />
          </div>

          {/* Detailed Invoices History */}
          <div className="">
             <WeeklyRevenueChartServer />
          
          </div>
        </div>




      </div>
    </PageTransition>
  );
}
