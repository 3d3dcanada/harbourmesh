import {
  type CommunityHazardBatch,
  type CommunityHazardReceipt,
  type CommunityHazardSummary,
  type CommunityHazardUpload,
} from './community-hazards.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

type StoredHazardBatch = {
  id: string;
  region: string;
  recordCount: number;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

type StoredHazard = CommunityHazardUpload & {
  batchId: string;
  storedAt: string;
  region: string;
};

export type CommunityHazardRepository = {
  acceptBatch: (batch: CommunityHazardBatch) => Promise<CommunityHazardReceipt>;
  getSummary: () => Promise<CommunityHazardSummary>;
};

export function createCommunityHazardRepository(dataDir: string): CommunityHazardRepository {
  const recordsFile = resolveDataFile(dataDir, 'community-hazards.jsonl');
  const batchesFile = resolveDataFile(dataDir, 'community-hazard-batches.jsonl');

  return {
    async acceptBatch(batch) {
      const existingRecords = await readJsonLines<StoredHazard>(recordsFile);
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const acceptedHazards = batch.hazards.filter((hazard) => !existingIds.has(hazard.id));
      const storedAt = new Date().toISOString();

      for (const hazard of acceptedHazards) {
        await appendJsonLine(recordsFile, {
          ...hazard,
          batchId: batch.id,
          storedAt,
          region: batch.region,
        });
      }

      const duplicateCount = batch.hazards.length - acceptedHazards.length;
      const storedBatch: StoredHazardBatch = {
        id: batch.id,
        region: batch.region,
        recordCount: batch.hazards.length,
        acceptedCount: acceptedHazards.length,
        duplicateCount,
        storedAt,
      };
      await appendJsonLine(batchesFile, storedBatch);

      return {
        ok: true,
        receiptId: `${batch.id}:${storedAt}`,
        batchId: batch.id,
        acceptedCount: acceptedHazards.length,
        duplicateCount,
        storedAt,
      };
    },

    async getSummary() {
      const hazards = await readJsonLines<StoredHazard>(recordsFile);
      const batches = await readJsonLines<StoredHazardBatch>(batchesFile);
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
      const latestReportedAt = hazards
        .map((hazard) => hazard.reportedAt)
        .sort()
        .at(-1);

      return {
        totalRecords: hazards.length,
        batchCount: batches.length,
        regions,
        byType,
        bySeverity,
        latestReportedAt,
      };
    },
  };
}
