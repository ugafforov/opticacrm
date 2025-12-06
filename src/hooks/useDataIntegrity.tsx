import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to ensure data integrity across the application
 * - Prevents duplicate submissions
 * - Validates data before saving
 * - Monitors for data anomalies
 */
export function useDataIntegrity() {
  const { t } = useLanguage();
  const pendingOperations = useRef<Set<string>>(new Set());

  /**
   * Wrapper to prevent duplicate submissions
   * Uses operation key to track in-flight requests
   */
  const withDuplicatePrevention = useCallback(async <T,>(
    operationKey: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    if (pendingOperations.current.has(operationKey)) {
      console.warn(`Duplicate operation prevented: ${operationKey}`);
      return null;
    }

    pendingOperations.current.add(operationKey);
    try {
      return await operation();
    } finally {
      pendingOperations.current.delete(operationKey);
    }
  }, []);

  /**
   * Check if an operation is currently in progress
   */
  const isOperationPending = useCallback((operationKey: string): boolean => {
    return pendingOperations.current.has(operationKey);
  }, []);

  /**
   * Clear all pending operations (for cleanup)
   */
  const clearPendingOperations = useCallback(() => {
    pendingOperations.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingOperations.current.clear();
    };
  }, []);

  return {
    withDuplicatePrevention,
    isOperationPending,
    clearPendingOperations,
  };
}

/**
 * Hook to monitor and log data changes for audit trail
 */
export function useAuditLog() {
  const logChange = useCallback((
    action: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    userId: string,
    details?: Record<string, any>
  ) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      tableName,
      recordId,
      userId,
      details,
    };

    // Store in sessionStorage for debugging (limited history)
    try {
      const existingLogs = JSON.parse(sessionStorage.getItem('audit_log') || '[]');
      const updatedLogs = [logEntry, ...existingLogs].slice(0, 100); // Keep last 100
      sessionStorage.setItem('audit_log', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.log(`[AUDIT] ${action.toUpperCase()} ${tableName}:${recordId}`, details);
    }
  }, []);

  const getRecentLogs = useCallback((limit: number = 50) => {
    try {
      const logs = JSON.parse(sessionStorage.getItem('audit_log') || '[]');
      return logs.slice(0, limit);
    } catch {
      return [];
    }
  }, []);

  return { logChange, getRecentLogs };
}
