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

/**
 * Format phone number with automatic spacing: +998 90 123 45 67
 * Limits input to 9 digits after +998
 */
export function formatPhoneNumber(value: string): string {
  // Remove everything except digits
  const digits = value.replace(/\D/g, "");
  
  // Remove leading 998 if present (we'll add it back)
  const cleaned = digits.startsWith("998") ? digits.slice(3) : digits;
  
  // Limit to 9 digits
  const limited = cleaned.slice(0, 9);
  
  // Add spacing: XX XXX XX XX
  let formatted = "+998 ";
  if (limited.length > 0) {
    formatted += limited.slice(0, 2);
  }
  if (limited.length > 2) {
    formatted += " " + limited.slice(2, 5);
  }
  if (limited.length > 5) {
    formatted += " " + limited.slice(5, 7);
  }
  if (limited.length > 7) {
    formatted += " " + limited.slice(7, 9);
  }
  
  return formatted;
}
