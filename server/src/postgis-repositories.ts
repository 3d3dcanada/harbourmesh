import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type { CommunityHazardBatch, CommunityHazardReview, CommunityHazardSummary } from './community-hazards.js';
import type {
  CommunityAggregateReleaseRepository,
  StoredCommunityAggregateCell,
} from './community-aggregate-release-repository.js';
import type { CommunityHazardRepository, StoredCommunityHazard, StoredHazardReview } from './community-hazard-repository.js';
import type { CommunityObservationBatch, CommunityObservationSummary } from './community-observations.js';
import type { CommunityObservationRepository, StoredCommunityObservation } from './community-observation-repository.js';
import type { CommunityAggregateGeoJson } from './community-aggregates.js';
import type { CommunityAggregateReleaseManifest } from './community-release-manifests.js';
import type { CommunitySoundingBatch, CommunitySoundingSummary } from './community-soundings.js';
import type { CommunitySoundingRepository, StoredCommunitySounding } from './community-sounding-repository.js';
import type { DeviceRepository } from './device-repository.js';
import type { DeviceRegistration } from './devices.js';

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
};

type PositionRow = {
  latitude: string | number | null;
  longitude: string | number | null;
  position: unknown;
};

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../db/migrations/0001_nb_pilot_community_mesh.sql'
);

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toOptionalIsoString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return toIsoString(value);
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

function toJsonObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function mapPosition(row: PositionRow): StoredCommunityObservation['position'] {
  const stored = toJsonObject<StoredCommunityObservation['position'] | null>(row.position, null);
  if (stored) return stored;
  if (row.latitude === null || row.longitude === null) return undefined;

  return {
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    source: 'estimated',
    timestamp: new Date(0).toISOString(),
  };
}

function mapHazardPosition(row: PositionRow): StoredCommunityHazard['position'] {
  const position = mapPosition(row);
  if (!position) return undefined;

  return {
    ...position,
    source: position.source === 'radar' ? 'estimated' : position.source,
  };
}

function mapReleaseManifest(value: unknown): CommunityAggregateReleaseManifest {
  return toJsonObject<CommunityAggregateReleaseManifest>(value, value as CommunityAggregateReleaseManifest);
}

function mapAggregateGeometry(value: unknown): CommunityAggregateGeoJson['features'][number]['geometry'] {
  return toJsonObject<CommunityAggregateGeoJson['features'][number]['geometry']>(
    value,
    { type: 'Polygon', coordinates: [[
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]] }
  );
}

async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadMigrationSql(): Promise<string> {
  return readFile(migrationPath, 'utf8');
}

export type PostgisRepositorySet = {
  soundings: CommunitySoundingRepository;
  observations: CommunityObservationRepository;
  hazards: CommunityHazardRepository;
  devices: DeviceRepository;
  aggregateReleases: CommunityAggregateReleaseRepository;
  runMigrations: () => Promise<void>;
  close: () => Promise<void>;
};

export function createPostgisRepositories(databaseUrl: string): PostgisRepositorySet {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    soundings: createPostgisSoundingRepository(pool),
    observations: createPostgisObservationRepository(pool),
    hazards: createPostgisHazardRepository(pool),
    devices: createPostgisDeviceRepository(pool),
    aggregateReleases: createPostgisAggregateReleaseRepository(pool),
    async runMigrations() {
      await pool.query(await loadMigrationSql());
    },
    async close() {
      await pool.end();
    },
  };
}

