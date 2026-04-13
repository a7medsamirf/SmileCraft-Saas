// =============================================================================
// DENTAL CMS — Patients Module: Axios API Service
// features/patients/services/patientApiService.ts
//
// Drop-in replacement for patientService.ts that uses real HTTP calls.
// Falls back to localStorage when USE_MOCK_API is true (no backend yet).
// =============================================================================

import { apiClient, USE_MOCK_API } from "@/lib/apiClient";
import { Patient, PatientFilters, PaginatedPatients } from "../types";
import { patientService } from "./patientService";
import { generateId } from "@/lib/utils/id";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GetPatientsParams extends PatientFilters {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Patient API Service
// ---------------------------------------------------------------------------

export const patientApiService = {
  /**
   * Fetch a paginated + filtered list of patients.
   */
  async getPatients(params: GetPatientsParams = {}): Promise<PaginatedPatients> {
    if (USE_MOCK_API) {
      // Delegate to localStorage service
      const all = patientService.getPatients();
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const start = (page - 1) * limit;
      const data = all.slice(start, start + limit);
      return { data, total: all.length, page, totalPages: Math.ceil(all.length / limit) };
    }

    const response = await apiClient.get<PaginatedPatients>("/patients", { params });
    return response.data;
  },

  /**
   * Fetch a single patient by ID.
   */
  async getPatient(id: string): Promise<Patient> {
    if (USE_MOCK_API) {
      const patient = patientService.getPatientById(id);
      if (!patient) throw new Error(`Patient not found: ${id}`);
      return patient;
    }

    const response = await apiClient.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  /**
   * Create a new patient record.
   */
  async createPatient(payload: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> {
    if (USE_MOCK_API) {
      const now = new Date().toISOString();
      const newPatient: Patient = {
        ...payload,
        id: generateId() as Patient["id"],
        createdAt: now as Patient["createdAt"],
        updatedAt: now as Patient["updatedAt"],
        visits: payload.visits ?? [],
      };
      patientService.savePatient(newPatient);
      return newPatient;
    }

    const response = await apiClient.post<Patient>("/patients", payload);
    return response.data;
  },

  /**
   * Update an existing patient record (full replace).
   */
  async updatePatient(id: string, payload: Partial<Patient>): Promise<Patient> {
    if (USE_MOCK_API) {
      const existing = patientService.getPatientById(id);
      if (!existing) throw new Error(`Patient not found: ${id}`);
      const updated: Patient = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString() as Patient["updatedAt"],
      };
      patientService.savePatient(updated);
      return updated;
    }

    const response = await apiClient.patch<Patient>(`/patients/${id}`, payload);
    return response.data;
  },

  /**
   * Delete a patient record.
   */
  async deletePatient(id: string): Promise<void> {
    if (USE_MOCK_API) {
      patientService.deletePatient(id);
      return;
    }

    await apiClient.delete(`/patients/${id}`);
  },
};
