import type { BoatNodeSettings } from '@/store';
import type { ConsentSettings } from '@/types';

export type DeviceRegistrationPayload = {
  deviceId: string;
  vesselId: string;
  displayName: string;
  kind: 'boat_node';
  softwareVersion: string;
  signalKBaseUrl: string;
  registeredAt: string;
  consentCapturedAt?: string;
  capabilities: BoatNodeSettings['capabilities'];
};

export type DeviceRegistrationReceipt = {
  ok: true;
  deviceId: string;
  vesselId: string;
  status: 'registered' | 'updated';
  registeredAt: string;
};

export type RegisterBoatNodeOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  softwareVersion?: string;
  now?: string;
};

function resolveEndpoint(apiBaseUrl?: string): string {
  const endpoint = '/api/devices/register';
  if (!apiBaseUrl) return endpoint;
  return `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;
}

function isReceipt(value: unknown): value is DeviceRegistrationReceipt {
  const receipt = value as Partial<DeviceRegistrationReceipt>;
  return (
    receipt.ok === true &&
    typeof receipt.deviceId === 'string' &&
    typeof receipt.vesselId === 'string' &&
    (receipt.status === 'registered' || receipt.status === 'updated') &&
    typeof receipt.registeredAt === 'string'
  );
}

export function buildBoatNodeRegistrationPayload(
  boatNode: BoatNodeSettings,
  consent: ConsentSettings | null,
  options: RegisterBoatNodeOptions = {}
): DeviceRegistrationPayload {
  return {
    deviceId: boatNode.deviceId,
    vesselId: consent?.vesselId ?? 'demo-vessel',
    displayName: boatNode.deviceName,
    kind: 'boat_node',
    softwareVersion: options.softwareVersion ?? '0.1.0',
    signalKBaseUrl: boatNode.signalKBaseUrl,
    registeredAt: options.now ?? new Date().toISOString(),
    consentCapturedAt: consent?.lastUpdated,
    capabilities: boatNode.capabilities,
  };
}

export async function registerBoatNode(
  payload: DeviceRegistrationPayload,
  options: RegisterBoatNodeOptions = {}
): Promise<DeviceRegistrationReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(resolveEndpoint(options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Boat Node registration failed with HTTP ${response.status}`);
  }

  if (!isReceipt(body)) {
    throw new Error('Boat Node registration returned an invalid receipt');
  }

  return body;
}
