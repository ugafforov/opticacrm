import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook to monitor network connectivity status
 * Shows toast notifications when connection is lost/restored
 */
export function useNetworkStatus(): NetworkStatus {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      toast.success(t('network.restored') || 'Internet aloqa tiklandi', {
        duration: 3000,
        id: 'network-status',
      });
    }
    setWasOffline(false);
  }, [wasOffline, t]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    toast.error(t('network.lost') || 'Internet aloqa yo\'q', {
      duration: Infinity,
      id: 'network-status',
      description: t('network.checkConnection') || 'Internetga ulanishni tekshiring',
    });
  }, [t]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}

/**
 * Hook to ensure operations only run when online
 */
export function useOnlineGuard() {
  const { t } = useLanguage();
  const { isOnline } = useNetworkStatus();

  const guardOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    offlineMessage?: string
  ): Promise<T | null> => {
    if (!isOnline) {
      toast.error(offlineMessage || t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
      return null;
    }
    return operation();
  }, [isOnline, t]);

  return { isOnline, guardOperation };
}
