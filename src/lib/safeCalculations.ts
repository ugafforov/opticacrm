import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ 
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9
});

/**
 * Safely add two numbers with precise decimal arithmetic
 * Prevents floating-point errors in financial calculations
 */
export function safeAdd(a: number | string, b: number | string): number {
  try {
    const result = new Decimal(a || 0).plus(new Decimal(b || 0));
    return result.toNumber();
  } catch (error) {
    console.error('Safe add error:', error);
    return (Number(a) || 0) + (Number(b) || 0);
  }
}

/**
 * Safely subtract two numbers with precise decimal arithmetic
 */
export function safeSubtract(a: number | string, b: number | string): number {
  try {
    const result = new Decimal(a || 0).minus(new Decimal(b || 0));
    return result.toNumber();
  } catch (error) {
    console.error('Safe subtract error:', error);
    return (Number(a) || 0) - (Number(b) || 0);
  }
}

/**
 * Safely multiply two numbers with precise decimal arithmetic
 */
export function safeMultiply(a: number | string, b: number | string): number {
  try {
    const result = new Decimal(a || 0).times(new Decimal(b || 0));
    return result.toNumber();
  } catch (error) {
    console.error('Safe multiply error:', error);
    return (Number(a) || 0) * (Number(b) || 0);
  }
}

/**
 * Safely divide two numbers with precise decimal arithmetic
 * Returns 0 if divisor is 0
 */
export function safeDivide(a: number | string, b: number | string): number {
  try {
    const divisor = new Decimal(b || 0);
    if (divisor.isZero()) return 0;
    const result = new Decimal(a || 0).dividedBy(divisor);
    return result.toNumber();
  } catch (error) {
    console.error('Safe divide error:', error);
    const numB = Number(b) || 0;
    if (numB === 0) return 0;
    return (Number(a) || 0) / numB;
  }
}

/**
 * Safely calculate sum of an array of numbers
 * Critical for financial reports
 */
export function safeSum(values: (number | string | undefined | null)[]): number {
  try {
    const result = values.reduce<Decimal>((acc, val) => {
      const num = new Decimal(val ?? 0);
      return acc.plus(num);
    }, new Decimal(0));
    return result.toNumber();
  } catch (error) {
    console.error('Safe sum error:', error);
    let sum = 0;
    for (const val of values) {
      sum += Number(val) || 0;
    }
    return sum;
  }
}

/**
 * Parse price string to number safely
 * Handles formatted strings like "200 000"
 */
export function safeParsePriceToNumber(value: string | number | undefined | null): number {
  if (value === null || value === undefined) return 0;
  
  try {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    
    // Remove all non-numeric characters except decimal point and minus
    const cleaned = value.toString().replace(/[^\d.-]/g, '');
    if (!cleaned || cleaned === '-') return 0;
    
    const result = new Decimal(cleaned);
    return result.toNumber();
  } catch (error) {
    console.error('Parse price error:', error, value);
    return 0;
  }
}

/**
 * Validate that a number is within acceptable range for financial data
 */
export function isValidFinancialNumber(value: number): boolean {
  if (typeof value !== 'number') return false;
  if (isNaN(value) || !isFinite(value)) return false;
  // Max value: 1 trillion (reasonable limit for this application)
  if (Math.abs(value) > 1e12) return false;
  return true;
}

/**
 * Clamp a number to a valid financial range
 */
export function clampFinancialValue(value: number, min: number = 0, max: number = 1e12): number {
  if (!isValidFinancialNumber(value)) return 0;
  return Math.max(min, Math.min(max, value));
}
