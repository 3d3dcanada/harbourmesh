import { z } from 'zod';

export const deviceRegistrationSchema = z.object({
  deviceId: z.string().min(1),
  vesselId: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(['boat_node', 'mobile_app', 'desktop_app', 'gateway']),
  softwareVersion: z.string().optional(),
  signalKBaseUrl: z.string().url().optional(),
  registeredAt: z.string().datetime(),
  consentCapturedAt: z.string().datetime().optional(),
  capabilities: z.object({
    position: z.boolean(),
    depth: z.boolean(),
    ais: z.boolean(),
    radar: z.boolean(),
    sonar: z.boolean(),
    weather: z.boolean(),
  }).strict(),
}).strict();

export type DeviceRegistration = z.infer<typeof deviceRegistrationSchema>;

export type DeviceRegistrationReceipt = {
  ok: true;
  deviceId: string;
  vesselId: string;
  status: 'registered' | 'updated';
  registeredAt: string;
};
