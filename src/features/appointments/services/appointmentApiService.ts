// =============================================================================
// DENTAL CMS — Appointments Module: Axios API Service
// features/appointments/services/appointmentApiService.ts
//
// REST-backed appointments service.
// Falls back to the in-memory mock when USE_MOCK_API is true.
// =============================================================================

import { apiClient, USE_MOCK_API } from "@/lib/apiClient";
import { Appointment, AppointmentStatus } from "../types";

// ---------------------------------------------------------------------------
// Local mock store (mirrors DailyAgenda mock data)
// ---------------------------------------------------------------------------

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "1", patientId: "p1", patientName: "أحمد السيد",    time: "10:00 ص", durationMinutes: 45, procedure: "حشو عصب",        status: AppointmentStatus.COMPLETED },
  { id: "2", patientId: "p2", patientName: "سارة محمود",    time: "11:00 ص", durationMinutes: 30, procedure: "التنظيف وتلميع", status: AppointmentStatus.IN_PROGRESS },
  { id: "3", patientId: "p3", patientName: "خالد إبراهيم",  time: "12:30 م", durationMinutes: 60, procedure: "تركيب تقويم",    status: AppointmentStatus.SCHEDULED },
  { id: "4", patientId: "p4", patientName: "منى محمد",      time: "02:00 م", durationMinutes: 30, procedure: "خلع ضرس عقل",    status: AppointmentStatus.CANCELLED },
  { id: "5", patientId: "p5", patientName: "محمد احمد",     time: "03:00 م", durationMinutes: 45, procedure: "تركيب تقويم",    status: AppointmentStatus.SCHEDULED },

];

// ---------------------------------------------------------------------------
// Appointment API Service
// ---------------------------------------------------------------------------

export const appointmentApiService = {
  /**
   * Retrieve appointments for a specific date.
   */
  async getByDate(date: Date): Promise<Appointment[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      // In mock mode, return same list regardless of date
      return [...MOCK_APPOINTMENTS];
    }

    const isoDate = date.toISOString().split("T")[0];
    const response = await apiClient.get<Appointment[]>("/appointments", {
      params: { date: isoDate },
    });
    return response.data;
  },

  /**
   * Create a new appointment.
   */
  async create(payload: Omit<Appointment, "id">): Promise<Appointment> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 500));
      return { ...payload, id: `apt-${Date.now()}` };
    }

    const response = await apiClient.post<Appointment>("/appointments", payload);
    return response.data;
  },

  /**
   * Update the status of an appointment (e.g., mark as Completed).
   */
  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      const found = MOCK_APPOINTMENTS.find((a) => a.id === id);
      if (!found) throw new Error(`Appointment not found: ${id}`);
      return { ...found, status };
    }

    const response = await apiClient.patch<Appointment>(`/appointments/${id}`, { status });
    return response.data;
  },

  /**
   * Cancel / delete an appointment.
   */
  async cancel(id: string): Promise<void> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      return;
    }
    await apiClient.delete(`/appointments/${id}`);
  },
};
