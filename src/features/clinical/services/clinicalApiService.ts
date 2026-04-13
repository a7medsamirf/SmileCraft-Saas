// =============================================================================
// DENTAL CMS — Clinical Module: Axios API Service
// features/clinical/services/clinicalApiService.ts
//
// Mirrors the clinicalService interface against real REST endpoints.
// Falls back to localStorage when USE_MOCK_API is true.
// =============================================================================

import { apiClient, USE_MOCK_API } from "@/lib/apiClient";
import { MouthMap } from "../types/odontogram";
import { fetchMouthMap as localFetch, saveMouthMap as localSave } from "./clinicalService";

// ---------------------------------------------------------------------------
// Clinical API Service
// ---------------------------------------------------------------------------

export const clinicalApiService = {
  /**
   * Load a patient's mouth map from the API (or localStorage).
   * patientId is optional — the original service is single-patient scoped.
   */
  async fetchMouthMap(patientId?: string): Promise<MouthMap> {
    if (USE_MOCK_API) {
      return localFetch();
    }

    const url = patientId ? `/clinical/${patientId}/odontogram` : "/clinical/odontogram";
    const response = await apiClient.get<MouthMap>(url);
    return response.data;
  },

  /**
   * Persist a patient's mouth map to the API (or localStorage).
   */
  async saveMouthMap(mouthMap: MouthMap, patientId?: string): Promise<void> {
    if (USE_MOCK_API) {
      return localSave(mouthMap);
    }

    const url = patientId ? `/clinical/${patientId}/odontogram` : "/clinical/odontogram";
    await apiClient.put(url, mouthMap);
  },

  /**
   * Fetch treatment plans for a patient.
   */
  async getTreatmentPlans(patientId: string): Promise<unknown[]> {
    if (USE_MOCK_API) {
      // No localStorage layer for plans yet; return empty
      return [];
    }

    const response = await apiClient.get<unknown[]>(`/clinical/${patientId}/plans`);
    return response.data;
  },
};
