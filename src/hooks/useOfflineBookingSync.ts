import { useState, useEffect, useCallback } from 'react';
import {
  offlineBookingSyncService,
  OfflineBookingRecord,
  SyncResult,
} from '../services/offlineBookingSyncService';

export function useOfflineBookingSync() {
  const [isOnline, setIsOnline] = useState<boolean>(offlineBookingSyncService.isOnline());
  const [pendingQueue, setPendingQueue] = useState<OfflineBookingRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    // Subscribe to offlineBookingSyncService queue and connectivity updates
    const unsubscribe = offlineBookingSyncService.subscribe((queue, online) => {
      setPendingQueue(queue);
      setIsOnline(online);
    });

    const handleSyncFinished = (evt: any) => {
      if (evt.detail) {
        setLastSyncResult(evt.detail);
      }
      setIsSyncing(false);
    };

    window.addEventListener('hardinkaam:offline-sync-completed', handleSyncFinished);

    return () => {
      unsubscribe();
      window.removeEventListener('hardinkaam:offline-sync-completed', handleSyncFinished);
    };
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const res = await offlineBookingSyncService.syncAllPendingBookings();
      setLastSyncResult(res);
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const deletePending = useCallback(async (id: string): Promise<void> => {
    await offlineBookingSyncService.deletePendingBooking(id);
  }, []);

  return {
    isOnline,
    pendingQueue,
    isSyncing,
    lastSyncResult,
    syncNow,
    deletePending,
    hasPendingBookings: pendingQueue.length > 0,
  };
}
