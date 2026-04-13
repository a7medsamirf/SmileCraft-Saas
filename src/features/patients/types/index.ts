// =============================================================================
// DENTAL CMS — Patients Module: Core Type Definitions
// features/patients/types/index.ts
//
// Design Decision:
//   We separate enums, primitive types, and complex interfaces into logical
//   groups so that each can be imported independently. This avoids circular
//   dependencies and keeps bundle sizes small when only a subset is needed.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. ENUMS
//    Using string-literal enums for clarity in API payloads and debug logs.
//    Numeric enums would save bytes but make JSON responses unreadable.
// ---------------------------------------------------------------------------

/** The reason (type) for a single clinical visit / appointment. */
export enum VisitType {
  CONSULTATION = "CONSULTATION",   // First contact / initial assessment
  TREATMENT    = "TREATMENT",      // Ongoing or scheduled procedure
  FOLLOW_UP    = "FOLLOW_UP",      // Post-treatment check
  EMERGENCY    = "EMERGENCY",      // Urgent / walk-in pain case
  RECALL       = "RECALL",         // Routine periodic check (e.g., 6-month)
}

/** Biological sex as recorded in the clinical record. */
export enum Gender {
  MALE    = "MALE",
  FEMALE  = "FEMALE",
  OTHER   = "OTHER",
}

/** High-level status of the patient's file in the system. */
export enum PatientStatus {
  ACTIVE   = "ACTIVE",    // Currently receiving care
  INACTIVE = "INACTIVE",  // No visit in the last 12 months
  BLOCKED  = "BLOCKED",   // e.g., outstanding balance / clinic decision
}

/** Blood group — stored on patient for emergency reference. */
export enum BloodGroup {
  A_POS  = "A+",
  A_NEG  = "A-",
  B_POS  = "B+",
  B_NEG  = "B-",
  AB_POS = "AB+",
  AB_NEG = "AB-",
  O_POS  = "O+",
  O_NEG  = "O-",
  UNKNOWN = "UNKNOWN",
}

// ---------------------------------------------------------------------------
// 2. PRIMITIVE / VALUE TYPES
//    Branded types help prevent mixing up plain strings in function signatures.
// ---------------------------------------------------------------------------

/** ISO 8601 date string, e.g. "2024-03-15" */
export type ISODateString = string & { readonly _brand: "ISODate" };

/** ISO 8601 datetime string, e.g. "2024-03-15T10:30:00Z" */
export type ISODateTimeString = string & { readonly _brand: "ISODateTime" };

/** UUID v4 string — the canonical ID format used across all entities. */
export type UUID = string & { readonly _brand: "UUID" };

// ---------------------------------------------------------------------------
// 3. CONTACT & DEMOGRAPHICS
// ---------------------------------------------------------------------------

