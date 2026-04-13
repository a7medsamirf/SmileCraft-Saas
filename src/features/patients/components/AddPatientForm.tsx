"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createPatientAction, updatePatientAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  Phone,
  CreditCard,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { Gender, BloodGroup, Patient } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  clientAddPatientSchema,
  ClientAddPatientFormData,
} from "../schemas/addPatientSchema";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface AddPatientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** "create" = new patient (default) | "edit" = update existing */
  mode?: "create" | "edit";
  /** When mode="edit", the patient whose data should pre-fill the form */
  patient?: Patient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build RHF defaultValues from an existing Patient object
// ─────────────────────────────────────────────────────────────────────────────
function buildDefaultValues(
  patient?: Patient,
): Partial<ClientAddPatientFormData> {
  if (!patient) return {};
  return {
    fullName: patient.fullName,
    phone: patient.contactInfo.phone,
    nationalId: patient.nationalId ?? "",
    // birthDate must be YYYY-MM-DD for <input type="date">
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : "",
    gender: patient.gender,
    city: patient.contactInfo.city ?? "",
    bloodGroup: patient.medicalHistory.bloodGroup,
    medicalNotes: patient.medicalHistory.conditions[0]?.condition ?? "",
    currentMedications: patient.medicalHistory.currentMedications[0] ?? "",
    emergencyName: patient.emergencyContact?.name ?? "",
    emergencyRelationship: patient.emergencyContact?.relationship ?? "",
    emergencyPhone: patient.emergencyContact?.phone ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function AddPatientForm({
  onSuccess,
  onCancel,
  mode = "create",
  patient,
}: AddPatientFormProps) {
  const t = useTranslations("Patients");
  const isEdit = mode === "edit";

  const [step, setStep] = React.useState(1);
  const totalSteps = 3;
  const formRef = useRef<HTMLFormElement>(null);

  // Switch server action based on mode
  const serverAction = isEdit ? updatePatientAction : createPatientAction;
  const [state, formAction, isPending] = useActionState(serverAction, {
    success: null,
  });

  // Use the client-side schema (no z.preprocess) so TypeScript infers
  // plain `string` types — avoids the Zod 4 unknown input/output conflict.
  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ClientAddPatientFormData>({
    resolver: zodResolver(clientAddPatientSchema),
    defaultValues: buildDefaultValues(patient),
    mode: "onChange",
    shouldUnregister: false, // ← CRITICAL: preserve values when inputs are hidden
  });

  // ── Close modal on success ──────────────────────────────────────────────
  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        onSuccess?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.success, onSuccess]);

  // ── Prevent double-tap submission on final step ────────────────────────
  const [isSubmitReady, setIsSubmitReady] = React.useState(false);
  React.useEffect(() => {
    if (step === totalSteps) {
      setIsSubmitReady(false);
      const timer = setTimeout(() => setIsSubmitReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Step navigation ─────────────────────────────────────────────────────
  const nextStep = async () => {
    let fields: (keyof ClientAddPatientFormData)[] = [];
    if (step === 1)
      fields = [
        "fullName",
        "phone",
        "nationalId",
        "birthDate",
        "gender",
        "city",
      ];
    else if (step === 2)
      fields = ["bloodGroup", "medicalNotes", "currentMedications"];
    const valid = await trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ── Prevent Enter from submitting prematurely or blocking textarea newlines ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Allow Enter key to create new lines in textareas (e.g., currentMedications)
    if (e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // Prevent Enter from submitting the form directly unless they specifically
    // trigger it via the submit button, keeping them from accidentally submitting 
    // step 3 prematurely.
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ← CRITICAL: only allow real submission from the final step
    if (step !== totalSteps) return;

    const isValid = await trigger();
    if (!isValid) return;

    const data = getValues() as ClientAddPatientFormData;
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });

    // Inject patient ID so the server action knows which record to update
    if (isEdit && patient) {
      formData.append("patientId", patient.id);
    }

    React.startTransition(() => {
      formAction(formData);
    });
  };

  // ── Error helpers ───────────────────────────────────────────────────────
  const getError = (name: keyof ClientAddPatientFormData) => {
    if (errors[name]?.message)
      return t(errors[name].message as Parameters<typeof t>[0]);
    if (state.errors?.[name]?.[0])
      return t(state.errors[name][0] as Parameters<typeof t>[0]);
    return undefined;
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (state.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t(isEdit ? "editPatientSuccess" : "addPatientSuccess")}
        </h3>
        <p className="mt-2 text-slate-500">{t("redirecting")}</p>
      </div>
    );
  }

  // ── Shared input class helper ───────────────────────────────────────────
  const selectCls =
    "w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900";

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}
            >
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            <span
              className={`hidden sm:inline text-xs font-bold ${
                step === s ? "text-slate-900 dark:text-white" : "text-slate-400"
              }`}
            >
              {s === 1
                ? t("stepBasic")
                : s === 2
                  ? t("stepMedical")
                  : t("stepEmergency")}
            </span>
            {s < 3 && (
              <div className="h-px w-8 sm:w-16 bg-slate-100 dark:bg-slate-800" />
            )}
          </div>
        ))}
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-5"
      >
        {/*
         * All 3 step panels are ALWAYS mounted in the DOM so that
         * react-hook-form never loses track of registered field values.
         * Inactive panels are hidden via opacity:0 + pointerEvents:none
         * and animated via Framer Motion's `animate` prop.
         */}
        <div className="relative min-h-[300px]">
          {/* ── STEP 1: Basic Info ────────────────────────────────────────── */}
          <motion.div
            initial={false}
            animate={{
              opacity: step === 1 ? 1 : 0,
              x: step === 1 ? 0 : step > 1 ? -30 : 30,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-x-0 top-0 w-full space-y-4"
            style={{ pointerEvents: step === 1 ? "auto" : "none" }}
            aria-hidden={step !== 1}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("fullName")}
                </label>
                <Input
                  {...register("fullName")}
                  placeholder={t("fullNamePlaceholder")}
                  icon={<User className="h-4 w-4" />}
                  error={getError("fullName")}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("phone")}
                </label>
                <Input
                  {...register("phone")}
                  placeholder={t("phonePlaceholder")}
                  type="tel"
                  icon={<Phone className="h-4 w-4" />}
                  error={getError("phone")}
                />
              </div>

              {/* National ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("nationalId")}
                </label>
                <Input
                  {...register("nationalId")}
                  placeholder={t("nationalIdPlaceholder")}
                  type="number"
                  icon={<CreditCard className="h-4 w-4" />}
                  error={getError("nationalId")}
                />
              </div>

              {/* Birth date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("birthDate")}
                </label>
                <Input
                  {...register("birthDate")}
                  type="date"
                  icon={<Calendar className="h-4 w-4" />}
                  error={getError("birthDate")}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("gender")}
                </label>
                <select {...register("gender")} className={selectCls}>
                  <option value={Gender.MALE}>{t("male")}</option>
                  <option value={Gender.FEMALE}>{t("female")}</option>
                  <option value={Gender.OTHER}>{t("other")}</option>
                </select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("city")}
                </label>
                <Input {...register("city")} placeholder="..." />
              </div>
            </div>
          </motion.div>

          {/* ── STEP 2: Medical Info ──────────────────────────────────────── */}
          <motion.div
            initial={false}
            animate={{
              opacity: step === 2 ? 1 : 0,
              x: step === 2 ? 0 : step > 2 ? -30 : 30,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-x-0 top-0 w-full space-y-4"
            style={{ pointerEvents: step === 2 ? "auto" : "none" }}
            aria-hidden={step !== 2}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood group */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("bloodGroup")}
                </label>
                <select {...register("bloodGroup")} className={selectCls}>
                  {Object.values(BloodGroup).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medical alerts */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("medicalAlerts")}
                </label>
                <Input
                  {...register("medicalNotes")}
                  placeholder={t("medicalAlertsPlaceholder")}
                  icon={<Activity className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Current medications */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("medications")}
              </label>
              <textarea
                {...register("currentMedications")}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
                placeholder={t("medicationsPlaceholder")}
              />
            </div>
          </motion.div>

          {/* ── STEP 3: Emergency Contact ─────────────────────────────────── */}
          <motion.div
            initial={false}
            animate={{
              opacity: step === 3 ? 1 : 0,
              x: step === 3 ? 0 : 30,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-x-0 top-0 w-full space-y-4"
            style={{ pointerEvents: step === 3 ? "auto" : "none" }}
            aria-hidden={step !== 3}
          >
            <p className="text-sm text-slate-500 mb-4">{t("emergencyNote")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("emergencyContactName")}
                </label>
                <Input
                  {...register("emergencyName")}
                  placeholder="..."
                  icon={<UserPlus className="h-4 w-4" />}
                />
              </div>

              {/* Relationship */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("emergencyRelationship")}
                </label>
                <Input
                  {...register("emergencyRelationship")}
                  placeholder={t("emergencyRelationshipPlaceholder")}
                />
              </div>

              {/* Emergency phone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("emergencyPhone")}
                </label>
                <Input
                  {...register("emergencyPhone")}
                  placeholder={t("phonePlaceholder")}
                  icon={<Phone className="h-4 w-4" />}
                  error={getError("emergencyPhone")}
                />
              </div>
            </div>

            {/* Form-level server error */}
            {state.message && !state.success && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {t(state.message as Parameters<typeof t>[0])}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Footer Actions ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="rounded-2xl px-6"
            >
              <ArrowRight className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("prev")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-2xl text-slate-400 hover:text-red-500"
            >
              {t("cancel")}
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              type="button"
              onClick={nextStep}
              className="rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-8"
            >
              {t("next")}
              <ArrowLeft className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isPending || !isSubmitReady}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 shadow-lg px-10"
            >
              {isPending
                ? t(isEdit ? "updating" : "registering")
                : t(isEdit ? "update" : "register")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
