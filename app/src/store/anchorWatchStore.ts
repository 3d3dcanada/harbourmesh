import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AnchorPosition {
  latitude: number;
  longitude: number;
  depth?: number;
}

export type AnchorAlarmState = 'normal' | 'warn' | 'alarm' | 'emergency';

export interface AnchorTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  distanceFromAnchor: number;
}

export interface AnchorWatchConfig {
  alarmState: AnchorAlarmState;
  warningPercentage: number;
  delaySeconds: number;
  fudgeMeters: number;
  bowHeightMeters: number;
  noPositionAlarmSeconds: number;
}

interface AnchorWatchStore {
  active: boolean;
  anchorPosition: AnchorPosition | null;
  maxRadius: number | null;
  currentRadius: number | null;
  rodeLength: number | null;
  currentAlarm: AnchorAlarmState;
  alarmMessage: string | null;
  track: AnchorTrackPoint[];
  config: AnchorWatchConfig;
  lastPositionTime: string | null;
  delayStartTime: number | null;

  dropAnchor: (position: AnchorPosition) => void;
  raiseAnchor: () => void;
  setMaxRadius: (radius: number) => void;
  setRadiusFromPosition: (vesselLat: number, vesselLon: number) => void;
  setRodeLength: (rode: number) => void;
  checkPosition: (vesselLat: number, vesselLon: number) => AnchorAlarmState;
  updateConfig: (updates: Partial<AnchorWatchConfig>) => void;
  clearAlarm: () => void;
  addTrackPoint: (lat: number, lon: number) => void;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcRodeLength(
  horizontalDistance: number,
  depth: number,
  bowHeight: number,
): number {
  const verticalDist = depth + bowHeight;
  return Math.sqrt(horizontalDistance * horizontalDistance + verticalDist * verticalDist);
}

const DEFAULT_CONFIG: AnchorWatchConfig = {
  alarmState: 'emergency',
  warningPercentage: 80,
  delaySeconds: 0,
  fudgeMeters: 5,
  bowHeightMeters: 0,
  noPositionAlarmSeconds: 30,
};

export const useAnchorWatchStore = create<AnchorWatchStore>()(
  persist(
    (set, get) => ({
      active: false,
      anchorPosition: null,
      maxRadius: null,
      currentRadius: null,
      rodeLength: null,
      currentAlarm: 'normal',
      alarmMessage: null,
      track: [],
      config: DEFAULT_CONFIG,
      lastPositionTime: null,
      delayStartTime: null,

      dropAnchor: (position) => set({
        active: true,
        anchorPosition: position,
        currentAlarm: 'normal',
        alarmMessage: null,
        track: [],
        lastPositionTime: new Date().toISOString(),
        delayStartTime: null,
      }),

      raiseAnchor: () => set({
        active: false,
        anchorPosition: null,
        maxRadius: null,
        currentRadius: null,
        rodeLength: null,
        currentAlarm: 'normal',
        alarmMessage: null,
        track: [],
        delayStartTime: null,
      }),

      setMaxRadius: (radius) => {
        const { config } = get();
        set({ maxRadius: radius + config.fudgeMeters });
      },

      setRadiusFromPosition: (vesselLat, vesselLon) => {
        const { anchorPosition, config } = get();
        if (!anchorPosition) return;
        const dist = haversineDistance(
          anchorPosition.latitude, anchorPosition.longitude,
          vesselLat, vesselLon,
        );
        const radius = dist + config.fudgeMeters;
        const rode = anchorPosition.depth
          ? calcRodeLength(dist, anchorPosition.depth, config.bowHeightMeters)
          : undefined;
        set({ maxRadius: radius, rodeLength: rode ?? get().rodeLength });
      },

      setRodeLength: (rode) => {
        const { anchorPosition, config } = get();
        if (!anchorPosition) return;
        const depth = anchorPosition.depth ?? 0;
        const verticalDist = depth + config.bowHeightMeters;
        const horizontalMax = Math.sqrt(Math.abs(rode * rode - verticalDist * verticalDist));
        set({
          rodeLength: rode,
          maxRadius: horizontalMax + config.fudgeMeters,
        });
      },

      checkPosition: (vesselLat, vesselLon) => {
        const state = get();
        if (!state.active || !state.anchorPosition) return 'normal';

        const dist = haversineDistance(
          state.anchorPosition.latitude, state.anchorPosition.longitude,
          vesselLat, vesselLon,
        );

        const now = Date.now();
        const radius = state.maxRadius;

        set({ currentRadius: dist, lastPositionTime: new Date().toISOString() });

        if (radius === null) return 'normal';

        const warningDist = state.config.warningPercentage > 0
          ? (state.config.warningPercentage / 100) * radius
          : 0;

        let alarm: AnchorAlarmState = 'normal';
        let message: string | null = null;

        if (dist > radius) {
          alarm = state.config.alarmState;
          message = `Anchor drag detected: ${dist.toFixed(1)}m from anchor (limit: ${radius.toFixed(1)}m)`;
        } else if (warningDist > 0 && dist > warningDist) {
          alarm = 'warn';
          message = `Approaching anchor radius: ${dist.toFixed(1)}m of ${radius.toFixed(1)}m`;
        }

        if (alarm !== 'normal' && state.config.delaySeconds > 0) {
          const delayStart = state.delayStartTime;
          if (!delayStart) {
            set({ delayStartTime: now });
            return 'normal';
          }
          if ((now - delayStart) / 1000 < state.config.delaySeconds) {
            return 'normal';
          }
        } else if (alarm === 'normal' && state.delayStartTime) {
          set({ delayStartTime: null });
        }

        set({ currentAlarm: alarm, alarmMessage: message });
        return alarm;
      },

      updateConfig: (updates) =>
        set((state) => ({ config: { ...state.config, ...updates } })),

      clearAlarm: () => set({ currentAlarm: 'normal', alarmMessage: null, delayStartTime: null }),

      addTrackPoint: (lat, lon) => {
        const state = get();
        if (!state.anchorPosition) return;
        const dist = haversineDistance(
          state.anchorPosition.latitude, state.anchorPosition.longitude,
          lat, lon,
        );
        const point: AnchorTrackPoint = {
          latitude: lat,
          longitude: lon,
          timestamp: new Date().toISOString(),
          distanceFromAnchor: dist,
        };
        set((prev) => ({
          track: [...prev.track, point].slice(-1440),
          currentRadius: dist,
        }));
      },
    }),
    {
      name: 'harbormesh-anchor-watch',
      partialize: (state) => ({
        active: state.active,
        anchorPosition: state.anchorPosition,
        maxRadius: state.maxRadius,
        rodeLength: state.rodeLength,
        config: state.config,
      }),
    }
  )
);
