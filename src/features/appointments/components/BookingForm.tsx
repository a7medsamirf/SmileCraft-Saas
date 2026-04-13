"use client";

// =============================================================================
// Appointments — Booking Form Modal
// Procedure chip-picker linked to odontogram tooth statuses + tooth number input
// =============================================================================

import React, { useActionState, useEffect, useRef, useState } from "react";
import {
  CalendarPlus,
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Timer,
  FileText,
  CheckCircle2,
  Hash,
  Stethoscope,
} from "lucide-react";
import {
  bookAppointmentAction,
} from "../actions/bookAppointmentAction";
import type { BookingState } from "../schemas";
import { getAppointmentsByDateAction } from "../serverActions";
import { AppointmentStatus } from "../types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  PROCEDURE_DEFINITIONS,
  PROCEDURE_CATEGORY_LABELS,
  ProcedureDefinition,
} from "../constants/procedures";
import {
  getToothPosition,
  getToothType,
  ToothPosition,
  ToothType,
} from "@/features/clinical/types/odontogram";
import {
  getServicesAction,
  getBusinessHoursForBookingAction,
} from "@/features/settings/serverActions";
import { DentalService, BusinessDay } from "@/features/settings/types";
import {
  generateTimeSlots,
  formatTimeToArabic,
  parseArabicTime,
  isDayOpen,
  getDayNameFromDate,
} from "@/lib/clinic-hours-utils";

// ── Tooth position / type labels (Arabic) ───────────────────────────────────
const POSITION_LABEL: Record<ToothPosition, string> = {
  [ToothPosition.UPPER_RIGHT]: "فك علوي أيمن",
  [ToothPosition.UPPER_LEFT]: "فك علوي أيسر",
  [ToothPosition.LOWER_LEFT]: "فك سفلي أيسر",
  [ToothPosition.LOWER_RIGHT]: "فك سفلي أيمن",
};

const TYPE_LABEL: Record<ToothType, string> = {
  [ToothType.MOLAR]: "ضرس",
  [ToothType.PREMOLAR]: "ضرس أمامي",
  [ToothType.CANINE]: "ناب",
  [ToothType.INCISOR]: "قاطع",
};

// ── Group procedures by category ─────────────────────────────────────────────
const CATEGORY_ORDER: ProcedureDefinition["category"][] = [
  "restorative",
  "endodontic",
  "prosthetic",
  "surgical",
  "preventive",
  "cosmetic",
  "periodontic",
];

const groupedProcedures = CATEGORY_ORDER.reduce<
  Record<string, ProcedureDefinition[]>
>((acc, cat) => {
  const items = PROCEDURE_DEFINITIONS.filter((p) => p.category === cat);
  if (items.length > 0) acc[cat] = items;
  return acc;
}, {});

// ── Duration options ─────────────────────────────────────────────────────────
const DURATIONS = [
  { value: "15", label: "١٥ دقيقة" },
  { value: "30", label: "٣٠ دقيقة" },
  { value: "45", label: "٤٥ دقيقة" },
  { value: "60", label: "ساعة" },
  { value: "90", label: "ساعة ونصف" },
  { value: "120", label: "ساعتين" },
];

// ── Initial form state ───────────────────────────────────────────────────────
const initialState: BookingState = { success: false, errors: {} };

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: {
    patientName?: string;
    phone?: string;
    toothNumber?: number;
    date?: string;
    procedureKey?: string;
    procedure?: string;
  };
}

