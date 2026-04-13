"use server";

import {
  createPatientActionDB,
  updatePatientActionDB,
  deletePatientAction,
} from "./serverActions";
import { addPatientSchema } from "./schemas/addPatientSchema";
import {
  Patient,
  Gender,
  BloodGroup,
  PatientStatus,
  ISODateString,
} from "./types/index";

// =============================================================================
// Shared state type
// =============================================================================
export interface ActionState {
  success: boolean | null;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
}

// =============================================================================
// Helper: extract & validate common form fields
// =============================================================================
function extractFormData(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    nationalId: formData.get("nationalId"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    city: formData.get("city"),
    bloodGroup: formData.get("bloodGroup"),
    medicalNotes: formData.get("medicalNotes"),
    currentMedications: formData.get("currentMedications"),
    emergencyName: formData.get("emergencyName"),
    emergencyRelationship: formData.get("emergencyRelationship"),
    emergencyPhone: formData.get("emergencyPhone"),
  };
}

function buildPatientPayload(
  data: ReturnType<typeof addPatientSchema.parse>,
): Omit<Patient, "id" | "createdAt" | "updatedAt"> {
  return {
    fullName: data.fullName,
    gender: data.gender as Gender,
    birthDate: data.birthDate as ISODateString,
    contactInfo: {
      phone: data.phone,
      city: data.city,
    },
    medicalHistory: {
      conditions: data.medicalNotes
        ? [{ condition: data.medicalNotes, isActive: true }]
        : [],
      allergies: [],
      currentMedications: data.currentMedications
        ? [data.currentMedications]
        : [],
      bloodGroup: (data.bloodGroup as BloodGroup) || BloodGroup.UNKNOWN,
    },
    emergencyContact: data.emergencyName
      ? {
          name: data.emergencyName,
          relationship: data.emergencyRelationship || "",
          phone: data.emergencyPhone || "",
        }
      : undefined,
    status: PatientStatus.ACTIVE,
    nationalId: data.nationalId,
    visits: [],
  };
}

// =============================================================================
// CREATE — register a new patient
// =============================================================================
export async function createPatientAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawData = extractFormData(formData);
  const validated = addPatientSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      message: "validationError",
    };
  }

  try {
    const newPatient = await createPatientActionDB(
      buildPatientPayload(validated.data),
    );
    return {
      success: true,
      message: "addPatientSuccess",
      data: newPatient,
    };
  } catch (error) {
    console.error("[createPatientAction]", error);
    return { success: false, message: "saveError" };
  }
}

// =============================================================================
// UPDATE — edit an existing patient
// =============================================================================
export async function updatePatientAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // The patient's ID is injected as a hidden form field by AddPatientForm
  const patientId = (formData.get("patientId") as string | null) ?? "";

  if (!patientId) {
    return { success: false, message: "saveError" };
  }

  const rawData = extractFormData(formData);
  const validated = addPatientSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      message: "validationError",
    };
  }

  const { data } = validated;

  // Build a Partial<Patient> payload — same shape as create but for an update
  const payload: Partial<Patient> = {
    fullName: data.fullName,
    gender: data.gender as Gender,
    birthDate: data.birthDate as ISODateString,
    contactInfo: {
      phone: data.phone,
      city: data.city,
    },
    medicalHistory: {
      conditions: data.medicalNotes
        ? [{ condition: data.medicalNotes, isActive: true }]
        : [],
      allergies: [],
      currentMedications: data.currentMedications
        ? [data.currentMedications]
        : [],
      bloodGroup: (data.bloodGroup as BloodGroup) || BloodGroup.UNKNOWN,
    },
    emergencyContact: data.emergencyName
      ? {
          name: data.emergencyName,
          relationship: data.emergencyRelationship || "",
          phone: data.emergencyPhone || "",
        }
      : undefined,
    status: PatientStatus.ACTIVE,
    nationalId: data.nationalId,
  };

  try {
    await updatePatientActionDB(patientId, payload);
    return { success: true, message: "editPatientSuccess" };
  } catch (error) {
    console.error("[updatePatientAction]", error);
    return { success: false, message: "saveError" };
  }
}

// =============================================================================
// DELETE — soft delete a patient (sets isActive = false)
// =============================================================================
export async function deletePatientActionWrapper(
  patientId: string,
): Promise<ActionState> {
  if (!patientId) {
    return { success: false, message: "saveError" };
  }

  try {
    await deletePatientAction(patientId);
    return { success: true, message: "deletePatientSuccess" };
  } catch (error) {
    console.error("[deletePatientAction]", error);
    return { success: false, message: "deletePatientError" };
  }
}
