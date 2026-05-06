import { z } from 'zod';

const qualitySchema = z.object({
  confidence: z.number().min(0).max(1),
  rejected: z.boolean(),
  flags: z.array(z.string()),
}).strict();

const offsetsSchema = z.object({
  surfaceToTransducerMeters: z.number().optional(),
  transducerToKeelMeters: z.number().optional(),
  gnssToTransducerMeters: z.object({
    forward: z.number(),
    starboard: z.number(),
  }).strict().optional(),
}).strict();

export const communitySoundingUploadSchema = z.object({
  id: z.string().min(1),
  vesselId: z.string().min(1),
  timestamp: z.string().datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sourceDeviceId: z.string().min(1),
  sourceProtocol: z.enum(['signalk', 'nmea0183', 'nmea2000', 'manual', 'replay', 'simulated']),
  rawMessageId: z.string().min(1),
  receivedAt: z.string().datetime(),
  sharingState: z.enum(['shareable_blurred', 'shareable_full']),
  consentCapturedAt: z.string().datetime(),
  rawDepthMeters: z.number().positive().max(250),
  depthMeters: z.number().positive().max(250),
  depthReference: z.enum(['below_surface', 'below_transducer', 'below_keel', 'unknown']),
  tideCorrectionApplied: z.literal(false),
  waterLevelCorrectionApplied: z.literal(false),
  offsets: offsetsSchema,
  quality: qualitySchema,
}).strict();

export const communitySoundingBatchSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal('harbourmesh.community-soundings.v1'),
  createdAt: z.string().datetime(),
  region: z.string().min(1),
  recordCount: z.number().int().positive(),
  records: z.array(communitySoundingUploadSchema).min(1).max(250),
  policy: z.object({
    intendedUse: z.literal('community_reference_overlay'),
    officialChartDataIncluded: z.literal(false),
    containsFullSharedPositions: z.boolean(),
    rawLocalPositionsIncluded: z.literal(false),
    uploadEndpoint: z.string().optional(),
  }).strict(),
}).strict().superRefine((batch, context) => {
  if (batch.recordCount !== batch.records.length) {
    context.addIssue({
      code: 'custom',
      path: ['recordCount'],
      message: 'recordCount must match records.length',
    });
  }

  const hasFullSharedPositions = batch.records.some((record) => record.sharingState === 'shareable_full');
  if (batch.policy.containsFullSharedPositions !== hasFullSharedPositions) {
    context.addIssue({
      code: 'custom',
      path: ['policy', 'containsFullSharedPositions'],
      message: 'containsFullSharedPositions must match record sharing states',
    });
  }
});

export type CommunitySoundingUpload = z.infer<typeof communitySoundingUploadSchema>;
export type CommunitySoundingBatch = z.infer<typeof communitySoundingBatchSchema>;

export type CommunitySoundingReceipt = {
  ok: true;
  receiptId: string;
  batchId: string;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type CommunitySoundingSummary = {
  totalRecords: number;
  batchCount: number;
  regions: Record<string, number>;
  latestTimestamp?: string;
};
