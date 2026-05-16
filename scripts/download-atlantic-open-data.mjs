#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';

const outputRoot = process.argv[2] ?? 'output/atlantic-open-data-2026-05-07';
const userAgent = 'HarbourMesh Atlantic data bootstrap/2026-05-07 (research ingest; contact 3D3D)';

const atlanticBbox = {
  nb: [-68.5, 44.2, -63.6, 48.3],
  ns: [-66.6, 43.0, -59.6, 47.2],
  pei: [-64.8, 45.8, -61.8, 47.2],
};

const geonbService = 'https://geonb.snb.ca/arcgis/rest/services/GeoNB_DNR_NBHN/MapServer';
const nsgiwaService = 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_NSHN_UT83/MapServer';
const peiArcgis = 'https://services9.arcgis.com/zow9Ot3ujGSyJI3C/ArcGIS/rest/services';

const arcgisLayers = [
  ...[
    [0, 'named-features-points'],
    [1, 'obstacles-points'],
    [2, 'man-made-features-points'],
    [3, 'water-gauges'],
    [4, 'named-features-lines'],
    [5, 'obstacles-lines'],
    [6, 'man-made-features-lines'],
    [7, 'obstacles-polygons'],
    [8, 'named-features-polygons'],
    [9, 'man-made-features-polygons'],
    [10, 'water-courses'],
    [11, 'wetlands'],
    [12, 'islands'],
    [13, 'water-bodies'],
    [14, 'watersheds'],
    [15, 'coastline'],
    [16, 'coastal-features'],
  ].map(([layerId, slug]) => ({
    id: `geonb-nbhn-${slug}`,
    province: 'nb',
    serviceUrl: geonbService,
    layerId,
    slug,
    licence: 'Government of New Brunswick open/reference data; verify attribution before redistribution',
    sourcePolicy: 'reference_only',
  })),
  ...[
    [1, 'hydrography-lines'],
    [2, 'hydrography-polygons'],
    [4, 'junction-points'],
    [5, 'hydrography-points'],
    [7, 'flow-direction'],
    [8, 'delimiters'],
    [9, 'spines'],
    [10, 'dry-features-lines'],
    [11, 'wet-features-lines'],
    [13, 'toponymic-objects'],
    [14, 'dry-features-polygons'],
    [15, 'rapids'],
    [16, 'wet-features-polygons'],
  ].map(([layerId, slug]) => ({
    id: `geonova-nshn-${slug}`,
    province: 'ns',
    serviceUrl: nsgiwaService,
    layerId,
    slug,
    licence: 'Open Government Licence - Nova Scotia',
    sourcePolicy: 'reference_only',
  })),
  ...[
    ['PEI_Watercourse/FeatureServer', 56, 'watercourse'],
    ['Coastline/FeatureServer', 0, 'coastline'],
    ['Wetlands_2023_10_16/FeatureServer', 57, 'wetlands'],
    ['Water_Names/FeatureServer', 0, 'water-names'],
    ['WaterAccess/FeatureServer', 0, 'water-access'],
    ['Buoys_march_2025/FeatureServer', 0, 'buoys-march-2025'],
    ['Leases_march_2025/FeatureServer', 0, 'leases-march-2025'],
    ['License_march_2025/FeatureServer', 0, 'licenses-march-2025'],
    ['Fishing_Public/FeatureServer', 0, 'fishing-public'],
    ['Stream_Flow_Site_Background/FeatureServer', 0, 'stream-flow-sites'],
    ['PondBoundaries/FeatureServer', 0, 'pond-boundaries'],
  ].map(([servicePath, layerId, slug]) => ({
    id: `pei-${slug}`,
    province: 'pei',
    serviceUrl: `${peiArcgis}/${servicePath}`,
    layerId,
    slug,
    licence: 'Government of Prince Edward Island public ArcGIS service; verify dataset page attribution before redistribution',
    sourcePolicy: 'reference_only',
  })),
];

