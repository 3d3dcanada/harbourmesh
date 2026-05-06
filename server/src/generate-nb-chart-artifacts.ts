import { resolve } from 'node:path';
import { writeNBPilotChartPackageArtifacts } from './chart-package-artifacts.js';

const outputDir = resolve(
  process.argv[2] ?? process.env.HARBOURMESH_CHART_ARTIFACT_DIR ?? './data/chart-artifacts/nb-pilot'
);

const maxGeoNBFeaturesPerSource = Number(process.env.HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE ?? 100);
const releaseManifest = await writeNBPilotChartPackageArtifacts({
  outputDir,
  includeGeoNBFeatures: process.env.HARBOURMESH_FETCH_GEONB_FEATURES === 'true',
  maxGeoNBFeaturesPerSource: Number.isFinite(maxGeoNBFeaturesPerSource) ? maxGeoNBFeaturesPerSource : 100,
});

console.log(JSON.stringify({
  ok: true,
  outputDir: releaseManifest.outputDir,
  manifestFileName: releaseManifest.manifestFileName,
  artifactCount: releaseManifest.artifacts.length,
  artifacts: releaseManifest.artifacts.map((artifact) => ({
    fileName: artifact.fileName,
    byteLength: artifact.byteLength,
    sha256: artifact.sha256,
    officialChartDataIncluded: artifact.officialChartDataIncluded,
    sourceFeatureCount: artifact.sourceFeatureCount,
  })),
}, null, 2));
