#!/usr/bin/env node
/**
 * tile-nb-reference.mjs
 *
 * Tiles the three most useful NB GeoJSON reference layers into a single PMTiles file
 * using tippecanoe. Output goes to app/public/tiles/nb-reference.pmtiles.
 *
 * Usage:
 *   node scripts/tile-nb-reference.mjs
 *
 * Requires:
 *   tippecanoe >= 2.x  (brew install tippecanoe  OR  apt install tippecanoe)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DATA_DIR = resolve(root, 'output/atlantic-open-data-2026-05-07/raw/nb');
const OUT_DIR  = resolve(root, 'app/public/tiles');
const OUT_FILE = resolve(OUT_DIR, 'nb-reference.pmtiles');

const LAYERS = [
  { file: 'geonb-nbhn-coastline.geojson',            layer: 'coastline' },
  { file: 'geonb-nbhn-obstacles-points.geojson',      layer: 'obstacles' },
  { file: 'geonb-nbhn-named-features-points.geojson', layer: 'named_features' },
];

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.error) {
    console.error(`Failed to run ${cmd}: ${result.error.message}`);
    process.exit(1);
  }
  return result;
}

function checkTippecanoe() {
  const result = spawnSync('tippecanoe', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
  if (result.error) {
    console.error('tippecanoe is not installed or not in PATH.');
    console.error('Install: brew install tippecanoe  |  sudo apt install tippecanoe');
    process.exit(1);
  }
  console.log('tippecanoe found:', (result.stderr || result.stdout || '').trim());
}

function checkInputs() {
  for (const { file } of LAYERS) {
    const path = resolve(DATA_DIR, file);
    if (!existsSync(path)) {
      console.error(`Missing input file: ${path}`);
      console.error('Run the Atlantic data downloader first: node scripts/download-atlantic-open-data.mjs');
      process.exit(1);
    }
    console.log(`  found: ${file}`);
  }
}

function tile() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Build args as a flat array — no shell interpolation, no injection risk.
  const args = [];
  for (const { file, layer } of LAYERS) {
    args.push('--named-layer', `${layer}:${resolve(DATA_DIR, file)}`);
  }
  args.push(
    '--output', OUT_FILE,
    '--force',
    '--minimum-zoom', '6',
    '--maximum-zoom', '14',
    '--drop-densest-as-needed',
    '--extend-zooms-if-still-dropping',
    '--attribution', 'GeoNB / New Brunswick Hydrographic Network (Government of NB)',
  );

  console.log('\nRunning tippecanoe with', args.length, 'arguments...');
  run('tippecanoe', args);
  console.log(`\nDone: ${OUT_FILE}`);
}

checkTippecanoe();
console.log('\nChecking input files:');
checkInputs();
tile();
