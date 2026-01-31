import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface NetworkContextType {
  isOnline: boolean;
  wasOffline: boolean;
  guardOperation: <T>(operation: () => Promise<T>, offlineMessage?: string) => Promise<T | null>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
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

  const value = useMemo(() => ({
    isOnline,
    wasOffline,
    guardOperation,
  }), [isOnline, wasOffline, guardOperation]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetworkContext must be used within a NetworkProvider");
  }
  return context;
};
