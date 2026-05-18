import {
  TelemetryMessageType,
  type TelemetryMessage,
  type PositionPayload,
  type MotionPayload,
  type EnvironmentPayload,
  type HealthPayload,
} from '@/types';

const MPS_TO_KNOTS = 1.9438444924;

export interface PhoneSensorCapabilities {
  geolocation: boolean;
  deviceOrientation: boolean;
  deviceMotion: boolean;
  barometer: boolean;
  wakeLock: boolean;
  battery: boolean;
}

export interface PhoneSensorPermissions {
  geolocation: PermissionState | 'unknown';
  deviceOrientation: 'granted' | 'denied' | 'requires-gesture' | 'unknown';
  deviceMotion: 'granted' | 'denied' | 'requires-gesture' | 'unknown';
}

export interface PhoneSensorConfig {
  gpsIntervalMs: number;
  motionIntervalMs: number;
  orientationIntervalMs: number;
  barometerIntervalMs: number;
  enableWakeLock: boolean;
  highAccuracyGps: boolean;
}

export type PhoneSensorStatus = 'idle' | 'requesting-permissions' | 'active' | 'error' | 'partial';

export interface PhoneSensorState {
  status: PhoneSensorStatus;
  capabilities: PhoneSensorCapabilities;
  permissions: PhoneSensorPermissions;
  activeSensors: string[];
  errors: Record<string, string>;
  batteryLevel?: number;
  batteryCharging?: boolean;
  wakeLockActive: boolean;
}

export type PhoneSensorCallback = (messages: TelemetryMessage[]) => void;

const DEFAULT_CONFIG: PhoneSensorConfig = {
  gpsIntervalMs: 1000,
  motionIntervalMs: 100,
  orientationIntervalMs: 100,
  barometerIntervalMs: 2000,
  enableWakeLock: true,
  highAccuracyGps: true,
};

let idCounter = 0;
function nextId(): string {
  return `phone_${Date.now()}_${++idCounter}`;
}

export class PhoneSensorManager {
  private config: PhoneSensorConfig;
  private callback: PhoneSensorCallback;
  private vesselId: string;
  private deviceId: string;

  private geoWatchId: number | null = null;
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private barometerSensor: any = null;
  private wakeLock: WakeLockSentinel | null = null;
  private batteryRef: any = null;

  private lastOrientationEmit = 0;
  private lastMotionEmit = 0;
  private lastBarometerEmit = 0;

  private latestOrientation: { alpha: number; beta: number; gamma: number } | null = null;
  private latestMotionAccel: { x: number; y: number; z: number } | null = null;
  private latestMotionRotation: { x: number; y: number; z: number } | null = null;

  private _state: PhoneSensorState = {
    status: 'idle',
    capabilities: { geolocation: false, deviceOrientation: false, deviceMotion: false, barometer: false, wakeLock: false, battery: false },
    permissions: { geolocation: 'unknown', deviceOrientation: 'unknown', deviceMotion: 'unknown' },
    activeSensors: [],
    errors: {},
    wakeLockActive: false,
  };

  constructor(
    config: Partial<PhoneSensorConfig>,
    callback: PhoneSensorCallback,
    vesselId: string,
    deviceId: string,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callback = callback;
    this.vesselId = vesselId;
    this.deviceId = deviceId;
  }

  detectCapabilities(): PhoneSensorCapabilities {
    const caps: PhoneSensorCapabilities = {
      geolocation: 'geolocation' in navigator,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
      barometer: 'PressureSensor' in window,
      wakeLock: 'wakeLock' in navigator,
      battery: 'getBattery' in navigator,
    };
    this._state.capabilities = caps;
    return caps;
  }

