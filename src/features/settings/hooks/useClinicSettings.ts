"use client";

// =============================================================================
// SmileCraft CMS — useClinicSettings Hook
// ✅ DB-backed via server actions (no localStorage).
// ✅ Mock data used as initial state while DB loads (never blank UI).
// ✅ useOptimistic for instant price feedback.
// ✅ React 19 async startTransition for isSaving state.
// =============================================================================

import { useSettingsContext } from "../context/SettingsContext";

/**
 * useClinicSettings Hook
 * Now a consumer of the SettingsContext.
 * This ensures that the data is fetched on the server once and shared across components.
 */
export function useClinicSettings() {
  const context = useSettingsContext();
  
  return {
    services: context.services,
    updateServicePrice: context.updateServicePrice,
    hours: context.hours,
    updateBusinessHours: context.updateBusinessHours,
    clinicInfo: context.clinicInfo!, // fallback handled in components or provider
    updateClinicInfo: context.updateClinicInfo,
    notifications: context.notifications,
    updateNotifications: context.updateNotifications,
    isSaving: context.isSaving,
  };
}
