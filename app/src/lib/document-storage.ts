const DB_NAME = 'harbormesh-documents';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeFile(documentId: string, file: File): Promise<{ size: number; type: string }> {
  const db = await openDB();
  const blob = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(
      { blob, name: file.name, type: file.type, size: file.size, storedAt: new Date().toISOString() },
      documentId,
    );
    tx.oncomplete = () => resolve({ size: file.size, type: file.type });
    tx.onerror = () => reject(tx.error);
  });
}

export async function retrieveFile(documentId: string): Promise<{ blob: Blob; name: string; type: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(documentId);
    req.onsuccess = () => {
      const result = req.result;
      if (!result) return resolve(null);
      const blob = new Blob([result.blob], { type: result.type });
      resolve({ blob, name: result.name, type: result.type });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(documentId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(documentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStorageUsage(): Promise<{ count: number; totalBytes: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result as Array<{ size: number }>;
      resolve({
        count: records.length,
        totalBytes: records.reduce((sum, r) => sum + (r.size || 0), 0),
      });
    };
    req.onerror = () => reject(req.error);
  });
}
