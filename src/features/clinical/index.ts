// =============================================================================
// DENTAL CMS — Clinical Module: Public Barrel Export
// features/clinical/index.ts
// =============================================================================

// Types
export * from "./types/odontogram";
export * from "./types/treatmentPlan";

// Components
export { ToothVisual } from "./components/ToothVisual";
export { PlanBuilder } from "./components/PlanBuilder";

// Hooks
export { useSessionProgress } from "./hooks/useSessionProgress";
