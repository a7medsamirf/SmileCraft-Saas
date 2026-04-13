import { z } from "zod";
import { Gender, BloodGroup } from "../types";

// =============================================================================
// SERVER-SIDE SCHEMA (used in Server Actions / actions.ts)
// Uses z.preprocess so FormData.get() null values are coerced to "".
// =============================================================================

/** Coerce null/undefined to empty string so Zod never sees a non-string type */
const toStr = z.preprocess((v) => (v == null ? "" : v), z.string());

export const step1Schema = z.object({
  fullName: toStr.pipe(z.string().min(3, "validationName")),
  phone: toStr.pipe(z.string().min(10, "validationPhone")),
  nationalId: toStr.pipe(z.string()).optional(),
  birthDate: toStr.pipe(z.string().min(1, "validationDate")),
  gender: z.nativeEnum(Gender),
  city: toStr.pipe(z.string()).optional(),
});

export const step2Schema = z.object({
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
  medicalNotes: toStr.pipe(z.string()).optional(),
  currentMedications: toStr.pipe(z.string()).optional(),
});

export const step3Schema = z.object({
  emergencyName: toStr.pipe(z.string()).optional(),
  emergencyRelationship: toStr.pipe(z.string()).optional(),
  emergencyPhone: toStr.pipe(z.string()).optional(),
});

export const addPatientSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema);

export type AddPatientFormData = z.infer<typeof addPatientSchema>;

// =============================================================================
// CLIENT-SIDE SCHEMA (used in AddPatientForm / react-hook-form zodResolver)
// Plain z.string() types — no z.preprocess — so TypeScript infers string
// (not unknown) for all fields, avoiding the Zod 4 resolver type conflict.
// Validation rules are identical to the server schema.
// =============================================================================

export const clientStep1Schema = z.object({
  fullName: z.string().min(3, "validationName"),
  phone: z.string().min(10, "validationPhone"),
  nationalId: z.string().optional(),
  birthDate: z.string().min(1, "validationDate"),
  gender: z.nativeEnum(Gender),
  city: z.string().optional(),
});

export const clientStep2Schema = z.object({
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
  medicalNotes: z.string().optional(),
  currentMedications: z.string().optional(),
});

export const clientStep3Schema = z.object({
  emergencyName: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const clientAddPatientSchema = clientStep1Schema
  .merge(clientStep2Schema)
  .merge(clientStep3Schema);

/** Typed form values for react-hook-form — all string fields, no unknown */
export type ClientAddPatientFormData = z.infer<typeof clientAddPatientSchema>;
