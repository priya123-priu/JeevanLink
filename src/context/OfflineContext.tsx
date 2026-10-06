import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { OfflineQueuedAlert } from '../types/alert';
import { offlineQueue } from '../services/offlineQueue';
import { sosAlertService } from '../services/sosAlertService';
import { useAuth } from './AuthContext';

interface OfflineContextType {
  isOnline: boolean;
  queuedAlerts: OfflineQueuedAlert[];
  isSyncing: boolean;
  syncMessage: string | null;
  refreshQueue: () => Promise<void>;
  syncNow: (confirmRealConsent?: boolean) => Promise<{ synced: number; failed: number }>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedAlerts, setQueuedAlerts] = useState<OfflineQueuedAlert[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshQueue = useCallback(async () => {
    const list = await offlineQueue.getAll();
    setQueuedAlerts(list);
  }, []);

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage('Network connectivity restored. Checking queued alerts...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('Device is currently offline. Alerts will be securely queued in local storage.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshQueue]);

  const syncNow = async (confirmRealConsent: boolean = false) => {
    if (!navigator.onLine) {
      setSyncMessage('Cannot synchronize: device is still offline.');
      return { synced: 0, failed: 0 };
    }

    if (!user) {
      setSyncMessage('Authentication required to synchronize queued alerts with cloud backend.');
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    setSyncMessage('Synchronizing offline queue with backend...');

    const items = await offlineQueue.getAll();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      // If it is real mode and confirmation not granted, hold it pending
      if (item.payload.mode === 'real' && !confirmRealConsent) {
        setSyncMessage('Real SMS queued item requires user confirmation before dispatching.');
        continue;
      }

      try {
        const result = await sosAlertService.dispatchAlert(user.id, item.payload);
        if (result.success && !result.offlineQueued) {
          await offlineQueue.remove(item.clientRequestId);
          synced++;
        } else {
          failed++;
        }
      } catch (err: any) {
        console.error('Failed to sync item:', item.clientRequestId, err);
        failed++;
      }
    }

    await refreshQueue();
    setIsSyncing(false);
    setSyncMessage(
      synced > 0
        ? `Successfully synchronized ${synced} queued alert(s).`
        : failed > 0
        ? `Failed to synchronize ${failed} alert(s). Will retry upon next reconnection.`
        : 'All alerts are synchronized.'
    );

    return { synced, failed };
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queuedAlerts,
        isSyncing,
        syncMessage,
        refreshQueue,
        syncNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
