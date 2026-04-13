"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Stethoscope, Loader2, ExternalLink } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { OdontogramView } from "./OdontogramView";
import { ToothStatus, generateEmptyMouthMap, MouthMap } from "../types/odontogram";
import {
  getPatientClinicalDataAction,
} from "../serverActions";
import { getPatientAppointmentsWithTeethAction, AppointmentTooth } from "@/features/appointments/serverActions";
import { Button } from "@/components/ui/Button";

interface PatientOdontogramModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName: string | null;
}

export function PatientOdontogramModal({
  isOpen,
  onClose,
  patientId,
  patientName,
}: PatientOdontogramModalProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(false);
  const [mouthMap, setMouthMap] = useState<MouthMap>([]);
  const [teethWithCases, setTeethWithCases] = useState<Set<number>>(new Set());
  const [appointmentTeeth, setAppointmentTeeth] = useState<AppointmentTooth[]>([]);

  const PROCEDURE_KEY_TO_STATUS: Record<string, ToothStatus> = {
    procedureCleaning: ToothStatus.CARIOUS,
    procedureReview: ToothStatus.FILLING,
    procedureRootCanal: ToothStatus.ROOT_CANAL,
    procedureCrown: ToothStatus.CROWN,
    procedureExtraction: ToothStatus.MISSING,
    procedureWisdomExtraction: ToothStatus.MISSING,
  };

  useEffect(() => {
    if (isOpen && patientId) {
      loadData();
    }
  }, [isOpen, patientId]);

  async function loadData() {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const [clinicalData, aptTeeth] = await Promise.all([
        getPatientClinicalDataAction(patientId),
        getPatientAppointmentsWithTeethAction(patientId),
      ]);

      let map = clinicalData?.mouthMap ?? generateEmptyMouthMap();

      // Overlay appointment data onto HEALTHY teeth only (Same logic as ClinicalClient)
      if (aptTeeth.length > 0) {
        map = map.map((tooth) => {
          if (tooth.status !== ToothStatus.HEALTHY) return tooth;
          const apt = aptTeeth.find((a) => a.toothNumber === tooth.id);
          if (!apt) return tooth;
          const mappedStatus = (PROCEDURE_KEY_TO_STATUS as any)[apt.procedureKey];
          if (!mappedStatus) return tooth;
          return { ...tooth, status: mappedStatus };
        });
      }

      setMouthMap(map);
      // Use teethWithCases from clinicalData instead of redundant call
      setTeethWithCases(new Set(clinicalData?.teethWithCases ?? []));
      setAppointmentTeeth(aptTeeth);
    } catch (err) {
      console.error("[PatientOdontogramModal] Failed to load data:", err);
      setMouthMap(generateEmptyMouthMap());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-110"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-111 flex items-center justify-center p-4 md:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200/50 dark:border-slate-700/50 pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {patientName || t("toothLabel")}
                    </h2>
                    <p className="text-[13px] text-slate-500 font-medium">
                      {t("odontogram")} — خريطة الأسنان والتشخيص الطبي
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-red-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">{t("loadingRecords")}</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Legend */}
                    <div className="flex justify-center gap-4 text-[11px] font-bold text-slate-400 flex-wrap bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-slate-100 border border-slate-300" />
                        {t("statusReady")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        {t("statusCaries")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {t("statusFilling")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        {t("statusEndo")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {t("casePanel")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        {t("fromAppointment")}
                      </span>
                    </div>

                    <OdontogramView
                      mouthMap={mouthMap}
                      teethWithCases={teethWithCases}
                      appointmentTeeth={appointmentTeeth}
                      procedureKeyToStatus={PROCEDURE_KEY_TO_STATUS}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[12px] text-slate-500 font-medium">
                  {t("welcomeMessage")}
                </p>
                <Link
                  href={`/${locale}/clinical?patientId=${patientId}`}
                  onClick={onClose}
                >
                  <Button className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20">
                    <ExternalLink className="w-4 h-4" />
                    الذهاب للتشخيص التفصيلي
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
