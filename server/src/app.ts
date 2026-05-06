import { createHash, createHmac } from 'node:crypto';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';
import {
  createApiAuthConfig,
  getRequestApiKeyIdentity,
  parseOperatorApiKeys,
  parseOperatorApiKeySha256Hashes,
  parseApiKeys,
  parseApiKeySha256Hashes,
  requireApiAccess,
  type OperatorApiKey,
} from './api-auth.js';
import {
  type BuildNBPilotChartPackageArtifactsOptions,
  getNBPilotChartPackageArtifactDownload,
  getNBPilotChartPackageArtifactManifest,
  type ChartPackageArtifactFormat,
} from './chart-package-artifacts.js';
import { getNBPilotChartCatalog, getNBPilotChartPackageManifest } from './chart-catalog.js';
import { buildCommunityAggregateGeoJson } from './community-aggregates.js';
import {
  buildCommunityAggregateGeoJsonFromStoredRelease,
  createCommunityAggregateReleaseRepository,
  type CommunityAggregateReleaseRepository,
} from './community-aggregate-release-repository.js';
import {
  buildCommunityAggregateReleaseArtifacts,
  getCommunityAggregateReleaseArtifactManifest,
} from './community-aggregate-release-artifacts.js';
import { buildCommunityGeoJsonOverlay } from './community-geojson.js';
import { buildCommunityAggregateReleaseManifest } from './community-release-manifests.js';
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
import { createPostgisRepositories } from './postgis-repositories.js';

export type BuildAppOptions = {
  dataDir: string;
  repository?: CommunitySoundingRepository;
  hazardRepository?: CommunityHazardRepository;
  observationRepository?: CommunityObservationRepository;
  deviceRepository?: DeviceRepository;
  aggregateReleaseRepository?: CommunityAggregateReleaseRepository;
  apiKeys?: readonly string[];
  apiKeySha256Hashes?: readonly string[];
  writeApiKeys?: readonly string[];
  writeApiKeySha256Hashes?: readonly string[];
  reviewApiKeys?: readonly string[];
  reviewApiKeySha256Hashes?: readonly string[];
  reviewOperatorKeys?: readonly OperatorApiKey[];
  reviewOperatorKeySha256Hashes?: readonly OperatorApiKey[];
  requireApiAuth?: boolean;
  databaseUrl?: string;
  runMigrations?: boolean;
  chartPackageArtifactOptions?: BuildNBPilotChartPackageArtifactsOptions;
  artifactSigningKey?: string;
  artifactSigningKeyId?: string;
  logger?: boolean;
};

type DownloadableArtifact = {
  id: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
};

type ArtifactSigningConfig = {
  key: string;
  keyId: string;
};

function chartArtifactOptionsFromEnvironment(): BuildNBPilotChartPackageArtifactsOptions {
  const maxFeatures = Number(process.env.HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE ?? 100);
  return {
    includeGeoNBFeatures: process.env.HARBOURMESH_FETCH_GEONB_FEATURES === 'true',
    maxGeoNBFeaturesPerSource: Number.isFinite(maxFeatures) && maxFeatures > 0 ? maxFeatures : 100,
  };
}

function artifactSigningConfigFromOptions(options: BuildAppOptions): ArtifactSigningConfig | null {
  const key = options.artifactSigningKey ?? process.env.HARBOURMESH_ARTIFACT_SIGNING_KEY;
  if (!key) return null;

  return {
    key,
    keyId: options.artifactSigningKeyId ?? process.env.HARBOURMESH_ARTIFACT_SIGNING_KEY_ID ?? 'harbourmesh-artifact-signing-key',
  };
}

function artifactSigningPayload(artifact: DownloadableArtifact): string {
  return JSON.stringify({
    artifactId: artifact.id,
    fileName: artifact.fileName,
    mediaType: artifact.mediaType,
    byteLength: artifact.byteLength,
    sha256: artifact.sha256,
    generatedAt: artifact.generatedAt,
  });
}

