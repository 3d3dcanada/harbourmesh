import {
  type CommunitySoundingBatch,
  type CommunitySoundingReceipt,
  type CommunitySoundingReview,
  type CommunitySoundingReviewReceipt,
  type CommunitySoundingReviewStatus,
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
  reviewStatus: CommunitySoundingReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewReason?: CommunitySoundingReview['reason'];
  reviewNote?: string;
};

export type StoredSoundingReview = CommunitySoundingReview & {
  soundingId: string;
  reviewedAt: string;
};

export type CommunitySoundingRepository = {
  acceptBatch: (batch: CommunitySoundingBatch) => Promise<CommunitySoundingReceipt>;
  reviewSounding: (soundingId: string, review: CommunitySoundingReview) => Promise<CommunitySoundingReviewReceipt | null>;
  getSummary: () => Promise<CommunitySoundingSummary>;
  listRecords: () => Promise<StoredCommunitySounding[]>;
  listReviews: () => Promise<StoredSoundingReview[]>;
};

export function createCommunitySoundingRepository(dataDir: string): CommunitySoundingRepository {
  const recordsFile = resolveDataFile(dataDir, 'community-soundings.jsonl');
  const batchesFile = resolveDataFile(dataDir, 'community-sounding-batches.jsonl');
  const reviewsFile = resolveDataFile(dataDir, 'community-sounding-reviews.jsonl');

  async function listRecords(): Promise<StoredCommunitySounding[]> {
    const [records, reviews] = await Promise.all([
      readJsonLines<StoredCommunitySounding>(recordsFile),
      readJsonLines<StoredSoundingReview>(reviewsFile),
    ]);
    const latestReviews = new Map<string, StoredSoundingReview>();
    for (const review of reviews) {
      latestReviews.set(review.soundingId, review);
    }

    return records.map((record) => {
      const review = latestReviews.get(record.id);
      const reviewStatus = review?.status ?? record.reviewStatus ?? (record.quality.rejected ? 'rejected' : 'unreviewed');
      return {
        ...record,
        reviewStatus,
        reviewedAt: review?.reviewedAt ?? record.reviewedAt,
        reviewedBy: review?.reviewedBy ?? record.reviewedBy,
        reviewReason: review?.reason ?? record.reviewReason,
        reviewNote: review?.note ?? record.reviewNote,
      };
    });
  }

  return {
    async acceptBatch(batch) {
      const existingRecords = await listRecords();
      const existingIds = new Set(existingRecords.map((record) => record.id));
      const acceptedRecords = batch.records.filter((record) => !existingIds.has(record.id));
      const storedAt = new Date().toISOString();

      for (const record of acceptedRecords) {
        await appendJsonLine(recordsFile, {
          ...record,
          batchId: batch.id,
          storedAt,
          region: batch.region,
          reviewStatus: record.quality.rejected ? 'rejected' : 'unreviewed',
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

    async reviewSounding(soundingId, review) {
      const records = await listRecords();
      const sounding = records.find((record) => record.id === soundingId);
      if (!sounding) return null;

      const reviewedAt = review.reviewedAt ?? new Date().toISOString();
      await appendJsonLine(reviewsFile, {
        ...review,
        soundingId,
        reviewedAt,
      });

      return {
        ok: true,
        soundingId,
        status: review.status,
        includedInAggregates: review.status === 'accepted' && !sounding.quality.rejected,
        reviewedAt,
      };
    },

    async getSummary() {
      const records = await listRecords();
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
      const byReviewStatus = records.reduce<Record<CommunitySoundingReviewStatus, number>>((counts, record) => {
        counts[record.reviewStatus] = (counts[record.reviewStatus] ?? 0) + 1;
        return counts;
      }, { unreviewed: 0, accepted: 0, rejected: 0 });

      return {
        totalRecords: records.length,
        batchCount: batches.length,
        regions,
        byReviewStatus,
        aggregateEligibleCount: records.filter((record) => !record.quality.rejected && record.reviewStatus !== 'rejected').length,
        latestTimestamp,
      };
    },

    async listRecords() {
      return listRecords();
    },

    async listReviews() {
      return readJsonLines<StoredSoundingReview>(reviewsFile);
    },
  };
}
