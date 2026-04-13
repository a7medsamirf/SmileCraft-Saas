"use client";

import React from "react";
import { Patient } from "@/features/patients/types";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  MapPin,
  AlertTriangle,
  Droplets,
  Calendar,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useTranslations, useLocale } from "next-intl";

interface PatientMiniProfileProps {
  patient: Patient;
  onDeselect: () => void;
}

export function PatientMiniProfile({ patient, onDeselect }: PatientMiniProfileProps) {
  const t = useTranslations("Clinical");
  const locale = useLocale();

  // Has medical alerts?
  const hasAlerts =
    patient.medicalHistory.allergies.length > 0 ||
    patient.medicalHistory.conditions.some((c) => c.isActive);

  // Last visit formatted
  const lastVisitDate = patient.lastVisit
    ? new Date(patient.lastVisit).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-5 border-s-4 border-s-blue-500 relative overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none" />

      <div className="relative flex items-start gap-4 flex-wrap">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-extrabold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
        >
          {patient.fullName.charAt(0)}
        </motion.div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {patient.fullName}
            </h3>
            {patient.age && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 dark:text-white">
                {patient.age} {t("years") || "سنة"}
              </Badge>
            )}
            {hasAlerts && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("medicalAlert")}
              </Badge>
            )}
          </div>

          {/* Contact + Meta Row */}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400" />
              <span dir="ltr">{patient.contactInfo.phone}</span>
            </span>
            {patient.contactInfo.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-slate-400" />
                {patient.contactInfo.city}
              </span>
            )}
            {patient.medicalHistory.bloodGroup && patient.medicalHistory.bloodGroup !== "UNKNOWN" && (
              <span className="flex items-center gap-1.5">
                <Droplets className="h-3 w-3 text-red-400" />
                {patient.medicalHistory.bloodGroup}
              </span>
            )}
            {lastVisitDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-400" />
                {t("lastVisitLabel")}: {lastVisitDate}
              </span>
            )}
          </div>

          {/* Allergy chips */}
          {patient.medicalHistory.allergies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {patient.medicalHistory.allergies.map((allergy) => (
                <span
                  key={allergy.allergen}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    allergy.severity === "SEVERE"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {allergy.allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onDeselect}
          className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t("deselectPatient")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