function addArtifactSignatureHeaders(
  reply: FastifyReply,
  artifact: DownloadableArtifact,
  signingConfig: ArtifactSigningConfig | null
): FastifyReply {
  if (!signingConfig) return reply;

  const payload = artifactSigningPayload(artifact);
  const payloadSha256 = createHash('sha256').update(payload).digest('hex');
  const signature = createHmac('sha256', signingConfig.key).update(payload).digest('hex');

  return reply
    .header('X-HarbourMesh-Artifact-Signature-Algorithm', 'HMAC-SHA256')
    .header('X-HarbourMesh-Artifact-Signature-Key-Id', signingConfig.keyId)
    .header('X-HarbourMesh-Artifact-Signature-Payload-SHA256', payloadSha256)
    .header('X-HarbourMesh-Artifact-Signature', signature);
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const databaseUrl = options.databaseUrl ?? process.env.HARBOURMESH_DATABASE_URL;
  const postgisRepositories = databaseUrl ? createPostgisRepositories(databaseUrl) : null;
  if (postgisRepositories && (options.runMigrations ?? process.env.HARBOURMESH_RUN_MIGRATIONS === 'true')) {
    await postgisRepositories.runMigrations();
  }
  if (postgisRepositories) {
    app.addHook('onClose', async () => {
      await postgisRepositories.close();
    });
  }

  const repository = options.repository ?? postgisRepositories?.soundings ?? createCommunitySoundingRepository(options.dataDir);
  const hazardRepository = options.hazardRepository ?? postgisRepositories?.hazards ?? createCommunityHazardRepository(options.dataDir);
  const observationRepository = options.observationRepository ?? postgisRepositories?.observations ?? createCommunityObservationRepository(options.dataDir);
  const deviceRepository = options.deviceRepository ?? postgisRepositories?.devices ?? createDeviceRepository(options.dataDir);
  const aggregateReleaseRepository = options.aggregateReleaseRepository
    ?? postgisRepositories?.aggregateReleases
    ?? createCommunityAggregateReleaseRepository(options.dataDir);
  const chartPackageArtifactOptions = options.chartPackageArtifactOptions ?? chartArtifactOptionsFromEnvironment();
  const artifactSigningConfig = artifactSigningConfigFromOptions(options);
  const apiAuth = createApiAuthConfig({
    keys: options.apiKeys ?? parseApiKeys(process.env.HARBOURMESH_API_KEYS, process.env.HARBOURMESH_API_KEY),
    keySha256Hashes: options.apiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_API_KEY_SHA256S, process.env.HARBOURMESH_API_KEY_SHA256),
    writeKeys: options.writeApiKeys ?? parseApiKeys(process.env.HARBOURMESH_WRITE_API_KEYS),
    writeKeySha256Hashes: options.writeApiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_WRITE_API_KEY_SHA256S),
    reviewKeys: options.reviewApiKeys ?? parseApiKeys(process.env.HARBOURMESH_REVIEW_API_KEYS),
    reviewKeySha256Hashes: options.reviewApiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_REVIEW_API_KEY_SHA256S),
    reviewOperatorKeys: options.reviewOperatorKeys ?? parseOperatorApiKeys(process.env.HARBOURMESH_REVIEW_OPERATOR_KEYS),
    reviewOperatorKeySha256Hashes: options.reviewOperatorKeySha256Hashes ?? parseOperatorApiKeySha256Hashes(process.env.HARBOURMESH_REVIEW_OPERATOR_KEY_SHA256S),
    required: options.requireApiAuth ?? process.env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: true,
  });

  const aggregateReleasePublishSchema = z.object({
    generatedBy: z.string().trim().min(2).max(120).optional(),
  });

  async function publishAggregateRelease(generatedBy = 'system:auto') {
    const [soundings, hazards, observations] = await Promise.all([
      repository.listRecords(),
      hazardRepository.listRecords(),
      observationRepository.listRecords(),
    ]);
    const generatedAt = new Date().toISOString();
    const aggregate = buildCommunityAggregateGeoJson(soundings, hazards, observations, generatedAt);
    const manifest = buildCommunityAggregateReleaseManifest(aggregate);

    return aggregateReleaseRepository.publishAggregateRelease({ aggregate, manifest, generatedBy });
  }

  async function getOrPublishLatestAggregateRelease() {
    return (await aggregateReleaseRepository.getLatestAggregateRelease()) ?? publishAggregateRelease();
  }

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

  app.get('/api/community/releases/aggregates/latest', async () => {
    return getOrPublishLatestAggregateRelease();
  });

  app.get('/api/community/releases/aggregates/latest/cells.geojson', async () => {
    const release = await getOrPublishLatestAggregateRelease();
    const cells = await aggregateReleaseRepository.listAggregateCells(release.id);

    return buildCommunityAggregateGeoJsonFromStoredRelease(release, cells);
  });

  app.get('/api/community/releases/aggregates/latest/artifacts', async () => {
    const release = await getOrPublishLatestAggregateRelease();
    const cells = await aggregateReleaseRepository.listAggregateCells(release.id);
    const aggregate = buildCommunityAggregateGeoJsonFromStoredRelease(release, cells);

    return getCommunityAggregateReleaseArtifactManifest(release, aggregate);
  });

  app.get('/api/community/releases/aggregates/latest/artifacts/:format', async (request, reply) => {
    const { format } = request.params as { format: string };
    if (format !== 'geojson' && format !== 'mbtiles' && format !== 'pmtiles') {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_artifact_not_found' });
    }

    const release = await getOrPublishLatestAggregateRelease();
    const cells = await aggregateReleaseRepository.listAggregateCells(release.id);
    const aggregate = buildCommunityAggregateGeoJsonFromStoredRelease(release, cells);
    const artifacts = await buildCommunityAggregateReleaseArtifacts(release, aggregate);
    const artifact = artifacts.find((candidate) => candidate.format === format);
    if (!artifact) {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_artifact_not_available' });
    }

    const response = reply
      .type(artifact.mediaType)
      .header('Content-Disposition', `attachment; filename="${artifact.fileName}"`)
      .header('X-HarbourMesh-Release-Id', artifact.releaseId)
      .header('X-HarbourMesh-SHA256', artifact.sha256)
      .header('X-HarbourMesh-Official-Chart-Data-Included', 'false')
      .header('X-HarbourMesh-Raw-Record-Ids-Included', 'false')
      .header('X-HarbourMesh-Vessel-Ids-Included', 'false');

    return addArtifactSignatureHeaders(response, artifact, artifactSigningConfig).send(artifact.bytes);
  });

  app.get('/api/community/releases/aggregates', async () => ({
    releases: await aggregateReleaseRepository.listAggregateReleases(),
  }));

  app.post('/api/community/releases/aggregates', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    try {
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestBody = aggregateReleasePublishSchema.parse(request.body ?? {});
      const release = await publishAggregateRelease(reviewIdentity?.operatorId ?? requestBody.generatedBy ?? 'review-operator');

      return reply.code(201).send({
        ok: true,
        release,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_aggregate_release_request',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/charts/nb/catalog', async () => getNBPilotChartCatalog());
  app.get('/api/charts/nb/packages', async () => getNBPilotChartPackageManifest());
  app.get('/api/charts/nb/package-artifacts', async () => (
    getNBPilotChartPackageArtifactManifest(new Date().toISOString(), chartPackageArtifactOptions)
  ));
  app.get('/api/charts/nb/package-artifacts/:packageId/:format', async (request, reply) => {
    const { packageId, format } = request.params as { packageId: string; format: string };
    if (format !== 'geojson' && format !== 'mbtiles' && format !== 'pmtiles') {
      return reply.code(404).send({ ok: false, error: 'chart_package_artifact_not_found' });
    }

    const query = request.query as { generatedAt?: string };
    const artifact = await getNBPilotChartPackageArtifactDownload(
      packageId,
      format as ChartPackageArtifactFormat,
      query.generatedAt,
      chartPackageArtifactOptions
    );
    if (!artifact) {
      return reply.code(404).send({ ok: false, error: 'chart_package_artifact_not_found' });
    }

    const response = reply
      .type(artifact.mediaType)
      .header('Content-Disposition', `attachment; filename="${artifact.fileName}"`)
      .header('X-HarbourMesh-Artifact-Id', artifact.id)
      .header('X-HarbourMesh-SHA256', artifact.sha256)
      .header('X-HarbourMesh-Reference-Only', 'true')
      .header('X-HarbourMesh-Official-Chart-Data-Included', 'false');

    return addArtifactSignatureHeaders(response, artifact, artifactSigningConfig).send(artifact.bytes);
  });

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
