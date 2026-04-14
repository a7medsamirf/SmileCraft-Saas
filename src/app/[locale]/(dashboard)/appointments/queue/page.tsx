// =============================================================================
// SmileCraft CMS — Today's Queue Page (Server Component)
//
// Architecture:
//   1. Authenticates the current user via Supabase Auth (no Prisma).
//   2. Resolves the user's clinicId from the `users` table — multi-tenant scope.
//   3. Fetches today's appointments joined with patient data using PostgREST.
//   4. Renders <TodayQueueUI> with the data as props (pure UI, Client Component).
//   5. Mounts <RealtimeAppointmentHandler> (headless Client Component) which
//      subscribes to Supabase Postgres Changes and calls router.refresh()
//      on any INSERT / UPDATE / DELETE — making the queue update live without
//      a full page reload.
//
// Data flow:
//   Supabase DB ──(postgres_changes)──► RealtimeAppointmentHandler
//                                                │
//                                         router.refresh()
//                                                │
//                                    Server Component re-runs
//                                                │
//                                    fetchTodaysQueue() called again
//                                                │
//                                    <TodayQueueUI> receives new props
//
// src/app/[locale]/(dashboard)/appointments/queue/page.tsx
// =============================================================================

import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";

import { PageTransition } from "@/components/ui/PageTransition";
import { TodayQueueWithOptimism } from "@/features/appointments/components/TodayQueueWithOptimism";
import { RealtimeAppointmentHandler } from "@/features/appointments/components/RealtimeAppointmentHandler";
import {
  fetchTodaysQueue,
  getAuthenticatedClinicId,
} from "@/features/appointments/services/queue";

// ---------------------------------------------------------------------------
// Page Props
// ---------------------------------------------------------------------------
interface PageProps {
  params: Promise<{ locale: string }>;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default async function AppointmentsQueuePage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("Appointments");

  // ── 1. Resolve the authenticated user's clinic scope ────────────────────
  // Uses Supabase Auth + a lookup on the `users` table.
  // Throws if unauthenticated — redirects to 404 (middleware will handle auth
  // redirect once it's activated; for now, notFound() is a safe fallback).
  let clinicId: string;
  try {
    clinicId = await getAuthenticatedClinicId();
  } catch (err) {
    console.error(
      "[AppointmentsQueuePage] Auth/clinic resolution failed:",
      err,
    );
    notFound();
  }

  // ── 2. Fetch today's appointments (Supabase PostgREST — no Prisma) ───────
  // Joins `appointments` with `patients!inner` to get fullName + phone.
  // Filtered by clinicId (multi-tenancy) and today's date window.
  // Ordered by startTime ascending.
  const { appointments, stats } = await fetchTodaysQueue(clinicId);

  // ── 3. Render ────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/appointments"
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              title="العودة للمواعيد"
            >
              {locale === "ar" ? (
                <ArrowRight className="h-5 w-5" />
              ) : (
                <ArrowLeft className="h-5 w-5" />
              )}
            </Link>
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900 dark:text-white">
                   <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
                      <CalendarCheck className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                  </div>
                {t("queueTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t("queueSubtitle")}
              </p>
            </div>
          </div>

          {/* Live indicator — visible hint that Realtime is active */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {t("queueLive")}
          </div>
        </div>

        {/* ── Queue Table + Stats Cards ─────────────────────────────────── */}
        {/*
          TodayQueueWithOptimism is a Client Component that:
          - Renders the 5-card stats grid
          - Renders the appointments table with status badges
          - Exposes action buttons (summon, complete, cancel) via Server Actions
          - Links each active patient to the Clinical module (mouthMap)
          - Implements optimistic UI updates for instant feedback
        */}
        <TodayQueueWithOptimism
          appointments={appointments}
          stats={stats}
          locale={locale}
        />

        {/* ── Realtime Listener ─────────────────────────────────────────── */}
        {/*
          Headless Client Component — renders nothing.
          Subscribes to `postgres_changes` on the `appointments` table,
          filtered by clinicId. Calls router.refresh() on any event,
          which re-runs THIS Server Component and re-fetches fresh data.

          The Supabase Realtime broker respects RLS policies, so users only
          receive events for their own clinic's rows.
        */}
        <RealtimeAppointmentHandler
          clinicId={clinicId}
          appointments={appointments}
        />

        {/* Debug indicator - remove this after testing */}
 {/*        {process.env.NODE_ENV === "development" && (
          <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white px-3 py-2 rounded-lg text-xs font-mono">
            Realtime Handler: ✅ Mounted (clinicId: {clinicId?.slice(0, 8)}...)
            <br />
            Check console for [RealtimeAppointmentHandler] logs
          </div>
        )} */}
      </div>
    </PageTransition>
  );
}