export interface ContactInfo {
  /** Primary mobile number (international format recommended: +201XXXXXXXXX) */
  phone: string;
  /** Optional secondary / home number */
  altPhone?: string;
  email?: string;
  address?: string;
  /** City name — used for geo-clustering of patients */
  city?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// 4. MEDICAL HISTORY (Dental-specific)
// ---------------------------------------------------------------------------

/**
 * Represents a single systemic condition flagged in the patient's chart.
 * Using a structured object (rather than plain strings) to enable future
 * filtering such as "find all diabetic patients before extraction".
 */
export interface MedicalCondition {
  /** Canonical name, e.g. "Type 2 Diabetes", "Hypertension" */
  condition: string;
  /** Whether the condition is currently active or historical */
  isActive: boolean;
  /** Free-text notes from the clinician */
  notes?: string;
  /** When this condition was recorded */
  diagnosedAt?: ISODateString;
}

export interface Allergy {
  /** Allergen name, e.g. "Penicillin", "Latex", "Lidocaine" */
  allergen: string;
  /** Observed or expected reaction type */
  reaction?: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
}

/**
 * The patient's full dental & systemic medical background.
 *
 * Design Decision:
 *   `conditions` and `allergies` are typed arrays instead of `string[]`
 *   so the UI can render structured chips/badges with severity colours,
 *   and so the clinical module can perform safety checks (e.g., block
 *   amoxicillin prescription for penicillin-allergic patients).
 */
export interface MedicalHistory {
  conditions: MedicalCondition[];
  allergies: Allergy[];
  /** Current regular medications the patient takes */
  currentMedications: string[];
  /** Previous dental procedures of note (implants, extractions, etc.) */
  previousDentalHistory?: string[];
  /** Any other free-text notes the receptionist or dentist recorded */
  generalNotes?: string;
  bloodGroup: BloodGroup;
  /** Height in centimetres */
  heightCm?: number;
  /** Weight in kilograms */
  weightKg?: number;
}

// ---------------------------------------------------------------------------
// 5. VISIT SUMMARY (lightweight — full record lives in Clinical module)
// ---------------------------------------------------------------------------

/**
 * A brief snapshot of a visit attached to the patient profile.
 * The Clinical module owns the full `TreatmentRecord`; this is just
 * a reference so the patient card can show "Last Visit" without loading
 * the entire clinical record.
 */
export interface VisitSummary {
  id: UUID;
  visitDate: ISODateTimeString;
  type: VisitType;
  /** The treating dentist's display name */
  dentistName: string;
  /** Short description written by the dentist: "Composite filling #26" */
  chiefComplaint: string;
  /** Total billed for this visit (links to Finance module) */
  totalBilled?: number;
  isPaid?: boolean;
}

// ---------------------------------------------------------------------------
// 6. CORE PATIENT ENTITY
// ---------------------------------------------------------------------------

/**
 * The canonical Patient entity used throughout the application.
 *
 * Design Decision — Why separate `contactInfo` and `medicalHistory`?
 *   Receptionist staff need Read/Write access to contact fields, but
 *   should have Read-Only access (or no access) to medical fields.
 *   Keeping them as nested objects makes RBAC implementation cleaner:
 *   we can provide just `contactInfo` to a slice or API endpoint without
 *   leaking sensitive clinical data.
 */
export interface Patient {
  // --- Identity ---
  id: UUID;
  /** Full name as it appears on their national ID */
  fullName: string;
  gender: Gender;
  /** ISO date string, e.g. "1990-06-15" */
  birthDate: ISODateString;
  /** Computed on load; not stored in DB to avoid staleness */
  age?: number;
  /** Optional URL to the patient's photo */
  photoUrl?: string;

  // --- Contact ---
  contactInfo: ContactInfo;
  emergencyContact?: EmergencyContact;

  // --- Medical ---
  medicalHistory: MedicalHistory;

  // --- Clinical Snapshots (references only) ---
  /** Quick-access count of X-ray files — full list in Patients/Radiology */
  xrayCount?: number;
  visits: VisitSummary[];

  // --- Record Management ---
  status: PatientStatus;
  /** National / emirates / insurance ID for cross-referencing */
  nationalId?: string;
  insuranceNumber?: string;
  /** Treating / primary dentist ID */
  assignedDentistId?: UUID;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  /** Derived from visits[].visitDate — kept for fast query/sort */
  lastVisit?: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// 7. DTO / FORM TYPES
//    These are what the UI sends to the API — they omit server-generated fields.
// ---------------------------------------------------------------------------

/** Payload for creating a brand-new patient record */
export type CreatePatientDTO = Omit<
  Patient,
  "id" | "createdAt" | "updatedAt" | "lastVisit" | "age" | "visits" | "xrayCount"
>;

/** Payload for patching an existing patient (all fields optional) */
export type UpdatePatientDTO = Partial<CreatePatientDTO>;

// ---------------------------------------------------------------------------
// 8. QUERY / FILTER TYPES
// ---------------------------------------------------------------------------

export interface PatientFilters {
  search?: string;          // fullName, phone, nationalId
  gender?: Gender;
  status?: PatientStatus;
  bloodGroup?: BloodGroup;
  assignedDentistId?: UUID;
  /** ISO date - filter patients whose lastVisit is >= this date */
  lastVisitFrom?: ISODateString;
  /** ISO date - filter patients whose lastVisit is <= this date */
  lastVisitTo?: ISODateString;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export type PaginatedPatients = PaginatedResponse<Patient>;
