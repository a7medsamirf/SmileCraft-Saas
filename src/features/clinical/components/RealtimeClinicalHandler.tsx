'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Props {
  clinicId: string
  patientId?: string
  onClinicalCasesUpdate?: () => void
  onTreatmentsUpdate?: () => void
  onAppointmentsUpdate?: () => void
}

export function RealtimeClinicalHandler({
  clinicId,
  patientId,
  onClinicalCasesUpdate,
  onTreatmentsUpdate,
  onAppointmentsUpdate,
}: Props) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({
    onClinicalCasesUpdate,
    onTreatmentsUpdate,
    onAppointmentsUpdate,
  })

  // Keep callbacks ref current to avoid stale closures
  useEffect(() => {
    callbacksRef.current = {
      onClinicalCasesUpdate,
      onTreatmentsUpdate,
      onAppointmentsUpdate,
    }
  }, [onClinicalCasesUpdate, onTreatmentsUpdate, onAppointmentsUpdate])

  useEffect(() => {
    if (!clinicId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`smilecraft:clinical:${clinicId}:${patientId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinical_cases',
          filter: patientId ? `clinicId=eq.${clinicId}&patientId=eq.${patientId}` : `clinicId=eq.${clinicId}`,
        },
        (payload) => {
          console.info('[Realtime] Clinical cases updated:', payload.eventType)
          callbacksRef.current.onClinicalCasesUpdate?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatments',
          filter: patientId ? `patientId=eq.${patientId}` : `clinicId=eq.${clinicId}`,
        },
        (payload) => {
          console.info('[Realtime] Treatments updated:', payload.eventType)
          callbacksRef.current.onTreatmentsUpdate?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment',
          filter: patientId ? `patientId=eq.${patientId}` : `clinicId=eq.${clinicId}`,
        },
        (payload) => {
          console.info('[Realtime] Appointments updated:', payload.eventType)
          callbacksRef.current.onAppointmentsUpdate?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patientId}`,
        },
        (payload) => {
          const oldMap = JSON.stringify((payload.old as any)?.mouthMap)
          const newMap = JSON.stringify((payload.new as any)?.mouthMap)
          if (oldMap !== newMap) {
            console.info('[Realtime] Patient mouthMap updated')
            callbacksRef.current.onClinicalCasesUpdate?.()
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [clinicId, patientId])

  return null
}
