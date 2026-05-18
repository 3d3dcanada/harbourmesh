import { useEffect, useRef, useState, useCallback } from 'react';
import {
  DeviceSyncManager,
  getSyncGroupId,
  createSyncGroup,
  mergeByTimestamp,
  type SyncableRecord,
  type SyncStatus,
} from '@/lib/device-sync';
import { useVesselStore, useLogTaskStore } from '@/store';

export function useDeviceSync(enabled: boolean) {
  const currentVessel = useVesselStore((s) => s.currentVessel);
  const { spaces, items } = useVesselStore();
  const { logs, tasks } = useLogTaskStore();
  const managerRef = useRef<DeviceSyncManager | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    deviceCount: 0,
    pendingChanges: 0,
    lastSyncAt: null,
  });

  const handleRemoteChange = useCallback((collection: string, records: SyncableRecord[]) => {
    setSyncStatus((prev) => ({ ...prev, lastSyncAt: new Date().toISOString() }));

    switch (collection) {
      case 'spaces': {
        const current = useVesselStore.getState().spaces as unknown as SyncableRecord[];
        const merged = mergeByTimestamp(current, records);
        if (merged.length !== current.length || merged.some((m, i) => m.updatedAt !== current[i]?.updatedAt)) {
          for (const record of records) {
            const existing = current.find((s) => s.id === record.id);
            if (!existing || new Date(record.updatedAt) > new Date(existing.updatedAt)) {
              useVesselStore.getState().updateSpace(record.id, record as any);
            }
          }
        }
        break;
      }
      case 'items': {
        const current = useVesselStore.getState().items as unknown as SyncableRecord[];
        for (const record of records) {
          const existing = current.find((i) => i.id === record.id);
          if (!existing) {
            useVesselStore.getState().addItem(record as any);
          } else if (new Date(record.updatedAt) > new Date(existing.updatedAt)) {
            useVesselStore.getState().updateItem(record.id, record as any);
          }
        }
        break;
      }
      case 'logs': {
        const current = useLogTaskStore.getState().logs as unknown as SyncableRecord[];
        for (const record of records) {
          if (!current.find((l) => l.id === record.id)) {
            useLogTaskStore.getState().addLog(record as any);
          }
        }
        break;
      }
      case 'tasks': {
        const current = useLogTaskStore.getState().tasks as unknown as SyncableRecord[];
        for (const record of records) {
          const existing = current.find((t) => t.id === record.id);
          if (!existing) {
            useLogTaskStore.getState().addTask(record as any);
          } else if (new Date(record.updatedAt) > new Date(existing.updatedAt)) {
            useLogTaskStore.getState().updateTask(record.id, record as any);
          }
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !currentVessel) {
      managerRef.current?.destroy();
      managerRef.current = null;
      setSyncStatus({ connected: false, deviceCount: 0, pendingChanges: 0, lastSyncAt: null });
      return;
    }

    let groupId = getSyncGroupId();
    if (!groupId) {
      groupId = createSyncGroup(currentVessel.id);
    }

    const manager = new DeviceSyncManager(groupId, [], handleRemoteChange);
    managerRef.current = manager;
    manager.announceDevice();

    manager.subscribeToCollection('spaces');
    manager.subscribeToCollection('items');
    manager.subscribeToCollection('logs');
    manager.subscribeToCollection('tasks');

    setSyncStatus((prev) => ({ ...prev, connected: true }));

    const devicePoll = setInterval(() => {
      manager.getConnectedDevices((devices) => {
        setSyncStatus((prev) => ({ ...prev, deviceCount: devices.length }));
      });
    }, 30_000);

    manager.getConnectedDevices((devices) => {
      setSyncStatus((prev) => ({ ...prev, deviceCount: devices.length }));
    });

    return () => {
      clearInterval(devicePoll);
      manager.destroy();
      managerRef.current = null;
    };
  }, [enabled, currentVessel?.id, handleRemoteChange]);

  useEffect(() => {
    if (!managerRef.current || !currentVessel) return;
    for (const space of spaces.filter((s) => s.vesselId === currentVessel.id)) {
      managerRef.current.queueWrite('spaces', space as unknown as SyncableRecord);
    }
  }, [spaces, currentVessel?.id]);

  useEffect(() => {
    if (!managerRef.current || !currentVessel) return;
    for (const item of items.filter((i) => i.vesselId === currentVessel.id)) {
      managerRef.current.queueWrite('items', item as unknown as SyncableRecord);
    }
  }, [items, currentVessel?.id]);

  useEffect(() => {
    if (!managerRef.current || !currentVessel) return;
    for (const log of logs.filter((l) => l.vesselId === currentVessel.id)) {
      managerRef.current.queueWrite('logs', log as unknown as SyncableRecord);
    }
  }, [logs, currentVessel?.id]);

  useEffect(() => {
    if (!managerRef.current || !currentVessel) return;
    for (const task of tasks.filter((t) => t.vesselId === currentVessel.id)) {
      managerRef.current.queueWrite('tasks', task as unknown as SyncableRecord);
    }
  }, [tasks, currentVessel?.id]);

  return { syncStatus };
}
