import { useState, useEffect, useCallback } from 'react';
import { networkMonitor, offlineStorage, offlineFetch } from '@/lib/offline-storage';
import { useToast } from '@/hooks/use-toast';

interface UseOfflineOptions {
  enableSync?: boolean;
  showToasts?: boolean;
}

export function useOffline(options: UseOfflineOptions = {}) {
  const { enableSync = true, showToasts = true } = options;
  const [isOnline, setIsOnline] = useState(networkMonitor.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().catch(console.error);

    // Monitor network status
    const unsubscribe = networkMonitor.addListener((online) => {
      setIsOnline(online);
      
      if (showToasts) {
        if (online) {
          toast({
            title: 'Back Online',
            description: enableSync ? 'Syncing offline data...' : 'Connection restored',
            duration: 3000,
          });
          
          if (enableSync) {
            syncOfflineData();
          }
        } else {
          toast({
            title: 'Working Offline',
            description: 'Your changes will be saved and synced when online',
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enableSync, showToasts]);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      // Sync queued requests
      const requests = await offlineStorage.getQueuedRequests();
      let successCount = 0;
      
      for (const request of requests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });
          
          if (response.ok) {
            await offlineStorage.removeQueuedRequest(request.id!);
            successCount++;
          }
        } catch (error) {
          console.error('Failed to sync request:', error);
        }
      }
      
      // Sync time entries
      const timeEntries = await offlineStorage.getUnsyncedTimeEntries();
      for (const entry of timeEntries) {
        try {
          const response = await fetch('/api/time/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
          
          if (response.ok) {
            await offlineStorage.markTimeEntrySynced(entry.id);
            successCount++;
          }
        } catch (error) {
          console.error('Failed to sync time entry:', error);
        }
      }
      
      if (showToasts && successCount > 0) {
        toast({
          title: 'Sync Complete',
          description: `${successCount} offline changes synced successfully`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (showToasts) {
        toast({
          title: 'Sync Failed',
          description: 'Some offline data could not be synced',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, showToasts]);

  const saveOffline = useCallback(async (key: string, data: any) => {
    await offlineStorage.cacheData(key, data);
  }, []);

  const loadOffline = useCallback(async (key: string) => {
    return await offlineStorage.getCachedData(key);
  }, []);

  return {
    isOnline,
    isSyncing,
    syncOfflineData,
    saveOffline,
    loadOffline,
    offlineFetch,
  };
}

// Hook for offline-first forms
export function useOfflineForm<T>(formKey: string) {
  const { saveOffline, loadOffline, isOnline } = useOffline();
  const [isDirty, setIsDirty] = useState(false);

  const saveForm = useCallback(async (data: T) => {
    await saveOffline(formKey, data);
    setIsDirty(false);
  }, [formKey, saveOffline]);

  const loadForm = useCallback(async (): Promise<T | null> => {
    const data = await loadOffline(formKey);
    return data;
  }, [formKey, loadOffline]);

  const clearForm = useCallback(async () => {
    await saveOffline(formKey, null);
    setIsDirty(false);
  }, [formKey, saveOffline]);

  return {
    saveForm,
    loadForm,
    clearForm,
    isDirty,
    setIsDirty,
    isOnline,
  };
}