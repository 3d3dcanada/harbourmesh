-- HarbourMesh NB pilot community mesh schema.
-- This migration defines the production PostGIS target. The server uses it when
-- HARBOURMESH_DATABASE_URL is configured and keeps JSONL as the local fallback.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_vessel_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  home_region text NOT NULL DEFAULT 'NB_PILOT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL,
  external_vessel_id text,
  display_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('boat_node', 'mobile_app', 'desktop_app', 'gateway', 'signalk_server', 'mobile', 'manual_import', 'other')),
  software_version text,
  signal_k_base_url text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_captured_at timestamptz NOT NULL,
  registered_at timestamptz NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_external_vessel_id ON devices(external_vessel_id);
CREATE INDEX IF NOT EXISTS idx_devices_kind ON devices(kind);

ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_kind_check;
ALTER TABLE devices ADD CONSTRAINT devices_kind_check
  CHECK (kind IN ('boat_node', 'mobile_app', 'desktop_app', 'gateway', 'signalk_server', 'mobile', 'manual_import', 'other'));

CREATE TABLE IF NOT EXISTS community_sounding_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_batch_id text UNIQUE NOT NULL,
  schema_version text NOT NULL CHECK (schema_version = 'harbourmesh.community-soundings.v1'),
  region text NOT NULL,
  record_count integer NOT NULL CHECK (record_count > 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  intended_use text NOT NULL CHECK (intended_use = 'community_reference_overlay'),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  contains_full_shared_positions boolean NOT NULL DEFAULT false,
  raw_local_positions_included boolean NOT NULL DEFAULT false CHECK (raw_local_positions_included = false),
  created_at timestamptz NOT NULL,
  stored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sounding_batches_region ON community_sounding_batches(region);
CREATE INDEX IF NOT EXISTS idx_sounding_batches_created_at ON community_sounding_batches(created_at);

CREATE TABLE IF NOT EXISTS community_soundings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_record_id text UNIQUE NOT NULL,
  batch_id uuid NOT NULL REFERENCES community_sounding_batches(id) ON DELETE CASCADE,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL,
  external_vessel_id text NOT NULL,
  source_device_id text NOT NULL,
  source_protocol text NOT NULL CHECK (source_protocol IN ('signalk', 'nmea0183', 'nmea2000', 'manual', 'replay', 'simulated')),
  raw_message_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  consent_captured_at timestamptz NOT NULL,
  sharing_state text NOT NULL CHECK (sharing_state IN ('shareable_blurred', 'shareable_full')),
  geom geometry(Point, 4326) NOT NULL,
  raw_depth_meters numeric(8, 3) NOT NULL CHECK (raw_depth_meters > 0 AND raw_depth_meters <= 250),
  depth_meters numeric(8, 3) NOT NULL CHECK (depth_meters > 0 AND depth_meters <= 250),
  depth_reference text NOT NULL CHECK (depth_reference IN ('below_surface', 'below_transducer', 'below_keel', 'unknown')),
  tide_correction_applied boolean NOT NULL DEFAULT false CHECK (tide_correction_applied = false),
  water_level_correction_applied boolean NOT NULL DEFAULT false CHECK (water_level_correction_applied = false),
  offsets jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_confidence numeric(4, 3) NOT NULL CHECK (quality_confidence >= 0 AND quality_confidence <= 1),
  quality_rejected boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'accepted', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  review_reason text CHECK (review_reason IS NULL OR review_reason IN ('outlier', 'duplicate', 'bad_position', 'bad_offset', 'sensor_fault', 'other')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  stored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_soundings_geom ON community_soundings USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_community_soundings_observed_at ON community_soundings(observed_at);
CREATE INDEX IF NOT EXISTS idx_community_soundings_source_device ON community_soundings(source_device_id);
CREATE INDEX IF NOT EXISTS idx_community_soundings_shareable ON community_soundings(quality_rejected, sharing_state);
CREATE INDEX IF NOT EXISTS idx_community_soundings_review_status ON community_soundings(review_status);

ALTER TABLE community_soundings ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'unreviewed';
ALTER TABLE community_soundings ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE community_soundings ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE community_soundings ADD COLUMN IF NOT EXISTS review_reason text;
ALTER TABLE community_soundings ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE community_soundings DROP CONSTRAINT IF EXISTS community_soundings_review_status_check;
ALTER TABLE community_soundings ADD CONSTRAINT community_soundings_review_status_check
  CHECK (review_status IN ('unreviewed', 'accepted', 'rejected'));
ALTER TABLE community_soundings DROP CONSTRAINT IF EXISTS community_soundings_review_reason_check;
ALTER TABLE community_soundings ADD CONSTRAINT community_soundings_review_reason_check
  CHECK (review_reason IS NULL OR review_reason IN ('outlier', 'duplicate', 'bad_position', 'bad_offset', 'sensor_fault', 'other'));
ALTER TABLE community_soundings DROP CONSTRAINT IF EXISTS community_soundings_review_note_check;
ALTER TABLE community_soundings ADD CONSTRAINT community_soundings_review_note_check
  CHECK (review_note IS NULL OR char_length(review_note) <= 500);
UPDATE community_soundings
SET review_status = 'rejected'
WHERE quality_rejected = true AND review_status = 'unreviewed';

CREATE TABLE IF NOT EXISTS community_sounding_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sounding_id uuid NOT NULL REFERENCES community_soundings(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('accepted', 'rejected')),
  reviewed_by text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reason text CHECK (reason IS NULL OR reason IN ('outlier', 'duplicate', 'bad_position', 'bad_offset', 'sensor_fault', 'other')),
  note text CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_sounding_reviews_sounding_id ON community_sounding_reviews(sounding_id);
CREATE INDEX IF NOT EXISTS idx_sounding_reviews_reviewed_at ON community_sounding_reviews(reviewed_at);

CREATE TABLE IF NOT EXISTS community_observation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_batch_id text UNIQUE NOT NULL,
  schema_version text NOT NULL CHECK (schema_version = 'harbourmesh.community-observations.v1'),
  region text NOT NULL,
  record_count integer NOT NULL CHECK (record_count > 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  intended_use text NOT NULL CHECK (intended_use = 'community_reference_overlay'),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  contains_full_shared_positions boolean NOT NULL DEFAULT false,
  raw_local_positions_included boolean NOT NULL DEFAULT false CHECK (raw_local_positions_included = false),
  raw_sensor_payloads_included boolean NOT NULL DEFAULT false CHECK (raw_sensor_payloads_included = false),
  created_at timestamptz NOT NULL,
  stored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observation_batches_region ON community_observation_batches(region);
CREATE INDEX IF NOT EXISTS idx_observation_batches_created_at ON community_observation_batches(created_at);

CREATE TABLE IF NOT EXISTS community_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_record_id text UNIQUE NOT NULL,
  batch_id uuid NOT NULL REFERENCES community_observation_batches(id) ON DELETE CASCADE,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL,
  external_vessel_id text NOT NULL,
  source_device_id text NOT NULL,
  source_protocol text NOT NULL CHECK (source_protocol IN ('signalk', 'nmea0183', 'nmea2000', 'manual', 'replay', 'simulated')),
  observation_type text NOT NULL CHECK (observation_type IN ('ais_target', 'radar_contact', 'weather', 'condition', 'track_point', 'system_health', 'other')),
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  consent_captured_at timestamptz NOT NULL,
  sharing_state text NOT NULL CHECK (sharing_state IN ('shareable_no_position', 'shareable_blurred', 'shareable_full')),
  geom geometry(Point, 4326),
  position jsonb,
  position_source text CHECK (position_source IN ('gps', 'ais', 'radar', 'manual', 'estimated')),
  position_accuracy_meters numeric(10, 3) CHECK (position_accuracy_meters >= 0),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_confidence numeric(4, 3) NOT NULL CHECK (quality_confidence >= 0 AND quality_confidence <= 1),
  quality_rejected boolean NOT NULL DEFAULT false CHECK (quality_rejected = false),
  raw_payload_included boolean NOT NULL DEFAULT false CHECK (raw_payload_included = false),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  stored_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((sharing_state = 'shareable_no_position' AND geom IS NULL) OR (sharing_state <> 'shareable_no_position' AND geom IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_community_observations_geom ON community_observations USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_community_observations_observed_at ON community_observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_community_observations_type ON community_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_community_observations_source_device ON community_observations(source_device_id);

ALTER TABLE community_observations ADD COLUMN IF NOT EXISTS position jsonb;

CREATE TABLE IF NOT EXISTS community_hazard_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_batch_id text UNIQUE NOT NULL,
  schema_version text NOT NULL CHECK (schema_version = 'harbourmesh.community-hazards.v1'),
  region text NOT NULL,
  record_count integer NOT NULL CHECK (record_count > 0),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  intended_use text NOT NULL CHECK (intended_use = 'community_reference_overlay'),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  contains_full_shared_positions boolean NOT NULL DEFAULT false,
  raw_local_positions_included boolean NOT NULL DEFAULT false CHECK (raw_local_positions_included = false),
  created_at timestamptz NOT NULL,
  stored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hazard_batches_region ON community_hazard_batches(region);
CREATE INDEX IF NOT EXISTS idx_hazard_batches_created_at ON community_hazard_batches(created_at);

CREATE TABLE IF NOT EXISTS community_hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_hazard_id text UNIQUE NOT NULL,
  batch_id uuid NOT NULL REFERENCES community_hazard_batches(id) ON DELETE CASCADE,
  vessel_id uuid REFERENCES vessels(id) ON DELETE SET NULL,
  external_vessel_id text NOT NULL,
  source_device_id text,
  region text NOT NULL,
  hazard_type text NOT NULL CHECK (hazard_type IN ('traffic', 'weather', 'obstruction', 'shoal', 'debris', 'other')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 3 AND 500),
  geom geometry(Point, 4326),
  position_source text CHECK (position_source IN ('gps', 'ais', 'manual', 'estimated')),
  position_accuracy_meters numeric(10, 3) CHECK (position_accuracy_meters >= 0),
  reported_at timestamptz NOT NULL,
  consent_captured_at timestamptz NOT NULL,
  sharing_state text NOT NULL CHECK (sharing_state IN ('shareable_no_position', 'shareable_blurred', 'shareable_full')),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  public_overlay_eligible boolean NOT NULL DEFAULT false,
  position jsonb,
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  stored_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  CHECK ((sharing_state = 'shareable_no_position' AND geom IS NULL) OR (sharing_state <> 'shareable_no_position' AND geom IS NOT NULL)),
  CHECK (public_overlay_eligible = false OR (review_status = 'accepted' AND geom IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_community_hazards_geom ON community_hazards USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_community_hazards_review_status ON community_hazards(review_status);
CREATE INDEX IF NOT EXISTS idx_community_hazards_public_overlay ON community_hazards(public_overlay_eligible);
CREATE INDEX IF NOT EXISTS idx_community_hazards_reported_at ON community_hazards(reported_at);

ALTER TABLE community_hazards ADD COLUMN IF NOT EXISTS position jsonb;

CREATE TABLE IF NOT EXISTS community_hazard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id uuid NOT NULL REFERENCES community_hazards(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('accepted', 'rejected')),
  reviewed_by text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  note text CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_hazard_reviews_hazard_id ON community_hazard_reviews(hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazard_reviews_reviewed_at ON community_hazard_reviews(reviewed_at);

CREATE TABLE IF NOT EXISTS community_aggregate_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id text NOT NULL,
  region text NOT NULL,
  cell_size_degrees numeric(8, 6) NOT NULL CHECK (cell_size_degrees > 0),
  geom geometry(Polygon, 4326) NOT NULL,
  sounding_count integer NOT NULL DEFAULT 0 CHECK (sounding_count >= 0),
  observation_count integer NOT NULL DEFAULT 0 CHECK (observation_count >= 0),
  weather_observation_count integer NOT NULL DEFAULT 0 CHECK (weather_observation_count >= 0),
  condition_observation_count integer NOT NULL DEFAULT 0 CHECK (condition_observation_count >= 0),
  ais_target_observation_count integer NOT NULL DEFAULT 0 CHECK (ais_target_observation_count >= 0),
  track_point_observation_count integer NOT NULL DEFAULT 0 CHECK (track_point_observation_count >= 0),
  radar_contact_observation_count integer NOT NULL DEFAULT 0 CHECK (radar_contact_observation_count >= 0),
  health_observation_count integer NOT NULL DEFAULT 0 CHECK (health_observation_count >= 0),
  hazard_count integer NOT NULL DEFAULT 0 CHECK (hazard_count >= 0),
  high_hazard_count integer NOT NULL DEFAULT 0 CHECK (high_hazard_count >= 0),
  medium_hazard_count integer NOT NULL DEFAULT 0 CHECK (medium_hazard_count >= 0),
  low_hazard_count integer NOT NULL DEFAULT 0 CHECK (low_hazard_count >= 0),
  min_depth_meters numeric(8, 3),
  max_depth_meters numeric(8, 3),
  average_depth_meters numeric(8, 3),
  average_confidence numeric(4, 3) CHECK (average_confidence IS NULL OR (average_confidence >= 0 AND average_confidence <= 1)),
  raw_record_ids_included boolean NOT NULL DEFAULT false CHECK (raw_record_ids_included = false),
  vessel_ids_included boolean NOT NULL DEFAULT false CHECK (vessel_ids_included = false),
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cell_id, cell_size_degrees, generated_at)
);

ALTER TABLE community_aggregate_cells
  ADD COLUMN IF NOT EXISTS track_point_observation_count integer NOT NULL DEFAULT 0 CHECK (track_point_observation_count >= 0);

CREATE INDEX IF NOT EXISTS idx_aggregate_cells_geom ON community_aggregate_cells USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_aggregate_cells_region_generated ON community_aggregate_cells(region, generated_at);

CREATE TABLE IF NOT EXISTS dataset_release_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text UNIQUE NOT NULL,
  region text NOT NULL,
  product_kind text NOT NULL CHECK (product_kind IN ('aggregate_geojson', 'aggregate_vector_tiles', 'offline_reference_package')),
  source_started_at timestamptz,
  source_ended_at timestamptz,
  official_chart_data_included boolean NOT NULL DEFAULT false CHECK (official_chart_data_included = false),
  raw_record_ids_included boolean NOT NULL DEFAULT false CHECK (raw_record_ids_included = false),
  vessel_ids_included boolean NOT NULL DEFAULT false CHECK (vessel_ids_included = false),
  generated_by text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_release_manifests_region_kind ON dataset_release_manifests(region, product_kind);
CREATE INDEX IF NOT EXISTS idx_release_manifests_generated_at ON dataset_release_manifests(generated_at);

INSERT INTO schema_migrations(version)
VALUES ('0001_nb_pilot_community_mesh')
ON CONFLICT (version) DO NOTHING;
