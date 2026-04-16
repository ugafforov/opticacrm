import { useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ConnectionQuality = 'excellent' | 'good' | 'slow' | 'poor' | 'offline';

interface ConnectionState {
  quality: ConnectionQuality;
  latency: number | null;
  lastChecked: Date;
}

const PING_INTERVAL = 30000; // 30 seconds
const LATENCY_THRESHOLDS = {
  excellent: 150,
  good: 300,
  slow: 1000,
};

export function ConnectionIndicator() {
  const { t } = useLanguage();
  const [state, setState] = useState<ConnectionState>({
    quality: navigator.onLine ? 'good' : 'offline',
    latency: null,
    lastChecked: new Date(),
  });
  const [isHovered, setIsHovered] = useState(false);
  const pingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureLatency = useCallback(async (): Promise<number | null> => {
    if (!navigator.onLine) return null;
    
    const start = performance.now();
    try {
      // Simple ping to Supabase to measure latency
      await supabase.from('buyurtmalar').select('id').limit(1).maybeSingle();
      const end = performance.now();
      return Math.round(end - start);
    } catch {
      return null;
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setState({
        quality: 'offline',
        latency: null,
        lastChecked: new Date(),
      });
      return;
    }

    const latency = await measureLatency();
    
    let quality: ConnectionQuality = 'good';
    if (latency === null) {
      quality = 'poor';
    } else if (latency < LATENCY_THRESHOLDS.excellent) {
      quality = 'excellent';
    } else if (latency < LATENCY_THRESHOLDS.good) {
      quality = 'good';
    } else if (latency < LATENCY_THRESHOLDS.slow) {
      quality = 'slow';
    } else {
      quality = 'poor';
    }

    setState({
      quality,
      latency,
      lastChecked: new Date(),
    });
  }, [measureLatency]);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up periodic checking
    pingRef.current = setInterval(checkConnection, PING_INTERVAL);

    // Listen for online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      setState({
        quality: 'offline',
        latency: null,
        lastChecked: new Date(),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (pingRef.current) {
        clearInterval(pingRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  const getIcon = () => {
    switch (state.quality) {
      case 'offline':
        return WifiOff;
      case 'poor':
        return SignalLow;
      case 'slow':
        return SignalMedium;
      case 'good':
      case 'excellent':
        return Signal;
      default:
        return Wifi;
    }
  };

  const getColor = () => {
    switch (state.quality) {
      case 'offline':
      case 'poor':
        return 'text-destructive';
      case 'slow':
        return 'text-yellow-500';
      case 'good':
      case 'excellent':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBgColor = () => {
    switch (state.quality) {
      case 'offline':
      case 'poor':
        return 'bg-destructive/10 border-destructive/30';
      case 'slow':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'good':
      case 'excellent':
        return 'bg-green-500/10 border-green-500/30';
      default:
        return 'bg-muted border-border';
    }
  };

  const getLabel = () => {
    switch (state.quality) {
      case 'offline':
        return t('connection.offline');
      case 'poor':
        return t('connection.poor');
      case 'slow':
        return t('connection.slow');
      case 'good':
        return t('connection.good');
      case 'excellent':
        return t('connection.excellent');
      default:
        return t('connection.checking');
    }
  };

  const Icon = getIcon();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-sm transition-all duration-300 cursor-default select-none',
            getBgColor(),
            isHovered && 'shadow-lg scale-105'
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Icon 
            className={cn(
              'w-4 h-4 transition-all duration-300',
              getColor(),
              state.quality === 'offline' && 'animate-pulse'
            )} 
          />
          <span className={cn('text-xs font-medium', getColor())}>
            {isHovered && state.latency !== null ? `${state.latency}ms` : ''}
            {isHovered && state.latency === null && state.quality !== 'offline' ? '...' : ''}
          </span>
          {/* Pulsing dot for status */}
          <span 
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-300',
              state.quality === 'excellent' && 'bg-green-500',
              state.quality === 'good' && 'bg-green-400',
              state.quality === 'slow' && 'bg-yellow-500 animate-pulse',
              state.quality === 'poor' && 'bg-destructive animate-pulse',
              state.quality === 'offline' && 'bg-destructive animate-pulse'
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{getLabel()}</span>
          {state.latency !== null && (
            <span className="text-muted-foreground">
              {t('connection.latency')}: {state.latency}ms
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
