"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  locale?: string;
}

export function CalendarGrid({
  currentDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
  locale = "ar",
}: CalendarGridProps) {
  const isRtl = locale === "ar";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const prevMonthDays = Array.from(
      { length: startDay },
      (_, i) => prevMonthTotalDays - startDay + i + 1,
    );
    const currentMonthDays = Array.from(
      { length: daysInMonth },
      (_, i) => i + 1,
    );
    const remainingSlots = 42 - (prevMonthDays.length + currentMonthDays.length);
    const nextMonthDays = Array.from({ length: remainingSlots }, (_, i) => i + 1);

    return { prevMonthDays, currentMonthDays, nextMonthDays };
  }, [year, month]);

  const weekDays = isRtl
    ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const todayDate = new Date();
  const isToday = (day: number) =>
    todayDate.getDate() === day &&
    todayDate.getMonth() === month &&
    todayDate.getFullYear() === year;

  const isSelected = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  return (
    <div className="glass-card p-4 h-full flex flex-col min-h-[400px]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(currentDate)}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={isRtl ? handleNextMonth : handlePrevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          >
            <ChevronRight className={cn("h-4 w-4", !isRtl && "rotate-180")} />
          </button>
          <button
            type="button"
            onClick={isRtl ? handlePrevMonth : handleNextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          >
            <ChevronLeft className={cn("h-4 w-4", !isRtl && "rotate-180")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}

        {calendarDays.prevMonthDays.map((day) => (
          <div key={`prev-${day}`} className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-sm py-3 opacity-50 cursor-default">
            {day}
          </div>
        ))}

        {calendarDays.currentMonthDays.map((day) => {
          const selected = isSelected(day);
          const today = isToday(day);

          return (
            <button
              key={`curr-${day}`}
              type="button"
              onClick={() => onDateSelect(new Date(year, month, day))}
              className={cn(
                "h-full relative flex items-center justify-center text-sm py-3 rounded-xl transition-all duration-200 group",
                selected
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transform scale-105 z-10"
                  : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300",
              )}
            >
              <span className="relative z-10">{day}</span>
              {today && !selected && (
                <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              )}
              {!selected && (
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"></div>
              )}
            </button>
          );
        })}

        {calendarDays.nextMonthDays.map((day) => (
          <div key={`next-${day}`} className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-sm py-3 opacity-50 cursor-default">
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
