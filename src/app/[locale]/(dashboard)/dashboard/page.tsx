import { StatsGrid } from "@/features/dashboard/components/StatsGrid";
import { WeeklyRevenueChartServer } from "@/features/dashboard/components/WeeklyRevenueChartServer";
import { ProceduresBreakdown } from "@/features/dashboard/components/ProceduresBreakdown";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { InventoryAlerts } from "@/features/dashboard/components/InventoryAlerts";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import { BirthdayReminders } from "@/features/dashboard/components/BirthdayReminders";
import { LabTracker } from "@/features/dashboard/components/LabTracker";
import { OutstandingBalances } from "@/features/dashboard/components/OutstandingBalances";
import { DailyAgenda } from "@/features/appointments/components/DailyAgenda";
import { getTranslations } from "next-intl/server";
import { PageTransition } from "@/components/ui/PageTransition";
import { resolveUserFullName } from "@/lib/supabase-utils";
import { fixOrphanedUserAction } from "@/features/users/actions/fixOrphanedUserAction";
import { redirect } from "next/navigation";

/**
 * Returns a time-based greeting translation key.
 * - 5:00 - 11:59 → Morning
 * - 12:00 - 16:59 → Afternoon
 * - 17:00 - 20:59 → Evening
 * - 21:00 - 4:59 → Night
 */
function getTimeBasedGreetingKey(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return "greetingMorning";
  } else if (hour >= 12 && hour < 17) {
    return "greetingAfternoon";
  } else if (hour >= 17 && hour < 21) {
    return "greetingEvening";
  } else {
    return "greetingNight";
  }
}

export const metadata = {
  title: "لوحة التحكم | SmileCraft CMS",
  description: "نظام إدارة عيادة الأسنان - لوحة التحكم الرئيسية",
};

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const greetingKey = getTimeBasedGreetingKey();

  // Try to get user name; if it fails due to missing clinic, fix it
  let userName: string | null = null;
  let needsRedirect = false;
  let redirectPath = "/dashboard";

  try {
    userName = await resolveUserFullName();
  } catch (error) {
    // User is orphaned — try to fix automatically
    console.warn("[Dashboard] User missing clinic, attempting auto-fix...", error);
    const result = await fixOrphanedUserAction();

    if (result.success && result.redirectPath) {
      needsRedirect = true;
      redirectPath = result.redirectPath;
    } else {
      // If fix failed, rethrow to show error boundary
      throw new Error(result.message);
    }
  }

  // If we successfully fixed the user, redirect to refresh the page
  if (needsRedirect) {
    redirect(redirectPath);
  }

  return (
    <PageTransition loadingText={t(greetingKey, { name: userName || "Doctor" })}>
      <div className="w-full mx-auto space-y-5">
        {/* ── Greeting Header ── */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t(greetingKey, { name: userName || "Doctor" })}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t("summary")}
          </p>
        </div>

        {/* ── 1. Stats Grid ── */}
        <StatsGrid />

        {/* ── 2. Quick Actions ── */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
          <QuickActions />
          </div>
          <div>
          <WeeklyRevenueChartServer />
          </div>
           <div className="lg:col-span-1 ">
                  <ProceduresBreakdown />
          </div>
        </div>
      

        {/* ── 3. Main Content: Agenda + Revenue Chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <DailyAgenda />
          </div>
          <div>
             <RecentActivity />
          </div>
        </div>

        {/* ── 4. Secondary Row: Procedures + Recent Activity + Lab ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         <InventoryAlerts />
         <OutstandingBalances />
          <LabTracker />
        </div>

        {/* ── 5. Bottom Row: Inventory + Birthdays + Balances ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
         {/*  <BirthdayReminders /> */}
         
        </div>
      </div>
    </PageTransition>
  );
}
