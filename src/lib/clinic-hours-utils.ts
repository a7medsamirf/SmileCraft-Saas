// =============================================================================
// SmileCraft CMS — Clinic Hours Utilities
// Helper functions for validating appointments against business hours
// =============================================================================

import { BusinessDay } from "@/features/settings/types";

// Day name mappings (JavaScript getDay() → our day names)
const DAY_INDEX_MAP = [
  "sunday",    // 0
  "monday",    // 1
  "tuesday",   // 2
  "wednesday", // 3
  "thursday",  // 4
  "friday",    // 5
  "saturday",  // 6
] as const;

/**
 * Get the day name from a Date object
 */
export function getDayNameFromDate(date: Date): string {
  return DAY_INDEX_MAP[date.getDay()];
}

/**
 * Check if a specific date is an open day based on clinic hours
 */
export function isDayOpen(date: Date, hours: BusinessDay[]): boolean {
  const dayName = getDayNameFromDate(date);
  const dayHours = hours.find((h) => h.day === dayName);
  return dayHours?.isOpen ?? false;
}

/**
 * Validate if a specific time (HH:MM) falls within clinic hours for a given date
 */
export function isTimeWithinHours(
  date: Date,
  time: string, // HH:MM format (24-hour)
  hours: BusinessDay[],
): boolean {
  const dayName = getDayNameFromDate(date);
  const dayHours = hours.find((h) => h.day === dayName);

  if (!dayHours || !dayHours.isOpen) return false;

  // Convert times to minutes for comparison
  const [startHour, startMin] = dayHours.start.split(":").map(Number);
  const [endHour, endMin] = dayHours.end.split(":").map(Number);
  const [timeHour, timeMin] = time.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const timeMinutes = timeHour * 60 + timeMin;

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Generate available time slots for a given date based on clinic hours and slot duration
 * Returns slots in 24-hour HH:MM format
 */
export function generateTimeSlots(
  date: Date,
  hours: BusinessDay[],
  slotDuration: number = 30, // minutes
  bookedSlots: string[] = [], // HH:MM format times that are already booked
): string[] {
  const dayName = getDayNameFromDate(date);
  const dayHours = hours.find((h) => h.day === dayName);

  if (!dayHours || !dayHours.isOpen) return [];

  const [startHour, startMin] = dayHours.start.split(":").map(Number);
  const [endHour, endMin] = dayHours.end.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const slots: string[] = [];
  let current = startMinutes;

  while (current + slotDuration <= endMinutes) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    // Only add if not already booked
    if (!bookedSlots.includes(timeString)) {
      slots.push(timeString);
    }

    current += slotDuration;
  }

  return slots;
}

/**
 * Format a time string from 24-hour HH:MM to Arabic 12-hour format
 * e.g., "09:00" → "09:00 ص", "14:30" → "02:30 م"
 */
export function formatTimeToArabic(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "م" : "ص";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Parse Arabic time format back to 24-hour HH:MM
 * e.g., "02:30 م" → "14:30"
 */
export function parseArabicTime(timeAr: string): string {
  const match = timeAr.match(/(\d{1,2}):(\d{2})\s*([صم])/);
  if (!match) return timeAr; // Return as-is if not Arabic format

  const [, hoursStr, minutes, period] = match;
  let hours = parseInt(hoursStr, 10);

  if (period === "م" && hours !== 12) hours += 12;
  if (period === "ص" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

/**
 * Get the next open day from a given date
 * Returns null if no open days in the next 30 days
 */
export function getNextOpenDay(fromDate: Date, hours: BusinessDay[]): Date | null {
  const date = new Date(fromDate);
  
  for (let i = 0; i < 30; i++) {
    if (isDayOpen(date, hours)) {
      return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  
  return null;
}

/**
 * Get minimum and maximum booking times for a given date
 * Returns null if the day is closed
 */
export function getBookingTimeRange(
  date: Date,
  hours: BusinessDay[],
): { start: string; end: string } | null {
  const dayName = getDayNameFromDate(date);
  const dayHours = hours.find((h) => h.day === dayName);

  if (!dayHours || !dayHours.isOpen) return null;

  return { start: dayHours.start, end: dayHours.end };
}
