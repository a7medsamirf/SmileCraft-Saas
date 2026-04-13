// =============================================================================
// DENTAL CMS — Clinical Module: Odontogram Types
// features/clinical/types/odontogram.ts
//
// Represents the clinical state of a patient's teeth.
// Uses the Universal Numbering System (1-32).
// =============================================================================

export enum ToothPosition {
  UPPER_RIGHT = "UPPER_RIGHT", // 1-8
  UPPER_LEFT  = "UPPER_LEFT",  // 9-16
  LOWER_LEFT  = "LOWER_LEFT",  // 17-24
  LOWER_RIGHT = "LOWER_RIGHT", // 25-32
}

export enum ToothStatus {
  HEALTHY    = "HEALTHY",     // سليم
  CARIOUS    = "CARIOUS",     // تسوس
  MISSING    = "MISSING",     // مخلوع / مفقود
  CROWN      = "CROWN",       // طربوش / تاج
  FILLING    = "FILLING",     // حشو
  ROOT_CANAL = "ROOT_CANAL",  // حشو عصب
}

export enum ToothType {
  MOLAR    = "MOLAR",
  PREMOLAR = "PREMOLAR",
  CANINE   = "CANINE",
  INCISOR  = "INCISOR",
}

export interface Tooth {
  /** Universal Numbering System: 1 to 32 */
  id: number;
  position: ToothPosition;
  type: ToothType;
  status: ToothStatus;
  /** Clinical notes for this specific tooth (e.g. "Deep mesial caries") */
  notes?: string;
}

/** 
 * Represents the entire state of a patient's mouth at a specific clinical visit.
 */
export type MouthMap = Tooth[];

// ---------------------------------------------------------------------------
// Helpers and Label Maps
// ---------------------------------------------------------------------------

export const TOOTH_STATUS_LABELS: Record<ToothStatus, { ar: string; en: string }> = {
  [ToothStatus.HEALTHY]:    { ar: "سليم",        en: "Healthy" },
  [ToothStatus.CARIOUS]:    { ar: "تسوس",        en: "Carious" },
  [ToothStatus.MISSING]:    { ar: "مخلوع",       en: "Missing" },
  [ToothStatus.CROWN]:      { ar: "طربوش",       en: "Crown" },
  [ToothStatus.FILLING]:    { ar: "حشو",         en: "Filling" },
  [ToothStatus.ROOT_CANAL]: { ar: "حشو عصب",      en: "Root Canal" },
};

/**
 * Derives the quadrant position of a tooth based on Universal Numbering System.
 */
export function getToothPosition(id: number): ToothPosition {
  if (id >= 1 && id <= 8)   return ToothPosition.UPPER_RIGHT;
  if (id >= 9 && id <= 16)  return ToothPosition.UPPER_LEFT;
  if (id >= 17 && id <= 24) return ToothPosition.LOWER_LEFT;
  if (id >= 25 && id <= 32) return ToothPosition.LOWER_RIGHT;
  throw new Error(`Invalid tooth ID: ${id}`);
}

/**
 * Determines tooth type based on Universal Numbering System (1-32).
 */
export function getToothType(id: number): ToothType {
  // Molars: 1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32
  const molars = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32];
  if (molars.includes(id)) return ToothType.MOLAR;
  
  // Premolars: 4, 5, 12, 13, 20, 21, 28, 29
  const premolars = [4, 5, 12, 13, 20, 21, 28, 29];
  if (premolars.includes(id)) return ToothType.PREMOLAR;
  
  // Canines: 6, 11, 22, 27
  const canines = [6, 11, 22, 27];
  if (canines.includes(id)) return ToothType.CANINE;
  
  // Incisors: 7, 8, 9, 10, 23, 24, 25, 26
  return ToothType.INCISOR;
}

/** Generates a fresh healthy mouth map for a new patient baseline. */
export function generateEmptyMouthMap(): MouthMap {
  const map: MouthMap = [];
  for (let i = 1; i <= 32; i++) {
    map.push({
      id: i,
      position: getToothPosition(i),
      type: getToothType(i),
      status: ToothStatus.HEALTHY,
    });
  }
  return map;
}
