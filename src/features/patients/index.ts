// =============================================================================
// DENTAL CMS — Patients Module: Public Barrel Export
// features/patients/index.ts
//
// Only import from this file in other modules/features.
// This keeps the internal folder structure refactorable without breaking callers.
// =============================================================================

// Types
export * from "./types";

// Constants / Labels
export * from "./constants";

// Hooks
export { usePatients } from "./hooks/usePatients";

// Mock data (remove in production, replace with real service)

// Media
export * from "./types/media";
export { XRayViewer } from "./components/XRayViewer";
export { MediaUploader } from "./components/MediaUploader";

// Components
export { PatientList } from "./components/PatientList";
export { PatientCard } from "./components/PatientCard";
export { ProfileLayout } from "./components/ProfileLayout";
