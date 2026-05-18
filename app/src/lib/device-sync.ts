import { getGunInstance, type GunNode } from './gun-instance';

const DEVICE_ID_KEY = 'harbormesh-device-id';
const DEVICE_NAME_KEY = 'harbormesh-device-name';
const SYNC_GROUP_KEY = 'harbormesh-sync-group';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) ?? `Device ${getDeviceId().slice(0, 6)}`;
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

export function getSyncGroupId(): string | null {
  return localStorage.getItem(SYNC_GROUP_KEY);
}

export function setSyncGroupId(groupId: string): void {
  localStorage.setItem(SYNC_GROUP_KEY, groupId);
}

export function createSyncGroup(vesselId: string): string {
  const groupId = `${vesselId}-${crypto.randomUUID().slice(0, 8)}`;
  setSyncGroupId(groupId);
  return groupId;
}

export function generatePairingUrl(groupId: string): string {
  return `${window.location.origin}?sync=${encodeURIComponent(groupId)}`;
}

export interface SyncableRecord {
  id: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface SyncStatus {
  connected: boolean;
  deviceCount: number;
  pendingChanges: number;
  lastSyncAt: string | null;
}

export class DeviceSyncManager {
  private gun: ReturnType<typeof getGunInstance>;
  private groupId: string;
  private deviceId: string;
  private syncNode: GunNode;
  private subscriptions: Map<string, GunNode> = new Map();
  private pendingWrites: Map<string, SyncableRecord> = new Map();
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private onRemoteChange?: (collection: string, records: SyncableRecord[]) => void;

  constructor(
    groupId: string,
    peers: string[] = [],
    onRemoteChange?: (collection: string, records: SyncableRecord[]) => void,
  ) {
    this.gun = getGunInstance(peers);
    this.groupId = groupId;
    this.deviceId = getDeviceId();
    this.syncNode = this.gun.get(`harbormesh/sync/${groupId}`);
    this.onRemoteChange = onRemoteChange;
  }

  announceDevice(): void {
    this.syncNode.get('devices').get(this.deviceId).put({
      id: this.deviceId,
      name: getDeviceName(),
      lastSeen: new Date().toISOString(),
    });
  }

  subscribeToCollection(collection: string): void {
    if (this.subscriptions.has(collection)) return;
    const collectionNode = this.syncNode.get(collection);
    this.subscriptions.set(collection, collectionNode);
    collectionNode.map().on((data: unknown, _key: string) => {
      if (!data || typeof data !== 'object') return;
      const record = data as SyncableRecord;
      if (!record.id || !record.updatedAt) return;
      this.onRemoteChange?.(collection, [record]);
    });
  }

  queueWrite(collection: string, record: SyncableRecord): void {
    this.pendingWrites.set(`${collection}/${record.id}`, record);

    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.flushWrites();
    }, 2000);
  }

  private flushWrites(): void {
    for (const [path, record] of this.pendingWrites) {
      const [collection] = path.split('/');
      this.syncNode.get(collection).get(record.id).put({
        ...record,
        _syncedBy: this.deviceId,
        _syncedAt: new Date().toISOString(),
      });
    }
    this.pendingWrites.clear();
  }

  getConnectedDevices(callback: (devices: Array<{ id: string; name: string; lastSeen: string }>) => void): void {
    const devices: Array<{ id: string; name: string; lastSeen: string }> = [];
    this.syncNode.get('devices').map().once((data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const d = data as { id?: string; name?: string; lastSeen?: string };
      if (d.id && d.lastSeen) {
        const age = Date.now() - new Date(d.lastSeen).getTime();
        if (age < 600_000) {
          devices.push({ id: d.id!, name: d.name ?? 'Unknown', lastSeen: d.lastSeen! });
        }
      }
    });
    setTimeout(() => callback(devices), 1000);
  }

  destroy(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.flushWrites();
    for (const node of this.subscriptions.values()) {
      try { node.off(); } catch { /* ignore */ }
    }
    this.subscriptions.clear();
  }
}

export function mergeByTimestamp<T extends SyncableRecord>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const record of local) merged.set(record.id, record);
  for (const record of remote) {
    const existing = merged.get(record.id);
    if (!existing || new Date(record.updatedAt) > new Date(existing.updatedAt)) {
      merged.set(record.id, record);
    }
  }
  return Array.from(merged.values());
}
