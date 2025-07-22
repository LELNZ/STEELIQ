// Offline storage utilities for PWA functionality
const DB_NAME = 'LELSteelOffline';
const DB_VERSION = 1;

export interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
}

export interface OfflineData {
  store: string;
  data: any;
  timestamp: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline request queue
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create offline data cache
        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', { 
            keyPath: 'store' 
          });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create time entries store
        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeStore = db.createObjectStore('timeEntries', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          timeStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create inspection reports store
        if (!db.objectStoreNames.contains('inspectionReports')) {
          const inspectionStore = db.createObjectStore('inspectionReports', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          inspectionStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  // Queue an API request for later sync
  async queueRequest(request: OfflineRequest): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    
    await store.add({
      ...request,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  // Get all queued requests
  async getQueuedRequests(): Promise<OfflineRequest[]> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['offlineQueue'], 'readonly');
    const store = tx.objectStore('offlineQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove a queued request
  async removeQueuedRequest(id: number): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    
    await store.delete(id);
  }

  // Cache data for offline use
  async cacheData(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['offlineData'], 'readwrite');
    const store = tx.objectStore('offlineData');
    
    await store.put({
      store: storeName,
      data,
      timestamp: Date.now()
    });
  }

  // Get cached data
  async getCachedData(storeName: string): Promise<any> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['offlineData'], 'readonly');
    const store = tx.objectStore('offlineData');
    
    return new Promise((resolve, reject) => {
      const request = store.get(storeName);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save time entry for offline sync
  async saveTimeEntry(entry: any): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['timeEntries'], 'readwrite');
    const store = tx.objectStore('timeEntries');
    
    await store.add({
      ...entry,
      synced: false,
      timestamp: Date.now()
    });
  }

  // Get unsynced time entries
  async getUnsyncedTimeEntries(): Promise<any[]> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['timeEntries'], 'readonly');
    const store = tx.objectStore('timeEntries');
    const index = store.index('synced');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark time entry as synced
  async markTimeEntrySynced(id: number): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction(['timeEntries'], 'readwrite');
    const store = tx.objectStore('timeEntries');
    
    const entry = await new Promise<any>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (entry) {
      entry.synced = true;
      await store.put(entry);
    }
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Network status monitoring
export class NetworkMonitor {
  private listeners: Set<(online: boolean) => void> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
  }

  private updateStatus(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(listener => listener(online));
    
    if (online) {
      // Trigger background sync
      this.triggerSync();
    }
  }

  private async triggerSync() {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-data');
    }
  }

  getStatus(): boolean {
    return this.isOnline;
  }

  addListener(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const networkMonitor = new NetworkMonitor();

// Offline-aware fetch wrapper
export async function offlineFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (!networkMonitor.getStatus() && options.method !== 'GET') {
      // Queue non-GET requests for later
      await offlineStorage.queueRequest({
        url,
        method: options.method || 'GET',
        headers: options.headers as Record<string, string> || {},
        body: options.body as string || null,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      // Return a fake success response
      return new Response(
        JSON.stringify({ 
          queued: true, 
          message: 'Request queued for sync when online' 
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }
}