import { create } from 'zustand';
import type { GeoPosition } from '@/types';

export interface MeshVessel {
  vesselId: string;
  name: string;
  position: GeoPosition | null;
  windSpeed: number | null; // in knots
  windDirection: number | null; // in degrees
  lastUpdate: string;
}

export interface RelayStatus {
  url: string;
  connected: boolean;
  lastSeen?: string;
}

interface MeshStore {
  meshVessels: Record<string, MeshVessel>;
  isConnected: boolean;
  relayStatuses: RelayStatus[];
  communityDataSyncActive: boolean;

  // Actions
  setConnectionState: (isConnected: boolean) => void;
  upsertVessel: (vesselId: string, updates: Partial<MeshVessel>) => void;
  removeStaleVessels: (maxAgeMs: number) => void;
  setRelayStatus: (statuses: RelayStatus[]) => void;
  setCommunityDataSyncActive: (active: boolean) => void;
}

export const useMeshStore = create<MeshStore>()((set) => ({
  meshVessels: {},
  isConnected: false,
  relayStatuses: [],
  communityDataSyncActive: false,

  setConnectionState: (isConnected) => set({ isConnected }),

  upsertVessel: (vesselId, updates) =>
    set((state) => {
      const existing = state.meshVessels[vesselId] || {
        vesselId,
        name: 'Unknown Vessel',
        position: null,
        windSpeed: null,
        windDirection: null,
        lastUpdate: new Date().toISOString(),
      };

      return {
        meshVessels: {
          ...state.meshVessels,
          [vesselId]: { ...existing, ...updates, lastUpdate: new Date().toISOString() },
        },
      };
    }),

  removeStaleVessels: (maxAgeMs) =>
    set((state) => {
      const now = Date.now();
      const updatedVessels = { ...state.meshVessels };
      let changed = false;

      Object.keys(updatedVessels).forEach((vesselId) => {
        const lastUpdateMs = new Date(updatedVessels[vesselId].lastUpdate).getTime();
        if (now - lastUpdateMs > maxAgeMs) {
          delete updatedVessels[vesselId];
          changed = true;
        }
      });

      return changed ? { meshVessels: updatedVessels } : state;
    }),

  setRelayStatus: (statuses) => set({ relayStatuses: statuses }),
  setCommunityDataSyncActive: (active) => set({ communityDataSyncActive: active }),
}));
