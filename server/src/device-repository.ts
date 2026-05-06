import {
  type DeviceRegistration,
  type DeviceRegistrationReceipt,
} from './devices.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

export type DeviceRepository = {
  registerDevice: (registration: DeviceRegistration) => Promise<DeviceRegistrationReceipt>;
  listDevices: () => Promise<DeviceRegistration[]>;
  getDevice: (deviceId: string) => Promise<DeviceRegistration | null>;
};

export function createDeviceRepository(dataDir: string): DeviceRepository {
  const devicesFile = resolveDataFile(dataDir, 'devices.jsonl');

  async function getLatestDevices(): Promise<Map<string, DeviceRegistration>> {
    const registrations = await readJsonLines<DeviceRegistration>(devicesFile);
    return registrations.reduce<Map<string, DeviceRegistration>>((devices, registration) => {
      devices.set(registration.deviceId, registration);
      return devices;
    }, new Map());
  }

  return {
    async registerDevice(registration) {
      const existingDevices = await getLatestDevices();
      const status = existingDevices.has(registration.deviceId) ? 'updated' : 'registered';
      await appendJsonLine(devicesFile, registration);

      return {
        ok: true,
        deviceId: registration.deviceId,
        vesselId: registration.vesselId,
        status,
        registeredAt: registration.registeredAt,
      };
    },

    async listDevices() {
      return [...(await getLatestDevices()).values()].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
    },

    async getDevice(deviceId) {
      return (await getLatestDevices()).get(deviceId) ?? null;
    },
  };
}
