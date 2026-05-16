import { useTelemetryStore } from '@/store';
import { useMeshStore, type RelayStatus } from '@/store/meshStore';
import { useSettingsStore, useVesselStore } from '@/store';
import { getGunInstance, type GunInstance } from './gun-instance';

const TELEMETRY_PATH = 'mesh/telemetry';
const STALE_VESSEL_MS = 10 * 60 * 1000; // 10 minutes
const BROADCAST_THROTTLE_MS = 5_000;    // max 1 telemetry push per 5s

interface GunTelemetryNode {
  name: string;
  lat: number;
  lon: number;
  cog: number | null;
  sog: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  ts: number; // unix ms
}

class HarbourMeshP2P {
  private gun: GunInstance | null = null;
  private telemetryUnsubscribe: (() => void) | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private lastBroadcastMs = 0;
  private connectedPeerIds = new Set<string>();

  start() {
    const { boatNode } = useSettingsStore.getState();
    if (!boatNode.meshEnabled) return;

    this.gun = this.initGun();
    this.subscribeTelemetryOut();
    this.subscribeTelemetryIn();
    this.startStaleEviction();
  }

  stop() {
    this.gun?.off();
    this.gun = null;
    this.telemetryUnsubscribe?.();
    this.telemetryUnsubscribe = null;
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    useMeshStore.getState().setConnectionState(false);
    useMeshStore.getState().setRelayStatus([]);
  }

  getGun(): GunInstance | null {
    return this.gun;
  }

  private initGun(): GunInstance {
    const peers = this.resolveRelayPeers();
    const gun = getGunInstance(peers);

    gun.on('hi', (...args: unknown[]) => {
      const peer = args[0] as { id?: string; url?: string } | undefined;
      const id = peer?.id ?? peer?.url ?? 'unknown';
      this.connectedPeerIds.add(id);
      useMeshStore.getState().setConnectionState(true);
      useMeshStore.getState().setRelayStatus(this.buildRelayStatuses());
    });

    gun.on('bye', (...args: unknown[]) => {
      const peer = args[0] as { id?: string; url?: string } | undefined;
      const id = peer?.id ?? peer?.url ?? 'unknown';
      this.connectedPeerIds.delete(id);
      if (this.connectedPeerIds.size === 0) {
        useMeshStore.getState().setConnectionState(false);
      }
      useMeshStore.getState().setRelayStatus(this.buildRelayStatuses());
    });

    return gun;
  }

  private resolveRelayPeers(): string[] {
    const configured = useSettingsStore.getState().boatNode.meshRelayUrls ?? [];
    // Community-operated relay is optional — app works without it.
    // Users can add their own in Settings → Boat Node → Mesh Relay URLs.
    const defaults: string[] = [];
    return [...configured, ...defaults].filter(Boolean);
  }

  private buildRelayStatuses(): RelayStatus[] {
    const urls = useSettingsStore.getState().boatNode.meshRelayUrls ?? [];
    return urls.map((url) => ({
      url,
      connected: this.connectedPeerIds.size > 0,
      lastSeen: new Date().toISOString(),
    }));
  }

  private subscribeTelemetryOut() {
    this.telemetryUnsubscribe = useTelemetryStore.subscribe((state) => {
      const { boatNode } = useSettingsStore.getState();
      if (!boatNode.meshEnabled) return;
      if (boatNode.meshBroadcastMode === 'never') return;

      const now = Date.now();
      if (now - this.lastBroadcastMs < BROADCAST_THROTTLE_MS) return;
      this.lastBroadcastMs = now;

      const { latestPosition, latestEnvironment } = state;
      if (boatNode.meshBroadcastMode === 'active' && !latestPosition) return;

      const { currentVessel } = useVesselStore.getState();
      if (!currentVessel) return;

      const payload: GunTelemetryNode = {
        name: boatNode.deviceName || currentVessel.name,
        lat: latestPosition?.latitude ?? 0,
        lon: latestPosition?.longitude ?? 0,
        cog: latestPosition?.cog ?? null,
        sog: latestPosition?.sog ?? null,
        windSpeed: latestEnvironment?.windSpeed ?? null,
        windDirection: latestEnvironment?.windDirection ?? null,
        ts: now,
      };

      this.gun?.get(TELEMETRY_PATH).get(boatNode.deviceId).put(payload);
    });
  }

  private subscribeTelemetryIn() {
    const myDeviceId = useSettingsStore.getState().boatNode.deviceId;

    this.gun
      ?.get(TELEMETRY_PATH)
      .map()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any, vesselId: string) => {
        if (!data || typeof data !== 'object') return;
        if (vesselId === myDeviceId) return;

        const ts = data.ts as number | undefined;
        if (!ts || Date.now() - ts > STALE_VESSEL_MS) return;

        const lat = data.lat as number | undefined;
        const lon = data.lon as number | undefined;
        if (!lat || !lon) return;

        useMeshStore.getState().upsertVessel(vesselId, {
          name: (data.name as string) || 'Unknown Vessel',
          position: {
            latitude: lat,
            longitude: lon,
            cog: (data.cog as number | null) ?? undefined,
            sog: (data.sog as number | null) ?? undefined,
            source: 'manual',
            timestamp: new Date(ts).toISOString(),
          },
          windSpeed: (data.windSpeed as number | null) ?? null,
          windDirection: (data.windDirection as number | null) ?? null,
          lastUpdate: new Date(ts).toISOString(),
        });
      });
  }

  private startStaleEviction() {
    this.staleTimer = setInterval(() => {
      useMeshStore.getState().removeStaleVessels(STALE_VESSEL_MS);
    }, 60_000);
  }
}

export const meshSyncClient = new HarbourMeshP2P();
