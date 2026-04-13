// =============================================================================
// SmileCraft CMS — Today's Queue: Supabase Data Service (server-only)
// ✅ Migrated to Prisma for database queries (bypasses RLS)
// All queries are scoped to the authenticated user's clinicId.
// src/features/appointments/services/queue.ts
// =============================================================================
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import type { AppointmentStatus } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

/** Shape of a single row in the Today's Queue list */
export interface QueueAppointment {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  /** HH:mm time string, e.g. "09:30" */
  startTime: string
  type: string | null
  status: AppointmentStatus
}

/** Aggregated stats shown in the header cards */
export interface QueueStats {
  total: number
  /** SCHEDULED — waiting outside */
  scheduled: number
  /** CONFIRMED — currently inside the clinic */
  confirmed: number
  completed: number
  /** CANCELLED + NO_SHOW combined */
  cancelled: number
}

// ---------------------------------------------------------------------------
// fetchTodaysQueue
// ---------------------------------------------------------------------------

/**
 * Fetches today's appointments for `clinicId`, joined with the patients table
 * to get fullName and phone. Ordered by startTime ascending.
 *
 * ✅ Uses Prisma for database queries (bypasses RLS).
 *
 * @param clinicId  The clinic scope (multi-tenant guard).
 */
export async function fetchTodaysQueue(clinicId: string): Promise<{
  appointments: QueueAppointment[]
  stats: QueueStats
}> {
  // Build today's date window in ISO-8601
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch appointments with patient relation via Prisma
  const appointmentsData = await prisma.appointments.findMany({
    where: {
      clinicId,
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    select: {
      id: true,
      patientId: true,
      startTime: true,
      type: true,
      status: true,
      patients: {
        select: {
          fullName: true,
          phone: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  // Map Prisma results → typed QueueAppointment objects
  const appointments: QueueAppointment[] = appointmentsData.map((row) => ({
    id: row.id,
    patientId: row.patientId,
    patientName: row.patients?.fullName ?? '—',
    patientPhone: row.patients?.phone ?? '',
    startTime: row.startTime,
    type: row.type,
    status: row.status as AppointmentStatus,
  }))

  // Build stats
  const stats: QueueStats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === 'SCHEDULED').length,
    confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(
      (a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW'
    ).length,
  }

  return { appointments, stats }
}

// ---------------------------------------------------------------------------
// getAuthenticatedClinicId
// ---------------------------------------------------------------------------

/**
 * Reads the authenticated user's session from Supabase Auth, then looks up
 * the corresponding clinicId from the `users` table.
 *
 * Throws an Error if not authenticated or if the user record is missing.
 */
export async function getAuthenticatedClinicId(): Promise<string> {
  const supabase = await createClient()

  // 1. Verify session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: No active Supabase session.')
  }

  // 2. Fetch clinicId from the users table using Prisma (bypasses RLS)
  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true },
  })

  if (!dbUser) {
    throw new Error(`User record not found in DB for uid=${user.id}`)
  }

  return dbUser.clinicId
}
