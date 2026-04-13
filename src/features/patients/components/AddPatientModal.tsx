"use client";

import React from "react";
import { X, UserPlus, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { AddPatientForm } from "./AddPatientForm";
import type { Patient } from "../types";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the modal opens in edit mode, pre-filling the form */
  patient?: Patient;
}

export function AddPatientModal({
  isOpen,
  onClose,
  patient,
}: AddPatientModalProps) {
  const t = useTranslations("Patients");
  const isEdit = !!patient;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-slate-200/50 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 md:p-10"
          >
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${
                    isEdit
                      ? "bg-amber-500 shadow-amber-500/30"
                      : "bg-blue-600 shadow-blue-500/30"
                  }`}
                >
                  {isEdit ? (
                    <Pencil className="h-6 w-6" />
                  ) : (
                    <UserPlus className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isEdit
                      ? t("editPatientModalTitle")
                      : t("addPatientModalTitle")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEdit
                      ? t("editPatientModalSub")
                      : t("addPatientModalSub")}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form — key forces remount when patient changes */}
            <AddPatientForm
              key={patient?.id ?? "create"}
              mode={isEdit ? "edit" : "create"}
              patient={patient}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
