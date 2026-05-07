import { describe, expect, it, vi } from 'vitest';
import { SharePositionLevel, type ConsentSettings } from '@/types';
import { DEFAULT_BOAT_NODE_SETTINGS } from '@/store';
import { buildBoatNodeRegistrationPayload, registerBoatNode } from './device-registration';

const consent: ConsentSettings = {
  vesselId: 'vessel-1',
  userId: 'user-1',
  shareLivePosition: SharePositionLevel.BLURRED,
  shareTelemetryForCommunity: true,
  shareTelemetryForTraining: false,
  telemetryAnonymization: 'full',
  shareLogsForTraining: false,
  logAnonymization: 'full',
  enterpriseLockdownMode: false,
  fleetOnlySharing: false,
  allowAICloudProcessing: false,
  allowAITrainingUse: false,
  lastUpdated: '2026-05-06T12:00:00.000Z',
  updatedBy: 'user-1',
};

describe('device registration', () => {
  it('builds a Boat Node registration payload from settings and consent', () => {
    expect(buildBoatNodeRegistrationPayload(DEFAULT_BOAT_NODE_SETTINGS, consent, {
      now: '2026-05-06T12:01:00.000Z',
    })).toMatchObject({
      deviceId: 'boat-node-001',
      vesselId: 'vessel-1',
      displayName: 'NB Pilot Boat Node',
      kind: 'boat_node',
      signalKBaseUrl: 'http://192.168.1.100:3000',
      registeredAt: '2026-05-06T12:01:00.000Z',
      consentCapturedAt: '2026-05-06T12:00:00.000Z',
      capabilities: {
        depth: true,
        sonar: true,
      },
    });
  });

  it('posts registration payloads and validates receipts', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      deviceId: 'boat-node-001',
      vesselId: 'vessel-1',
      status: 'registered',
      registeredAt: '2026-05-06T12:01:00.000Z',
    }), { status: 202 }));
    const payload = buildBoatNodeRegistrationPayload(DEFAULT_BOAT_NODE_SETTINGS, consent, {
      now: '2026-05-06T12:01:00.000Z',
    });

    await expect(registerBoatNode(payload, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      deviceId: 'boat-node-001',
      status: 'registered',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/devices/register', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });

  it('adds account-session ownership context without replacing pilot API keys', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      deviceId: 'boat-node-001',
      vesselId: 'vessel-1',
      status: 'registered',
      registeredAt: '2026-05-06T12:01:00.000Z',
    }), { status: 202 }));
    const payload = buildBoatNodeRegistrationPayload(DEFAULT_BOAT_NODE_SETTINGS, consent, {
      now: '2026-05-06T12:01:00.000Z',
    });

    await registerBoatNode(payload, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      accountAccessToken: 'hm_user_session_v1.payload.signature',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/devices/register', expect.objectContaining({
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
        'X-HarbourMesh-Account-Session': 'hm_user_session_v1.payload.signature',
      }),
    }));
  });
});
