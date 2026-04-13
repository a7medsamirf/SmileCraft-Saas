// =============================================================================
// SmileCraft CMS — Appointments Validation Schemas
// Shared Zod schemas for client + server validation
// =============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Booking form schema (used in bookAppointmentAction.ts)
// ---------------------------------------------------------------------------
export const bookingSchema = z.object({
  patientName: z.string().min(1, "patientNameRequired"),
  phone: z.string().min(10, "phoneRequired"),
  date: z.string().min(1, "dateRequired"),
  time: z.string().min(1, "timeRequired"),
  procedure: z.string().min(1, "procedureRequired"),
  procedureKey: z.string().optional(),
  duration: z.string().min(1, "durationRequired"),
  notes: z.string().optional(),
  toothNumber: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const num = parseInt(val, 10);
        return num >= 1 && num <= 32;
      },
      { message: "toothNumberRange" }
    ),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

// ---------------------------------------------------------------------------
// Appointment mutation schemas (used in serverActions.ts)
// ---------------------------------------------------------------------------
export const appointmentIdSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
});

export const statusUpdateSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  date: z.date(),
  startTime: z.string().min(1, "Start time is required"),
  type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Booking state (compatible with useActionState)
// ---------------------------------------------------------------------------
export type BookingState = {
  success: boolean;
  message?: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
};