function createPostgisSoundingRepository(pool: Pool): CommunitySoundingRepository {
  return {
    async acceptBatch(batch) {
      return withTransaction(pool, async (client) => {
        const storedAt = new Date().toISOString();
        const existing = await client.query<{ external_record_id: string }>(
          'SELECT external_record_id FROM community_soundings WHERE external_record_id = ANY($1::text[])',
          [batch.records.map((record) => record.id)]
        );
        const existingIds = new Set(existing.rows.map((row) => row.external_record_id));
        const acceptedRecords = batch.records.filter((record) => !existingIds.has(record.id));
        const duplicateCount = batch.records.length - acceptedRecords.length;
        const insertedBatch = await client.query<{ id: string }>(
          `INSERT INTO community_sounding_batches (
            external_batch_id, schema_version, region, record_count, accepted_count, duplicate_count,
            intended_use, official_chart_data_included, contains_full_shared_positions,
            raw_local_positions_included, created_at, stored_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (external_batch_id) DO UPDATE SET
            accepted_count = EXCLUDED.accepted_count,
            duplicate_count = EXCLUDED.duplicate_count,
            stored_at = EXCLUDED.stored_at
          RETURNING id`,
          [
            batch.id,
            batch.schemaVersion,
            batch.region,
            batch.records.length,
            acceptedRecords.length,
            duplicateCount,
            batch.policy.intendedUse,
            batch.policy.officialChartDataIncluded,
            batch.policy.containsFullSharedPositions,
            batch.policy.rawLocalPositionsIncluded,
            batch.createdAt,
            storedAt,
          ]
        );
        const batchId = insertedBatch.rows[0].id;

        for (const record of acceptedRecords) {
          await client.query(
            `INSERT INTO community_soundings (
              external_record_id, batch_id, external_vessel_id, source_device_id, source_protocol,
              raw_message_id, observed_at, received_at, consent_captured_at, sharing_state, geom,
              raw_depth_meters, depth_meters, depth_reference, tide_correction_applied,
              water_level_correction_applied, offsets, quality, quality_confidence,
              quality_rejected, official_chart_data_included, stored_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              ST_SetSRID(ST_MakePoint($11, $12), 4326),
              $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb, $20, $21, false, $22
            )
            ON CONFLICT (external_record_id) DO NOTHING`,
            [
              record.id,
              batchId,
              record.vesselId,
              record.sourceDeviceId,
              record.sourceProtocol,
              record.rawMessageId,
              record.timestamp,
              record.receivedAt,
              record.consentCapturedAt,
              record.sharingState,
              record.longitude,
              record.latitude,
              record.rawDepthMeters,
              record.depthMeters,
              record.depthReference,
              record.tideCorrectionApplied,
              record.waterLevelCorrectionApplied,
              JSON.stringify(record.offsets),
              JSON.stringify(record.quality),
              record.quality.confidence,
              record.quality.rejected,
              storedAt,
            ]
          );
        }

        return {
          ok: true,
          receiptId: `${batch.id}:${storedAt}`,
          batchId: batch.id,
          acceptedCount: acceptedRecords.length,
          duplicateCount,
          storedAt,
        };
      });
    },

    async getSummary(): Promise<CommunitySoundingSummary> {
      const [summary, regions] = await Promise.all([
        pool.query<{ total_records: string; batch_count: string; latest_timestamp: unknown }>(
          `SELECT
            COUNT(*)::text AS total_records,
            (SELECT COUNT(*) FROM community_sounding_batches)::text AS batch_count,
            MAX(observed_at) AS latest_timestamp
          FROM community_soundings`
        ),
        pool.query<{ region: string; count: string }>(
          `SELECT b.region, COUNT(*)::text AS count
          FROM community_soundings s
          JOIN community_sounding_batches b ON b.id = s.batch_id
          GROUP BY b.region`
        ),
      ]);

      return {
        totalRecords: Number(summary.rows[0]?.total_records ?? 0),
        batchCount: Number(summary.rows[0]?.batch_count ?? 0),
        regions: Object.fromEntries(regions.rows.map((row) => [row.region, Number(row.count)])),
        latestTimestamp: toOptionalIsoString(summary.rows[0]?.latest_timestamp),
      };
    },

    async listRecords() {
      const result = await pool.query<{
        id: string;
        batch_id: string;
        region: string;
        vessel_id: string;
        timestamp: unknown;
        latitude: string | number;
        longitude: string | number;
        source_device_id: string;
        source_protocol: StoredCommunitySounding['sourceProtocol'];
        raw_message_id: string;
        received_at: unknown;
        sharing_state: StoredCommunitySounding['sharingState'];
        consent_captured_at: unknown;
        raw_depth_meters: string | number;
        depth_meters: string | number;
        depth_reference: StoredCommunitySounding['depthReference'];
        tide_correction_applied: boolean;
        water_level_correction_applied: boolean;
        offsets: unknown;
        quality: unknown;
        stored_at: unknown;
      }>(
        `SELECT
          s.external_record_id AS id,
          b.external_batch_id AS batch_id,
          b.region,
          s.external_vessel_id AS vessel_id,
          s.observed_at AS timestamp,
          ST_Y(s.geom) AS latitude,
          ST_X(s.geom) AS longitude,
          s.source_device_id,
          s.source_protocol,
          s.raw_message_id,
          s.received_at,
          s.sharing_state,
          s.consent_captured_at,
          s.raw_depth_meters,
          s.depth_meters,
          s.depth_reference,
          s.tide_correction_applied,
          s.water_level_correction_applied,
          s.offsets,
          s.quality,
          s.stored_at
        FROM community_soundings s
        JOIN community_sounding_batches b ON b.id = s.batch_id
        ORDER BY s.observed_at ASC, s.external_record_id ASC`
      );

      return result.rows.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        region: row.region,
        vesselId: row.vessel_id,
        timestamp: toIsoString(row.timestamp),
        latitude: toNumber(row.latitude),
        longitude: toNumber(row.longitude),
        sourceDeviceId: row.source_device_id,
        sourceProtocol: row.source_protocol,
        rawMessageId: row.raw_message_id,
        receivedAt: toIsoString(row.received_at),
        sharingState: row.sharing_state,
        consentCapturedAt: toIsoString(row.consent_captured_at),
        rawDepthMeters: toNumber(row.raw_depth_meters),
        depthMeters: toNumber(row.depth_meters),
        depthReference: row.depth_reference,
        tideCorrectionApplied: false,
        waterLevelCorrectionApplied: false,
        offsets: toJsonObject(row.offsets, {}),
        quality: toJsonObject(row.quality, { confidence: 0, rejected: true, flags: ['missing_quality'] }),
        storedAt: toIsoString(row.stored_at),
      }));
    },
  };
}