  async requestPermissions(): Promise<PhoneSensorPermissions> {
    this._state.status = 'requesting-permissions';
    const perms = { ...this._state.permissions };

    if (this._state.capabilities.geolocation) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        perms.geolocation = result.state;
      } catch {
        perms.geolocation = 'unknown';
      }
    }

    const isIOS = typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (isIOS) {
      perms.deviceOrientation = 'requires-gesture';
      perms.deviceMotion = 'requires-gesture';
    } else {
      perms.deviceOrientation = this._state.capabilities.deviceOrientation ? 'granted' : 'denied';
      perms.deviceMotion = this._state.capabilities.deviceMotion ? 'granted' : 'denied';
    }

    this._state.permissions = perms;
    return perms;
  }

  async requestIOSPermissions(): Promise<{ orientation: string; motion: string }> {
    let orientation = 'denied';
    let motion = 'denied';

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        orientation = await (DeviceOrientationEvent as any).requestPermission();
        this._state.permissions.deviceOrientation = orientation === 'granted' ? 'granted' : 'denied';
      } catch {
        this._state.permissions.deviceOrientation = 'denied';
      }
    }

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        motion = await (DeviceMotionEvent as any).requestPermission();
        this._state.permissions.deviceMotion = motion === 'granted' ? 'granted' : 'denied';
      } catch {
        this._state.permissions.deviceMotion = 'denied';
      }
    }

    return { orientation, motion };
  }

  async start(): Promise<void> {
    this.detectCapabilities();
    this._state.activeSensors = [];
    this._state.errors = {};

    this.startGeolocation();
    this.startDeviceOrientation();
    this.startDeviceMotion();
    this.startBarometer();

    if (this.config.enableWakeLock) {
      await this.acquireWakeLock();
    }

    this.monitorBattery();

    this._state.status = this._state.activeSensors.length > 0 ? 'active' : 'error';
    if (this._state.activeSensors.length > 0 && Object.keys(this._state.errors).length > 0) {
      this._state.status = 'partial';
    }
  }

  stop(): void {
    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }

    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }

    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }

    if (this.barometerSensor) {
      try { this.barometerSensor.stop(); } catch { /* ignore */ }
      this.barometerSensor = null;
    }

    this.releaseWakeLock();

    this._state.status = 'idle';
    this._state.activeSensors = [];
  }

  getState(): PhoneSensorState {
    return { ...this._state };
  }

  private startGeolocation(): void {
    if (!this._state.capabilities.geolocation) {
      this._state.errors.geolocation = 'Geolocation API not available';
      return;
    }

    try {
      this.geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const msg = this.geoToPositionMessage(position);
          this.callback([msg]);
        },
        (error) => {
          this._state.errors.geolocation = error.message;
        },
        {
          enableHighAccuracy: this.config.highAccuracyGps,
          timeout: 10000,
          maximumAge: this.config.gpsIntervalMs,
        },
      );
      this._state.activeSensors.push('geolocation');
    } catch (err) {
      this._state.errors.geolocation = err instanceof Error ? err.message : 'Failed to start GPS';
    }
  }

  private startDeviceOrientation(): void {
    if (!this._state.capabilities.deviceOrientation) {
      this._state.errors.orientation = 'DeviceOrientation API not available';
      return;
    }

    if (this._state.permissions.deviceOrientation === 'denied') {
      this._state.errors.orientation = 'Orientation permission denied';
      return;
    }

    if (this._state.permissions.deviceOrientation === 'requires-gesture') {
      this._state.errors.orientation = 'iOS: tap "Enable Compass" in Settings first';
      return;
    }

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - this.lastOrientationEmit < this.config.orientationIntervalMs) {
        this.latestOrientation = {
          alpha: (event as any).webkitCompassHeading ?? event.alpha ?? 0,
          beta: event.beta ?? 0,
          gamma: event.gamma ?? 0,
        };
        return;
      }
      this.lastOrientationEmit = now;

      const heading = (event as any).webkitCompassHeading ?? event.alpha ?? 0;
      this.latestOrientation = {
        alpha: heading,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      };

      const msg = this.orientationToMotionMessage(heading, event.beta ?? 0, event.gamma ?? 0);
      this.callback([msg]);
    };

    window.addEventListener('deviceorientation', this.orientationHandler);
    this._state.activeSensors.push('orientation');
  }

  private startDeviceMotion(): void {
    if (!this._state.capabilities.deviceMotion) {
      this._state.errors.motion = 'DeviceMotion API not available';
      return;
    }

    if (this._state.permissions.deviceMotion === 'denied') {
      this._state.errors.motion = 'Motion permission denied';
      return;
    }

    if (this._state.permissions.deviceMotion === 'requires-gesture') {
      return;
    }

    this.motionHandler = (event: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - this.lastMotionEmit < this.config.motionIntervalMs) {
        if (event.acceleration) {
          this.latestMotionAccel = {
            x: event.acceleration.x ?? 0,
            y: event.acceleration.y ?? 0,
            z: event.acceleration.z ?? 0,
          };
        }
        if (event.rotationRate) {
          this.latestMotionRotation = {
            x: (event.rotationRate.alpha ?? 0) * (Math.PI / 180),
            y: (event.rotationRate.beta ?? 0) * (Math.PI / 180),
            z: (event.rotationRate.gamma ?? 0) * (Math.PI / 180),
          };
        }
        return;
      }
      this.lastMotionEmit = now;

      const accel = event.acceleration;
      const rotation = event.rotationRate;

      if (accel) {
        this.latestMotionAccel = { x: accel.x ?? 0, y: accel.y ?? 0, z: accel.z ?? 0 };
      }
      if (rotation) {
        this.latestMotionRotation = {
          x: (rotation.alpha ?? 0) * (Math.PI / 180),
          y: (rotation.beta ?? 0) * (Math.PI / 180),
          z: (rotation.gamma ?? 0) * (Math.PI / 180),
        };
      }

      const msg = this.motionToMessage();
      if (msg) this.callback([msg]);
    };

    window.addEventListener('devicemotion', this.motionHandler);
    this._state.activeSensors.push('motion');
  }

  private startBarometer(): void {
    if (!this._state.capabilities.barometer) return;

    try {
      const PS = (window as any).PressureSensor;
      const sensor = new PS({ frequency: 0.5 });

      sensor.addEventListener('reading', () => {
        const now = Date.now();
        if (now - this.lastBarometerEmit < this.config.barometerIntervalMs) return;
        this.lastBarometerEmit = now;
        this.callback([this.barometerToEnvironmentMessage(sensor.pressure)]);
      });

      sensor.addEventListener('error', (e: any) => {
        this._state.errors.barometer = e.error?.message ?? 'Barometer error';
      });

      sensor.start();
      this.barometerSensor = sensor;
      this._state.activeSensors.push('barometer');
    } catch {
      // Barometer not supported on this device
    }
  }

  private async acquireWakeLock(): Promise<void> {
    if (!this._state.capabilities.wakeLock) return;

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this._state.wakeLockActive = true;

      this.wakeLock.addEventListener('release', () => {
        this._state.wakeLockActive = false;
      });
    } catch {
      this._state.errors.wakeLock = 'Could not acquire wake lock';
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
      this._state.wakeLockActive = false;
    }
  }

  private monitorBattery(): void {
    if (!this._state.capabilities.battery) return;

    (navigator as any).getBattery().then((battery: any) => {
      this.batteryRef = battery;
      this._state.batteryLevel = battery.level;
      this._state.batteryCharging = battery.charging;

      const update = () => {
        this._state.batteryLevel = battery.level;
        this._state.batteryCharging = battery.charging;

        if (battery.level < 0.15 && !battery.charging) {
          const msg: TelemetryMessage = {
            id: nextId(),
            vesselId: this.vesselId,
            sourceDeviceId: this.deviceId,
            timestamp: new Date().toISOString(),
            messageType: TelemetryMessageType.HEALTH,
            payload: {
              deviceId: this.deviceId,
              deviceType: 'phone',
              status: battery.level < 0.05 ? 'critical' : 'warning',
              cpuUsage: 0,
              memoryUsage: 0,
              diskUsage: 0,
              temperature: 0,
              uptime: 0,
              lastUpdate: new Date().toISOString(),
              errors: [`Phone battery at ${Math.round(battery.level * 100)}%`],
            } as HealthPayload,
          };
          this.callback([msg]);
        }
      };

      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
    }).catch(() => {});
  }

  private geoToPositionMessage(position: GeolocationPosition): TelemetryMessage {
    const coords = position.coords;

    const payload: PositionPayload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude ?? undefined,
      accuracy: coords.accuracy,
      sog: coords.speed != null && coords.speed > 0 ? coords.speed * MPS_TO_KNOTS : 0,
      cog: coords.heading != null ? coords.heading : 0,
      fixType: coords.altitude != null ? '3d' : '2d',
    };

    return {
      id: nextId(),
      vesselId: this.vesselId,
      sourceDeviceId: this.deviceId,
      timestamp: new Date(position.timestamp).toISOString(),
      messageType: TelemetryMessageType.POSITION,
      payload,
      accuracy: coords.accuracy,
    };
  }

  private orientationToMotionMessage(heading: number, pitch: number, roll: number): TelemetryMessage {
    const payload: MotionPayload = {
      yaw: heading,
      pitch,
      roll,
      linearAcceleration: this.latestMotionAccel ?? undefined,
      angularVelocity: this.latestMotionRotation ?? undefined,
    };

    return {
      id: nextId(),
      vesselId: this.vesselId,
      sourceDeviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      messageType: TelemetryMessageType.MOTION,
      payload,
    };
  }

  private motionToMessage(): TelemetryMessage | null {
    if (!this.latestMotionAccel && !this.latestMotionRotation) return null;

    const orientation = this.latestOrientation;

    const payload: MotionPayload = {
      yaw: orientation?.alpha ?? 0,
      pitch: orientation?.beta ?? 0,
      roll: orientation?.gamma ?? 0,
      heave: this.latestMotionAccel ? this.latestMotionAccel.z : undefined,
      surge: this.latestMotionAccel?.x,
      sway: this.latestMotionAccel?.y,
      linearAcceleration: this.latestMotionAccel ?? undefined,
      angularVelocity: this.latestMotionRotation ?? undefined,
    };

    return {
      id: nextId(),
      vesselId: this.vesselId,
      sourceDeviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      messageType: TelemetryMessageType.MOTION,
      payload,
    };
  }

  private barometerToEnvironmentMessage(pressure: number): TelemetryMessage {
    const payload: EnvironmentPayload = {
      barometricPressure: pressure,
    };

    return {
      id: nextId(),
      vesselId: this.vesselId,
      sourceDeviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      messageType: TelemetryMessageType.ENVIRONMENT,
      payload,
    };
  }
}
