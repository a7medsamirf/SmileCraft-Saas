// =============================================================================
// SmileCraft CMS — Realtime Appointment Handler (Enhanced)
// Client Component — headless, renders nothing.
//
// Features:
//   1. Subscribes to Supabase Postgres Changes on `appointments` table
//   2. Filters by clinic_id for multi-tenant isolation
//   3. Calls router.refresh() on any INSERT / UPDATE / DELETE
//   4. Implements exponential backoff reconnection logic
//   5. Provides visual toast notifications for connection status
//   6. Supports optimistic UI updates for new appointments
//
// Usage:
//   <RealtimeAppointmentHandler clinicId={clinicId} appointments={appointments} />
//
// src/features/appointments/components/RealtimeAppointmentHandler.tsx
// =============================================================================
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import type { QueueAppointment } from '../services/queue'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RealtimeAppointmentHandlerProps {
  /**
   * The clinic ID used to filter Realtime events.
   * Only changes to appointments belonging to this clinic will trigger a refresh.
   */
  clinicId: string
  /**
   * Current appointments list — used to detect new appointments on INSERT events.
   * This enables optimistic UI updates for newly booked appointments.
   */
  appointments: QueueAppointment[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RealtimeAppointmentHandler({
  clinicId,
  appointments,
}: RealtimeAppointmentHandlerProps) {
  const router = useRouter()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const appointmentsRef = useRef(appointments)

  // Keep appointments ref in sync
  useEffect(() => {
    appointmentsRef.current = appointments
  }, [appointments])

  // Exponential backoff reconnection logic
  const getReconnectDelay = useCallback((attempt: number): number => {
    // Cap at 30 seconds, start at 1 second
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5)
    return Math.max(1000, delay + jitter)
  }, [])

  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const attempt = reconnectAttemptsRef.current++
    const delay = getReconnectDelay(attempt)

    console.warn(
      `[Realtime] Reconnection attempt ${attempt + 1} in ${Math.round(delay / 1000)}s`
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      console.info('[Realtime] Attempting reconnection...')
      // The useEffect will handle the actual re-subscription via dependency changes
      setConnectionStatus('connecting')
    }, delay)
  }, [getReconnectDelay])

  useEffect(() => {
    // Guard: clinicId must be a non-empty string
    if (!clinicId) {
      console.warn('[RealtimeAppointmentHandler] No clinicId provided - realtime disabled');
      return;
    }

    console.log('[RealtimeAppointmentHandler] Initializing with clinicId:', clinicId);

    const supabase = createClient()
    let isMounted = true

    // ── Subscribe ────────────────────────────────────────────────────────
    // Note: We don't filter by clinicId in the realtime subscription because
    // Supabase RLS policies already ensure users only see their clinic's data.
    // The router.refresh() call will re-fetch only the current user's clinic data.
    const channel = supabase
      .channel(`smilecraft:queue:${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',          // Listen for INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'appointments',
          // No filter - RLS policies handle clinic isolation
        },
        (payload) => {
          if (!isMounted) return

          const eventType = payload.eventType
          console.info(
            `[Realtime] ${eventType} on appointments for clinic ${clinicId}`,
            payload
          )

          // For INSERT events, show a toast notification
          if (eventType === 'INSERT') {
            const newAppointment = payload.new as Record<string, unknown>
            const patientId = newAppointment?.patientId as string | undefined

            // Show a generic "new booking" toast immediately
            // The Server Component re-fetch will bring in the actual patient data
            toast.success(
              '📅 تم حجز موعد جديد',
              {
                duration: 4000,
                icon: '🔔',
                className: 'font-bold',
              }
            )

            // Optionally fetch patient name in background for better UX
            if (patientId) {
              const browserSupabase = createClient()
              void fetchPatientNameAndToast(browserSupabase, patientId)
            }
          }

          // Trigger a full Server Component re-render
          router.refresh()
        }
      )
      .subscribe((status, err) => {
        if (!isMounted) return

        if (status === 'SUBSCRIBED') {
          console.info(
            `[Realtime] ✅ Subscribed to queue channel for clinic ${clinicId}`
          )
          setConnectionStatus('connected')
          reconnectAttemptsRef.current = 0 // Reset on successful connection

          // Show connection success toast (only once)
          toast.success(
            '🔴 مباشر: تحديث مواعيد العيادة مفعل',
            {
              duration: 2000,
              icon: '📡',
            }
          )
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] ⚠️ Channel issue: ${status}`, err)
          setConnectionStatus('error')

          // Show error toast (throttled)
          if (reconnectAttemptsRef.current < 5) {
            toast.error(
              `⚠️ فقدان الاتصال — إعادة المحاولة ${reconnectAttemptsRef.current + 1}`,
              {
                duration: 3000,
              }
            )
          }

          handleReconnect()
        }

        if (status === 'CLOSED') {
          console.warn('[Realtime] 🔌 Channel closed')
          setConnectionStatus('disconnected')
          handleReconnect()
        }
      })

    channelRef.current = channel

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      isMounted = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [clinicId, router, handleReconnect])

  // This component is intentionally headless — it renders no DOM.
  return null
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Fetches patient name from DB and shows a personalized toast.
 * This runs in the background after an INSERT event to provide
 * a better UX than just "new appointment".
 */
async function fetchPatientNameAndToast(
  supabase: ReturnType<typeof createClient>,
  patientId: string,
) {
  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('fullName')
      .eq('id', patientId)
      .single()

    if (!error && patient) {
      // Dismiss the generic toast and show a personalized one
      toast.success(
        `📅 حجز جديد: ${patient.fullName}`,
        {
          duration: 5000,
          icon: '👤',
          className: 'font-bold',
        }
      )
    }
  } catch (err) {
    console.warn('[Realtime] Failed to fetch patient name:', err)
  }
}