function createPostgisObservationRepository(pool: Pool): CommunityObservationRepository {
  return {
    async acceptBatch(batch: CommunityObservationBatch) {
      return withTransaction(pool, async (client) => {
        const storedAt = new Date().toISOString();
        const existing = await client.query<{ external_record_id: string }>(
          'SELECT external_record_id FROM community_observations WHERE external_record_id = ANY($1::text[])',
          [batch.observations.map((record) => record.id)]
        );
        const existingIds = new Set(existing.rows.map((row) => row.external_record_id));
        const acceptedRecords = batch.observations.filter((record) => !existingIds.has(record.id));
        const duplicateCount = batch.observations.length - acceptedRecords.length;
        const insertedBatch = await client.query<{ id: string }>(
          `INSERT INTO community_observation_batches (
            external_batch_id, schema_version, region, record_count, accepted_count, duplicate_count,
            intended_use, official_chart_data_included, contains_full_shared_positions,
            raw_local_positions_included, raw_sensor_payloads_included, created_at, stored_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (external_batch_id) DO UPDATE SET
            accepted_count = EXCLUDED.accepted_count,
            duplicate_count = EXCLUDED.duplicate_count,
            stored_at = EXCLUDED.stored_at
          RETURNING id`,
          [
            batch.id,
            batch.schemaVersion,
            batch.region,
            batch.observations.length,
            acceptedRecords.length,
            duplicateCount,
            batch.policy.intendedUse,
            batch.policy.officialChartDataIncluded,
            batch.policy.containsFullSharedPositions,
            batch.policy.rawLocalPositionsIncluded,
            batch.policy.rawSensorPayloadsIncluded,
            batch.createdAt,
            storedAt,
          ]
        );
        const batchId = insertedBatch.rows[0].id;

        for (const observation of acceptedRecords) {
          await client.query(
            `INSERT INTO community_observations (
              external_record_id, batch_id, external_vessel_id, source_device_id, source_protocol,
              observation_type, observed_at, received_at, consent_captured_at, sharing_state,
              geom, position, position_source, position_accuracy_meters, metrics, quality,
              quality_confidence, quality_rejected, raw_payload_included, official_chart_data_included, stored_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              CASE WHEN $11::double precision IS NULL OR $12::double precision IS NULL THEN NULL
                ELSE ST_SetSRID(ST_MakePoint($12, $11), 4326)
              END,
              $13::jsonb, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20, $21, $22
            )
            ON CONFLICT (external_record_id) DO NOTHING`,
            [
              observation.id,
              batchId,
              observation.vesselId,
              observation.sourceDeviceId,
              observation.sourceProtocol,
              observation.observationType,
              observation.observedAt,
              observation.receivedAt,
              observation.consentCapturedAt,
              observation.sharingState,
              observation.position?.latitude ?? null,
              observation.position?.longitude ?? null,
              observation.position ? JSON.stringify(observation.position) : null,
              observation.position?.source ?? null,
              observation.position?.accuracy ?? null,
              JSON.stringify(observation.metrics),
              JSON.stringify(observation.quality),
              observation.quality.confidence,
              observation.quality.rejected,
              observation.rawPayloadIncluded,
              observation.officialChartDataIncluded,
              storedAt,
            ]
          );
        }

        return {
          ok: true,
          receiptId: `${batch.id}:${storedAt}`,
          batchId: batch.id,
          acceptedCount: acceptedRecords.length,
          duplicateCount,
          storedAt,
        };
      });
    },

    async getSummary(): Promise<CommunityObservationSummary> {
      const [summary, regions, byType] = await Promise.all([
        pool.query<{ total_records: string; batch_count: string; positioned_records: string; latest_observed_at: unknown }>(
          `SELECT
            COUNT(*)::text AS total_records,
            (SELECT COUNT(*) FROM community_observation_batches)::text AS batch_count,
            COUNT(*) FILTER (WHERE geom IS NOT NULL)::text AS positioned_records,
            MAX(observed_at) AS latest_observed_at
          FROM community_observations`
        ),
        pool.query<{ region: string; count: string }>(
          `SELECT b.region, COUNT(*)::text AS count
          FROM community_observations o
          JOIN community_observation_batches b ON b.id = o.batch_id
          GROUP BY b.region`
        ),
        pool.query<{ observation_type: string; count: string }>(
          'SELECT observation_type, COUNT(*)::text AS count FROM community_observations GROUP BY observation_type'
        ),
      ]);

      return {
        totalRecords: Number(summary.rows[0]?.total_records ?? 0),
        batchCount: Number(summary.rows[0]?.batch_count ?? 0),
        regions: Object.fromEntries(regions.rows.map((row) => [row.region, Number(row.count)])),
        byType: Object.fromEntries(byType.rows.map((row) => [row.observation_type, Number(row.count)])),
        positionedRecords: Number(summary.rows[0]?.positioned_records ?? 0),
        latestObservedAt: toOptionalIsoString(summary.rows[0]?.latest_observed_at),
      };
    },

    async listRecords() {
      const result = await pool.query<{
        id: string;
        batch_id: string;
        region: string;
        vessel_id: string;
        source_device_id: string;
        source_protocol: StoredCommunityObservation['sourceProtocol'];
        observation_type: StoredCommunityObservation['observationType'];
        observed_at: unknown;
        received_at: unknown;
        latitude: string | number | null;
        longitude: string | number | null;
        position: unknown;
        sharing_state: StoredCommunityObservation['sharingState'];
        consent_captured_at: unknown;
        metrics: unknown;
        quality: unknown;
        raw_payload_included: boolean;
        official_chart_data_included: boolean;
        stored_at: unknown;
      }>(
        `SELECT
          o.external_record_id AS id,
          b.external_batch_id AS batch_id,
          b.region,
          o.external_vessel_id AS vessel_id,
          o.source_device_id,
          o.source_protocol,
          o.observation_type,
          o.observed_at,
          o.received_at,
          ST_Y(o.geom) AS latitude,
          ST_X(o.geom) AS longitude,
          o.position,
          o.sharing_state,
          o.consent_captured_at,
          o.metrics,
          o.quality,
          o.raw_payload_included,
          o.official_chart_data_included,
          o.stored_at
        FROM community_observations o
        JOIN community_observation_batches b ON b.id = o.batch_id
        ORDER BY o.observed_at ASC, o.external_record_id ASC`
      );

      return result.rows.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        region: row.region,
        vesselId: row.vessel_id,
        sourceDeviceId: row.source_device_id,
        sourceProtocol: row.source_protocol,
        observationType: row.observation_type,
        observedAt: toIsoString(row.observed_at),
        receivedAt: toIsoString(row.received_at),
        position: mapPosition(row),
        sharingState: row.sharing_state,
        consentCapturedAt: toIsoString(row.consent_captured_at),
        metrics: toJsonObject(row.metrics, {}),
        quality: toJsonObject(row.quality, { confidence: 0, rejected: false, flags: ['missing_quality'] }),
        rawPayloadIncluded: false,
        officialChartDataIncluded: false,
        storedAt: toIsoString(row.stored_at),
      }));
    },
  };
}

