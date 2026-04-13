// =============================================================================
// DENTAL CMS — Appointments Module: Types
// features/appointments/types/index.ts
// =============================================================================

export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED", // منتظر
  CONFIRMED = "CONFIRMED", // مؤكد
  IN_PROGRESS = "IN_PROGRESS", // بالداخل
  COMPLETED = "COMPLETED", // انتهى
  CANCELLED = "CANCELLED", // اعتذر
  NO_SHOW = "NO_SHOW", // لم يحضر
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string; // HH:mm format for simplicity in UI matching
  durationMinutes: number;
  procedure: string; // e.g. 'خلع', 'حشو عصب', 'تنظيف'
  toothNumber?: number; // Universal Numbering System 1–32 (optional)
  status: AppointmentStatus;
}
