// =============================================================================
// SmileCraft CMS — Appointment Procedures
// Single source of truth that links appointment procedure types to the clinical
// odontogram tooth statuses, using the same hex colors as ToothVisual COLOR_MAP.
// =============================================================================

import { ToothStatus } from "@/features/clinical/types/odontogram";

export interface ProcedureDefinition {
  /** Machine-readable key — matches clinical module procedureKey values */
  key: string;
  labelAr: string;
  labelEn: string;
  /** The ToothStatus this procedure directly treats (null for general procedures) */
  relatedStatus: ToothStatus | null;
  /** Hex fill color — MUST match ToothVisual.tsx COLOR_MAP for the relatedStatus */
  color: string;
  /** Hex stroke/border color — MUST match ToothVisual.tsx COLOR_MAP */
  strokeColor: string;
  /** Estimated cost in EGP */
  estimatedCost: number;
  category: "restorative" | "endodontic" | "prosthetic" | "surgical" | "preventive" | "cosmetic" | "periodontic";
}

// =============================================================================
// Procedures — grouped so "chart-linked" ones appear first
// =============================================================================
export const PROCEDURE_DEFINITIONS: ProcedureDefinition[] = [
  // ── Restorative (Caries treatment → red tooth on chart) ──────────────────
  {
    key: "procedureCleaning",
    labelAr: "تنظيف وحشو (تسوس)",
    labelEn: "Cleaning & Filling — Caries",
    relatedStatus: ToothStatus.CARIOUS,
    color: "#ef4444",
    strokeColor: "#b91c1c",
    estimatedCost: 400,
    category: "restorative",
  },
  {
    key: "procedureReview",
    labelAr: "مراجعة حشو قائم",
    labelEn: "Filling Review",
    relatedStatus: ToothStatus.FILLING,
    color: "#3b82f6",
    strokeColor: "#1d4ed8",
    estimatedCost: 150,
    category: "restorative",
  },
  // ── Endodontic (Root canal → purple tooth on chart) ───────────────────────
  {
    key: "procedureRootCanal",
    labelAr: "علاج لبّ السن (عصب)",
    labelEn: "Root Canal Treatment",
    relatedStatus: ToothStatus.ROOT_CANAL,
    color: "#a855f7",
    strokeColor: "#7e22ce",
    estimatedCost: 1200,
    category: "endodontic",
  },
  // ── Prosthetic (Crown → amber tooth on chart) ─────────────────────────────
  {
    key: "procedureCrown",
    labelAr: "تركيب تاج",
    labelEn: "Crown Placement",
    relatedStatus: ToothStatus.CROWN,
    color: "#fbbf24",
    strokeColor: "#d97706",
    estimatedCost: 2500,
    category: "prosthetic",
  },
  {
    key: "procedureImplant",
    labelAr: "زراعة سن",
    labelEn: "Dental Implant",
    relatedStatus: null,
    color: "#10b981",
    strokeColor: "#059669",
    estimatedCost: 8000,
    category: "prosthetic",
  },
  {
    key: "procedureBridge",
    labelAr: "تركيب جسر",
    labelEn: "Dental Bridge",
    relatedStatus: null,
    color: "#6366f1",
    strokeColor: "#4f46e5",
    estimatedCost: 3500,
    category: "prosthetic",
  },
  {
    key: "procedureDenture",
    labelAr: "طقم أسنان",
    labelEn: "Denture",
    relatedStatus: null,
    color: "#8b5cf6",
    strokeColor: "#7c3aed",
    estimatedCost: 4000,
    category: "prosthetic",
  },
  // ── Surgical (Extraction → grey/missing tooth on chart) ───────────────────
  {
    key: "procedureExtraction",
    labelAr: "خلع سن",
    labelEn: "Tooth Extraction",
    relatedStatus: ToothStatus.MISSING,
    color: "#94a3b8",
    strokeColor: "#64748b",
    estimatedCost: 300,
    category: "surgical",
  },
  {
    key: "procedureWisdomExtraction",
    labelAr: "خلع ضرس عقل",
    labelEn: "Wisdom Tooth Extraction",
    relatedStatus: null,
    color: "#64748b",
    strokeColor: "#475569",
    estimatedCost: 600,
    category: "surgical",
  },
  // ── Preventive ────────────────────────────────────────────────────────────
  {
    key: "procedureScaling",
    labelAr: "تنظيف وتقليح",
    labelEn: "Scaling & Polishing",
    relatedStatus: null,
    color: "#06b6d4",
    strokeColor: "#0891b2",
    estimatedCost: 200,
    category: "preventive",
  },
  {
    key: "procedureCheckup",
    labelAr: "فحص دوري",
    labelEn: "Routine Checkup",
    relatedStatus: null,
    color: "#22c55e",
    strokeColor: "#16a34a",
    estimatedCost: 100,
    category: "preventive",
  },
  {
    key: "procedureXray",
    labelAr: "أشعة بانوراما",
    labelEn: "Panoramic X-Ray",
    relatedStatus: null,
    color: "#64748b",
    strokeColor: "#475569",
    estimatedCost: 250,
    category: "preventive",
  },
  {
    key: "procedureFluoride",
    labelAr: "فلورايد وقائي",
    labelEn: "Fluoride Treatment",
    relatedStatus: null,
    color: "#34d399",
    strokeColor: "#10b981",
    estimatedCost: 150,
    category: "preventive",
  },
  // ── Cosmetic ──────────────────────────────────────────────────────────────
  {
    key: "procedureBraces",
    labelAr: "تقويم أسنان",
    labelEn: "Orthodontics / Braces",
    relatedStatus: null,
    color: "#f472b6",
    strokeColor: "#ec4899",
    estimatedCost: 5000,
    category: "cosmetic",
  },
  {
    key: "procedureWhitening",
    labelAr: "تبييض أسنان",
    labelEn: "Teeth Whitening",
    relatedStatus: null,
    color: "#fb923c",
    strokeColor: "#f97316",
    estimatedCost: 800,
    category: "cosmetic",
  },
  {
    key: "procedureVeneer",
    labelAr: "قشرة خزفية (فينير)",
    labelEn: "Dental Veneer",
    relatedStatus: null,
    color: "#e879f9",
    strokeColor: "#d946ef",
    estimatedCost: 3000,
    category: "cosmetic",
  },
  // ── Periodontic ───────────────────────────────────────────────────────────
  {
    key: "procedureGumTreatment",
    labelAr: "علاج اللثة",
    labelEn: "Gum Treatment",
    relatedStatus: null,
    color: "#f87171",
    strokeColor: "#ef4444",
    estimatedCost: 500,
    category: "periodontic",
  },
];

// Category display labels (Arabic)
export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureDefinition["category"], string> = {
  restorative: "حشو وترميم",
  endodontic:  "علاج العصب",
  prosthetic:  "التركيبات",
  surgical:    "الجراحة",
  preventive:  "الوقاية والتنظيف",
  cosmetic:    "التجميل",
  periodontic: "علاج اللثة",
};

// Lookup by key — used by DailyAgenda mapper to translate stored keys → Arabic labels
export const PROCEDURE_BY_KEY: Record<string, ProcedureDefinition> = Object.fromEntries(
  PROCEDURE_DEFINITIONS.map((p) => [p.key, p]),
);

// Procedures that are directly linked to a ToothStatus (for the "Dental Chart" section)
export const CHART_LINKED_PROCEDURES = PROCEDURE_DEFINITIONS.filter(
  (p) => p.relatedStatus !== null,
);
