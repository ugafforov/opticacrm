/**
 * Centralized logging utility that only logs in development mode.
 * In production, sensitive error details are hidden from the browser console.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log error messages - only visible in development mode
   */
  error: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    }
    // In production, errors could be sent to a server-side logging service
    // logErrorToServer(message, args);
  },

  /**
   * Log warning messages - only visible in development mode
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log info messages - only visible in development mode
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log debug messages - only visible in development mode
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};

export default logger;
