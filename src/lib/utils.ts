import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Uzbekistan timezone utilities (Asia/Tashkent, UTC+5)
const UZ_TIMEZONE = "Asia/Tashkent";

/**
 * Get current date/time in Uzbekistan timezone
 */
export function getUzbekistanDate(): Date {
  // Create a date string in Uzbekistan timezone and parse it
  const now = new Date();
  const uzDateString = now.toLocaleString("en-US", { timeZone: UZ_TIMEZONE });
  return new Date(uzDateString);
}

/**
 * Format date to Uzbek locale string (dd.MM.yyyy format)
 */
export function formatUzbekistanDate(date?: Date): string {
  const targetDate = date || getUzbekistanDate();
  return targetDate.toLocaleDateString("uz-UZ", { timeZone: UZ_TIMEZONE });
}

/**
 * Get ISO string for Uzbekistan timezone
 */
export function getUzbekistanISOString(date?: Date): string {
  const targetDate = date || getUzbekistanDate();
  return targetDate.toLocaleString("sv-SE", { timeZone: UZ_TIMEZONE }).replace(" ", "T") + "Z";
}
