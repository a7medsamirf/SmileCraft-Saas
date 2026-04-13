"use server";

import { exportPatientsAction, exportSystemBackupAction } from "./serverActions";

export interface ExportActionState {
  success: boolean;
  message?: string;
  file?: string;
  fileName?: string;
}

export async function exportPatientsWrapper(
  prevState: ExportActionState,
): Promise<ExportActionState> {
  const result = await exportPatientsAction();
  if (result.success && result.file && result.fileName) {
    return {
      success: true,
      file: result.file,
      fileName: result.fileName,
    };
  }
  return {
    success: false,
    message: result.error || "Export failed",
  };
}

export async function exportSystemBackupWrapper(
  prevState: ExportActionState,
): Promise<ExportActionState> {
  const result = await exportSystemBackupAction();
  if (result.success && result.file && result.fileName) {
    return {
      success: true,
      file: result.file,
      fileName: result.fileName,
    };
  }
  return {
    success: false,
    message: result.error || "Backup failed",
  };
}