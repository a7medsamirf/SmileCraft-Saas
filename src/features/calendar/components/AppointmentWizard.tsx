"use client";

// =============================================================================
// DENTAL CMS — Appointments Module: Appointment Wizard
// features/appointments/components/AppointmentWizard.tsx
//
// Drag-and-Drop Appointment Booking Wizard with React 19 useOptimistic
// =============================================================================

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { getPatientsAction } from "@/features/patients/serverActions";
import { Patient } from "@/features/patients/types";
import { AppointmentStatus } from "@/features/appointments/types";
import { getServicesAction } from "@/features/settings/serverActions";
import { DentalService } from "@/features/settings/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WizardStep = "select-patient" | "select-time" | "confirm";

interface TimeSlot {
  id: string;
  time: string;
  label: string;
  available: boolean;
}

interface OptimisticAppointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  procedure: string;
  status: AppointmentStatus;
  isOptimistic: boolean;
}

// -----------------------------------------------------------------------------
// Mock Services & Data
// -----------------------------------------------------------------------------

const TIME_SLOTS: TimeSlot[] = [
  { id: "slot-0900", time: "09:00", label: "9:00 AM", available: true },
  { id: "slot-0930", time: "09:30", label: "9:30 AM", available: true },
  { id: "slot-1000", time: "10:00", label: "10:00 AM", available: false },
  { id: "slot-1030", time: "10:30", label: "10:30 AM", available: true },
  { id: "slot-1100", time: "11:00", label: "11:00 AM", available: true },
  { id: "slot-1130", time: "11:30", label: "11:30 AM", available: true },
  { id: "slot-1200", time: "12:00", label: "12:00 PM", available: true },
  { id: "slot-1230", time: "12:30", label: "12:30 PM", available: false },
  { id: "slot-1400", time: "14:00", label: "2:00 PM", available: true },
  { id: "slot-1430", time: "14:30", label: "2:30 PM", available: true },
  { id: "slot-1500", time: "15:00", label: "3:00 PM", available: true },
  { id: "slot-1530", time: "15:30", label: "3:30 PM", available: true },
  { id: "slot-1600", time: "16:00", label: "4:00 PM", available: true },
  { id: "slot-1630", time: "16:30", label: "4:30 PM", available: true },
];

const PROCEDURES = [
  { id: "consultation", name: "استشارة أولية", duration: 15, procedureType: "EXAMINATION" },
  { id: "cleaning", name: "تنظيف وتلميع", duration: 30, procedureType: "TEETH_CLEANING" },
  { id: "filling", name: "حشو عصب", duration: 45, procedureType: "FILLING" },
  { id: "extraction", name: "خلع", duration: 20, procedureType: "EXTRACTION" },
  { id: "crown", name: "تاج", duration: 60, procedureType: "CROWN" },
  { id: "orthodontics", name: "تقويم", duration: 30, procedureType: "BRACES" },
];

// Simulated async save to localStorage
async function saveAppointment(data: {
  patientId: string;
  time: string;
  procedure: string;
}): Promise<{ id: string; success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { id: `apt-${Date.now()}`, success: true };
}

// -----------------------------------------------------------------------------
// Patient Card Component (Draggable)
// -----------------------------------------------------------------------------

interface PatientCardProps {
  patient: Patient;
  onDragStart: (patient: Patient) => void;
}

