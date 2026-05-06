import { createHash } from 'node:crypto';
import {
  getNBPilotChartPackageManifest,
  type NBPilotChartPackage,
} from './chart-catalog.js';

type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [[
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]];
};

type ChartPackageArtifactContent = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: PolygonGeometry;
    properties: {
      packageId: string;
      label: string;
      region: 'NB_PILOT';
      intendedUse: 'reference_only';
      minZoom: number;
      maxZoom: number;
      sourceIds: string[];
      excludedSourceIds: string[];
      communityOverlayIncluded: boolean;
      officialChartDataIncluded: false;
    };
  }>;
  metadata: {
    schemaVersion: 'harbourmesh.chart-package-artifact-content.v1';
    generatedAt: string;
    packageId: string;
    referenceOnly: true;
    officialChartDataIncluded: false;
  };
};

export type NBPilotChartPackageArtifact = {
  id: string;
  packageId: string;
  region: 'NB_PILOT';
  format: 'geojson';
  mediaType: 'application/geo+json';
  fileName: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  officialChartDataIncluded: false;
  sourceIds: string[];
  excludedSourceIds: string[];
  warnings: string[];
  content: ChartPackageArtifactContent;
};

export type NBPilotChartPackageArtifactManifest = {
  id: 'nb-pilot-chart-package-artifacts';
  schemaVersion: 'harbourmesh.chart-package-artifacts.v1';
  generatedAt: string;
  artifacts: NBPilotChartPackageArtifact[];
  rules: {
    artifactsAreReferenceOnly: boolean;
    officialChartDataExcluded: boolean;
    pmtilesGenerationPending: boolean;
    mbtilesGenerationPending: boolean;
  };
};

function packageBoundsToPolygon(chartPackage: NBPilotChartPackage): PolygonGeometry {
  const { south, west, north, east } = chartPackage.bounds;
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  };
}

function buildArtifactContent(
  chartPackage: NBPilotChartPackage,
  generatedAt: string
): ChartPackageArtifactContent {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: `package-boundary:${chartPackage.id}`,
        geometry: packageBoundsToPolygon(chartPackage),
        properties: {
          packageId: chartPackage.id,
          label: chartPackage.label,
          region: chartPackage.region,
          intendedUse: chartPackage.intendedUse,
          minZoom: chartPackage.minZoom,
          maxZoom: chartPackage.maxZoom,
          sourceIds: chartPackage.sourceIds,
          excludedSourceIds: chartPackage.excludedSourceIds,
          communityOverlayIncluded: chartPackage.communityOverlayIncluded,
          officialChartDataIncluded: false,
        },
      },
    ],
    metadata: {
      schemaVersion: 'harbourmesh.chart-package-artifact-content.v1',
      generatedAt,
      packageId: chartPackage.id,
      referenceOnly: true,
      officialChartDataIncluded: false,
    },
  };
}

function hashContent(content: ChartPackageArtifactContent): { byteLength: number; sha256: string } {
  const serialized = JSON.stringify(content);
  return {
    byteLength: Buffer.byteLength(serialized),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

function buildArtifact(chartPackage: NBPilotChartPackage, generatedAt: string): NBPilotChartPackageArtifact {
  const content = buildArtifactContent(chartPackage, generatedAt);
  const { byteLength, sha256 } = hashContent(content);

  return {
    id: `artifact:${chartPackage.id}:geojson`,
    packageId: chartPackage.id,
    region: chartPackage.region,
    format: 'geojson',
    mediaType: 'application/geo+json',
    fileName: `${chartPackage.id}.geojson`,
    byteLength,
    sha256,
    generatedAt,
    officialChartDataIncluded: false,
    sourceIds: chartPackage.sourceIds,
    excludedSourceIds: chartPackage.excludedSourceIds,
    warnings: [
      ...chartPackage.warnings,
      'GeoJSON package artifact only; PMTiles and MBTiles generation are still pending.',
    ],
    content,
  };
}

export function getNBPilotChartPackageArtifactManifest(
  generatedAt = new Date().toISOString()
): NBPilotChartPackageArtifactManifest {
  const manifest = getNBPilotChartPackageManifest(generatedAt);

  return {
    id: 'nb-pilot-chart-package-artifacts',
    schemaVersion: 'harbourmesh.chart-package-artifacts.v1',
    generatedAt,
    artifacts: manifest.packages.map((chartPackage) => buildArtifact(chartPackage, generatedAt)),
    rules: {
      artifactsAreReferenceOnly: true,
      officialChartDataExcluded: true,
      pmtilesGenerationPending: true,
      mbtilesGenerationPending: true,
    },
  };
}
