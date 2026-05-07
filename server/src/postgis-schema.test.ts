import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../db/migrations/0001_nb_pilot_community_mesh.sql'
);

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

describe('NB pilot PostGIS schema migration', () => {
  it('defines the core community mesh tables and PostGIS extension', async () => {
    const sql = await readMigration();

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    for (const table of [
      'vessels',
      'devices',
      'community_sounding_batches',
      'community_soundings',
      'community_sounding_reviews',
      'community_observation_batches',
      'community_observations',
      'community_hazard_batches',
      'community_hazards',
      'community_hazard_reviews',
      'community_aggregate_cells',
      'dataset_release_manifests',
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it('uses spatial columns and indexes for observations, hazards, and aggregates', async () => {
    const sql = await readMigration();

    expect(sql).toMatch(/community_soundings[\s\S]+geom geometry\(Point, 4326\) NOT NULL/);
    expect(sql).toMatch(/community_observations[\s\S]+geom geometry\(Point, 4326\)/);
    expect(sql).toMatch(/community_hazards[\s\S]+geom geometry\(Point, 4326\)/);
    expect(sql).toMatch(/community_observations[\s\S]+position jsonb/);
    expect(sql).toMatch(/community_hazards[\s\S]+position jsonb/);
    expect(sql).toContain('ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS position jsonb');
    expect(sql).toContain('ALTER TABLE community_hazards ADD COLUMN IF NOT EXISTS position jsonb');
    expect(sql).toMatch(/community_aggregate_cells[\s\S]+geom geometry\(Polygon, 4326\) NOT NULL/);
    expect(sql).toContain('idx_community_soundings_geom ON community_soundings USING gist(geom)');
    expect(sql).toContain('idx_community_soundings_review_status ON community_soundings(review_status)');
    expect(sql).toContain('idx_community_observations_geom ON community_observations USING gist(geom)');
    expect(sql).toContain('idx_community_hazards_geom ON community_hazards USING gist(geom)');
    expect(sql).toContain('idx_aggregate_cells_geom ON community_aggregate_cells USING gist(geom)');
    expect(sql).toContain('observation_count integer NOT NULL DEFAULT 0 CHECK (observation_count >= 0)');
    expect(sql).toContain('track_point_observation_count integer NOT NULL DEFAULT 0 CHECK (track_point_observation_count >= 0)');
    expect(sql).toContain('ALTER TABLE community_aggregate_cells');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS track_point_observation_count integer NOT NULL DEFAULT 0 CHECK (track_point_observation_count >= 0)');
  });

  it('keeps official chart data and raw identifiers out of shared products by schema rule', async () => {
    const sql = await readMigration();

    expect(sql.match(/official_chart_data_included boolean NOT NULL DEFAULT false CHECK \(official_chart_data_included = false\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(sql).toContain('raw_record_ids_included boolean NOT NULL DEFAULT false CHECK (raw_record_ids_included = false)');
    expect(sql).toContain('vessel_ids_included boolean NOT NULL DEFAULT false CHECK (vessel_ids_included = false)');
    expect(sql).toContain("review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'accepted', 'rejected'))");
    expect(sql).toContain("CHECK (public_overlay_eligible = false OR (review_status = 'accepted' AND geom IS NOT NULL))");
  });

  it('keeps account ownership metadata on private account-scoped tables only', async () => {
    const sql = await readMigration();

    for (const column of [
      'owner_account_id text',
      "owner_account_roles jsonb NOT NULL DEFAULT '[]'::jsonb",
      'reviewed_by_account_id text',
      "reviewed_by_account_roles jsonb NOT NULL DEFAULT '[]'::jsonb",
      'published_by_account_id text',
      "published_by_account_roles jsonb NOT NULL DEFAULT '[]'::jsonb",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain('idx_devices_owner_account ON devices(owner_account_id)');
    expect(sql).toContain('idx_community_soundings_owner_account ON community_soundings(owner_account_id)');
    expect(sql).toContain('idx_community_hazards_owner_account ON community_hazards(owner_account_id)');
    expect(sql).toContain('idx_release_manifests_publisher_account ON dataset_release_manifests(published_by_account_id)');
    expect(sql).not.toMatch(/community_aggregate_cells[\s\S]+owner_account_id/);
  });

  it('matches runtime device kinds and documents the PostGIS env switch', async () => {
    const sql = await readMigration();

    expect(sql).toContain("kind text NOT NULL CHECK (kind IN ('boat_node', 'mobile_app', 'desktop_app', 'gateway'");
    expect(sql).toContain('ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_kind_check');
    expect(sql).toContain('HARBOURMESH_DATABASE_URL');
  });
});
