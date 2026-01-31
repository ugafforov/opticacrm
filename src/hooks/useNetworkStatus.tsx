import { useNetworkContext } from "@/contexts/NetworkContext";

/**
 * Hook wrapper for NetworkContext
 * All network state is cached in NetworkContext to prevent duplicate event listeners
 */
export function useNetworkStatus() {
  const { isOnline, wasOffline } = useNetworkContext();
  return { isOnline, wasOffline };
}

/**
 * Hook to ensure operations only run when online
 */
export function useOnlineGuard() {
  const { isOnline, guardOperation } = useNetworkContext();
  return { isOnline, guardOperation };
}