export function BookingForm({
  isOpen,
  onClose,
  defaultValues,
}: BookingFormProps) {
  const t = useTranslations("Settings.services");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    bookAppointmentAction,
    initialState,
  );

  // ── UI State ──────────────────────────────────────────────────────────────
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultValues?.date ?? "",
  );
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<
    ProcedureDefinition | null
  >(
    defaultValues?.procedureKey
      ? PROCEDURE_DEFINITIONS.find((p) => p.key === defaultValues.procedureKey) ?? null
      : null,
  );
  const [patientName, setPatientName] = useState<string>(
    defaultValues?.patientName ?? "",
  );
  const [phone, setPhone] = useState<string>(defaultValues?.phone ?? "");
  const [toothInput, setToothInput] = useState<string>(
    defaultValues?.toothNumber?.toString() ?? "",
  );
  const [services, setServices] = useState<DentalService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<DentalService | null>(null);
  const [clinicHours, setClinicHours] = useState<BusinessDay[]>([]);
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [isLoadingHours, setIsLoadingHours] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Load services from DB on mount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingServices(true);
        const data = await getServicesAction();
        if (isMounted) setServices(data);
      } catch {
        if (isMounted) setServices([]);
      } finally {
        if (isMounted) setIsLoadingServices(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load clinic hours and slot duration on mount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingHours(true);
        const { hours, slotDuration: duration } = await getBusinessHoursForBookingAction();
        if (isMounted) {
          setClinicHours(hours);
          setSlotDuration(duration);
        }
      } catch {
        if (isMounted) {
          setClinicHours([]);
          setSlotDuration(30);
        }
      } finally {
        if (isMounted) setIsLoadingHours(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // When a service is selected, auto-select the matching procedure
  useEffect(() => {
    if (selectedService) {
      const matchingProc = PROCEDURE_DEFINITIONS.find(
        (p) => p.key.toLowerCase().includes(selectedService.procedureType.toLowerCase()) ||
               selectedService.procedureType.toLowerCase().includes(p.key.replace("procedure", "").toLowerCase())
      );
      if (matchingProc) {
        setSelectedProcedure(matchingProc);
      }
    }
  }, [selectedService]);

  // Parse tooth number for live hint
  const toothNum = toothInput ? parseInt(toothInput, 10) : null;
  const isValidTooth = toothNum !== null && toothNum >= 1 && toothNum <= 32;

  // Tooth position hint (uses clinical module helpers)
  let toothHint = "";
  if (isValidTooth && toothNum) {
    try {
      const pos = getToothPosition(toothNum);
      const type = getToothType(toothNum);
      toothHint = `${TYPE_LABEL[type]} — ${POSITION_LABEL[pos]}`;
    } catch {
      toothHint = "";
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  // Auto-close on success
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success, onClose]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTime("");
      setSelectedDate(defaultValues?.date ?? "");
      setBookedTimes(new Set());
      setSelectedProcedure(
        defaultValues?.procedureKey
          ? PROCEDURE_DEFINITIONS.find((p) => p.key === defaultValues.procedureKey) ?? null
          : null,
      );
      setToothInput(defaultValues?.toothNumber?.toString() ?? "");
      setPatientName(defaultValues?.patientName ?? "");
      setPhone(defaultValues?.phone ?? "");
      setSelectedService(null);
    }
  }, [isOpen, defaultValues]);

  // Load booked slots and generate available time slots when date changes
  useEffect(() => {
    if (!isOpen || !selectedDate) {
      setBookedTimes(new Set());
      setAvailableTimeSlots([]);
      return;
    }

    const selectedDateObj = new Date(selectedDate);
    
    // Check if selected date is an open day
    if (clinicHours.length > 0 && !isDayOpen(selectedDateObj, clinicHours)) {
      setBookedTimes(new Set());
      setAvailableTimeSlots([]);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setIsLoadingSlots(true);
        const dayApts = await getAppointmentsByDateAction(selectedDateObj);
        if (!isMounted) return;
        
        const unavailable = new Set<AppointmentStatus>([
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.IN_PROGRESS,
        ]);
        const bookedTimeSet = new Set(
          dayApts.filter((a) => unavailable.has(a.status)).map((a) => a.time),
        );
        setBookedTimes(bookedTimeSet);

        // Generate available time slots based on clinic hours
        const bookedTimesArray = Array.from(bookedTimeSet);
        const slots = generateTimeSlots(
          selectedDateObj,
          clinicHours,
          slotDuration,
          bookedTimesArray,
        );
        const formattedSlots = slots.map(formatTimeToArabic);
        setAvailableTimeSlots(formattedSlots);
      } catch {
        if (isMounted) {
          setBookedTimes(new Set());
          setAvailableTimeSlots([]);
        }
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, clinicHours, slotDuration]);

  // Deselect time if it becomes booked after a reload
  useEffect(() => {
    if (selectedTime && bookedTimes.has(selectedTime)) setSelectedTime("");
  }, [bookedTimes, selectedTime]);

  if (!isOpen) return null;

  // ── Input style helper ─────────────────────────────────────────────────────
  const inputCls = (error?: string) =>
    cn(
      "w-full rounded-xl px-4 py-3 text-[13px] font-medium appearance-none",
      "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      "text-slate-700 dark:text-slate-300 outline-none",
      "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all",
      error && "border-red-500",
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        style={{ animation: "fadeIn 0.2s ease" }}
        onClick={onClose}
      />

      {/* Modal shell */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50"
          style={{ animation: "slideUp 0.3s ease" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <CalendarPlus className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  حجز موعد جديد
                </h2>
                <p className="text-[12px] text-slate-500">
                  أدخل بيانات المريض والإجراء والموعد
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Form ── */}
          <form ref={formRef} action={formAction} className="p-6 space-y-6">
            {/* ── 1. Patient info ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="اسم المريض"
                name="patientName"
                icon={<User className="w-4 h-4" />}
                placeholder="أدخل اسم المريض"
                error={state.errors?.patientName?.[0]}
                disabled={isPending}
                value={patientName}
                onChange={setPatientName}
              />
              <FormField
                label="رقم الهاتف"
                name="phone"
                icon={<Phone className="w-4 h-4" />}
                placeholder="01XXXXXXXXX"
                dir="ltr"
                error={state.errors?.phone?.[0]}
                disabled={isPending}
                value={phone}
                onChange={setPhone}
              />
            </div>

            {/* ── 2. Service Selection ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                <Stethoscope className="w-3.5 h-3.5" />
                الخدمة (اختياري)
              </label>
              {isLoadingServices ? (
                <p className="text-[11px] text-slate-500 font-medium">جاري تحميل الخدمات...</p>
              ) : services.length === 0 ? (
                <p className="text-[11px] text-slate-500 font-medium">لا توجد خدمات متاحة</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {services.map((service) => {
                    const isSelected = selectedService?.id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedService(null);
                            setSelectedProcedure(null);
                          } else {
                            setSelectedService(service);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-start rounded-xl border px-3 py-2.5 text-[11px] font-medium transition-all duration-150",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 shadow-md text-slate-900 dark:text-white"
                            : "bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-blue-300",
                        )}
                      >
                        <span className="font-semibold truncate w-full">{service.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                          {service.price} {t("currency") || "ج.م"} · {service.duration} دقيقة
                        </span>
                        {service.procedureType && (
                          <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
                            {service.procedureType.replace("_", " ")}
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected service summary */}
              {selectedService && (
                <div className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300">
                  <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                  <span>الخدمة: {selectedService.name}</span>
                  <span className="opacity-60">·</span>
                  <span>نوع الإجراء: {selectedService.procedureType}</span>
                </div>
              )}
            </div>

            {/* ── 3. Date + Duration ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="التاريخ"
                name="date"
                icon={<Calendar className="w-4 h-4" />}
                type="date"
                value={selectedDate}
                onChange={(v) => setSelectedDate(v)}
                error={state.errors?.date?.[0]}
                disabled={isPending}
              />
              <div>
                <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  المدة
                </label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Timer className="w-4 h-4" />
                  </div>
                  <select
                    name="duration"
                    disabled={isPending}
                    className={cn(
                      inputCls(state.errors?.duration?.[0]),
                      "pr-10",
                    )}
                  >
                    <option value="">اختر المدة</option>
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                {state.errors?.duration && (
                  <p className="text-[11px] text-red-400 font-medium mt-1">
                    {state.errors.duration[0]}
                  </p>
                )}
              </div>
            </div>

            {/* ── 3. Tooth Number ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                <Hash className="w-3.5 h-3.5" />
                رقم السن (اختياري — ١ إلى ٣٢)
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-32">
                  <input
                    type="number"
                    name="toothNumber"
                    min={1}
                    max={32}
                    value={toothInput}
                    onChange={(e) => setToothInput(e.target.value)}
                    placeholder="مثال: 14"
                    disabled={isPending}
                    className={cn(
                      inputCls(),
                      "text-center font-bold text-lg",
                      isValidTooth && "border-blue-400 focus:border-blue-500",
                    )}
                  />
                </div>

                {/* Live position hint */}
                {isValidTooth && toothHint && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-2 border border-blue-100 dark:border-blue-800/40">
                    {/* Mini tooth SVG indicator */}
                    <svg
                      viewBox="0 0 24 28"
                      width="16"
                      height="18"
                      className="shrink-0"
                    >
                      <path
                        d="M5 6 C5 2, 19 2, 19 6 C19 10, 22 14, 18 26 C15 26, 13 20, 12 20 C11 20, 9 26, 6 26 C2 14, 5 10, 5 6 Z"
                        fill="#3b82f6"
                        stroke="#1d4ed8"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <div>
                      <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                        سن #{toothNum}
                      </p>
                      <p className="text-[10px] text-blue-500 dark:text-blue-400">
                        {toothHint}
                      </p>
                    </div>
                  </div>
                )}

                {toothInput && !isValidTooth && (
                  <p className="text-[11px] text-red-400 font-medium">
                    الرقم يجب أن يكون بين ١ و٣٢
                  </p>
                )}
              </div>
            </div>

            {/* ── 4. Procedure Type — Visual Chip Picker ── */}
            <div>
              {/* Hidden inputs for form submission */}
              <input
                type="hidden"
                name="procedure"
                value={
                  selectedProcedure?.labelAr ?? defaultValues?.procedure ?? ""
                }
              />
              <input
                type="hidden"
                name="procedureKey"
                value={
                  selectedProcedure?.key ?? defaultValues?.procedureKey ?? ""
                }
              />

              <div className="flex items-center justify-between mb-3">
                <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                  نوع الإجراء
                </label>
                {/* Odontogram color legend — mirrors the dental chart */}
                <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                    تسوس
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                    حشو
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                    عصب
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                    تاج
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#94a3b8]" />
                    خلع
                  </span>
                </div>
              </div>

              {state.errors?.procedure && (
                <p className="text-[11px] text-red-400 font-medium mb-2">
                  {state.errors.procedure[0]}
                </p>
              )}

              {/* Grouped chips */}
              <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30 p-4">
                {Object.entries(groupedProcedures).map(([category, procs]) => (
                  <div key={category}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                      {
                        PROCEDURE_CATEGORY_LABELS[
                          category as ProcedureDefinition["category"]
                        ]
                      }
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {procs.map((proc) => {
                        const isSelected = selectedProcedure?.key === proc.key;
                        return (
                          <button
                            key={proc.key}
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              setSelectedProcedure(isSelected ? null : proc)
                            }
                            className={cn(
                              "relative flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all duration-150",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                              isSelected
                                ? "bg-white dark:bg-slate-900 shadow-md text-slate-900 dark:text-white"
                                : "bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                            )}
                            style={{
                              borderTopColor: isSelected
                                ? proc.strokeColor
                                : undefined,
                              borderRightColor: isSelected
                                ? proc.strokeColor
                                : undefined,
                              borderBottomColor: isSelected
                                ? proc.strokeColor
                                : undefined,
                              borderLeftWidth: "3px",
                              borderLeftColor: proc.color,
                              boxShadow: isSelected
                                ? `0 0 0 2px ${proc.color}40`
                                : undefined,
                            }}
                          >
                            {/* Color dot matching odontogram */}
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white dark:ring-slate-800"
                              style={{ backgroundColor: proc.color }}
                            />
                            {proc.labelAr}
                            {/* Cost badge — only on selected chip */}
                            {isSelected && (
                              <span className="ms-1 rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {proc.estimatedCost.toLocaleString()} ج.م
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected summary bar */}
              {selectedProcedure && (
                <div
                  className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold border"
                  style={{
                    backgroundColor: `${selectedProcedure.color}15`,
                    borderColor: `${selectedProcedure.color}40`,
                    color: selectedProcedure.strokeColor,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: selectedProcedure.color }}
                  />
                  تم اختيار: {selectedProcedure.labelAr}
                  {isValidTooth && toothNum && (
                    <span className="ms-1 opacity-75">• سن #{toothNum}</span>
                  )}
                </div>
              )}
            </div>

            {/* ── 5. Time Slots ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                <Clock className="w-3.5 h-3.5" />
                اختر الوقت
              </label>
              <input 
                type="hidden" 
                name="time" 
                value={selectedTime ? parseArabicTime(selectedTime) : ""} 
              />

              {!selectedDate && (
                <p className="text-[11px] text-amber-500 font-medium mb-2">
                  اختر التاريخ أولًا لعرض الأوقات المتاحة.
                </p>
              )}

              {selectedDate && clinicHours.length > 0 && !isDayOpen(new Date(selectedDate), clinicHours) && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-3">
                  <p className="text-[12px] text-red-600 dark:text-red-400 font-medium text-center">
                    العيادة مغلقة في هذا اليوم ({getDayNameFromDate(new Date(selectedDate))})
                  </p>
                </div>
              )}

              {isLoadingSlots && (
                <p className="text-[11px] text-slate-500 font-medium mb-2">
                  جاري تحميل الأوقات المتاحة...
                </p>
              )}

              {!isLoadingSlots && selectedDate && availableTimeSlots.length === 0 && clinicHours.length > 0 && isDayOpen(new Date(selectedDate), clinicHours) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2">
                  لا توجد أوقات متاحة في هذا اليوم
                </p>
              )}

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {availableTimeSlots.map((slot) => {
                  const isSelected = selectedTime === slot;
                  const isDisabled = isPending || isLoadingSlots;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "py-2 px-1 rounded-lg text-[12px] font-bold transition-all border",
                        isSelected
                          ? "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25"
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-500 cursor-pointer",
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              {state.errors?.time && (
                <p className="text-[11px] text-red-400 font-medium mt-1.5">
                  {state.errors.time[0]}
                </p>
              )}

              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />{" "}
                  المختار
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />{" "}
                  متاح
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" />{" "}
                  محجوز
                </span>
              </div>
            </div>

            {/* ── 6. Notes ── */}
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                <FileText className="w-3.5 h-3.5" />
                ملاحظات (اختياري)
              </label>
              <textarea
                name="notes"
                rows={3}
                disabled={isPending}
                placeholder="ملاحظات إضافية..."
                className="w-full rounded-xl px-4 py-3 text-[13px] font-medium bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none placeholder:text-slate-400"
              />
            </div>

            {/* ── Error / Success feedback ── */}
            {selectedDate && clinicHours.length > 0 && !isDayOpen(new Date(selectedDate), clinicHours) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[12.5px] text-amber-600 dark:text-amber-400 text-center font-medium">
                  لا يمكن الحجز في يوم {getDayNameFromDate(new Date(selectedDate))} - العيادة مغلقة
                </p>
              </div>
            )}

            {state.errors?.form && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-[12.5px] text-red-400 text-center font-medium">
                  {state.errors.form[0]}
                </p>
              </div>
            )}
            {state.success && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-[13px] text-emerald-400 font-bold">
                  {state.message}
                </p>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || Boolean(selectedDate && clinicHours.length > 0 && !isDayOpen(new Date(selectedDate), clinicHours))}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-[14px] transition-all duration-200",
                  "flex items-center justify-center gap-2",
                  isPending || Boolean(selectedDate && clinicHours.length > 0 && !isDayOpen(new Date(selectedDate), clinicHours))
                    ? "bg-blue-500/30 text-blue-200 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
                )}
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحجز...
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4" />
                    تأكيد الحجز
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-6 py-3 rounded-xl font-bold text-[14px] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; }                             to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FormField — Reusable labelled input
// ═══════════════════════════════════════════════════════════════════════════════

interface FormFieldProps {
  label: string;
  name: string;
  icon: React.ReactNode;
  placeholder?: string;
  type?: string;
  dir?: string;
  error?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

function FormField({
  label,
  name,
  icon,
  placeholder,
  type = "text",
  dir,
  error,
  disabled,
  value,
  onChange,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </div>
        <input
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            "w-full rounded-xl px-4 py-3 pr-10 text-[13px] font-medium",
            "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
            "text-slate-700 dark:text-slate-300 outline-none",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all",
            "placeholder:text-slate-400",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/10",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
      </div>
      {error && (
        <p className="text-[11px] text-red-400 font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
