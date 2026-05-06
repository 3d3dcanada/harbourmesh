import {
  type CommunityObservationBatch,
  type CommunityObservationReceipt,
  type CommunityObservationSummary,
  type CommunityObservationUpload,
} from './community-observations.js';
import {
  toOwnerMetadata,
  type AccountOwnerMetadata,
  type AccountOwnershipContext,
} from './account-ownership.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

type StoredObservationBatch = AccountOwnerMetadata & {
  id: string;
  region: string;
  recordCount: number;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type StoredCommunityObservation = CommunityObservationUpload & AccountOwnerMetadata & {
  batchId: string;
  storedAt: string;
  region: string;
};

export type CommunityObservationRepository = {
  acceptBatch: (batch: CommunityObservationBatch, owner?: AccountOwnershipContext | null) => Promise<CommunityObservationReceipt>;
  getSummary: () => Promise<CommunityObservationSummary>;
  listRecords: () => Promise<StoredCommunityObservation[]>;
};

export function createCommunityObservationRepository(dataDir: string): CommunityObservationRepository {
  const recordsFile = resolveDataFile(dataDir, 'community-observations.jsonl');
  const batchesFile = resolveDataFile(dataDir, 'community-observation-batches.jsonl');

  return {
    async acceptBatch(batch, owner) {
      const existingRecords = await readJsonLines<StoredCommunityObservation>(recordsFile);
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const acceptedRecords = batch.observations.filter((record) => !existingIds.has(record.id));
      const storedAt = new Date().toISOString();
      const ownerMetadata = toOwnerMetadata(owner);

      for (const record of acceptedRecords) {
        await appendJsonLine(recordsFile, {
          ...record,
          ...ownerMetadata,
          batchId: batch.id,
          storedAt,
          region: batch.region,
        });
      }

      const duplicateCount = batch.observations.length - acceptedRecords.length;
      const storedBatch: StoredObservationBatch = {
        id: batch.id,
        region: batch.region,
        recordCount: batch.observations.length,
        acceptedCount: acceptedRecords.length,
        duplicateCount,
        storedAt,
        ...ownerMetadata,
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
      const records = await readJsonLines<StoredCommunityObservation>(recordsFile);
      const batches = await readJsonLines<StoredObservationBatch>(batchesFile);
      const regions = records.reduce<Record<string, number>>((counts, record) => {
        counts[record.region] = (counts[record.region] ?? 0) + 1;
        return counts;
      }, {});
      const byType = records.reduce<Record<string, number>>((counts, record) => {
        counts[record.observationType] = (counts[record.observationType] ?? 0) + 1;
        return counts;
      }, {});
      const latestObservedAt = records
        .map((record) => record.observedAt)
        .sort()
        .at(-1);

      return {
        totalRecords: records.length,
        batchCount: batches.length,
        regions,
        byType,
        positionedRecords: records.filter((record) => Boolean(record.position)).length,
        latestObservedAt,
      };
    },

    async listRecords() {
      return readJsonLines<StoredCommunityObservation>(recordsFile);
    },
  };
}
