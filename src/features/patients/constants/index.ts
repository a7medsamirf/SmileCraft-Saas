// =============================================================================
// DENTAL CMS — Patients Module: UI Constants & Label Maps
// features/patients/constants/index.ts
// =============================================================================

import { BloodGroup, Gender, PatientStatus, VisitType } from "../types";

// ---------------------------------------------------------------------------
// Label Maps — convert enum values → human-readable Arabic/English strings
// ---------------------------------------------------------------------------

export const VISIT_TYPE_LABELS: Record<VisitType, { ar: string; en: string }> = {
  [VisitType.CONSULTATION]: { ar: "كشف أولي",      en: "Consultation" },
  [VisitType.TREATMENT]:    { ar: "جلسة علاج",      en: "Treatment"    },
  [VisitType.FOLLOW_UP]:    { ar: "متابعة",          en: "Follow Up"    },
  [VisitType.EMERGENCY]:    { ar: "طوارئ",           en: "Emergency"    },
  [VisitType.RECALL]:       { ar: "فحص دوري",        en: "Recall"       },
};

export const GENDER_LABELS: Record<Gender, { ar: string; en: string }> = {
  [Gender.MALE]:   { ar: "ذكر",  en: "Male"   },
  [Gender.FEMALE]: { ar: "أنثى", en: "Female" },
  [Gender.OTHER]:  { ar: "أخرى", en: "Other"  },
};

export const PATIENT_STATUS_LABELS: Record<PatientStatus, { ar: string; en: string; colorClass: string }> = {
  [PatientStatus.ACTIVE]:   { ar: "نشط",    en: "Active",   colorClass: "text-emerald-600 bg-emerald-50" },
  [PatientStatus.INACTIVE]: { ar: "غير نشط", en: "Inactive", colorClass: "text-amber-600 bg-amber-50"   },
  [PatientStatus.BLOCKED]:  { ar: "محظور",   en: "Blocked",  colorClass: "text-red-600 bg-red-50"        },
};

export const BLOOD_GROUP_OPTIONS = Object.values(BloodGroup);

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
