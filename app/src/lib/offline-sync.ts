const DB_NAME = 'harbormesh-offline-queue';
const STORE_NAME = 'pending-requests';
const DB_VERSION = 1;

export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  createdAt: string;
  attempts: number;
  lastAttempt: string | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueRequest(url: string, method: string, body: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const entry: PendingRequest = {
    id: crypto.randomUUID(),
    url,
    method,
    body: JSON.stringify(body),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastAttempt: null,
  };
  store.put(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingRequest(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updatePendingRequest(id: string, updates: Partial<PendingRequest>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const getReq = store.get(id);
  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...updates });
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function replayPendingRequests(): Promise<{ success: number; failed: number }> {
  const pending = await getPendingRequests();
  let success = 0;
  let failed = 0;

  for (const req of pending) {
    if (req.attempts >= 5) {
      await removePendingRequest(req.id);
      failed++;
      continue;
    }

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.body,
      });

      if (response.ok) {
        await removePendingRequest(req.id);
        success++;
      } else {
        await updatePendingRequest(req.id, {
          attempts: req.attempts + 1,
          lastAttempt: new Date().toISOString(),
        });
        failed++;
      }
    } catch {
      await updatePendingRequest(req.id, {
        attempts: req.attempts + 1,
        lastAttempt: new Date().toISOString(),
      });
      failed++;
    }
  }

  return { success, failed };
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingRequests();
  return pending.length;
}
