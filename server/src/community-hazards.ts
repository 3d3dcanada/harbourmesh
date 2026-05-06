import { z } from 'zod';

const hazardPositionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  altitude: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  cog: z.number().min(0).max(360).optional(),
  sog: z.number().nonnegative().optional(),
  source: z.enum(['gps', 'ais', 'manual', 'estimated']),
  timestamp: z.string().datetime(),
}).strict();

export const communityHazardUploadSchema = z.object({
  id: z.string().min(1),
  vesselId: z.string().min(1),
  sourceDeviceId: z.string().min(1).optional(),
  type: z.enum(['traffic', 'weather', 'obstruction', 'shoal', 'debris', 'other']),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(3).max(500),
  position: hazardPositionSchema.optional(),
  reportedAt: z.string().datetime(),
  sharingState: z.enum(['shareable_no_position', 'shareable_blurred', 'shareable_full']),
  consentCapturedAt: z.string().datetime(),
}).strict().superRefine((hazard, context) => {
  if (hazard.sharingState === 'shareable_no_position' && hazard.position) {
    context.addIssue({
      code: 'custom',
      path: ['position'],
      message: 'position must be omitted when sharingState is shareable_no_position',
    });
  }

  if (hazard.sharingState !== 'shareable_no_position' && !hazard.position) {
    context.addIssue({
      code: 'custom',
      path: ['position'],
      message: 'position is required when sharing a positioned hazard',
    });
  }
});

export const communityHazardBatchSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal('harbourmesh.community-hazards.v1'),
  createdAt: z.string().datetime(),
  region: z.string().min(1),
  recordCount: z.number().int().positive(),
  hazards: z.array(communityHazardUploadSchema).min(1).max(250),
  policy: z.object({
    intendedUse: z.literal('community_reference_overlay'),
    officialChartDataIncluded: z.literal(false),
    containsFullSharedPositions: z.boolean(),
    rawLocalPositionsIncluded: z.literal(false),
    uploadEndpoint: z.string().optional(),
  }).strict(),
}).strict().superRefine((batch, context) => {
  if (batch.recordCount !== batch.hazards.length) {
    context.addIssue({
      code: 'custom',
      path: ['recordCount'],
      message: 'recordCount must match hazards.length',
    });
  }

  const hasFullSharedPositions = batch.hazards.some((hazard) => hazard.sharingState === 'shareable_full');
  if (batch.policy.containsFullSharedPositions !== hasFullSharedPositions) {
    context.addIssue({
      code: 'custom',
      path: ['policy', 'containsFullSharedPositions'],
      message: 'containsFullSharedPositions must match hazard sharing states',
    });
  }
});

export const communityHazardReviewSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  reviewedBy: z.string().trim().min(1).max(120),
  reviewedAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(),
}).strict();

export type CommunityHazardUpload = z.infer<typeof communityHazardUploadSchema>;
export type CommunityHazardBatch = z.infer<typeof communityHazardBatchSchema>;
export type CommunityHazardReview = z.infer<typeof communityHazardReviewSchema>;
export type CommunityHazardReviewStatus = 'pending' | CommunityHazardReview['status'];

export type CommunityHazardReceipt = {
  ok: true;
  receiptId: string;
  batchId: string;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type CommunityHazardSummary = {
  totalRecords: number;
  batchCount: number;
  regions: Record<string, number>;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byReviewStatus: Record<CommunityHazardReviewStatus, number>;
  publicOverlayEligible: number;
  pendingReviewCount: number;
  latestReportedAt?: string;
};

export type CommunityHazardReviewReceipt = {
  ok: true;
  hazardId: string;
  status: CommunityHazardReview['status'];
  publicOverlayEligible: boolean;
  reviewedAt: string;
};