function PatientCard({ patient, onDragStart }: PatientCardProps) {
  const handleDragStart = () => {
    onDragStart(patient);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/20",
        "bg-white/10 backdrop-blur-3xl",
        "p-4 cursor-grab active:cursor-grabbing",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10",
        "dark:border-slate-700/50 dark:bg-slate-800/40",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold shadow-lg">
          {patient.fullName
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
            {patient.fullName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {patient.contactInfo.phone}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {patient.gender === "MALE" ? "ذكر" : "أنثى"}
        </Badge>
        {patient.medicalHistory.conditions.some((c) => c.isActive) && (
          <Badge variant="warning" className="text-[10px]">
            تنبيه طبي
          </Badge>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Time Slot Component (Droppable)
// -----------------------------------------------------------------------------

interface TimeSlotCardProps {
  slot: TimeSlot;
  isOver: boolean;
  onDrop: (slot: TimeSlot) => void;
}

function TimeSlotCard({ slot, isOver, onDrop }: TimeSlotCardProps) {
  const handleDrop = () => {
    if (slot.available) {
      onDrop(slot);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={cn(
        "relative flex items-center justify-between rounded-xl border p-4",
        "transition-all duration-300",
        slot.available
          ? "border-white/20 bg-white/10 backdrop-blur-3xl cursor-pointer hover:border-emerald-400/50 hover:bg-emerald-500/10"
          : "border-slate-200/10 bg-slate-100/10 opacity-50 cursor-not-allowed",
        isOver && slot.available
          ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-white/10 scale-[1.02]"
          : "",
        "dark:border-slate-700/50 dark:bg-slate-800/40",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            slot.available
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-500/20 text-slate-400",
          )}
        >
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {slot.label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {slot.available ? "متاح" : "محجوز"}
          </p>
        </div>
      </div>
      {slot.available && (
        <Badge variant="success" className="text-xs">
          متاح
        </Badge>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Wizard Component
// -----------------------------------------------------------------------------

export function AppointmentWizard() {
  const t = useTranslations("Appointments");
  const commonT = useTranslations("Common");

  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-patient");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<
    { id: string; name: string; duration: number; procedureType?: string } | null
  >(null);
  const [draggedPatient, setDraggedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React 19 useOptimistic for instant feedback
  const [optimisticAppointments, setOptimisticAppointments] =
    React.useOptimistic<
      OptimisticAppointment[],
      { appointment: OptimisticAppointment }
    >([], (state, action) => [...state, action.appointment]);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Patients from DB — loaded asynchronously on mount
  const [patients, setPatients] = useState<Patient[]>([]);
  useEffect(() => {
    getPatientsAction({}, 1, 100).then((result) => setPatients(result.data));
  }, []);

  // Services from DB — loaded on mount
  const [services, setServices] = useState<DentalService[]>([]);
  useEffect(() => {
    getServicesAction().then((data) => setServices(data));
  }, []);

  // Handlers
  const handleDragStart = useCallback((patient: Patient) => {
    setDraggedPatient(patient);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      if (over && draggedPatient) {
        const slot = TIME_SLOTS.find((s) => s.id === over.id);
        if (slot && slot.available) {
          setSelectedPatient(draggedPatient);
          setSelectedSlot(slot);
          setCurrentStep("confirm");
        }
      }
      setDraggedPatient(null);
    },
    [draggedPatient],
  );

  const handleSlotDrop = useCallback(
    (slot: TimeSlot) => {
      if (draggedPatient && slot.available) {
        setSelectedPatient(draggedPatient);
        setSelectedSlot(slot);
        setCurrentStep("confirm");
      }
      setDraggedPatient(null);
    },
    [draggedPatient],
  );

  const handleQuickBook = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep("select-time");
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedPatient || !selectedSlot || !selectedProcedure) return;

    setIsSubmitting(true);

    // Add optimistic appointment immediately
    const optimisticAppt: OptimisticAppointment = {
      id: `opt-${Date.now()}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      time: selectedSlot.time,
      procedure: selectedProcedure.name,
      status: AppointmentStatus.SCHEDULED,
      isOptimistic: true,
    };

    startTransition(() => {
      setOptimisticAppointments({ appointment: optimisticAppt });
    });

    // Simulate async save
    const result = await saveAppointment({
      patientId: selectedPatient.id,
      time: selectedSlot.time,
      procedure: selectedProcedure.name,
    });

    setIsSubmitting(false);

    if (result.success) {
      // Reset wizard
      setSelectedPatient(null);
      setSelectedSlot(null);
      setSelectedProcedure(null);
      setCurrentStep("select-patient");
    }
  }, [
    selectedPatient,
    selectedSlot,
    selectedProcedure,
    setOptimisticAppointments,
  ]);

  const handleReset = useCallback(() => {
    setSelectedPatient(null);
    setSelectedSlot(null);
    setSelectedProcedure(null);
    setCurrentStep("select-patient");
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStep === "select-patient" && selectedPatient) {
      setCurrentStep("select-time");
    } else if (currentStep === "select-time" && selectedSlot) {
      setCurrentStep("confirm");
    }
  }, [currentStep, selectedPatient, selectedSlot]);

  const goToPrevStep = useCallback(() => {
    if (currentStep === "select-time") {
      setCurrentStep("select-patient");
    } else if (currentStep === "confirm") {
      setCurrentStep("select-time");
    }
  }, [currentStep]);

  // Step indicators
  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    {
      id: "select-patient",
      label: "اختر المريض",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "select-time",
      label: "اختر الوقت",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: "confirm",
      label: "تأكيد",
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                اسحب المريض وأفلته في خانة الوقت للحجز السريع
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between relative">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" />
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                index <= currentStepIndex
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400",
              )}
            >
              {step.icon}
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => {}}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          {/* Step 1: Select Patient */}
          {currentStep === "select-patient" && (
            <motion.div
              key="step-patient"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="glass-card p-6 rounded-3xl"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                اختر مريض للحجز
              </h3>

              {patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    لا يوجد مرضى مسجلين. أضف مريضاً جديداً أولاً.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.map((patient) => (
                    <div key={patient.id} className="space-y-3">
                      <PatientCard
                        patient={patient}
                        onDragStart={handleDragStart}
                      />
                      <Button
                        variant="outline"
                        className="w-full rounded-xl text-xs"
                        onClick={() => handleQuickBook(patient)}
                      >
                        حجز سريع
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Select Time */}
          {currentStep === "select-time" && (
            <motion.div
              key="step-time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-6"
            >
              {/* Selected Patient Summary */}
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">
                    {selectedPatient?.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {selectedPatient?.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPatient?.contactInfo.phone}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Time Slots Grid */}
              <div className="glass-card p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-500" />
                  اختر خانة الوقت المتاحة
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <TimeSlotCard
                      key={slot.id}
                      slot={slot}
                      isOver={false}
                      onDrop={handleSlotDrop}
                    />
                  ))}
                </div>
              </div>

              {/* Service Selection */}
              <div className="glass-card p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-emerald-500" />
                  الخدمات المتاحة
                </h3>
                {services.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    لا توجد خدمات متاحة. أضف خدمات من الإعدادات أولاً.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedProcedure({
                          id: service.id,
                          name: service.name,
                          duration: service.duration,
                          procedureType: service.procedureType,
                        })}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-200 text-right",
                          selectedProcedure?.id === service.id
                            ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400/50"
                            : "border-white/20 bg-white/10 hover:border-emerald-300/50",
                          "dark:border-slate-700/50 dark:bg-slate-800/40",
                        )}
                      >
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                          {service.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {service.duration} دقيقة · {service.price} ج.م
                        </p>
                        <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          {service.procedureType.replace("_", " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Procedure Selection */}
              <div className="glass-card p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  أنواع الإجراءات
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROCEDURES.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => setSelectedProcedure(proc)}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 text-right",
                        selectedProcedure?.id === proc.id
                          ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400/50"
                          : "border-white/20 bg-white/10 hover:border-emerald-300/50",
                        "dark:border-slate-700/50 dark:bg-slate-800/40",
                      )}
                    >
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {proc.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {proc.duration} دقيقة
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronRight className="h-4 w-4 me-2" />
                  السابق
                </Button>
                <Button
                  variant="primary"
                  onClick={goToNextStep}
                  disabled={!selectedSlot || !selectedProcedure}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 ms-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === "confirm" && (
            <motion.div
              key="step-confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="glass-card p-8 rounded-3xl max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  تأكيد حجز الموعد
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  يرجى مراجعة التفاصيل قبل التأكيد
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    المريض
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPatient?.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    الوقت
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedSlot?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    الإجراء
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedProcedure?.name} ({selectedProcedure?.duration}{" "}
                      دقيقة)
                    </span>
                    {selectedProcedure?.procedureType && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        {selectedProcedure.procedureType.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronRight className="h-4 w-4 me-2" />
                  تعديل
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جاري الحفظ...
                    </span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 me-2" />
                      تأكيد الحجز
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedPatient ? (
            <div className="w-64 opacity-90 scale-105 rotate-3">
              <PatientCard patient={draggedPatient} onDragStart={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Optimistic Appointments Display */}
      {optimisticAppointments.length > 0 && (
        <div className="glass-card p-6 rounded-3xl">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            مواعيد محجوزة حديثاً
          </h3>
          <div className="space-y-2">
            {optimisticAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {apt.patientName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {apt.procedure}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs">
                  {apt.time}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