const fileDownloads = [
  {
    id: 'geofabrik-new-brunswick-osm-pbf',
    province: 'nb',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/new-brunswick-latest.osm.pbf',
    path: 'raw/osm/new-brunswick-latest.osm.pbf',
  },
  {
    id: 'geofabrik-new-brunswick-poly',
    province: 'nb',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/new-brunswick.poly',
    path: 'raw/osm/new-brunswick.poly',
  },
  {
    id: 'geofabrik-nova-scotia-osm-pbf',
    province: 'ns',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/nova-scotia-latest.osm.pbf',
    path: 'raw/osm/nova-scotia-latest.osm.pbf',
  },
  {
    id: 'geofabrik-nova-scotia-poly',
    province: 'ns',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/nova-scotia.poly',
    path: 'raw/osm/nova-scotia.poly',
  },
  {
    id: 'geofabrik-prince-edward-island-osm-pbf',
    province: 'pei',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/prince-edward-island-latest.osm.pbf',
    path: 'raw/osm/prince-edward-island-latest.osm.pbf',
  },
  {
    id: 'geofabrik-prince-edward-island-poly',
    province: 'pei',
    sourcePolicy: 'openstreetmap_odbl',
    url: 'https://download.geofabrik.de/north-america/canada/prince-edward-island.poly',
    path: 'raw/osm/prince-edward-island.poly',
  },
  {
    id: 'geonova-nshn-shp',
    province: 'ns',
    sourcePolicy: 'reference_only',
    url: 'https://nsgi.novascotia.ca/WSF_DDS/DDS.svc/DownloadFile?tkey=fhrTtdnDvfytwLz6&id=38906',
    path: 'raw/ns/nova-scotia-hydrographic-network.shp.zip',
  },
  {
    id: 'chs-9995-s57enc-sample',
    province: 'test-only',
    sourcePolicy: 'fictitious_test_chart_not_for_navigation',
    url: 'https://www.chs.gc.ca/documents/charts-cartes/instruction-formation/9995_S57ENC.zip',
    path: 'raw/chs-samples/9995_S57ENC.zip',
  },
  {
    id: 'chs-9995-bsbv3-sample',
    province: 'test-only',
    sourcePolicy: 'fictitious_test_chart_not_for_navigation',
    url: 'https://www.chs.gc.ca/documents/charts-cartes/instruction-formation/9995_BSBV3.zip',
    path: 'raw/chs-samples/9995_BSBV3.zip',
  },
];

const textDownloads = [
  {
    id: 'chs-nonna-wms-capabilities',
    sourcePolicy: 'non_navigational_bathymetry',
    url: 'https://nonna-geoserver.data.chs-shc.ca/geoserver/wms?request=GetCapabilities&service=WMS&version=1.3.0',
    path: 'metadata/chs-nonna/wms-capabilities.xml',
  },
  {
    id: 'chs-nonna-wcs-capabilities',
    sourcePolicy: 'non_navigational_bathymetry',
    url: 'https://nonna-geoserver.data.chs-shc.ca/geoserver/wcs?request=GetCapabilities&service=WCS&version=2.0.1',
    path: 'metadata/chs-nonna/wcs-capabilities.xml',
  },
  {
    id: 'eccc-geomet-collections',
    sourcePolicy: 'weather_open_data',
    url: 'https://api.weather.gc.ca/collections?f=json&limit=1000',
    path: 'metadata/eccc/geomet-collections.json',
  },
  {
    id: 'dfo-iwls-atlantic-stations',
    sourcePolicy: 'tides_currents_water_levels_api',
    url: 'https://api-sine.dfo-mpo.gc.ca/api/v1/stations?chs-region-code=ATL&lang=en',
    path: 'metadata/chs-iwls/atlantic-stations.json',
  },
  {
    id: 'nshn-socrata-metadata',
    sourcePolicy: 'reference_only',
    url: 'https://data.novascotia.ca/api/views/dk27-q8k2',
    path: 'metadata/ns/nshn-socrata-metadata.json',
  },
  {
    id: 'chs-nonna-open-canada-metadata',
    sourcePolicy: 'non_navigational_bathymetry',
    url: 'https://open.canada.ca/data/api/action/package_show?id=d3881c4c-650d-4070-bf9b-1e00aabf0a1d',
    path: 'metadata/chs-nonna/open-canada-package.json',
  },
];

async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

