// DEPRECATED: Use server actions from patients/serverActions.ts instead.
// This stub exists to prevent import errors in legacy code.
import { Patient } from "../types/index";

export const patientService = {
  getPatients: (): Patient[] => [],
  getPatientById: (_id: string): Patient | undefined => undefined,
  savePatient: (_patient: Patient): void => {},
  deletePatient: (_id: string): void => {},
};
