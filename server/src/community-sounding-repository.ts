import {
  type CommunitySoundingBatch,
  type CommunitySoundingReceipt,
  type CommunitySoundingSummary,
  type CommunitySoundingUpload,
} from './community-soundings.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

type StoredBatch = {
  id: string;
  region: string;
  recordCount: number;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type StoredCommunitySounding = CommunitySoundingUpload & {
  batchId: string;
  storedAt: string;
  region: string;
};

export type CommunitySoundingRepository = {
  acceptBatch: (batch: CommunitySoundingBatch) => Promise<CommunitySoundingReceipt>;
  getSummary: () => Promise<CommunitySoundingSummary>;
  listRecords: () => Promise<StoredCommunitySounding[]>;
};

export function createCommunitySoundingRepository(dataDir: string): CommunitySoundingRepository {
  const recordsFile = resolveDataFile(dataDir, 'community-soundings.jsonl');
  const batchesFile = resolveDataFile(dataDir, 'community-sounding-batches.jsonl');

  return {
    async acceptBatch(batch) {
      const existingRecords = await readJsonLines<StoredCommunitySounding>(recordsFile);
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const acceptedRecords = batch.records.filter((record) => !existingIds.has(record.id));
      const storedAt = new Date().toISOString();

      for (const record of acceptedRecords) {
        await appendJsonLine(recordsFile, {
          ...record,
          batchId: batch.id,
          storedAt,
          region: batch.region,
        });
      }

      const duplicateCount = batch.records.length - acceptedRecords.length;
      const storedBatch: StoredBatch = {
        id: batch.id,
        region: batch.region,
        recordCount: batch.records.length,
        acceptedCount: acceptedRecords.length,
        duplicateCount,
        storedAt,
      };
      await appendJsonLine(batchesFile, storedBatch);

      return {
        ok: true,
        receiptId: `${batch.id}:${storedAt}`,
        batchId: batch.id,
        acceptedCount: acceptedRecords.length,
        duplicateCount,
        storedAt,
      };
    },

    async getSummary() {
      const records = await readJsonLines<StoredCommunitySounding>(recordsFile);
      const batches = await readJsonLines<StoredBatch>(batchesFile);
      const regions = records.reduce<Record<string, number>>((counts, record) => {
        const region = record.region ?? 'unknown';
        counts[region] = (counts[region] ?? 0) + 1;
        return counts;
      }, {});
      const latestTimestamp = records
        .map((record) => record.timestamp)
        .sort()
        .at(-1);

      return {
        totalRecords: records.length,
        batchCount: batches.length,
        regions,
        latestTimestamp,
      };
    },

    async listRecords() {
      return readJsonLines<StoredCommunitySounding>(recordsFile);
    },
  };
}