function progress(label, current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${label} (${current}/${total} — ${pct}%)`);
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    outputRoot,
    warning: 'Reference/bootstrap data only. CHS official navigation products remain isolated unless HarbourMesh has a separate licence or user-local chart path.',
    arcgisLayers: [],
    files: [],
    textResources: [],
    failures: [],
  };

  console.log(`\n=== HarbourMesh Atlantic Data Download ===`);
  console.log(`Output: ${outputRoot}\n`);

  const totalText = textDownloads.length;
  for (let i = 0; i < totalText; i++) {
    const resource = textDownloads[i];
    const existingPath = join(outputRoot, resource.path);
    if (await fileExists(existingPath)) {
      progress(`[text] SKIP (exists) ${resource.id}`, i + 1, totalText);
      const bytes = (await readFile(existingPath)).byteLength;
      const checksum = createHash('sha256').update(await readFile(existingPath)).digest('hex');
      manifest.textResources.push({ ...resource, path: resource.path, bytes, sha256: checksum });
      continue;
    }
    try {
      progress(`[text] Downloading ${resource.id}`, i + 1, totalText);
      const saved = await saveText(resource.url, resource.path);
      manifest.textResources.push({ ...resource, ...saved });
    } catch (error) {
      console.error(`  FAILED: ${error instanceof Error ? error.message : error}`);
      manifest.failures.push(failure(resource, error));
    }
  }

  const totalLayers = arcgisLayers.length;
  for (let i = 0; i < totalLayers; i++) {
    const layer = arcgisLayers[i];
    const geojsonPath = join(outputRoot, `raw/${layer.province}/${layer.id}.geojson`);
    if (await fileExists(geojsonPath)) {
      const bytes = (await stat(geojsonPath)).size;
      if (bytes > 100) {
        progress(`[arcgis] SKIP (exists, ${(bytes / 1024 / 1024).toFixed(1)}MB) ${layer.id}`, i + 1, totalLayers);
        const checksum = await sha256File(geojsonPath);
        manifest.arcgisLayers.push({
          ...layer,
          metadataPath: `raw/${layer.province}/${layer.id}.metadata.json`,
          geojsonPath: `raw/${layer.province}/${layer.id}.geojson`,
          featureCount: -1,
          expectedFeatureCount: -1,
          pageSummaries: [],
          sha256: checksum,
        });
        continue;
      }
    }
    try {
      progress(`[arcgis] Downloading ${layer.id} (${layer.province})`, i + 1, totalLayers);
      const saved = await saveArcgisLayer(layer);
      progress(`[arcgis] Done ${layer.id}: ${saved.featureCount} features`, i + 1, totalLayers);
      manifest.arcgisLayers.push({ ...layer, ...saved });
    } catch (error) {
      console.error(`  FAILED: ${error instanceof Error ? error.message : error}`);
      manifest.failures.push(failure(layer, error));
    }
  }

  const totalFiles = fileDownloads.length;
  for (let i = 0; i < totalFiles; i++) {
    const resource = fileDownloads[i];
    const existingPath = join(outputRoot, resource.path);
    if (await fileExists(existingPath)) {
      const bytes = (await stat(existingPath)).size;
      progress(`[file] SKIP (exists, ${(bytes / 1024 / 1024).toFixed(1)}MB) ${resource.id}`, i + 1, totalFiles);
      const checksum = await sha256File(existingPath);
      manifest.files.push({ ...resource, path: resource.path, bytes, sha256: checksum });
      continue;
    }
    try {
      progress(`[file] Downloading ${resource.id}`, i + 1, totalFiles);
      const saved = await saveFile(resource.url, resource.path);
      progress(`[file] Done ${resource.id}: ${(saved.bytes / 1024 / 1024).toFixed(1)}MB`, i + 1, totalFiles);
      manifest.files.push({ ...resource, ...saved });
    } catch (error) {
      console.error(`  FAILED: ${error instanceof Error ? error.message : error}`);
      manifest.failures.push(failure(resource, error));
    }
  }

  await writeJson('manifest.json', manifest);
  console.log(`\n=== Download Complete ===`);
  console.log(JSON.stringify({
    outputRoot,
    arcgisLayers: manifest.arcgisLayers.length,
    files: manifest.files.length,
    textResources: manifest.textResources.length,
    failures: manifest.failures.length,
    failureIds: manifest.failures.map((f) => f.id),
  }, null, 2));
}

async function saveArcgisLayer(layer) {
  const basePath = `raw/${layer.province}/${layer.id}`;
  const metadata = await fetchJson(`${layer.serviceUrl}/${layer.layerId}?f=pjson`);
  await writeJson(`${basePath}.metadata.json`, metadata);

  const countUrl = buildArcgisQueryUrl(layer, {
    f: 'json',
    where: '1=1',
    returnCountOnly: 'true',
  });
  const countPayload = await fetchJson(countUrl);
  const count = Number(countPayload.count ?? 0);
  const maxRecordCount = Number(metadata.maxRecordCount ?? 2000);
  const pageSize = Math.max(1, Math.min(maxRecordCount || 2000, 2000));
  const pageSummaries = [];
  const geojsonPath = `${basePath}.geojson`;
  const geojsonOutputPath = join(outputRoot, geojsonPath);
  await mkdir(dirname(geojsonOutputPath), { recursive: true });
  const stream = createWriteStream(geojsonOutputPath, { encoding: 'utf8' });

  await writeStreamChunk(stream, `{\n`);
  await writeStreamChunk(stream, `  "type": "FeatureCollection",\n`);
  await writeStreamChunk(stream, `  "name": ${JSON.stringify(layer.id)},\n`);
  await writeStreamChunk(stream, `  "harbourmeshSource": ${JSON.stringify({
    id: layer.id,
    province: layer.province,
    licence: layer.licence,
    sourcePolicy: layer.sourcePolicy,
    sourceUrl: `${layer.serviceUrl}/${layer.layerId}`,
    downloadedAt: new Date().toISOString(),
    expectedFeatureCount: count,
  }, null, 2).replace(/\n/g, '\n  ')},\n`);
  await writeStreamChunk(stream, `  "features": [\n`);

  let writtenFeatureCount = 0;

  for (let offset = 0; offset < count; offset += pageSize) {
    const pageUrl = buildArcgisQueryUrl(layer, {
      f: 'geojson',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });
    const page = await fetchJson(pageUrl);
    const pageFeatures = Array.isArray(page.features) ? page.features : [];
    pageSummaries.push({ offset, count: pageFeatures.length });
    for (const feature of pageFeatures) {
      if (writtenFeatureCount > 0) {
        await writeStreamChunk(stream, ',\n');
      }
      await writeStreamChunk(stream, JSON.stringify(feature));
      writtenFeatureCount += 1;
    }
    if (pageFeatures.length === 0 && offset < count) {
      break;
    }
  }

  await writeStreamChunk(stream, `\n  ]\n}\n`);
  stream.end();
  await once(stream, 'finish');
  const checksum = await sha256File(join(outputRoot, geojsonPath));

  return {
    metadataPath: `${basePath}.metadata.json`,
    geojsonPath,
    featureCount: writtenFeatureCount,
    expectedFeatureCount: count,
    pageSummaries,
    sha256: checksum,
  };
}

async function writeStreamChunk(stream, chunk) {
  if (!stream.write(chunk)) {
    await once(stream, 'drain');
  }
}

function buildArcgisQueryUrl(layer, params) {
  const url = new URL(`${layer.serviceUrl}/${layer.layerId}/query`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function saveText(url, relativePath) {
  const response = await fetchWithRetry(url);
  const text = await response.text();
  await writeText(relativePath, text);
  return {
    path: relativePath,
    bytes: Buffer.byteLength(text),
    sha256: createHash('sha256').update(text).digest('hex'),
  };
}

async function saveFile(url, relativePath) {
  const outputPath = join(outputRoot, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  const response = await fetchWithRetry(url);
  await pipeline(response.body, createWriteStream(outputPath));
  const bytes = (await readFile(outputPath)).byteLength;
  return {
    path: relativePath,
    bytes,
    sha256: await sha256File(outputPath),
  };
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url);
  return response.json();
}

async function fetchWithRetry(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      accept: '*/*',
    },
  });
  if (response.status === 429 && attempt < 4) {
    await sleep(1000 * attempt);
    return fetchWithRetry(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response;
}

async function writeJson(relativePath, payload) {
  await writeText(relativePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeText(relativePath, text) {
  const outputPath = join(outputRoot, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, text);
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

function failure(resource, error) {
  return {
    id: resource.id,
    url: resource.url ?? `${resource.serviceUrl}/${resource.layerId}`,
    message: error instanceof Error ? error.message : String(error),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
