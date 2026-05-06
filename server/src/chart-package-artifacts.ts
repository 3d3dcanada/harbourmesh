import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
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

export type NBPilotChartPackageArtifactReleaseFile = Omit<NBPilotChartPackageArtifact, 'content'> & {
  relativePath: string;
};

export type NBPilotChartPackageArtifactReleaseManifest = {
  id: 'nb-pilot-chart-package-artifact-release';
  schemaVersion: 'harbourmesh.chart-package-artifact-release.v1';
  generatedAt: string;
  outputDir: string;
  manifestFileName: 'manifest.json';
  artifacts: NBPilotChartPackageArtifactReleaseFile[];
  rules: NBPilotChartPackageArtifactManifest['rules'];
};

export type WriteNBPilotChartPackageArtifactsOptions = {
  outputDir: string;
  generatedAt?: string;
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

function serializeArtifactContent(content: ChartPackageArtifactContent): string {
  return JSON.stringify(content);
}

function hashContent(content: ChartPackageArtifactContent): { byteLength: number; sha256: string } {
  const serialized = serializeArtifactContent(content);
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

export async function writeNBPilotChartPackageArtifacts(
  options: WriteNBPilotChartPackageArtifactsOptions
): Promise<NBPilotChartPackageArtifactReleaseManifest> {
  const outputDir = resolve(options.outputDir);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const manifest = getNBPilotChartPackageArtifactManifest(generatedAt);
  await mkdir(outputDir, { recursive: true });

  const releaseFiles: NBPilotChartPackageArtifactReleaseFile[] = [];
  for (const artifact of manifest.artifacts) {
    await writeFile(
      join(outputDir, artifact.fileName),
      serializeArtifactContent(artifact.content),
      'utf8'
    );
    releaseFiles.push({
      id: artifact.id,
      packageId: artifact.packageId,
      region: artifact.region,
      format: artifact.format,
      mediaType: artifact.mediaType,
      fileName: artifact.fileName,
      byteLength: artifact.byteLength,
      sha256: artifact.sha256,
      generatedAt: artifact.generatedAt,
      officialChartDataIncluded: artifact.officialChartDataIncluded,
      sourceIds: artifact.sourceIds,
      excludedSourceIds: artifact.excludedSourceIds,
      warnings: artifact.warnings,
      relativePath: artifact.fileName,
    });
  }

  const releaseManifest: NBPilotChartPackageArtifactReleaseManifest = {
    id: 'nb-pilot-chart-package-artifact-release',
    schemaVersion: 'harbourmesh.chart-package-artifact-release.v1',
    generatedAt,
    outputDir,
    manifestFileName: 'manifest.json',
    artifacts: releaseFiles,
    rules: manifest.rules,
  };
  await writeFile(
    join(outputDir, releaseManifest.manifestFileName),
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    'utf8'
  );

  return releaseManifest;
}
