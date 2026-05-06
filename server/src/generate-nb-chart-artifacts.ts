import { resolve } from 'node:path';
import { writeNBPilotChartPackageArtifacts } from './chart-package-artifacts.js';

const outputDir = resolve(
  process.argv[2] ?? process.env.HARBOURMESH_CHART_ARTIFACT_DIR ?? './data/chart-artifacts/nb-pilot'
);

const releaseManifest = await writeNBPilotChartPackageArtifacts({ outputDir });

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
  })),
}, null, 2));
