import { createHash, createHmac } from 'node:crypto';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import {
  accountLoginSchema,
  accountRegistrationSchema,
  createAccountAuthConfig,
  createAccountSessionToken,
  createUserAccountRepository,
  toPublicUserAccount,
  verifyAccountSessionToken,
  type UserAccountRepository,
} from './account-auth.js';
import { buildAccountCommunityContributions } from './account-contributions.js';
import {
  resolveOptionalAccountOwnershipContext,
  sendAccountOwnershipError,
  type AccountOwnershipContext,
} from './account-ownership.js';
import {
  createApiAuthConfig,
  createOperatorSessionToken,
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
import {
  buildCommunityAggregateReleaseManifest,
  type CommunityAggregateReleaseManifest,
} from './community-release-manifests.js';
import { communityHazardBatchSchema, communityHazardReviewSchema } from './community-hazards.js';
import {
  buildCommunityHazardArtifacts,
  getCommunityHazardArtifactManifest,
  type CommunityHazardArtifactFormat,
} from './community-hazard-artifacts.js';
import {
  createCommunityHazardRepository,
  type CommunityHazardRepository,
} from './community-hazard-repository.js';
import { communityObservationBatchSchema } from './community-observations.js';
import {
  createCommunityObservationRepository,
  type CommunityObservationRepository,
} from './community-observation-repository.js';
import { communitySoundingBatchSchema, communitySoundingReviewSchema } from './community-soundings.js';
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
  userAccountRepository?: UserAccountRepository;
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
  sessionSigningKey?: string;
  sessionSigningKeyId?: string;
  sessionTtlSeconds?: number;
  accountSessionSigningKey?: string;
  accountSessionSigningKeyId?: string;
  accountSessionTtlSeconds?: number;
  accountRegistrationInviteCode?: string;
  accountRegistrationRequiresInvite?: boolean;
  requireAggregateReleaseApproval?: boolean;
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

type AggregateReleaseApproval = NonNullable<CommunityAggregateReleaseManifest['approval']>;
type AggregateReleaseApprovalRequest = Omit<AggregateReleaseApproval, 'required' | 'approvedAt'> & {
  approvedAt?: string;
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

function sessionTtlFromOptions(options: BuildAppOptions): number | undefined {
  const rawTtl = options.sessionTtlSeconds ?? Number(process.env.HARBOURMESH_SESSION_TTL_SECONDS);
  return Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : undefined;
}

function accountSessionTtlFromOptions(options: BuildAppOptions): number | undefined {
  const rawTtl = options.accountSessionTtlSeconds ?? Number(process.env.HARBOURMESH_ACCOUNT_SESSION_TTL_SECONDS);
  return Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : undefined;
}

function accountRegistrationRequiresInvite(options: BuildAppOptions): boolean {
  if (typeof options.accountRegistrationRequiresInvite === 'boolean') return options.accountRegistrationRequiresInvite;
  if (options.accountRegistrationInviteCode ?? process.env.HARBOURMESH_ACCOUNT_REGISTRATION_INVITE_CODE) return true;
  return process.env.NODE_ENV === 'production';
}

function extractBearerToken(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
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
  const userAccountRepository = options.userAccountRepository ?? createUserAccountRepository(options.dataDir);
  const chartPackageArtifactOptions = options.chartPackageArtifactOptions ?? chartArtifactOptionsFromEnvironment();
  const artifactSigningConfig = artifactSigningConfigFromOptions(options);
  const requireAggregateReleaseApproval = options.requireAggregateReleaseApproval
    ?? process.env.HARBOURMESH_REQUIRE_AGGREGATE_RELEASE_APPROVAL === 'true';
  const accountAuth = createAccountAuthConfig({
    sessionSigningKey: options.accountSessionSigningKey ?? process.env.HARBOURMESH_ACCOUNT_SESSION_SIGNING_KEY,
    sessionSigningKeyId: options.accountSessionSigningKeyId ?? process.env.HARBOURMESH_ACCOUNT_SESSION_SIGNING_KEY_ID,
    sessionTtlSeconds: accountSessionTtlFromOptions(options),
    registrationInviteCode: options.accountRegistrationInviteCode ?? process.env.HARBOURMESH_ACCOUNT_REGISTRATION_INVITE_CODE,
    registrationRequiresInvite: accountRegistrationRequiresInvite(options),
  });
  const apiAuth = createApiAuthConfig({
    keys: options.apiKeys ?? parseApiKeys(process.env.HARBOURMESH_API_KEYS, process.env.HARBOURMESH_API_KEY),
    keySha256Hashes: options.apiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_API_KEY_SHA256S, process.env.HARBOURMESH_API_KEY_SHA256),
    writeKeys: options.writeApiKeys ?? parseApiKeys(process.env.HARBOURMESH_WRITE_API_KEYS),
    writeKeySha256Hashes: options.writeApiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_WRITE_API_KEY_SHA256S),
    reviewKeys: options.reviewApiKeys ?? parseApiKeys(process.env.HARBOURMESH_REVIEW_API_KEYS),
    reviewKeySha256Hashes: options.reviewApiKeySha256Hashes ?? parseApiKeySha256Hashes(process.env.HARBOURMESH_REVIEW_API_KEY_SHA256S),
    reviewOperatorKeys: options.reviewOperatorKeys ?? parseOperatorApiKeys(process.env.HARBOURMESH_REVIEW_OPERATOR_KEYS),
    reviewOperatorKeySha256Hashes: options.reviewOperatorKeySha256Hashes ?? parseOperatorApiKeySha256Hashes(process.env.HARBOURMESH_REVIEW_OPERATOR_KEY_SHA256S),
    sessionSigningKey: options.sessionSigningKey ?? process.env.HARBOURMESH_SESSION_SIGNING_KEY,
    sessionSigningKeyId: options.sessionSigningKeyId ?? process.env.HARBOURMESH_SESSION_SIGNING_KEY_ID,
    sessionTtlSeconds: sessionTtlFromOptions(options),
    required: options.requireApiAuth ?? process.env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: true,
  });

  const aggregateReleasePublishSchema = z.object({
    generatedBy: z.string().trim().min(2).max(120).optional(),
    approval: z.object({
      approvedBy: z.string().trim().min(2).max(120),
      approvedAt: z.string().datetime().optional(),
      checklist: z.object({
        referenceOnly: z.literal(true),
        officialChartDataExcluded: z.literal(true),
        rawRecordIdsExcluded: z.literal(true),
        vesselIdsExcluded: z.literal(true),
      }).strict(),
      notes: z.string().trim().max(1000).optional(),
    }).strict().optional(),
  });

  const operatorSessionRequestSchema = z.object({
    operatorId: z.string().trim().min(2).max(120).optional(),
    ttlSeconds: z.number().int().positive().max(apiAuth.sessionTtlSeconds).optional(),
  }).strict();

  async function getAccountOwnershipContextIfPresent(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ ok: true; context: AccountOwnershipContext | null } | { ok: false }> {
    const resolution = await resolveOptionalAccountOwnershipContext(request, accountAuth, userAccountRepository);
    if (!resolution.ok) {
      await sendAccountOwnershipError(reply, resolution);
      return { ok: false };
    }

    return {
      ok: true,
      context: resolution.context,
    };
  }

  async function getRequiredAccountOwnershipContext(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ ok: true; context: AccountOwnershipContext } | { ok: false }> {
    if (!accountAuth.sessionSigningKey) {
      await reply.code(503).send({
        ok: false,
        error: 'account_session_signing_not_configured',
      });
      return { ok: false };
    }

    const resolution = await resolveOptionalAccountOwnershipContext(request, accountAuth, userAccountRepository);
    if (!resolution.ok) {
      await sendAccountOwnershipError(reply, resolution);
      return { ok: false };
    }
    if (!resolution.context) {
      await reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer realm="harbourmesh-account"')
        .send({
          ok: false,
          error: 'account_session_required',
        });
      return { ok: false };
    }

    return {
      ok: true,
      context: resolution.context,
    };
  }

  function normalizeAggregateReleaseApproval(
    approval: AggregateReleaseApprovalRequest,
    approvedByOverride?: string
  ): AggregateReleaseApproval {
    return {
      required: requireAggregateReleaseApproval,
      approvedBy: approvedByOverride ?? approval.approvedBy,
      approvedAt: approval.approvedAt ?? new Date().toISOString(),
      checklist: approval.checklist,
      ...(approval.notes ? { notes: approval.notes } : {}),
    };
  }

  async function publishAggregateRelease(
    generatedBy = 'system:auto',
    approval?: AggregateReleaseApproval,
    publisher?: AccountOwnershipContext | null
  ) {
    const [soundings, hazards, observations] = await Promise.all([
      repository.listRecords(),
      hazardRepository.listRecords(),
      observationRepository.listRecords(),
    ]);
    const generatedAt = new Date().toISOString();
    const aggregate = buildCommunityAggregateGeoJson(soundings, hazards, observations, generatedAt);
    const baseManifest = buildCommunityAggregateReleaseManifest(aggregate);
    const manifest = approval ? { ...baseManifest, approval } : baseManifest;

    return aggregateReleaseRepository.publishAggregateRelease({ aggregate, manifest, generatedBy, publisher });
  }

  async function getOrPublishLatestAggregateRelease() {
    const latest = await aggregateReleaseRepository.getLatestAggregateRelease();
    if (latest || requireAggregateReleaseApproval) return latest;

    return publishAggregateRelease();
  }

  app.get('/health', async () => ({
    ok: true,
    service: 'harbourmesh-server',
    time: new Date().toISOString(),
  }));

  app.post('/api/auth/register', async (request, reply) => {
    if (!accountAuth.sessionSigningKey) {
      return reply.code(503).send({
        ok: false,
        error: 'account_session_signing_not_configured',
      });
    }

    try {
      const requestBody = accountRegistrationSchema.parse(request.body ?? {});
      if (accountAuth.registrationRequiresInvite) {
        if (!accountAuth.registrationInviteCode) {
          return reply.code(503).send({
            ok: false,
            error: 'account_registration_invite_not_configured',
          });
        }

        if (requestBody.inviteCode !== accountAuth.registrationInviteCode) {
          return reply.code(403).send({
            ok: false,
            error: 'invalid_account_registration_invite',
          });
        }
      }

      const account = await userAccountRepository.createAccount(requestBody);
      if (!account) {
        return reply.code(409).send({
          ok: false,
          error: 'account_already_exists',
        });
      }

      const session = createAccountSessionToken(accountAuth, account);
      if (!session) {
        return reply.code(503).send({
          ok: false,
          error: 'account_session_unavailable',
        });
      }

      return reply.code(201).send({
        ok: true,
        session,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_account_registration_request',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    if (!accountAuth.sessionSigningKey) {
      return reply.code(503).send({
        ok: false,
        error: 'account_session_signing_not_configured',
      });
    }

    try {
      const requestBody = accountLoginSchema.parse(request.body ?? {});
      const account = await userAccountRepository.verifyCredentials(requestBody.email, requestBody.password);
      if (!account) {
        return reply.code(401).send({
          ok: false,
          error: 'invalid_account_credentials',
        });
      }

      const session = createAccountSessionToken(accountAuth, account);
      if (!session) {
        return reply.code(503).send({
          ok: false,
          error: 'account_session_unavailable',
        });
      }

      return reply.code(201).send({
        ok: true,
        session,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_account_login_request',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!accountAuth.sessionSigningKey) {
      return reply.code(503).send({
        ok: false,
        error: 'account_session_signing_not_configured',
      });
    }

    const token = extractBearerToken(request);
    if (!token) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer realm="harbourmesh-account"')
        .send({
          ok: false,
          error: 'account_session_required',
        });
    }

    const session = verifyAccountSessionToken(accountAuth, token);
    if (!session) {
      return reply.code(403).send({
        ok: false,
        error: 'invalid_account_session',
      });
    }

    const account = await userAccountRepository.getAccountById(session.accountId);
    if (!account || account.status !== 'active') {
      return reply.code(401).send({
        ok: false,
        error: 'account_not_available',
      });
    }

    return {
      ok: true,
      account: toPublicUserAccount(account),
      session: {
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        keyId: session.keyId,
      },
    };
  });

  app.get('/api/account/community/contributions', async (request, reply) => {
    const accountOwnership = await getRequiredAccountOwnershipContext(request, reply);
    if (!accountOwnership.ok) return reply;

    return buildAccountCommunityContributions(accountOwnership.context.accountId, {
      soundings: repository,
      hazards: hazardRepository,
      observations: observationRepository,
      devices: deviceRepository,
      aggregateReleases: aggregateReleaseRepository,
    });
  });

  app.post('/api/auth/operator-session', async (request, reply) => {
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    if (!apiAuth.sessionSigningKey) {
      return reply.code(503).send({
        ok: false,
        error: 'operator_session_signing_not_configured',
      });
    }

    try {
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestBody = operatorSessionRequestSchema.parse(request.body ?? {});
      const session = createOperatorSessionToken(apiAuth, {
        operatorId: reviewIdentity?.operatorId ?? requestBody.operatorId ?? 'review-operator',
        scopes: ['review'],
        ttlSeconds: requestBody.ttlSeconds,
      });
      if (!session) {
        return reply.code(503).send({
          ok: false,
          error: 'operator_session_unavailable',
        });
      }

      return reply.code(201).send({
        ok: true,
        session,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_operator_session_request',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.post('/api/community/soundings', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    try {
      const batch = communitySoundingBatchSchema.parse(request.body);
      const receipt = await repository.acceptBatch(batch, accountOwnership.context);
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

  app.get('/api/community/soundings/review', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      soundings: await repository.listRecords(),
    };
  });

  app.get('/api/community/soundings/reviews', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      reviews: await repository.listReviews(),
    };
  });

  app.post('/api/community/soundings/:soundingId/review', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    try {
      const { soundingId } = request.params as { soundingId: string };
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestedReview = communitySoundingReviewSchema.parse(request.body);
      const review = {
        ...requestedReview,
        reviewedBy: reviewIdentity?.operatorId ?? requestedReview.reviewedBy,
      };
      const receipt = await repository.reviewSounding(soundingId, review, accountOwnership.context);
      if (!receipt) {
        return reply.code(404).send({ ok: false, error: 'sounding_not_found' });
      }

      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_sounding_review',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

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

  app.get('/api/community/releases/aggregates/latest', async (_request, reply) => {
    const release = await getOrPublishLatestAggregateRelease();
    if (!release) {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_not_found' });
    }

    return release;
  });

  app.get('/api/community/releases/aggregates/latest/cells.geojson', async (_request, reply) => {
    const release = await getOrPublishLatestAggregateRelease();
    if (!release) {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_not_found' });
    }

    const cells = await aggregateReleaseRepository.listAggregateCells(release.id);

    return buildCommunityAggregateGeoJsonFromStoredRelease(release, cells);
  });

  app.get('/api/community/releases/aggregates/latest/artifacts', async (_request, reply) => {
    const release = await getOrPublishLatestAggregateRelease();
    if (!release) {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_not_found' });
    }

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
    if (!release) {
      return reply.code(404).send({ ok: false, error: 'aggregate_release_not_found' });
    }

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
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    try {
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestBody = aggregateReleasePublishSchema.parse(request.body ?? {});
      if (requireAggregateReleaseApproval && !requestBody.approval) {
        return reply.code(428).send({
          ok: false,
          error: 'aggregate_release_approval_required',
        });
      }

      const approval = requestBody.approval
        ? normalizeAggregateReleaseApproval(requestBody.approval, reviewIdentity?.operatorId)
        : undefined;
      const release = await publishAggregateRelease(
        reviewIdentity?.operatorId ?? requestBody.generatedBy ?? 'review-operator',
        approval,
        accountOwnership.context
      );

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
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    try {
      const batch = communityObservationBatchSchema.parse(request.body);
      const receipt = await observationRepository.acceptBatch(batch, accountOwnership.context);
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
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    try {
      const batch = communityHazardBatchSchema.parse(request.body);
      const receipt = await hazardRepository.acceptBatch(batch, accountOwnership.context);
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

  app.get('/api/community/hazards/artifacts', async () => {
    const generatedAt = new Date().toISOString();
    const hazards = await hazardRepository.listRecords();

    return getCommunityHazardArtifactManifest(hazards, generatedAt);
  });

  app.get('/api/community/hazards/artifacts/:format', async (request, reply) => {
    const { format } = request.params as { format: string };
    if (format !== 'geojson' && format !== 'mbtiles' && format !== 'pmtiles') {
      return reply.code(404).send({ ok: false, error: 'community_hazard_artifact_not_found' });
    }

    const query = request.query as { generatedAt?: string };
    const hazards = await hazardRepository.listRecords();
    const artifacts = await buildCommunityHazardArtifacts(hazards, query.generatedAt ?? new Date().toISOString());
    const artifact = artifacts.find((candidate) => candidate.format === (format as CommunityHazardArtifactFormat));
    if (!artifact) {
      return reply.code(404).send({ ok: false, error: 'community_hazard_artifact_not_available' });
    }

    const response = reply
      .type(artifact.mediaType)
      .header('Content-Disposition', `attachment; filename="${artifact.fileName}"`)
      .header('X-HarbourMesh-Artifact-Id', artifact.id)
      .header('X-HarbourMesh-SHA256', artifact.sha256)
      .header('X-HarbourMesh-Reference-Only', 'true')
      .header('X-HarbourMesh-Official-Chart-Data-Included', 'false')
      .header('X-HarbourMesh-Raw-Record-Ids-Included', 'false')
      .header('X-HarbourMesh-Vessel-Ids-Included', 'false')
      .header('X-HarbourMesh-Source-Device-Ids-Included', 'false');

    return addArtifactSignatureHeaders(response, artifact, artifactSigningConfig).send(artifact.bytes);
  });

  app.get('/api/community/hazards/review', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      hazards: await hazardRepository.listRecords(),
    };
  });

  app.get('/api/community/hazards/reviews', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    return {
      reviews: await hazardRepository.listReviews(),
    };
  });

  app.post('/api/community/hazards/:hazardId/review', async (request, reply) => {
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth, 'review'))) return reply;

    try {
      const { hazardId } = request.params as { hazardId: string };
      const reviewIdentity = getRequestApiKeyIdentity(apiAuth, request, 'review');
      const requestedReview = communityHazardReviewSchema.parse(request.body);
      const review = {
        ...requestedReview,
        reviewedBy: reviewIdentity?.operatorId ?? requestedReview.reviewedBy,
      };
      const receipt = await hazardRepository.reviewHazard(hazardId, review, accountOwnership.context);
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
    const accountOwnership = await getAccountOwnershipContextIfPresent(request, reply);
    if (!accountOwnership.ok) return reply;
    if (!(await requireApiAccess(request, reply, apiAuth))) return reply;

    try {
      const registration = deviceRegistrationSchema.parse(request.body);
      const receipt = await deviceRepository.registerDevice(registration, accountOwnership.context);
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

  // Optional Gun P2P relay — enabled when HARBOURMESH_GUN_RELAY=true.
  // Allows self-hosted users to act as a mesh relay for other HarbourMesh nodes.
  // No PostGIS dependency; Gun persists to a local file store.
  if (process.env.HARBOURMESH_GUN_RELAY === 'true') {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const Gun = req('gun');
    req('gun/lib/wire'); // WebSocket wire protocol
    req('gun/lib/radisk'); // file-based persistence
    const gunDataDir = `${options.dataDir}/gun-data`;
    Gun({
      web: app.server,
      file: gunDataDir,
      ws: { path: '/gun' },
    });
  }

  return app;
}
