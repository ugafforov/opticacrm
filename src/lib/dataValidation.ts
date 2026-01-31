/**
 * Data validation utilities for ensuring data integrity
 * Critical for production reliability
 */

import { z } from 'zod';
import { logger } from './logger';

// Base schemas for common fields
const phoneSchema = z.string()
  .regex(/^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, 'Noto\'g\'ri telefon raqami formati')
  .optional()
  .or(z.literal(''))
  .or(z.literal('+998 '));

const dateSchema = z.string()
  .regex(/^\d{2}-\d{2}-\d{4}$/, 'Noto\'g\'ri sana formati (DD-MM-YYYY)')
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Noto\'g\'ri sana formati (YYYY-MM-DD)'));

const priceSchema = z.number()
  .min(0, 'Narx manfiy bo\'lishi mumkin emas')
  .max(1e12, 'Narx juda katta')
  .finite('Narx cheksiz bo\'lishi mumkin emas');

const clientNameSchema = z.string()
  .min(1, 'Mijoz ismi kiritilishi shart')
  .max(200, 'Mijoz ismi juda uzun');

const odOsSchema = z.string()
  .max(20, 'OD/OS qiymati juda uzun')
  .optional()
  .or(z.literal(''));

// Buyurtma (Order) validation
export const buyurtmaValidationSchema = z.object({
  mijoz: clientNameSchema,
  telefon: phoneSchema,
  od: odOsSchema,
  os: odOsSchema,
  oynaTuri: z.string().max(100),
  oynaNarxi: priceSchema,
  opravaTuri: z.string().max(100),
  opravaNarxi: priceSchema,
  sana: dateSchema,
});

// Tekshiruv (Examination) validation
export const tekshiruvValidationSchema = z.object({
  mijoz: clientNameSchema,
  refraksiyametriya: z.boolean(),
  tanometriya: z.boolean(),
  jamiSumma: priceSchema,
  sana: dateSchema,
});

// Linza sotuvi (Lens sale) validation
export const linzaSotuviValidationSchema = z.object({
  kliyent: clientNameSchema,
  linzaTuri: z.string().max(100),
  summa: priceSchema,
  sana: dateSchema,
});

// Tayyor ko'zoynak validation
export const tayyorKozoynakValidationSchema = z.object({
  kliyent: clientNameSchema,
  kozoynakTuri: z.string().max(100),
  summa: priceSchema,
  sana: dateSchema,
});

// Linza ro'yxati validation
export const linzaRoyxatiValidationSchema = z.object({
  mijoz: clientNameSchema,
  telefon: phoneSchema,
  od: odOsSchema,
  os: odOsSchema,
  linzaTuri: z.string().max(100),
  sana: dateSchema,
  tugilanYili: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
});

/**
 * Validate data before saving to database
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  throwOnError: boolean = false
): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(e => e.message);
  
  if (throwOnError) {
    throw new Error(errors.join(', '));
  }
  
  return { success: false, errors };
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Validate and clamp a number to safe range
 */
export function validateNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && isFinite(value)) {
    return Math.max(0, Math.min(1e12, value));
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/\s/g, ''));
    if (isFinite(parsed)) {
      return Math.max(0, Math.min(1e12, parsed));
    }
  }
  return defaultValue;
}

/**
 * Check if data is potentially corrupted
 */
export function isDataCorrupted(record: Record<string, any>): boolean {
  // Check for common signs of data corruption
  if (!record || typeof record !== 'object') return true;
  if (!record.id) return true;
  
  // Check for impossibly large numbers
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number') {
      if (!isFinite(value) || Math.abs(value) > 1e15) {
        logger.warn(`Potentially corrupted data detected in field ${key}:`, value);
        return true;
      }
    }
  }
  
  return false;
}
