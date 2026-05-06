import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import {
  createApiAuthConfig,
  getRequestApiKeyIdentity,
  parseOperatorApiKeys,
  parseApiKeys,
  requireApiAccess,
  type OperatorApiKey,
} from './api-auth.js';
import { getNBPilotChartPackageArtifactManifest } from './chart-package-artifacts.js';
import { getNBPilotChartCatalog, getNBPilotChartPackageManifest } from './chart-catalog.js';
import { buildCommunityAggregateGeoJson } from './community-aggregates.js';
import { buildCommunityGeoJsonOverlay } from './community-geojson.js';
import { communityHazardBatchSchema, communityHazardReviewSchema } from './community-hazards.js';
import {
  createCommunityHazardRepository,
  type CommunityHazardRepository,
} from './community-hazard-repository.js';
import { communityObservationBatchSchema } from './community-observations.js';
import {
  createCommunityObservationRepository,
  type CommunityObservationRepository,
} from './community-observation-repository.js';
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
  observationRepository?: CommunityObservationRepository;
  deviceRepository?: DeviceRepository;
  apiKeys?: readonly string[];
  writeApiKeys?: readonly string[];
  reviewApiKeys?: readonly string[];
  reviewOperatorKeys?: readonly OperatorApiKey[];
  requireApiAuth?: boolean;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = options.repository ?? createCommunitySoundingRepository(options.dataDir);
  const hazardRepository = options.hazardRepository ?? createCommunityHazardRepository(options.dataDir);
  const observationRepository = options.observationRepository ?? createCommunityObservationRepository(options.dataDir);
  const deviceRepository = options.deviceRepository ?? createDeviceRepository(options.dataDir);
  const apiAuth = createApiAuthConfig({
    keys: options.apiKeys ?? parseApiKeys(process.env.HARBOURMESH_API_KEYS, process.env.HARBOURMESH_API_KEY),
    writeKeys: options.writeApiKeys ?? parseApiKeys(process.env.HARBOURMESH_WRITE_API_KEYS),
    reviewKeys: options.reviewApiKeys ?? parseApiKeys(process.env.HARBOURMESH_REVIEW_API_KEYS),
    reviewOperatorKeys: options.reviewOperatorKeys ?? parseOperatorApiKeys(process.env.HARBOURMESH_REVIEW_OPERATOR_KEYS),
    required: options.requireApiAuth ?? process.env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'harbourmesh-server',
    time: new Date().toISOString(),
  }));

  app.post('/api/community/soundings', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

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

  app.get('/api/community/overlay.geojson', async () => {
    const [soundings, hazards] = await Promise.all([
      repository.listRecords(),
      hazardRepository.listRecords(),
    ]);

    return buildCommunityGeoJsonOverlay(soundings, hazards);
  });

  app.get('/api/community/aggregates.geojson', async () => {
    const [soundings, hazards, observations] = await Promise.all([
      repository.listRecords(),
      hazardRepository.listRecords(),
      observationRepository.listRecords(),
    ]);

    return buildCommunityAggregateGeoJson(soundings, hazards, observations);
  });

  app.get('/api/charts/nb/catalog', async () => getNBPilotChartCatalog());
  app.get('/api/charts/nb/packages', async () => getNBPilotChartPackageManifest());
  app.get('/api/charts/nb/package-artifacts', async () => getNBPilotChartPackageArtifactManifest());

  app.post('/api/community/observations', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    try {
      const batch = communityObservationBatchSchema.parse(request.body);
      const receipt = await observationRepository.acceptBatch(batch);
      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_observation_batch',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/community/observations/summary', async () => observationRepository.getSummary());

  app.post('/api/community/hazards', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

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

  app.get('/api/community/hazards/review', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      hazards: await hazardRepository.listRecords(),
    };
  });

  app.get('/api/community/hazards/reviews', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      reviews: await hazardRepository.listReviews(),
    };
  });

  app.post('/api/community/hazards/:hazardId/review', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    try {
      const { hazardId } = request.params as { hazardId: string };
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestedReview = communityHazardReviewSchema.parse(request.body);
      const review = {
        ...requestedReview,
        reviewedBy: reviewIdentity?.operatorId ?? requestedReview.reviewedBy,
      };
      const receipt = await hazardRepository.reviewHazard(hazardId, review);
      if (!receipt) {
        return reply.code(404).send({ ok: false, error: 'hazard_not_found' });
      }

      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_hazard_review',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.post('/api/devices/register', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

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

  app.get('/api/devices', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    return {
      devices: await deviceRepository.listDevices(),
    };
  });

  app.get('/api/devices/:deviceId', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    const { deviceId } = request.params as { deviceId: string };
    const device = await deviceRepository.getDevice(deviceId);
    if (!device) {
      return reply.code(404).send({ ok: false, error: 'device_not_found' });
    }

    return device;
  });

  return app;
}