function createPostgisHazardRepository(pool: Pool): CommunityHazardRepository {
  async function listRecords(queryable: Queryable = pool): Promise<StoredCommunityHazard[]> {
    const result = await queryable.query<{
      id: string;
      batch_id: string;
      region: string;
      vessel_id: string;
      source_device_id: string | null;
      type: StoredCommunityHazard['type'];
      severity: StoredCommunityHazard['severity'];
      description: string;
      latitude: string | number | null;
      longitude: string | number | null;
      position: unknown;
      reported_at: unknown;
      sharing_state: StoredCommunityHazard['sharingState'];
      consent_captured_at: unknown;
      stored_at: unknown;
      review_status: StoredCommunityHazard['reviewStatus'];
      public_overlay_eligible: boolean;
      reviewed_at: unknown;
      reviewed_by: string | null;
      review_note: string | null;
    }>(
      `SELECT
        h.external_hazard_id AS id,
        b.external_batch_id AS batch_id,
        b.region,
        h.external_vessel_id AS vessel_id,
        h.source_device_id,
        h.hazard_type AS type,
        h.severity,
        h.description,
        ST_Y(h.geom) AS latitude,
        ST_X(h.geom) AS longitude,
        h.position,
        h.reported_at,
        h.sharing_state,
        h.consent_captured_at,
        h.stored_at,
        h.review_status,
        h.public_overlay_eligible,
        h.reviewed_at,
        h.reviewed_by,
        h.review_note
      FROM community_hazards h
      JOIN community_hazard_batches b ON b.id = h.batch_id
      ORDER BY h.reported_at ASC, h.external_hazard_id ASC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      batchId: row.batch_id,
      region: row.region,
      vesselId: row.vessel_id,
      sourceDeviceId: row.source_device_id ?? undefined,
      type: row.type,
      severity: row.severity,
      description: row.description,
      position: mapHazardPosition(row),
      reportedAt: toIsoString(row.reported_at),
      sharingState: row.sharing_state,
      consentCapturedAt: toIsoString(row.consent_captured_at),
      storedAt: toIsoString(row.stored_at),
      reviewStatus: row.review_status,
      publicOverlayEligible: row.public_overlay_eligible,
      reviewedAt: toOptionalIsoString(row.reviewed_at),
      reviewedBy: row.reviewed_by ?? undefined,
      reviewNote: row.review_note ?? undefined,
    }));
  }

  return {
    async acceptBatch(batch: CommunityHazardBatch) {
      return withTransaction(pool, async (client) => {
        const storedAt = new Date().toISOString();
        const existing = await client.query<{ external_hazard_id: string }>(
          'SELECT external_hazard_id FROM community_hazards WHERE external_hazard_id = ANY($1::text[])',
          [batch.hazards.map((hazard) => hazard.id)]
        );
        const existingIds = new Set(existing.rows.map((row) => row.external_hazard_id));
        const acceptedHazards = batch.hazards.filter((hazard) => !existingIds.has(hazard.id));
        const duplicateCount = batch.hazards.length - acceptedHazards.length;
        const insertedBatch = await client.query<{ id: string }>(
          `INSERT INTO community_hazard_batches (
            external_batch_id, schema_version, region, record_count, accepted_count, duplicate_count,
            intended_use, official_chart_data_included, contains_full_shared_positions,
            raw_local_positions_included, created_at, stored_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (external_batch_id) DO UPDATE SET
            accepted_count = EXCLUDED.accepted_count,
            duplicate_count = EXCLUDED.duplicate_count,
            stored_at = EXCLUDED.stored_at
          RETURNING id`,
          [
            batch.id,
            batch.schemaVersion,
            batch.region,
            batch.hazards.length,
            acceptedHazards.length,
            duplicateCount,
            batch.policy.intendedUse,
            batch.policy.officialChartDataIncluded,
            batch.policy.containsFullSharedPositions,
            batch.policy.rawLocalPositionsIncluded,
            batch.createdAt,
            storedAt,
          ]
        );
        const batchId = insertedBatch.rows[0].id;

        for (const hazard of acceptedHazards) {
          await client.query(
            `INSERT INTO community_hazards (
              external_hazard_id, batch_id, external_vessel_id, source_device_id, region,
              hazard_type, severity, description, geom, position, position_source, position_accuracy_meters,
              reported_at, consent_captured_at, sharing_state, review_status, public_overlay_eligible,
              official_chart_data_included, stored_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              CASE WHEN $9::double precision IS NULL OR $10::double precision IS NULL THEN NULL
                ELSE ST_SetSRID(ST_MakePoint($10, $9), 4326)
              END,
              $11::jsonb, $12, $13, $14, $15, $16, 'pending', false, false, $17
            )
            ON CONFLICT (external_hazard_id) DO NOTHING`,
            [
              hazard.id,
              batchId,
              hazard.vesselId,
              hazard.sourceDeviceId ?? null,
              batch.region,
              hazard.type,
              hazard.severity,
              hazard.description,
              hazard.position?.latitude ?? null,
              hazard.position?.longitude ?? null,
              hazard.position ? JSON.stringify(hazard.position) : null,
              hazard.position?.source ?? null,
              hazard.position?.accuracy ?? null,
              hazard.reportedAt,
              hazard.consentCapturedAt,
              hazard.sharingState,
              storedAt,
            ]
          );
        }

        return {
          ok: true,
          receiptId: `${batch.id}:${storedAt}`,
          batchId: batch.id,
          acceptedCount: acceptedHazards.length,
          duplicateCount,
          storedAt,
        };
      });
    },

    async reviewHazard(hazardId: string, review: CommunityHazardReview) {
      return withTransaction(pool, async (client) => {
        const hazard = await client.query<{ id: string; has_position: boolean }>(
          'SELECT id, geom IS NOT NULL AS has_position FROM community_hazards WHERE external_hazard_id = $1',
          [hazardId]
        );
        if (!hazard.rows[0]) return null;

        const reviewedAt = review.reviewedAt ?? new Date().toISOString();
        const publicOverlayEligible = review.status === 'accepted' && hazard.rows[0].has_position;
        await client.query(
          `UPDATE community_hazards SET
            review_status = $1,
            public_overlay_eligible = $2,
            reviewed_at = $3,
            reviewed_by = $4,
            review_note = $5
          WHERE id = $6`,
          [review.status, publicOverlayEligible, reviewedAt, review.reviewedBy, review.note ?? null, hazard.rows[0].id]
        );
        await client.query(
          `INSERT INTO community_hazard_reviews (hazard_id, status, reviewed_by, reviewed_at, note)
          VALUES ($1, $2, $3, $4, $5)`,
          [hazard.rows[0].id, review.status, review.reviewedBy, reviewedAt, review.note ?? null]
        );

        return {
          ok: true,
          hazardId,
          status: review.status,
          publicOverlayEligible,
          reviewedAt,
        };
      });
    },

    async getSummary(): Promise<CommunityHazardSummary> {
      const hazards = await listRecords();
      const batches = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM community_hazard_batches');
      const regions = hazards.reduce<Record<string, number>>((counts, hazard) => {
        counts[hazard.region] = (counts[hazard.region] ?? 0) + 1;
        return counts;
      }, {});
      const byType = hazards.reduce<Record<string, number>>((counts, hazard) => {
        counts[hazard.type] = (counts[hazard.type] ?? 0) + 1;
        return counts;
      }, {});
      const bySeverity = hazards.reduce<Record<string, number>>((counts, hazard) => {
        counts[hazard.severity] = (counts[hazard.severity] ?? 0) + 1;
        return counts;
      }, {});
      const byReviewStatus = hazards.reduce<CommunityHazardSummary['byReviewStatus']>((counts, hazard) => {
        counts[hazard.reviewStatus] = (counts[hazard.reviewStatus] ?? 0) + 1;
        return counts;
      }, { pending: 0, accepted: 0, rejected: 0 });
      const latestReportedAt = hazards.map((hazard) => hazard.reportedAt).sort().at(-1);

      return {
        totalRecords: hazards.length,
        batchCount: Number(batches.rows[0]?.count ?? 0),
        regions,
        byType,
        bySeverity,
        byReviewStatus,
        publicOverlayEligible: hazards.filter((hazard) => hazard.publicOverlayEligible).length,
        pendingReviewCount: byReviewStatus.pending,
        latestReportedAt,
      };
    },

    async listRecords() {
      return listRecords();
    },

    async listReviews() {
      const result = await pool.query<{
        hazard_id: string;
        status: StoredHazardReview['status'];
        reviewed_by: string;
        reviewed_at: unknown;
        note: string | null;
      }>(
        `SELECT
          h.external_hazard_id AS hazard_id,
          r.status,
          r.reviewed_by,
          r.reviewed_at,
          r.note
        FROM community_hazard_reviews r
        JOIN community_hazards h ON h.id = r.hazard_id
        ORDER BY r.reviewed_at ASC, h.external_hazard_id ASC`
      );

      return result.rows.map((row) => ({
        hazardId: row.hazard_id,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: toIsoString(row.reviewed_at),
        note: row.note ?? undefined,
      }));
    },
  };
}

function createPostgisAggregateReleaseRepository(pool: Pool): CommunityAggregateReleaseRepository {
  async function listAggregateReleases(): Promise<CommunityAggregateReleaseManifest[]> {
    const result = await pool.query<{ manifest: unknown }>(
      `SELECT manifest
      FROM dataset_release_manifests
      WHERE region = 'NB_PILOT' AND product_kind = 'aggregate_geojson'
      ORDER BY generated_at DESC, release_id DESC`
    );

    return result.rows.map((row) => mapReleaseManifest(row.manifest));
  }

  return {
    async publishAggregateRelease(input) {
      return withTransaction(pool, async (client) => {
        const generatedBy = input.generatedBy?.trim() || 'system:auto';
        await client.query(
          `INSERT INTO dataset_release_manifests (
            release_id, region, product_kind, official_chart_data_included,
            raw_record_ids_included, vessel_ids_included, generated_by, generated_at, manifest
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
          ON CONFLICT (release_id) DO UPDATE SET
            region = EXCLUDED.region,
            product_kind = EXCLUDED.product_kind,
            official_chart_data_included = EXCLUDED.official_chart_data_included,
            raw_record_ids_included = EXCLUDED.raw_record_ids_included,
            vessel_ids_included = EXCLUDED.vessel_ids_included,
            generated_by = EXCLUDED.generated_by,
            generated_at = EXCLUDED.generated_at,
            manifest = EXCLUDED.manifest`,
          [
            input.manifest.id,
            input.manifest.region,
            input.manifest.productKind,
            input.manifest.rules.officialChartDataIncluded,
            input.manifest.rules.rawRecordIdsIncluded,
            input.manifest.rules.vesselIdsIncluded,
            generatedBy,
            input.manifest.generatedAt,
            JSON.stringify(input.manifest),
          ]
        );

        for (const feature of input.aggregate.features) {
          const { properties } = feature;
          await client.query(
            `INSERT INTO community_aggregate_cells (
              cell_id, region, cell_size_degrees, geom, sounding_count, observation_count,
              weather_observation_count, condition_observation_count, ais_target_observation_count,
              track_point_observation_count, radar_contact_observation_count, health_observation_count, hazard_count,
              high_hazard_count, medium_hazard_count, low_hazard_count, min_depth_meters,
              max_depth_meters, average_depth_meters, average_confidence, raw_record_ids_included,
              vessel_ids_included, official_chart_data_included, generated_at
            ) VALUES (
              $1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
            )
            ON CONFLICT (cell_id, cell_size_degrees, generated_at) DO UPDATE SET
              region = EXCLUDED.region,
              geom = EXCLUDED.geom,
              sounding_count = EXCLUDED.sounding_count,
              observation_count = EXCLUDED.observation_count,
              weather_observation_count = EXCLUDED.weather_observation_count,
              condition_observation_count = EXCLUDED.condition_observation_count,
              ais_target_observation_count = EXCLUDED.ais_target_observation_count,
              track_point_observation_count = EXCLUDED.track_point_observation_count,
              radar_contact_observation_count = EXCLUDED.radar_contact_observation_count,
              health_observation_count = EXCLUDED.health_observation_count,
              hazard_count = EXCLUDED.hazard_count,
              high_hazard_count = EXCLUDED.high_hazard_count,
              medium_hazard_count = EXCLUDED.medium_hazard_count,
              low_hazard_count = EXCLUDED.low_hazard_count,
              min_depth_meters = EXCLUDED.min_depth_meters,
              max_depth_meters = EXCLUDED.max_depth_meters,
              average_depth_meters = EXCLUDED.average_depth_meters,
              average_confidence = EXCLUDED.average_confidence,
              raw_record_ids_included = EXCLUDED.raw_record_ids_included,
              vessel_ids_included = EXCLUDED.vessel_ids_included,
              official_chart_data_included = EXCLUDED.official_chart_data_included`,
            [
              properties.cellId,
              properties.region,
              properties.cellSizeDegrees,
              JSON.stringify(feature.geometry),
              properties.soundingCount,
              properties.observationCount,
              properties.weatherObservationCount,
              properties.conditionObservationCount,
              properties.aisTargetObservationCount,
              properties.trackPointObservationCount,
              properties.radarContactObservationCount,
              properties.healthObservationCount,
              properties.hazardCount,
              properties.highHazardCount,
              properties.mediumHazardCount,
              properties.lowHazardCount,
              properties.minDepthMeters,
              properties.maxDepthMeters,
              properties.averageDepthMeters,
              properties.averageConfidence,
              false,
              false,
              false,
              input.manifest.generatedAt,
            ]
          );
        }

        return input.manifest;
      });
    },

    async getLatestAggregateRelease() {
      return (await listAggregateReleases()).at(0) ?? null;
    },

    listAggregateReleases,

    async listAggregateCells(releaseId) {
      const release = await pool.query<{ generated_at: unknown }>(
        `SELECT generated_at
        FROM dataset_release_manifests
        WHERE release_id = $1 AND region = 'NB_PILOT' AND product_kind = 'aggregate_geojson'`,
        [releaseId]
      );
      const generatedAt = release.rows[0]?.generated_at;
      if (!generatedAt) return [];

      const result = await pool.query<{
        cell_id: string;
        region: string;
        cell_size_degrees: string | number;
        geometry: unknown;
        sounding_count: string | number;
        observation_count: string | number;
        weather_observation_count: string | number;
        condition_observation_count: string | number;
        ais_target_observation_count: string | number;
        track_point_observation_count: string | number;
        radar_contact_observation_count: string | number;
        health_observation_count: string | number;
        hazard_count: string | number;
        high_hazard_count: string | number;
        medium_hazard_count: string | number;
        low_hazard_count: string | number;
        min_depth_meters: string | number | null;
        max_depth_meters: string | number | null;
        average_depth_meters: string | number | null;
        average_confidence: string | number | null;
        generated_at: unknown;
      }>(
        `SELECT
          cell_id,
          region,
          cell_size_degrees,
          ST_AsGeoJSON(geom) AS geometry,
          sounding_count,
          observation_count,
          weather_observation_count,
          condition_observation_count,
          ais_target_observation_count,
          track_point_observation_count,
          radar_contact_observation_count,
          health_observation_count,
          hazard_count,
          high_hazard_count,
          medium_hazard_count,
          low_hazard_count,
          min_depth_meters,
          max_depth_meters,
          average_depth_meters,
          average_confidence,
          generated_at
        FROM community_aggregate_cells
        WHERE generated_at = $1::timestamptz
        ORDER BY cell_id ASC`,
        [generatedAt]
      );

      return result.rows.map((row): StoredCommunityAggregateCell => ({
        releaseId,
        generatedAt: toIsoString(row.generated_at),
        cellId: row.cell_id,
        region: row.region,
        cellSizeDegrees: toNumber(row.cell_size_degrees),
        geometry: mapAggregateGeometry(row.geometry),
        soundingCount: toNumber(row.sounding_count),
        observationCount: toNumber(row.observation_count),
        weatherObservationCount: toNumber(row.weather_observation_count),
        conditionObservationCount: toNumber(row.condition_observation_count),
        aisTargetObservationCount: toNumber(row.ais_target_observation_count),
        trackPointObservationCount: toNumber(row.track_point_observation_count),
        radarContactObservationCount: toNumber(row.radar_contact_observation_count),
        healthObservationCount: toNumber(row.health_observation_count),
        hazardCount: toNumber(row.hazard_count),
        highHazardCount: toNumber(row.high_hazard_count),
        mediumHazardCount: toNumber(row.medium_hazard_count),
        lowHazardCount: toNumber(row.low_hazard_count),
        minDepthMeters: toNullableNumber(row.min_depth_meters),
        maxDepthMeters: toNullableNumber(row.max_depth_meters),
        averageDepthMeters: toNullableNumber(row.average_depth_meters),
        averageConfidence: toNullableNumber(row.average_confidence),
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
        officialChartDataIncluded: false,
      }));
    },
  };
}

function createPostgisDeviceRepository(pool: Pool): DeviceRepository {
  return {
    async registerDevice(registration) {
      return withTransaction(pool, async (client) => {
        const existing = await client.query<{ device_id: string }>(
          'SELECT device_id FROM devices WHERE device_id = $1',
          [registration.deviceId]
        );
        const vessel = await client.query<{ id: string }>(
          `INSERT INTO vessels (external_vessel_id, display_name, home_region, updated_at)
          VALUES ($1, $2, 'NB_PILOT', now())
          ON CONFLICT (external_vessel_id) DO UPDATE SET updated_at = now()
          RETURNING id`,
          [registration.vesselId, registration.vesselId]
        );
        await client.query(
          `INSERT INTO devices (
            device_id, vessel_id, external_vessel_id, display_name, kind, software_version,
            signal_k_base_url, capabilities, consent_captured_at, registered_at, last_seen_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, now())
          ON CONFLICT (device_id) DO UPDATE SET
            vessel_id = EXCLUDED.vessel_id,
            external_vessel_id = EXCLUDED.external_vessel_id,
            display_name = EXCLUDED.display_name,
            kind = EXCLUDED.kind,
            software_version = EXCLUDED.software_version,
            signal_k_base_url = EXCLUDED.signal_k_base_url,
            capabilities = EXCLUDED.capabilities,
            consent_captured_at = EXCLUDED.consent_captured_at,
            registered_at = EXCLUDED.registered_at,
            last_seen_at = EXCLUDED.last_seen_at,
            updated_at = now()`,
          [
            registration.deviceId,
            vessel.rows[0].id,
            registration.vesselId,
            registration.displayName,
            registration.kind,
            registration.softwareVersion ?? null,
            registration.signalKBaseUrl ?? null,
            JSON.stringify(registration.capabilities),
            registration.consentCapturedAt ?? registration.registeredAt,
            registration.registeredAt,
            registration.registeredAt,
          ]
        );

        return {
          ok: true,
          deviceId: registration.deviceId,
          vesselId: registration.vesselId,
          status: existing.rowCount ? 'updated' : 'registered',
          registeredAt: registration.registeredAt,
        };
      });
    },

    async listDevices() {
      const result = await pool.query<{
        device_id: string;
        external_vessel_id: string;
        display_name: string;
        kind: DeviceRegistration['kind'];
        software_version: string | null;
        signal_k_base_url: string | null;
        registered_at: unknown;
        consent_captured_at: unknown;
        capabilities: unknown;
      }>(
        `SELECT
          device_id,
          external_vessel_id,
          display_name,
          kind,
          software_version,
          signal_k_base_url,
          registered_at,
          consent_captured_at,
          capabilities
        FROM devices
        ORDER BY display_name ASC`
      );

      return result.rows.map(mapDeviceRegistration);
    },

    async getDevice(deviceId) {
      const result = await pool.query<{
        device_id: string;
        external_vessel_id: string;
        display_name: string;
        kind: DeviceRegistration['kind'];
        software_version: string | null;
        signal_k_base_url: string | null;
        registered_at: unknown;
        consent_captured_at: unknown;
        capabilities: unknown;
      }>(
        `SELECT
          device_id,
          external_vessel_id,
          display_name,
          kind,
          software_version,
          signal_k_base_url,
          registered_at,
          consent_captured_at,
          capabilities
        FROM devices
        WHERE device_id = $1`,
        [deviceId]
      );

      return result.rows[0] ? mapDeviceRegistration(result.rows[0]) : null;
    },
  };
}

function mapDeviceRegistration(row: {
  device_id: string;
  external_vessel_id: string;
  display_name: string;
  kind: DeviceRegistration['kind'];
  software_version: string | null;
  signal_k_base_url: string | null;
  registered_at: unknown;
  consent_captured_at: unknown;
  capabilities: unknown;
}): DeviceRegistration {
  return {
    deviceId: row.device_id,
    vesselId: row.external_vessel_id,
    displayName: row.display_name,
    kind: row.kind,
    softwareVersion: row.software_version ?? undefined,
    signalKBaseUrl: row.signal_k_base_url ?? undefined,
    registeredAt: toIsoString(row.registered_at),
    consentCapturedAt: toIsoString(row.consent_captured_at),
    capabilities: toJsonObject(row.capabilities, {
      position: false,
      depth: false,
      ais: false,
      radar: false,
      sonar: false,
      weather: false,
    }),
  };
}
