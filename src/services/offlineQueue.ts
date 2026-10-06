import type { OfflineQueuedAlert, SendEmergencyAlertPayload } from '../types/alert';

const DB_NAME = 'jeevanlink_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'sos_offline_queue';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientRequestId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineQueue = {
  async enqueue(payload: SendEmergencyAlertPayload): Promise<OfflineQueuedAlert> {
    const item: OfflineQueuedAlert = {
      clientRequestId: payload.clientRequestId,
      payload,
      queuedAt: new Date().toISOString(),
      status: 'offline_pending',
      retryAttempts: 0,
    };

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return item;
    } catch {
      // Fallback to localStorage if IndexedDB fails
      const current = this.getLocalStorageQueue();
      const filtered = current.filter((x) => x.clientRequestId !== item.clientRequestId);
      filtered.push(item);
      localStorage.setItem(STORE_NAME, JSON.stringify(filtered));
      return item;
    }
  },

  async getAll(): Promise<OfflineQueuedAlert[]> {
    try {
      const db = await openDatabase();
      return await new Promise<OfflineQueuedAlert[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getLocalStorageQueue();
    }
  },

  async remove(clientRequestId: string): Promise<void> {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(clientRequestId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const current = this.getLocalStorageQueue();
      const filtered = current.filter((x) => x.clientRequestId !== clientRequestId);
      localStorage.setItem(STORE_NAME, JSON.stringify(filtered));
    }
  },

  async getCount(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  },

  getLocalStorageQueue(): OfflineQueuedAlert[] {
    const raw = localStorage.getItem(STORE_NAME);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },
};
