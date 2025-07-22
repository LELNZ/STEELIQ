// Offline synchronization service for PWA functionality
import { toast } from "@/hooks/use-toast";

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
}

export class OfflineSyncService {
  private dbName = 'LELSteelOfflineDB';
  private storeName = 'pendingOperations';
  private db: IDBDatabase | null = null;

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>) {
    if (!this.db) await this.initialize();

    const pendingOp: PendingOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.add(pendingOp);
      request.onsuccess = resolve;
      request.onerror = reject;
    });

    // Register for background sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-data');
        }
      } catch (error) {
        console.log('Background sync registration failed:', error);
      }
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.initialize();

    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
  }

  async removePendingOperation(id: string) {
    if (!this.db) await this.initialize();

    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = resolve;
      request.onerror = reject;
    });
  }

  async syncPendingOperations() {
    const operations = await this.getPendingOperations();
    let syncedCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        const response = await fetch(op.endpoint, {
          method: op.type === 'DELETE' ? 'DELETE' : op.type === 'UPDATE' ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(op.data)
        });

        if (response.ok) {
          await this.removePendingOperation(op.id);
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.error('Sync failed for operation:', op.id, error);
      }
    }

    if (syncedCount > 0) {
      toast({
        title: "Sync Complete",
        description: `${syncedCount} operations synced successfully`,
      });
    }

    if (failedCount > 0) {
      toast({
        title: "Sync Partial",
        description: `${failedCount} operations failed to sync`,
        variant: "destructive"
      });
    }

    return { syncedCount, failedCount };
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Setup online/offline listeners
  setupNetworkListeners() {
    window.addEventListener('online', async () => {
      toast({
        title: "Back Online",
        description: "Syncing pending operations...",
      });
      await this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      toast({
        title: "Offline Mode",
        description: "Changes will be saved locally and synced when online",
        variant: "destructive"
      });
    });
  }
}

// Create singleton instance
export const offlineSync = new OfflineSyncService();