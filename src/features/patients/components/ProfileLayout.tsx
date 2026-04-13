"use client";

import React, { useState } from "react";
import { Patient } from "../types";
import { PATIENT_STATUS_LABELS } from "../constants";
import { Badge } from "@/components/ui/Badge";
import {
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  User,
  FileText,
  ActivitySquare,
  Pill,
  Pencil,
} from "lucide-react";
import { MedicalAlerts } from "./MedicalAlerts";
import { TreatmentTimeline } from "./TreatmentTimeline";
import { PatientMediaGallery } from "./PatientMediaGallery";
import { AddPatientModal } from "./AddPatientModal";

interface ProfileLayoutProps {
  patient: Patient;
  onUpdatePatientHistory?: (updated: Partial<Patient>) => Promise<void>;
}

type TabType = "overview" | "treatments" | "files";

export function ProfileLayout({
  patient,
  onUpdatePatientHistory,
}: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const statusLabel = PATIENT_STATUS_LABELS[patient.status];

  return (
    <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Edit modal */}
      <AddPatientModal
        isOpen={isEditOpen}
        patient={patient}
        onClose={() => setIsEditOpen(false)}
      />

      {/* 1. Profile Header Hero */}
      <div className="relative overflow-hidden glass-card p-6 md:p-8 backdrop-blur-xl">
        {/* Subtle background blob */}
        <div className="absolute -inset-inline-end-20 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/20 pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5 text-center md:flex-row md:text-right">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 border-4 border-white dark:border-slate-900">
            {patient.photoUrl ? (
              <img
                src={patient.photoUrl}
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <User className="h-10 w-10" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col items-center gap-3 md:flex-row md:flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                {patient.fullName}
              </h1>
              <Badge className={statusLabel.colorClass} variant="outline">
                {statusLabel.ar}
              </Badge>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                ID: #{patient.nationalId?.slice(-6) || "---"}
              </span>
              {/* Edit button */}
              <button
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل البيانات
              </button>
            </div>
            <p className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />{" "}
                <span dir="ltr">{patient.contactInfo.phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" /> {patient.age} سنة
              </span>
              {patient.contactInfo.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {patient.contactInfo.city}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Modern Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-px hide-scrollbar dark:border-slate-800">
        {[
          { id: "overview", label: "نظرة عامة", icon: ActivitySquare },
          { id: "treatments", label: "سجل الجلسات", icon: Pill },
          { id: "files", label: "الملفات والأشعة", icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <tab.icon
                className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500"}`}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MedicalAlerts
              history={patient.medicalHistory}
              onUpdateHistory={
                onUpdatePatientHistory
                  ? (newHistory) =>
                      onUpdatePatientHistory({ medicalHistory: newHistory })
                  : undefined
              }
            />

            {/* Quick Demo of a side card for demographic info */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                جهة الاتصال للطوارئ
              </h3>
              {patient.emergencyContact ? (
                <div className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">
                    {patient.emergencyContact.name} (
                    {patient.emergencyContact.relationship})
                  </span>
                  <span dir="ltr" className="text-right w-fit">
                    {patient.emergencyContact.phone}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  لا يوجد بيانات طوارئ مسجلة.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "treatments" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-4">
            <TreatmentTimeline visits={patient.visits} />
          </div>
        )}

        {activeTab === "files" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-4">
            <PatientMediaGallery patientId={patient.id} />
          </div>
        )}
      </div>
    </div>
  );
}
