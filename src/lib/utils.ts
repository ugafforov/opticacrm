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
 * Format date to Uzbek locale string (DD-MM-YYYY format)
 */
export function formatUzbekistanDate(date?: Date): string {
  const targetDate = date || getUzbekistanDate();
  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const year = targetDate.getFullYear();
  return `${day}-${month}-${year}`; // DD-MM-YYYY
}

/**
 * Convert ISO date string (yyyy-MM-dd) to display format (DD-MM-YYYY)
 * Also handles existing DD.MM.YYYY and DD-MM-YYYY formats
 */
export function formatDisplayDate(dateString: string): string {
  if (!dateString) return "-";
  
  // If already in DD-MM-YYYY format, return as is
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // If in DD.MM.YYYY format (old format), convert to DD-MM-YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
    return dateString.replace(/\./g, '-');
  }
  
  // If in ISO format yyyy-MM-dd, convert to DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const parts = dateString.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  return dateString;
}

/**
 * Get ISO string for Uzbekistan timezone
 */
export function getUzbekistanISOString(date?: Date): string {
  const targetDate = date || getUzbekistanDate();
  return targetDate.toLocaleString("sv-SE", { timeZone: UZ_TIMEZONE }).replace(" ", "T") + "Z";
}

/**
 * Format date and time to Uzbek locale string (dd.MM.yyyy HH:mm format)
 */
export function formatUzbekistanDateTime(date?: Date): string {
  const targetDate = date || getUzbekistanDate();
  return targetDate.toLocaleString("uz-UZ", { 
    timeZone: UZ_TIMEZONE,
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

/**
 * Format price with thousand separators (200000 → "200 000")
 */
export function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
  if (isNaN(num) || num === 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Parse formatted price string to number ("200 000" → 200000)
 */
export function parsePrice(formattedValue: string): number {
  return parseFloat(formattedValue.replace(/\s/g, '')) || 0;
}
