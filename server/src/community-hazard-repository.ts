import {
  type CommunityHazardBatch,
  type CommunityHazardReceipt,
  type CommunityHazardReview,
  type CommunityHazardReviewReceipt,
  type CommunityHazardReviewStatus,
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

export type StoredCommunityHazard = CommunityHazardUpload & {
  batchId: string;
  storedAt: string;
  region: string;
  reviewStatus: CommunityHazardReviewStatus;
  publicOverlayEligible: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

export type StoredHazardReview = CommunityHazardReview & {
  hazardId: string;
  reviewedAt: string;
};

export type CommunityHazardRepository = {
  acceptBatch: (batch: CommunityHazardBatch) => Promise<CommunityHazardReceipt>;
  reviewHazard: (hazardId: string, review: CommunityHazardReview) => Promise<CommunityHazardReviewReceipt | null>;
  getSummary: () => Promise<CommunityHazardSummary>;
  listRecords: () => Promise<StoredCommunityHazard[]>;
  listReviews: () => Promise<StoredHazardReview[]>;
};

export function createCommunityHazardRepository(dataDir: string): CommunityHazardRepository {
  const recordsFile = resolveDataFile(dataDir, 'community-hazards.jsonl');
  const batchesFile = resolveDataFile(dataDir, 'community-hazard-batches.jsonl');
  const reviewsFile = resolveDataFile(dataDir, 'community-hazard-reviews.jsonl');

  async function listRecords(): Promise<StoredCommunityHazard[]> {
    const [records, reviews] = await Promise.all([
      readJsonLines<StoredCommunityHazard>(recordsFile),
      readJsonLines<StoredHazardReview>(reviewsFile),
    ]);
    const latestReviews = new Map<string, StoredHazardReview>();
    for (const review of reviews) {
      latestReviews.set(review.hazardId, review);
    }

    return records.map((record) => {
      const review = latestReviews.get(record.id);
      const reviewStatus = review?.status ?? record.reviewStatus ?? 'pending';
      return {
        ...record,
        reviewStatus,
        publicOverlayEligible: reviewStatus === 'accepted' && Boolean(record.position),
        reviewedAt: review?.reviewedAt ?? record.reviewedAt,
        reviewedBy: review?.reviewedBy ?? record.reviewedBy,
        reviewNote: review?.note ?? record.reviewNote,
      };
    });
  }

  return {
    async acceptBatch(batch) {
      const existingRecords = await listRecords();
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const acceptedHazards = batch.hazards.filter((hazard) => !existingIds.has(hazard.id));
      const storedAt = new Date().toISOString();

      for (const hazard of acceptedHazards) {
        await appendJsonLine(recordsFile, {
          ...hazard,
          batchId: batch.id,
          storedAt,
          region: batch.region,
          reviewStatus: 'pending',
          publicOverlayEligible: false,
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

    async reviewHazard(hazardId, review) {
      const records = await listRecords();
      const hazard = records.find((record) => record.id === hazardId);
      if (!hazard) return null;

      const reviewedAt = review.reviewedAt ?? new Date().toISOString();
      await appendJsonLine(reviewsFile, {
        ...review,
        hazardId,
        reviewedAt,
      });

      return {
        ok: true,
        hazardId,
        status: review.status,
        publicOverlayEligible: review.status === 'accepted' && Boolean(hazard.position),
        reviewedAt,
      };
    },

    async getSummary() {
      const hazards = await listRecords();
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
      const byReviewStatus = hazards.reduce<Record<CommunityHazardReviewStatus, number>>((counts, hazard) => {
        counts[hazard.reviewStatus] = (counts[hazard.reviewStatus] ?? 0) + 1;
        return counts;
      }, { pending: 0, accepted: 0, rejected: 0 });
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
        byReviewStatus,
        publicOverlayEligible: hazards.filter((hazard) => hazard.publicOverlayEligible).length,
        pendingReviewCount: byReviewStatus.pending,
        latestReportedAt,
      };
    },

    async listRecords() {
      return listRecords();
    },

    async listReviews() {
      return readJsonLines<StoredHazardReview>(reviewsFile);
    },
  };
}
