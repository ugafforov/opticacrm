/**
 * Retry utility for handling transient failures
 * Critical for production reliability
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (!error) return false;
    
    // Network errors
    if (error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to fetch')) {
      return true;
    }
    
    // HTTP 5xx errors (server errors)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Rate limiting
    if (error.status === 429) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 429)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    return true;
  }
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt >= opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelay
      );
      
      console.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Execute a Supabase operation with retry logic
 */
export async function withSupabaseRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const result = await withRetry(async () => {
    const { data, error } = await operation();
    if (error) {
      // Create an error object with status for retry logic
      const enhancedError = new Error(error.message || 'Database operation failed');
      (enhancedError as any).status = error.code === 'PGRST301' ? 401 : 
                                       error.code === '23505' ? 409 : 500;
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
    return data;
  });
  
  return result as T;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Wait for the browser to come back online
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve();
      return;
    }
    
    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };
    
    window.addEventListener('online', handler);
  });
}
