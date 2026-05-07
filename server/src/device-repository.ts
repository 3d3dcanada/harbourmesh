import {
  type DeviceRegistration,
  type DeviceRegistrationReceipt,
} from './devices.js';
import {
  toOwnerMetadata,
  type AccountOwnerMetadata,
  type AccountOwnershipContext,
} from './account-ownership.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

export type StoredDeviceRegistration = DeviceRegistration & AccountOwnerMetadata;

export type DeviceRepository = {
  registerDevice: (
    registration: DeviceRegistration,
    owner?: AccountOwnershipContext | null
  ) => Promise<DeviceRegistrationReceipt>;
  listDevices: () => Promise<DeviceRegistration[]>;
  listDevicesByOwner: (accountId: string) => Promise<StoredDeviceRegistration[]>;
  getDevice: (deviceId: string) => Promise<DeviceRegistration | null>;
};

function publicDeviceRegistration(registration: StoredDeviceRegistration): DeviceRegistration {
  const {
    ownerAccountId: _ownerAccountId,
    ownerAccountRoles: _ownerAccountRoles,
    ...publicRegistration
  } = registration;
  return publicRegistration;
}

export function createDeviceRepository(dataDir: string): DeviceRepository {
  const devicesFile = resolveDataFile(dataDir, 'devices.jsonl');

  async function getLatestDevices(): Promise<Map<string, StoredDeviceRegistration>> {
    const registrations = await readJsonLines<StoredDeviceRegistration>(devicesFile);
    return registrations.reduce<Map<string, StoredDeviceRegistration>>((devices, registration) => {
      devices.set(registration.deviceId, registration);
      return devices;
    }, new Map());
  }

  return {
    async registerDevice(registration, owner) {
      const existingDevices = await getLatestDevices();
      const status = existingDevices.has(registration.deviceId) ? 'updated' : 'registered';
      await appendJsonLine(devicesFile, {
        ...registration,
        ...toOwnerMetadata(owner),
      });

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
      ).map(publicDeviceRegistration);
    },

    async listDevicesByOwner(accountId) {
      return [...(await getLatestDevices()).values()]
        .filter((registration) => registration.ownerAccountId === accountId)
        .sort((left, right) => (
          right.registeredAt.localeCompare(left.registeredAt) ||
          left.deviceId.localeCompare(right.deviceId)
        ));
    },

    async getDevice(deviceId) {
      const registration = (await getLatestDevices()).get(deviceId);
      return registration ? publicDeviceRegistration(registration) : null;
    },
  };
}
