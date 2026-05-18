import { LogEntryType, type GeoPosition, type LogEntry } from '@/types';

export type VoyageState = 'idle' | 'departing' | 'underway' | 'arriving';

export interface VoyageSnapshot {
  state: VoyageState;
  departurePosition: GeoPosition | null;
  departureTime: string | null;
  departureEngineHours: Record<string, number>;
  trackPoints: Array<{ lat: number; lon: number; sog: number; timestamp: string }>;
  maxSpeed: number;
  totalDistance: number;
}

const DEPART_SOG = 0.5;
const UNDERWAY_SOG = 2;
const ARRIVING_SOG = 1;
const IDLE_SOG = 0.3;

const DEPART_DURATION = 60_000;
const UNDERWAY_DURATION = 120_000;
const ARRIVING_DURATION = 120_000;
const IDLE_DURATION = 300_000;

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class VoyageTracker {
  private state: VoyageState = 'idle';
  private stateEnteredAt = 0;
  private snapshot: VoyageSnapshot = {
    state: 'idle',
    departurePosition: null,
    departureTime: null,
    departureEngineHours: {},
    trackPoints: [],
    maxSpeed: 0,
    totalDistance: 0,
  };
  private lastTrackTime = 0;
  private onVoyageComplete?: (log: Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;

  constructor(onComplete?: (log: Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'>) => void) {
    this.onVoyageComplete = onComplete;
  }

  getState(): VoyageState { return this.state; }
  getSnapshot(): VoyageSnapshot { return { ...this.snapshot, state: this.state }; }

  update(position: GeoPosition, engineHours: Record<string, number> = {}): void {
    const now = Date.now();
    const sog = position.sog ?? 0;
    const elapsed = now - this.stateEnteredAt;

    switch (this.state) {
      case 'idle':
        if (sog > DEPART_SOG && elapsed > DEPART_DURATION) {
          this.transition('departing', position, engineHours);
        }
        break;

      case 'departing':
        if (sog > UNDERWAY_SOG && elapsed > UNDERWAY_DURATION) {
          this.transition('underway', position, engineHours);
        } else if (sog < IDLE_SOG && elapsed > IDLE_DURATION) {
          this.transition('idle', position, engineHours);
        }
        break;

      case 'underway':
        if (now - this.lastTrackTime > 30_000) {
          this.addTrackPoint(position, sog);
          this.lastTrackTime = now;
        }
        if (sog > this.snapshot.maxSpeed) this.snapshot.maxSpeed = sog;
        if (sog < ARRIVING_SOG && elapsed > ARRIVING_DURATION) {
          this.transition('arriving', position, engineHours);
        }
        break;

      case 'arriving':
        if (sog > UNDERWAY_SOG) {
          this.transition('underway', position, engineHours);
        } else if (sog < IDLE_SOG && elapsed > IDLE_DURATION) {
          this.completeVoyage(position, engineHours);
          this.transition('idle', position, engineHours);
        }
        break;
    }
  }

  private transition(next: VoyageState, position: GeoPosition, engineHours: Record<string, number>): void {
    if (next === 'departing') {
      this.snapshot = {
        state: next,
        departurePosition: position,
        departureTime: new Date().toISOString(),
        departureEngineHours: { ...engineHours },
        trackPoints: [{ lat: position.latitude, lon: position.longitude, sog: position.sog ?? 0, timestamp: new Date().toISOString() }],
        maxSpeed: position.sog ?? 0,
        totalDistance: 0,
      };
    }
    this.state = next;
    this.snapshot.state = next;
    this.stateEnteredAt = Date.now();
  }

  private addTrackPoint(position: GeoPosition, sog: number): void {
    const pts = this.snapshot.trackPoints;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      this.snapshot.totalDistance += haversineNm(last.lat, last.lon, position.latitude, position.longitude);
    }
    pts.push({ lat: position.latitude, lon: position.longitude, sog, timestamp: new Date().toISOString() });
  }

  private completeVoyage(arrivalPosition: GeoPosition, arrivalEngineHours: Record<string, number>): void {
    if (!this.snapshot.departurePosition || !this.snapshot.departureTime) return;

    this.addTrackPoint(arrivalPosition, arrivalPosition.sog ?? 0);

    const departureTime = new Date(this.snapshot.departureTime);
    const arrivalTime = new Date();
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationHrs = durationMs / 3600000;
    const avgSpeed = durationHrs > 0 ? this.snapshot.totalDistance / durationHrs : 0;

    const engineHoursDelta: Record<string, number> = {};
    for (const [id, hours] of Object.entries(arrivalEngineHours)) {
      const startHours = this.snapshot.departureEngineHours[id] ?? hours;
      engineHoursDelta[id] = hours - startHours;
    }

    const durationStr = durationHrs < 1
      ? `${Math.round(durationMs / 60000)}min`
      : `${Math.floor(durationHrs)}h ${Math.round((durationHrs % 1) * 60)}m`;

    const log: Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      vesselId: '',
      type: LogEntryType.VOYAGE,
      timestamp: this.snapshot.departureTime,
      position: this.snapshot.departurePosition,
      summary: `Voyage: ${this.snapshot.totalDistance.toFixed(1)} nm in ${durationStr}`,
      details: [
        `Distance: ${this.snapshot.totalDistance.toFixed(1)} nm`,
        `Duration: ${durationStr}`,
        `Avg speed: ${avgSpeed.toFixed(1)} kn`,
        `Max speed: ${this.snapshot.maxSpeed.toFixed(1)} kn`,
        `Track points: ${this.snapshot.trackPoints.length}`,
        Object.keys(engineHoursDelta).length > 0
          ? `Engine hours: ${Object.entries(engineHoursDelta).map(([id, h]) => `${id}: +${h.toFixed(1)}`).join(', ')}`
          : '',
      ].filter(Boolean).join('\n'),
      engineHours: Object.keys(engineHoursDelta).length > 0 ? arrivalEngineHours : undefined,
      createdBy: 'voyage-tracker',
      createdByName: 'Auto Logbook',
    };

    this.onVoyageComplete?.(log);
  }

  reset(): void {
    this.state = 'idle';
    this.stateEnteredAt = Date.now();
    this.snapshot = {
      state: 'idle',
      departurePosition: null,
      departureTime: null,
      departureEngineHours: {},
      trackPoints: [],
      maxSpeed: 0,
      totalDistance: 0,
    };
  }
}
