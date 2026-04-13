"use client";

import React, { useActionState, useState, startTransition } from "react";
import {
  Download,
  Database,
  ShieldCheck,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  exportPatientsWrapper,
  exportSystemBackupWrapper,
} from "../actions";

interface ExportState {
  success: boolean;
  message?: string;
  file?: string;
  fileName?: string;
}

function downloadFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DataExport() {
  const t = useTranslations("Settings.backup");
  const [lastBackup, setLastBackup] = useState<string>("2024-03-27 10:45 PM");

  const [patientsState, patientsDispatch, patientsPending] = useActionState<
    ExportState,
    ExportState
  >(exportPatientsWrapper, { success: false });

  const [systemState, systemDispatch, systemPending] = useActionState<ExportState, ExportState>(
    exportSystemBackupWrapper,
    { success: false },
  );

  React.useEffect(() => {
    if (patientsState.success && patientsState.file && patientsState.fileName) {
      downloadFile(patientsState.file, patientsState.fileName);
    }
  }, [patientsState]);

  React.useEffect(() => {
    if (systemState.success && systemState.file && systemState.fileName) {
      downloadFile(systemState.file, systemState.fileName);
      setLastBackup(new Date().toLocaleString());
    }
  }, [systemState]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t("title")}
        </h2>
        <div className="flex items-center gap-2 text-emerald-600 glass px-3 py-1.5 shadow-sm transition-all duration-300 w-fit">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-medium">
            {t("lastBackup", { date: lastBackup })}
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="group relative overflow-hidden glass-card p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500 opacity-5 blur-2xl transition-all group-hover:scale-150" />
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-center">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Excel / CSV Export
                </h3>
                <p className="text-sm text-slate-500 mt-1">{t("exportPatients")}</p>
              </div>
              <Button
                onClick={() => startTransition(() => patientsDispatch({ success: false }))}
                disabled={patientsPending}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
                {patientsPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {t("downloading")}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />{" "}
                    {t("exportPatients").split("(")[0].trim()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden glass-card p-6 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-purple-500 opacity-5 blur-2xl transition-all group-hover:scale-150" />
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 text-center">
              <FileJson className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Full JSON Backup
                </h3>
                <p className="text-sm text-slate-500 mt-1">{t("systemBackup")}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => startTransition(() => systemDispatch({ success: false }))}
                disabled={systemPending}
                className="w-full rounded-2xl border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
              >
                {systemPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {t("downloading")}
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />{" "}
                    {t("systemBackup").split("(")[0].trim()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-8 text-center border-dashed border-slate-300 dark:border-slate-800 transition-all duration-300">
        <p className="text-sm text-slate-500">
          💡{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Audit Logs:
          </span>{" "}
          All setting changes and backup actions are recorded in the system
          audit logs for maximum security.
        </p>
      </div>
    </div>
  );
}