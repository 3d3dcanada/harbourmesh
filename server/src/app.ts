import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { getNBPilotChartCatalog } from './chart-catalog.js';
import { communityHazardBatchSchema } from './community-hazards.js';
import {
  createCommunityHazardRepository,
  type CommunityHazardRepository,
} from './community-hazard-repository.js';
import { communitySoundingBatchSchema } from './community-soundings.js';
import {
  createCommunitySoundingRepository,
  type CommunitySoundingRepository,
} from './community-sounding-repository.js';
import {
  createDeviceRepository,
  type DeviceRepository,
} from './device-repository.js';
import { deviceRegistrationSchema } from './devices.js';

export type BuildAppOptions = {
  dataDir: string;
  repository?: CommunitySoundingRepository;
  hazardRepository?: CommunityHazardRepository;
  deviceRepository?: DeviceRepository;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = options.repository ?? createCommunitySoundingRepository(options.dataDir);
  const hazardRepository = options.hazardRepository ?? createCommunityHazardRepository(options.dataDir);
  const deviceRepository = options.deviceRepository ?? createDeviceRepository(options.dataDir);

  await app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'harbourmesh-server',
    time: new Date().toISOString(),
  }));

  app.post('/api/community/soundings', async (request, reply) => {
    try {
      const batch = communitySoundingBatchSchema.parse(request.body);
      const receipt = await repository.acceptBatch(batch);
      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_sounding_batch',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/community/soundings/summary', async () => repository.getSummary());

  app.get('/api/charts/nb/catalog', async () => getNBPilotChartCatalog());

  app.post('/api/community/hazards', async (request, reply) => {
    try {
      const batch = communityHazardBatchSchema.parse(request.body);
      const receipt = await hazardRepository.acceptBatch(batch);
      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_hazard_batch',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/community/hazards/summary', async () => hazardRepository.getSummary());

  app.post('/api/devices/register', async (request, reply) => {
    try {
      const registration = deviceRegistrationSchema.parse(request.body);
      const receipt = await deviceRepository.registerDevice(registration);
      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_device_registration',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/devices', async () => ({
    devices: await deviceRepository.listDevices(),
  }));

  app.get('/api/devices/:deviceId', async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const device = await deviceRepository.getDevice(deviceId);
    if (!device) {
      return reply.code(404).send({ ok: false, error: 'device_not_found' });
    }

    return device;
  });

  return app;
}
