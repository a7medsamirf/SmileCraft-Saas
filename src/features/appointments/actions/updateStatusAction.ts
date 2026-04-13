// =============================================================================
// SmileCraft CMS — Update Appointment Status: Server Action
// ✅ Migrated to Prisma for database queries (bypasses RLS)
// All writes are scoped to the authenticated user's clinicId (multi-tenant guard).
// src/features/appointments/actions/updateStatusAction.ts
// =============================================================================
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import type { AppointmentStatus } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------
export interface UpdateStatusResult {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// updateAppointmentStatusAction
// ---------------------------------------------------------------------------

/**
 * Server Action — Updates the status of a single appointment.
 *
 * Security model (multi-tenancy):
 *  1. Authenticate the user via Supabase Auth.
 *  2. Look up their clinicId from the `users` table.
 *  3. Verify the target appointment belongs to that same clinicId.
 *  4. Only then perform the UPDATE.
 *
 * @param appointmentId  The cuid of the appointment to update.
 * @param newStatus      The target AppointmentStatus enum value.
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createClient()

    // ── Step 1: Auth check ────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Please log in.' }
    }

    // ── Step 2: Resolve clinicId from users table (via Prisma) ────────────
    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, role: true },
    })

    if (!dbUser) {
      return { success: false, error: 'User record not found.' }
    }

    const clinicId = dbUser.clinicId

    // ── Step 3: Ownership guard ───────────────────────────────────────────
    // Ensure the appointment belongs to the user's clinic before touching it.
    const existing = await prisma.appointments.findUnique({
      where: {
        id: appointmentId,
        clinicId,
      },
      select: { id: true, status: true },
    })

    if (!existing) {
      return {
        success: false,
        error: 'Appointment not found or you do not have permission to modify it.',
      }
    }

    // ── Step 4: Validate allowed transitions ──────────────────────────────
    // (Optional business-logic guard — prevent nonsensical transitions)
    const currentStatus = existing.status as AppointmentStatus
    const ALLOWED_FROM: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
      SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
    }
    const allowed = ALLOWED_FROM[currentStatus] ?? []
    if (allowed.length > 0 && !allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid transition: ${currentStatus} → ${newStatus}`,
      }
    }

    // ── Step 5: Perform the UPDATE (via Prisma) ───────────────────────────
    await prisma.appointments.update({
      where: {
        id: appointmentId,
        clinicId, // Belt-and-suspenders: scope the UPDATE to clinicId
      },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    })

    // ── Step 6: Invalidate cache so Server Component re-fetches ───────────
    // The Realtime listener also triggers router.refresh(), but revalidatePath
    // ensures other pages (dashboard, calendar) also see fresh data.
    revalidatePath('/appointments/queue')
    revalidatePath('/dashboard/appointments/queue')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[updateAppointmentStatusAction] Unexpected error:', message)
    return { success: false, error: message }
  }
}
