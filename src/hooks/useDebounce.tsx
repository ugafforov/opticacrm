import { useCallback, useRef } from 'react';

/**
 * Custom debounce hook for optimizing expensive operations
 * Prevents rapid successive calls by delaying execution
 */
export function useDebounce() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounce = useCallback(<T extends (...args: any[]) => void>(
    fn: T,
    delay: number = 300
  ) => {
    return (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { debounce, cancel };
}

/**
 * Custom throttle hook for rate-limiting function calls
 * Ensures function is called at most once per specified interval
 */
export function useThrottle() {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttle = useCallback(<T extends (...args: any[]) => void>(
    fn: T,
    limit: number = 1000
  ) => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= limit) {
        lastCallRef.current = now;
        fn(...args);
      } else {
        // Schedule execution for when throttle period ends
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          fn(...args);
        }, limit - timeSinceLastCall);
      }
    };
  }, []);

  return { throttle };
}
