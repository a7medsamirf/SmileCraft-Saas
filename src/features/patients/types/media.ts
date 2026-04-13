// =============================================================================
// DENTAL CMS — Patients Module: Media Types
// features/patients/types/media.ts
// =============================================================================

export enum PatientMediaType {
  PANORAMIC = "PANORAMIC",      // أشعة بانوراما
  PERIAPICAL = "PERIAPICAL",    // أشعة صغيرة (حول الذروة)
  CLINICAL_PHOTO = "CLINICAL_PHOTO", // صورة فوتوغرافية للأسنان
}

export interface PatientMedia {
  id: string;
  patientId: string;
  url: string;
  thumbnailUrl?: string;
  type: PatientMediaType;
  capturedAt: string; // ISO date string
  notes?: string;
}

/**
 * Group media items by their captured date (YYYY-MM-DD) for display in the profile.
 */
export function groupMediaByDate(media: PatientMedia[]): Record<string, PatientMedia[]> {
  return media.reduce((groups, item) => {
    const date = item.capturedAt.split("T")[0]; // YYYY-MM-DD
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, PatientMedia[]>);
}

export const MEDIA_TYPE_LABELS: Record<PatientMediaType, { ar: string; en: string }> = {
  [PatientMediaType.PANORAMIC]: { ar: "أشعة بانوراما", en: "Panoramic X-Ray" },
  [PatientMediaType.PERIAPICAL]: { ar: "أشعة صغيرة", en: "Periapical X-Ray" },
  [PatientMediaType.CLINICAL_PHOTO]: { ar: "صورة عيادية", en: "Clinical Photo" },
};
