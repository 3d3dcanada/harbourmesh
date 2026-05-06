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
    expect(sql).toMatch(/community_hazards[\s\S]+geom geometry\(Point, 4326\)/);
    expect(sql).toMatch(/community_aggregate_cells[\s\S]+geom geometry\(Polygon, 4326\) NOT NULL/);
    expect(sql).toContain('idx_community_soundings_geom ON community_soundings USING gist(geom)');
    expect(sql).toContain('idx_community_hazards_geom ON community_hazards USING gist(geom)');
    expect(sql).toContain('idx_aggregate_cells_geom ON community_aggregate_cells USING gist(geom)');
  });

  it('keeps official chart data and raw identifiers out of shared products by schema rule', async () => {
    const sql = await readMigration();

    expect(sql.match(/official_chart_data_included boolean NOT NULL DEFAULT false CHECK \(official_chart_data_included = false\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(sql).toContain('raw_record_ids_included boolean NOT NULL DEFAULT false CHECK (raw_record_ids_included = false)');
    expect(sql).toContain('vessel_ids_included boolean NOT NULL DEFAULT false CHECK (vessel_ids_included = false)');
    expect(sql).toContain("CHECK (public_overlay_eligible = false OR (review_status = 'accepted' AND geom IS NOT NULL))");
  });
});
