/**
 * HarborMesh - Community Section
 * Opt-in community telemetry network and shared safety features
 */

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Droplets,
  Eye,
  Globe,
  Info,
  Map,
  RefreshCw,
  Shield,
  Ship,
  Thermometer,
  Waves,
  XCircle,
} from 'lucide-react';
import { NBPilotChart } from '@/components/NBPilotChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  listCommunityHazardReviews,
  listCommunityHazardsForReview,
  reviewCommunityHazard,
  type CommunityHazardReviewHistoryEntry,
  type CommunityHazardReviewRecord,
} from '@/lib/community-hazard-review';
import {
  listCommunitySoundingReviews,
  listCommunitySoundingsForReview,
  reviewCommunitySounding,
  type CommunitySoundingReviewHistoryEntry,
  type CommunitySoundingReviewRecord,
} from '@/lib/community-sounding-review';
import {
  fetchCommunityAggregateReleaseArtifacts,
  fetchCommunityAggregateReleaseHistory,
  fetchCommunityAggregateReleaseManifest,
  fetchCommunityAggregates,
  fetchCommunityHazardArtifacts,
  fetchLatestCommunityAggregateReleaseCells,
  publishCommunityAggregateRelease,
  type CommunityAggregateReleaseArtifactManifest,
  type CommunityAggregateReleaseManifest,
  type CommunityAggregateFeature,
  type CommunityHazardArtifactManifest,
} from '@/lib/community-overlay';
import { prepareSoundingForCommunityUpload, type RawDepthSounding } from '@/lib/community-soundings';
import { uploadCommunityHazardBatch, uploadCommunityObservationBatch, uploadCommunitySoundingBatch } from '@/lib/community-sync';
import { communityMeshSync } from '@/lib/community-mesh-sync';
import { buildLocalCommunityOverlayFeatures } from '@/lib/local-community-overlay';
import { resolvePilotOperatorId } from '@/lib/pilot-api-credentials';
import { cn } from '@/lib/utils';
import {
  useCommunityDataStore,
  useSettingsStore,
  useTelemetryStore,
  useVesselStore,
  type CommunityHazard,
  type CommunityHazardSyncBatch,
  type CommunityObservationSyncBatch,
  type CommunitySyncBatch,
} from '@/store';
import { SharePositionLevel } from '@/types';

function getConfidenceClass(sounding: { quality: RawDepthSounding['quality'] }): string {
  if (sounding.quality.rejected) return 'text-red-500 border-red-200';
  if (sounding.quality.confidence >= 0.75) return 'text-emerald-500 border-emerald-200';
  if (sounding.quality.confidence >= 0.5) return 'text-amber-500 border-amber-200';
  return 'text-red-500 border-red-200';
}

function getBatchStatusClass(batch: CommunitySyncBatch): string {
  if (batch.status === 'acknowledged') return 'text-emerald-500 border-emerald-200';
  if (batch.status === 'sent') return 'text-blue-500 border-blue-200';
  if (batch.status === 'failed') return 'text-red-500 border-red-200';
  return 'text-amber-500 border-amber-200';
}

function getHazardClass(hazard: CommunityHazard): string {
  if (hazard.severity === 'high') return 'border-l-red-500 text-red-500';
  if (hazard.severity === 'medium') return 'border-l-amber-500 text-amber-500';
  return 'border-l-blue-500 text-blue-500';
}

function getHazardBatchStatusClass(batch: CommunityHazardSyncBatch): string {
  if (batch.status === 'acknowledged') return 'text-emerald-500 border-emerald-200';
  if (batch.status === 'sent') return 'text-blue-500 border-blue-200';
  if (batch.status === 'failed') return 'text-red-500 border-red-200';
  return 'text-amber-500 border-amber-200';
}

function getObservationBatchStatusClass(batch: CommunityObservationSyncBatch): string {
  if (batch.status === 'acknowledged') return 'text-emerald-500 border-emerald-200';
  if (batch.status === 'sent') return 'text-blue-500 border-blue-200';
  if (batch.status === 'failed') return 'text-red-500 border-red-200';
  return 'text-amber-500 border-amber-200';
}

function formatOptionalNumber(value: number | undefined, suffix: string): string {
  return typeof value === 'number' ? `${value.toFixed(1)} ${suffix}` : '--';
}

export function Community() {
  const { consent, setConsent, boatNode } = useSettingsStore();
  const currentVessel = useVesselStore((state) => state.currentVessel);
  const { aisTargets, latestPosition, latestMotion } = useTelemetryStore();
  const {
    hazards,
    hazardBatches,
    observations,
    observationBatches,
    rawSoundings,
    uploadBatches,
    getShareableSoundings,
    markHazardBatchStatus,
    markObservationBatchStatus,
    markUploadBatchStatus,
    queueShareableObservationBatch,
    queueShareableHazardBatch,
    queueShareableSoundingBatch,
    reportHazard,
  } = useCommunityDataStore();
  const [activeTab, setActiveTab] = useState('map');
  const [syncingBatchId, setSyncingBatchId] = useState<string | null>(null);
  const [syncingObservationBatchId, setSyncingObservationBatchId] = useState<string | null>(null);
  const [syncingHazardBatchId, setSyncingHazardBatchId] = useState<string | null>(null);
  const [reviewHazards, setReviewHazards] = useState<CommunityHazardReviewRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewingHazardId, setReviewingHazardId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLoadedAt, setReviewLoadedAt] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<CommunityHazardReviewHistoryEntry[]>([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false);
  const [reviewSoundings, setReviewSoundings] = useState<CommunitySoundingReviewRecord[]>([]);
  const [soundingReviewLoading, setSoundingReviewLoading] = useState(false);
  const [reviewingSoundingId, setReviewingSoundingId] = useState<string | null>(null);
  const [soundingReviewError, setSoundingReviewError] = useState<string | null>(null);
  const [soundingReviewLoadedAt, setSoundingReviewLoadedAt] = useState<string | null>(null);
  const [soundingReviewHistory, setSoundingReviewHistory] = useState<CommunitySoundingReviewHistoryEntry[]>([]);
  const [soundingReviewHistoryLoading, setSoundingReviewHistoryLoading] = useState(false);
  const [aggregateFeatures, setAggregateFeatures] = useState<CommunityAggregateFeature[]>([]);
  const [aggregateLoading, setAggregateLoading] = useState(false);
  const [aggregateError, setAggregateError] = useState<string | null>(null);
  const [aggregateRelease, setAggregateRelease] = useState<CommunityAggregateReleaseManifest | null>(null);
  const [aggregateReleaseLoading, setAggregateReleaseLoading] = useState(false);
  const [aggregateReleasePublishing, setAggregateReleasePublishing] = useState(false);
  const [aggregateReleaseHistory, setAggregateReleaseHistory] = useState<CommunityAggregateReleaseManifest[]>([]);
  const [aggregateReleaseArtifacts, setAggregateReleaseArtifacts] = useState<CommunityAggregateReleaseArtifactManifest | null>(null);
  const [aggregateReleaseApprovalChecked, setAggregateReleaseApprovalChecked] = useState(false);
  const [hazardArtifacts, setHazardArtifacts] = useState<CommunityHazardArtifactManifest | null>(null);
  const [hazardArtifactsLoading, setHazardArtifactsLoading] = useState(false);
  const [hazardArtifactError, setHazardArtifactError] = useState<string | null>(null);
  const isOptedIn = consent?.shareTelemetryForCommunity || false;
  const shareableSoundings = getShareableSoundings();
  const queuedBatches = useMemo(() => uploadBatches.filter((batch) => batch.status === 'queued'), [uploadBatches]);
  const queuedObservationBatches = useMemo(
    () => observationBatches.filter((batch) => batch.status === 'queued'),
    [observationBatches]
  );
  const queuedHazardBatches = useMemo(() => hazardBatches.filter((batch) => batch.status === 'queued'), [hazardBatches]);
  const acknowledgedBatches = useMemo(
    () => uploadBatches.filter((batch) => batch.status === 'acknowledged'),
    [uploadBatches]
  );
  const acknowledgedObservationBatches = useMemo(
    () => observationBatches.filter((batch) => batch.status === 'acknowledged'),
    [observationBatches]
  );
  const acknowledgedHazardBatches = useMemo(
    () => hazardBatches.filter((batch) => batch.status === 'acknowledged'),
    [hazardBatches]
  );
  const queuedRecordIds = useMemo(
    () =>
      new Set(
        uploadBatches
          .filter((batch) => batch.status !== 'failed')
          .flatMap((batch) => batch.payload.records.map((record) => record.id))
      ),
    [uploadBatches]
  );
  const queuedObservationIds = useMemo(
    () =>
      new Set(
        observationBatches
          .filter((batch) => batch.status !== 'failed')
          .flatMap((batch) => batch.payload.observations.map((observation) => observation.id))
      ),
    [observationBatches]
  );
  const queuedHazardIds = useMemo(
    () =>
      new Set(
        hazardBatches
          .filter((batch) => batch.status !== 'failed')
          .flatMap((batch) => batch.payload.hazards.map((hazard) => hazard.id))
      ),
    [hazardBatches]
  );
  const pendingShareableCount = useMemo(
    () => shareableSoundings.filter((record) => !queuedRecordIds.has(record.id)).length,
    [queuedRecordIds, shareableSoundings]
  );
  const pendingObservationCount = useMemo(
    () => observations.filter((observation) => !queuedObservationIds.has(observation.id)).length,
    [observations, queuedObservationIds]
  );
  const pendingHazardCount = useMemo(
    () => hazards.filter((hazard) => hazard.status !== 'acknowledged' && !queuedHazardIds.has(hazard.id)).length,
    [hazards, queuedHazardIds]
  );
  const queuedRecordCount = useMemo(
    () => queuedBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [queuedBatches]
  );
  const queuedObservationRecordCount = useMemo(
    () => queuedObservationBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [queuedObservationBatches]
  );
  const acknowledgedRecordCount = useMemo(
    () => acknowledgedBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [acknowledgedBatches]
  );
  const acknowledgedObservationCount = useMemo(
    () => acknowledgedObservationBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [acknowledgedObservationBatches]
  );
  const acknowledgedHazardCount = useMemo(
    () => acknowledgedHazardBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [acknowledgedHazardBatches]
  );
  const rejectedSoundings = useMemo(() => rawSoundings.filter((sounding) => sounding.quality.rejected), [rawSoundings]);
  const averageConfidence = useMemo(() => {
    if (rawSoundings.length === 0) return 0;
    return rawSoundings.reduce((total, sounding) => total + sounding.quality.confidence, 0) / rawSoundings.length;
  }, [rawSoundings]);
  const averageDepth = useMemo(() => {
    if (rawSoundings.length === 0) return undefined;
    return rawSoundings.reduce((total, sounding) => total + sounding.depthMeters, 0) / rawSoundings.length;
  }, [rawSoundings]);
  const latestSounding = rawSoundings[0];
  const latestWaterTemperature = rawSoundings.find((sounding) => typeof sounding.environment?.waterTemperatureC === 'number')
    ?.environment?.waterTemperatureC;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const reportsToday = rawSoundings.filter((sounding) => sounding.receivedAt.startsWith(todayPrefix)).length +
    observations.filter((observation) => observation.receivedAt.startsWith(todayPrefix)).length +
    hazards.filter((hazard) => hazard.reportedAt.startsWith(todayPrefix)).length;
  const communityOverlayFeatures = useMemo(
    () => buildLocalCommunityOverlayFeatures(rawSoundings, hazards),
    [hazards, rawSoundings]
  );
  const reviewCounts = useMemo(() => {
    const counts = { pending: 0, accepted: 0, rejected: 0 };
    for (const hazard of reviewHazards) {
      counts[hazard.reviewStatus] += 1;
    }
    return counts;
  }, [reviewHazards]);
  const pendingReviewHazards = useMemo(
    () => reviewHazards.filter((hazard) => hazard.reviewStatus === 'pending'),
    [reviewHazards]
  );
  const soundingReviewCounts = useMemo(() => {
    const counts = { unreviewed: 0, accepted: 0, rejected: 0 };
    for (const sounding of reviewSoundings) {
      counts[sounding.reviewStatus] += 1;
    }
    return counts;
  }, [reviewSoundings]);
  const unreviewedSoundings = useMemo(
    () => reviewSoundings.filter((sounding) => sounding.reviewStatus === 'unreviewed'),
    [reviewSoundings]
  );

  const handleOptIn = (enabled: boolean) => {
    if (!consent) return;

    setConsent({
      ...consent,
      shareTelemetryForCommunity: enabled,
      shareLivePosition: enabled ? SharePositionLevel.BLURRED : SharePositionLevel.NONE,
    });
  };

  const handleQueueSoundings = () => {
    const batch = queueShareableSoundingBatch();
    // Dual transport: also publish to P2P mesh when enabled
    if (batch && boatNode.meshEnabled) {
      communityMeshSync.publishSoundings(batch);
    }
  };

  const handleQueueHazards = () => {
    queueShareableHazardBatch({
      sharePosition: consent?.shareLivePosition ?? SharePositionLevel.NONE,
      consentCapturedAt: consent?.lastUpdated ?? new Date().toISOString(),
    });
  };

  const handleQueueObservations = () => {
    queueShareableObservationBatch();
  };

  const handleSyncNextBatch = async () => {
    const batch = queuedBatches[0];
    if (!batch) return;

    setSyncingBatchId(batch.id);
    markUploadBatchStatus(batch.id, 'sent');

    try {
      const receipt = await uploadCommunitySoundingBatch(batch);
      markUploadBatchStatus(batch.id, 'acknowledged', {
        acknowledgedId: receipt.receiptId,
        updatedAt: receipt.storedAt,
      });
    } catch (error) {
      markUploadBatchStatus(batch.id, 'failed', {
        error: error instanceof Error ? error.message : 'Community sync failed',
      });
    } finally {
      setSyncingBatchId(null);
    }
  };

  const handleReportHazard = () => {
    const hazard = reportHazard({
      vesselId: consent?.vesselId ?? currentVessel?.id ?? `local-vessel-${boatNode.deviceId}`,
      sourceDeviceId: boatNode.deviceId,
      type: 'debris',
      severity: 'medium',
      description: 'Local hazard report',
      position: latestPosition ?? undefined,
    });
    // Dual transport: hazards are urgent, publish to mesh immediately
    if (boatNode.meshEnabled) {
      communityMeshSync.publishHazard(hazard);
    }
  };

  const handleSyncNextObservationBatch = async () => {
    const batch = queuedObservationBatches[0];
    if (!batch) return;

    setSyncingObservationBatchId(batch.id);
    markObservationBatchStatus(batch.id, 'sent');

    try {
      const receipt = await uploadCommunityObservationBatch(batch);
      markObservationBatchStatus(batch.id, 'acknowledged', {
        acknowledgedId: receipt.receiptId,
        updatedAt: receipt.storedAt,
      });
    } catch (error) {
      markObservationBatchStatus(batch.id, 'failed', {
        error: error instanceof Error ? error.message : 'Community observation sync failed',
      });
    } finally {
      setSyncingObservationBatchId(null);
    }
  };

  const handleSyncNextHazardBatch = async () => {
    const batch = queuedHazardBatches[0];
    if (!batch) return;

    setSyncingHazardBatchId(batch.id);
    markHazardBatchStatus(batch.id, 'sent');

    try {
      const receipt = await uploadCommunityHazardBatch(batch);
      markHazardBatchStatus(batch.id, 'acknowledged', {
        acknowledgedId: receipt.receiptId,
        updatedAt: receipt.storedAt,
      });
    } catch (error) {
      markHazardBatchStatus(batch.id, 'failed', {
        error: error instanceof Error ? error.message : 'Community hazard sync failed',
      });
    } finally {
      setSyncingHazardBatchId(null);
    }
  };

  const handleLoadCommunityAggregates = async () => {
    setAggregateLoading(true);
    setAggregateError(null);

    try {
      const aggregate = await fetchCommunityAggregates();
      setAggregateFeatures(aggregate.features);
    } catch (error) {
      setAggregateError(error instanceof Error ? error.message : 'Community aggregate load failed');
    } finally {
      setAggregateLoading(false);
    }
  };

  const handleLoadAggregateRelease = async () => {
    setAggregateReleaseLoading(true);
    setAggregateError(null);

    try {
      const [release, aggregate, history, artifacts] = await Promise.all([
        fetchCommunityAggregateReleaseManifest(),
        fetchLatestCommunityAggregateReleaseCells(),
        fetchCommunityAggregateReleaseHistory(),
        fetchCommunityAggregateReleaseArtifacts(),
      ]);
      setAggregateRelease(release);
      setAggregateFeatures(aggregate.features);
      setAggregateReleaseHistory(history.releases.slice(0, 5));
      setAggregateReleaseArtifacts(artifacts);
    } catch (error) {
      setAggregateError(error instanceof Error ? error.message : 'Community aggregate release load failed');
    } finally {
      setAggregateReleaseLoading(false);
    }
  };

  const handlePublishAggregateRelease = async () => {
    setAggregateReleasePublishing(true);
    setAggregateError(null);

    try {
      const generatedBy = resolvePilotOperatorId() ?? consent?.vesselId ?? boatNode.deviceId ?? 'local-operator';
      const release = await publishCommunityAggregateRelease({
        generatedBy,
        ...(aggregateReleaseApprovalChecked ? {
          approval: {
            approvedBy: generatedBy,
            checklist: {
              referenceOnly: true,
              officialChartDataExcluded: true,
              rawRecordIdsExcluded: true,
              vesselIdsExcluded: true,
            },
          },
        } : {}),
      });
      const [aggregate, history, artifacts] = await Promise.all([
        fetchLatestCommunityAggregateReleaseCells(),
        fetchCommunityAggregateReleaseHistory(),
        fetchCommunityAggregateReleaseArtifacts(),
      ]);
      setAggregateRelease(release);
      setAggregateFeatures(aggregate.features);
      setAggregateReleaseHistory(history.releases.slice(0, 5));
      setAggregateReleaseArtifacts(artifacts);
    } catch (error) {
      setAggregateError(error instanceof Error ? error.message : 'Community aggregate release publish failed');
    } finally {
      setAggregateReleasePublishing(false);
    }
  };

  const handleLoadHazardArtifacts = async () => {
    setHazardArtifactsLoading(true);
    setHazardArtifactError(null);

    try {
      const artifacts = await fetchCommunityHazardArtifacts();
      setHazardArtifacts(artifacts);
    } catch (error) {
      setHazardArtifactError(error instanceof Error ? error.message : 'Community hazard artifact load failed');
    } finally {
      setHazardArtifactsLoading(false);
    }
  };

  const handleLoadReviewQueue = async () => {
    setReviewLoading(true);
    setReviewError(null);

    try {
      const queue = await listCommunityHazardsForReview();
      setReviewHazards(queue.hazards);
      setReviewLoadedAt(new Date().toISOString());
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Hazard review queue failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleLoadReviewHistory = async () => {
    setReviewHistoryLoading(true);
    setReviewError(null);

    try {
      const history = await listCommunityHazardReviews();
      setReviewHistory(history.reviews.slice().reverse());
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Hazard review history failed');
    } finally {
      setReviewHistoryLoading(false);
    }
  };

  const handleReviewHazard = async (
    hazardId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const reviewedBy = resolvePilotOperatorId() ?? consent?.vesselId ?? boatNode.deviceId ?? 'local-operator';

    setReviewingHazardId(`${hazardId}:${status}`);
    setReviewError(null);

    try {
      const receipt = await reviewCommunityHazard({
        hazardId,
        status,
        reviewedBy,
      });
      setReviewHazards((currentHazards) => currentHazards.map((hazard) => (
        hazard.id === hazardId
          ? {
              ...hazard,
              reviewStatus: receipt.status,
              publicOverlayEligible: receipt.publicOverlayEligible,
              reviewedAt: receipt.reviewedAt,
              reviewedBy,
            }
          : hazard
      )));
      setReviewHistory((currentHistory) => [
        {
          hazardId,
          status: receipt.status,
          reviewedBy,
          reviewedAt: receipt.reviewedAt,
        },
        ...currentHistory,
      ]);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Hazard review failed');
    } finally {
      setReviewingHazardId(null);
    }
  };

  const handleLoadSoundingReviewQueue = async () => {
    setSoundingReviewLoading(true);
    setSoundingReviewError(null);

    try {
      const queue = await listCommunitySoundingsForReview();
      setReviewSoundings(queue.soundings);
      setSoundingReviewLoadedAt(new Date().toISOString());
    } catch (error) {
      setSoundingReviewError(error instanceof Error ? error.message : 'Sounding review queue failed');
    } finally {
      setSoundingReviewLoading(false);
    }
  };

  const handleLoadSoundingReviewHistory = async () => {
    setSoundingReviewHistoryLoading(true);
    setSoundingReviewError(null);

    try {
      const history = await listCommunitySoundingReviews();
      setSoundingReviewHistory(history.reviews.slice().reverse());
    } catch (error) {
      setSoundingReviewError(error instanceof Error ? error.message : 'Sounding review history failed');
    } finally {
      setSoundingReviewHistoryLoading(false);
    }
  };

  const handleReviewSounding = async (
    soundingId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const reviewedBy = resolvePilotOperatorId() ?? consent?.vesselId ?? boatNode.deviceId ?? 'local-operator';
    const reason = status === 'rejected' ? 'outlier' : 'other';

    setReviewingSoundingId(`${soundingId}:${status}`);
    setSoundingReviewError(null);

    try {
      const receipt = await reviewCommunitySounding({
        soundingId,
        status,
        reviewedBy,
        reason,
      });
      setReviewSoundings((currentSoundings) => currentSoundings.map((sounding) => (
        sounding.id === soundingId
          ? {
              ...sounding,
              reviewStatus: receipt.status,
              reviewedAt: receipt.reviewedAt,
              reviewedBy,
              reviewReason: reason,
            }
          : sounding
      )));
      setSoundingReviewHistory((currentHistory) => [
        {
          soundingId,
          status: receipt.status,
          reviewedBy,
          reviewedAt: receipt.reviewedAt,
          reason,
        },
        ...currentHistory,
      ]);
    } catch (error) {
      setSoundingReviewError(error instanceof Error ? error.message : 'Sounding review failed');
    } finally {
      setReviewingSoundingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Network</h1>
          <p className="mt-1 text-muted-foreground">Opt-in shared telemetry and safety network</p>
        </div>
        <Badge variant={isOptedIn ? 'default' : 'secondary'}>
          {isOptedIn ? 'Participating' : 'Not Participating'}
        </Badge>
      </div>

      {!isOptedIn && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Info className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Join the HarborMesh Community</h4>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Share anonymized telemetry to help other boaters with conditions, traffic awareness, hazards, and local depth observations.
                </p>
                <Button className="mt-3" size="sm" onClick={() => handleOptIn(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Opt In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isOptedIn && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Participation
              </CardTitle>
              <Switch checked={isOptedIn} onCheckedChange={handleOptIn} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-950/30">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Position</p>
                  <p className="text-xs text-muted-foreground">{consent?.shareLivePosition ?? SharePositionLevel.NONE}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-500 dark:bg-blue-950/30">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Telemetry</p>
                  <p className="text-xs text-muted-foreground">Motion and environment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-500 dark:bg-purple-950/30">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Device</p>
                  <p className="text-xs text-muted-foreground">{boatNode.deviceId}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit [&_[data-slot=tabs-trigger]]:flex-none">
          <TabsTrigger value="map">
            <Map className="mr-2 h-4 w-4" />
            Community Map
          </TabsTrigger>
          <TabsTrigger value="conditions">
            <Waves className="mr-2 h-4 w-4" />
            Conditions
          </TabsTrigger>
          <TabsTrigger value="hazards">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Hazards
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="bathymetry">
            <Droplets className="mr-2 h-4 w-4" />
            Bathymetry
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <Card className="min-h-[640px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  NB Community Map
                </CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge variant={aggregateError ? 'destructive' : 'outline'}>
                    <Database className="mr-1 h-3 w-3" />
                    {aggregateError ? 'Aggregate error' : `${aggregateFeatures.length} aggregate cells`}
                  </Badge>
                  <Badge variant="outline">
                    <Ship className="mr-1 h-3 w-3" />
                    {aisTargets.length + (latestPosition ? 1 : 0)} vessels
                  </Badge>
                  <Button size="sm" variant="outline" onClick={handleLoadCommunityAggregates} disabled={aggregateLoading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', aggregateLoading && 'animate-spin')} />
                    {aggregateLoading ? 'Loading' : 'Load Aggregates'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLoadAggregateRelease} disabled={aggregateReleaseLoading}>
                    <Database className={cn('mr-2 h-4 w-4', aggregateReleaseLoading && 'animate-spin')} />
                    {aggregateReleaseLoading ? 'Loading' : 'Load Release'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePublishAggregateRelease}
                    disabled={aggregateReleasePublishing}
                  >
                    <CheckCircle2 className={cn('mr-2 h-4 w-4', aggregateReleasePublishing && 'animate-spin')} />
                    {aggregateReleasePublishing ? 'Publishing' : 'Publish Release'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label htmlFor="aggregate-release-approval" className="text-sm font-medium">
                    Approval checklist
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reference-only, official-chart-free, no raw IDs, no vessel IDs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aggregate-release-approval"
                    checked={aggregateReleaseApprovalChecked}
                    onCheckedChange={(checked) => setAggregateReleaseApprovalChecked(checked === true)}
                  />
                  <Label htmlFor="aggregate-release-approval" className="text-xs">
                    Attach approval
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[480px]">
              <NBPilotChart
                position={latestPosition ? {
                  latitude: latestPosition.latitude,
                  longitude: latestPosition.longitude,
                } : null}
                heading={latestMotion?.yaw ?? 0}
                aisTargets={aisTargets}
                communityFeatures={communityOverlayFeatures}
                communityAggregateFeatures={aggregateFeatures}
              />
            </CardContent>
          </Card>

          {aggregateRelease && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5" />
                  Aggregate Release
                </CardTitle>
                <CardDescription>
                  {aggregateRelease.product.fileName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Cells</p>
                    <p className="text-xl font-bold">{aggregateRelease.product.aggregateCells}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Bytes</p>
                    <p className="text-xl font-bold">{aggregateRelease.product.byteLength}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">SHA-256</p>
                    <p className="font-mono text-sm">{aggregateRelease.product.sha256.slice(0, 12)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Generated</p>
                    <p className="text-sm font-medium">{new Date(aggregateRelease.generatedAt).toLocaleString()}</p>
                  </div>
                </div>
                {aggregateRelease.approval && (
                  <div className="mt-4 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardCheck className="h-4 w-4" />
                        Release approved
                      </span>
                      <Badge variant="outline">{aggregateRelease.approval.approvedBy}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(aggregateRelease.approval.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {aggregateReleaseHistory.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {aggregateReleaseHistory.map((release) => (
                      <div key={release.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-mono text-xs">{release.id}</span>
                        <span className="text-xs text-muted-foreground">
                          {release.product.aggregateCells} cells / {release.product.byteLength} bytes
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {aggregateReleaseArtifacts && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {aggregateReleaseArtifacts.artifacts.map((artifact) => (
                      <div key={artifact.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium uppercase">{artifact.format}</span>
                          <span className="text-xs text-muted-foreground">{artifact.byteLength} bytes</span>
                        </div>
                        <p className="mt-2 font-mono text-xs">{artifact.sha256.slice(0, 12)}</p>
                        {artifact.tileSummary && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            z{artifact.tileSummary.minZoom}-z{artifact.tileSummary.maxZoom} / {artifact.tileSummary.tileCount} tiles
                          </p>
                        )}
                        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                          <a href={artifact.downloadPath} download={artifact.fileName}>
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Latest Depth</p>
                <p className="text-2xl font-bold">{formatOptionalNumber(latestSounding?.depthMeters, 'm')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Average Depth</p>
                <p className="text-2xl font-bold">{formatOptionalNumber(averageDepth, 'm')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Thermometer className="h-4 w-4" />
                  Water Temp
                </div>
                <p className="text-2xl font-bold">{formatOptionalNumber(latestWaterTemperature, 'C')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">AIS Targets</p>
                <p className="text-2xl font-bold">{aisTargets.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Observations</p>
                <p className="text-2xl font-bold">{observations.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                Data Basis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conditions shown here are derived from local telemetry, AIS targets, and captured soundings. Sea-state estimation is not enabled until motion calibration and backend aggregation are implemented.
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Droplets className="h-5 w-5" />
                    Sounding Quality Review
                  </CardTitle>
                  <CardDescription>
                    Rejected depth points are excluded from public overlays and aggregate chart products.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleLoadSoundingReviewQueue} disabled={soundingReviewLoading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', soundingReviewLoading && 'animate-spin')} />
                    {soundingReviewLoading ? 'Loading' : 'Load Soundings'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLoadSoundingReviewHistory} disabled={soundingReviewHistoryLoading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', soundingReviewHistoryLoading && 'animate-spin')} />
                    {soundingReviewHistoryLoading ? 'Loading' : 'Load Sounding History'}
                  </Button>
                </div>
              </div>
              {soundingReviewLoadedAt && (
                <p className="text-xs text-muted-foreground">
                  Loaded {new Date(soundingReviewLoadedAt).toLocaleString()} · {unreviewedSoundings.length} unreviewed
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Unreviewed</p>
                  <p className="text-xl font-semibold">{soundingReviewCounts.unreviewed}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Accepted</p>
                  <p className="text-xl font-semibold">{soundingReviewCounts.accepted}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-xl font-semibold">{soundingReviewCounts.rejected}</p>
                </div>
              </div>

              {soundingReviewError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                  {soundingReviewError}
                </div>
              )}

              {reviewSoundings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Droplets className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No sounding review queue loaded.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {reviewSoundings.slice(0, 8).map((sounding) => (
                    <div key={sounding.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{sounding.depthMeters.toFixed(1)} m</p>
                          <Badge variant="outline" className={cn('text-xs', getConfidenceClass(sounding))}>
                            {Math.round(sounding.quality.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">{sounding.reviewStatus}</Badge>
                          {sounding.quality.flags.map((flag) => (
                            <Badge key={flag} variant="secondary" className="text-xs">{flag.replace(/_/g, ' ')}</Badge>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sounding.region} · {new Date(sounding.timestamp).toLocaleString()} · {sounding.sourceProtocol}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sounding.latitude.toFixed(5)}, {sounding.longitude.toFixed(5)} · {sounding.depthReference.replace(/_/g, ' ')}
                        </p>
                        {sounding.reviewedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reviewed {new Date(sounding.reviewedAt).toLocaleString()} by {sounding.reviewedBy ?? 'operator'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleReviewSounding(sounding.id, 'accepted')}
                          disabled={reviewingSoundingId !== null}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleReviewSounding(sounding.id, 'rejected')}
                          disabled={reviewingSoundingId !== null}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {soundingReviewHistory.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">Recent Sounding Decisions</p>
                  <div className="divide-y">
                    {soundingReviewHistory.slice(0, 5).map((review) => (
                      <div key={`${review.soundingId}:${review.reviewedAt}:${review.status}`} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{review.soundingId}</span>
                          <Badge variant="outline" className="capitalize text-xs">{review.status}</Badge>
                          {review.reason && <Badge variant="secondary" className="text-xs">{review.reason.replace(/_/g, ' ')}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.reviewedAt).toLocaleString()} · {review.reviewedBy}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5" />
                    Observation Sync Queue
                  </CardTitle>
                  <CardDescription>
                    Weather, AIS, motion, health, and condition observations use the governed community observation API.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleQueueObservations} disabled={pendingObservationCount === 0}>
                    <Database className="mr-2 h-4 w-4" />
                    Queue Observations
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNextObservationBatch}
                    disabled={queuedObservationBatches.length === 0 || syncingObservationBatchId !== null}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    {syncingObservationBatchId ? 'Syncing' : 'Sync Next'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{pendingObservationCount}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Queued</p>
                  <p className="text-xl font-bold">{queuedObservationRecordCount}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                  <p className="text-xl font-bold">{acknowledgedObservationCount}</p>
                </div>
              </div>
              {observationBatches.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No observation batches queued.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {observationBatches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{batch.payload.recordCount} observations</p>
                          <Badge variant="outline" className={cn('text-xs capitalize', getObservationBatchStatusClass(batch))}>
                            {batch.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(batch.queuedAt).toLocaleString()} · {batch.payload.region} · {batch.endpoint}
                        </p>
                      </div>
                      <div className="text-sm md:text-right">
                        <p className="font-medium">Attempt {batch.attemptCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.lastError ?? batch.acknowledgedId ?? batch.payload.schemaVersion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hazards" className="mt-4">
          <div className="space-y-3">
            {hazards.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No local hazard reports yet.</p>
                </CardContent>
              </Card>
            ) : (
              hazards.map((hazard) => (
                <Card key={hazard.id} className={cn('border-l-4', getHazardClass(hazard))}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium">{hazard.description}</h4>
                          <Badge variant="outline" className="capitalize text-xs">{hazard.severity}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="capitalize">{hazard.type}</span>
                          <span>{new Date(hazard.reportedAt).toLocaleString()}</span>
                          <span>{hazard.status}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Button onClick={handleReportHazard} disabled={!latestPosition}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Current Position Hazard
            </Button>
            <Button variant="outline" onClick={handleQueueHazards} disabled={pendingHazardCount === 0}>
              <Database className="mr-2 h-4 w-4" />
              Queue Hazard Reports
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncNextHazardBatch}
              disabled={queuedHazardBatches.length === 0 || syncingHazardBatchId !== null}
            >
              <Database className="mr-2 h-4 w-4" />
              {syncingHazardBatchId ? 'Syncing' : 'Sync Hazard Batch'}
            </Button>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5" />
                Hazard Sync Queue
              </CardTitle>
              <CardDescription>
                Hazard batches use the same consent and source-provenance path as community soundings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hazardBatches.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No hazard batches queued.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {hazardBatches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{batch.payload.recordCount} reports</p>
                          <Badge variant="outline" className={cn('text-xs capitalize', getHazardBatchStatusClass(batch))}>
                            {batch.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(batch.queuedAt).toLocaleString()} · {batch.payload.region} · {batch.endpoint}
                        </p>
                      </div>
                      <div className="text-sm md:text-right">
                        <p className="font-medium">Attempt {batch.attemptCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.lastError ?? batch.acknowledgedId ?? batch.payload.schemaVersion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Download className="h-5 w-5" />
                    Accepted Hazard Products
                  </CardTitle>
                  <CardDescription>
                    Downloadable reference products for reviewed positioned hazards.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadHazardArtifacts} disabled={hazardArtifactsLoading}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', hazardArtifactsLoading && 'animate-spin')} />
                  {hazardArtifactsLoading ? 'Loading' : 'Load Products'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hazardArtifactError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                  {hazardArtifactError}
                </div>
              )}

              {hazardArtifacts ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Public Hazards</p>
                      <p className="text-xl font-bold">{hazardArtifacts.sourceRecordCounts.publicHazards}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Total Hazards</p>
                      <p className="text-xl font-bold">{hazardArtifacts.sourceRecordCounts.hazards}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Omitted</p>
                      <p className="text-xl font-bold">
                        {hazardArtifacts.sourceRecordCounts.omittedPendingOrRejectedHazards
                          + hazardArtifacts.sourceRecordCounts.omittedUnpositionedHazards}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Vector Tiles</p>
                      <p className="text-sm font-medium">
                        {hazardArtifacts.rules.vectorTileGenerationPending ? 'Pending' : 'Ready'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {hazardArtifacts.artifacts.map((artifact) => (
                      <div key={artifact.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium uppercase">{artifact.format}</span>
                          <span className="text-xs text-muted-foreground">{artifact.byteLength} bytes</span>
                        </div>
                        <p className="mt-2 font-mono text-xs">{artifact.sha256.slice(0, 12)}</p>
                        {artifact.tileSummary && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            z{artifact.tileSummary.minZoom}-z{artifact.tileSummary.maxZoom} / {artifact.tileSummary.tileCount} tiles
                          </p>
                        )}
                        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                          <a href={artifact.downloadPath} download={artifact.fileName}>
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No hazard products loaded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Review Queue</p>
                <p className="text-2xl font-bold">{reviewHazards.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{reviewCounts.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{reviewCounts.accepted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{reviewCounts.rejected}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5" />
                    Hazard Moderation
                  </CardTitle>
                  <CardDescription>
                    Accepted positioned hazards become eligible for the public community overlay.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleLoadReviewQueue} disabled={reviewLoading}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', reviewLoading && 'animate-spin')} />
                  {reviewLoading ? 'Loading' : 'Load Review Queue'}
                </Button>
              </div>
              {reviewLoadedAt && (
                <p className="text-xs text-muted-foreground">
                  Loaded {new Date(reviewLoadedAt).toLocaleString()} · {pendingReviewHazards.length} pending
                </p>
              )}
            </CardHeader>
            <CardContent>
              {reviewError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                  {reviewError}
                </div>
              )}

              {reviewHazards.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No review queue loaded.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {reviewHazards.map((hazard) => (
                    <div key={hazard.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{hazard.description}</p>
                          <Badge variant="outline" className="capitalize text-xs">{hazard.severity}</Badge>
                          <Badge variant="outline" className="capitalize text-xs">{hazard.reviewStatus}</Badge>
                          {hazard.publicOverlayEligible && (
                            <Badge variant="default" className="text-xs">Overlay</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hazard.type} · {hazard.region} · {new Date(hazard.reportedAt).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {hazard.position
                            ? `${hazard.position.latitude.toFixed(5)}, ${hazard.position.longitude.toFixed(5)} · ${hazard.position.source}`
                            : 'No shared position'}
                        </p>
                        {hazard.reviewedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reviewed {new Date(hazard.reviewedAt).toLocaleString()} by {hazard.reviewedBy ?? 'operator'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleReviewHazard(hazard.id, 'accepted')}
                          disabled={reviewingHazardId !== null}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleReviewHazard(hazard.id, 'rejected')}
                          disabled={reviewingHazardId !== null}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5" />
                    Review History
                  </CardTitle>
                  <CardDescription>
                    Prior accepted and rejected hazard decisions from the pilot API.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadReviewHistory} disabled={reviewHistoryLoading}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', reviewHistoryLoading && 'animate-spin')} />
                  {reviewHistoryLoading ? 'Loading' : 'Load History'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reviewHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No review history loaded.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {reviewHistory.slice(0, 8).map((review) => (
                    <div key={`${review.hazardId}:${review.reviewedAt}:${review.status}`} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{review.hazardId}</p>
                          <Badge variant="outline" className="capitalize text-xs">{review.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(review.reviewedAt).toLocaleString()} · {review.reviewedBy}
                        </p>
                      </div>
                      {review.note && (
                        <p className="max-w-md text-sm text-muted-foreground md:text-right">{review.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bathymetry" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Raw Soundings</p>
                <p className="text-2xl font-bold">{rawSoundings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Shareable</p>
                <p className="text-2xl font-bold">{shareableSoundings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Queued</p>
                <p className="text-2xl font-bold">{queuedRecordCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedSoundings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{Math.round(averageConfidence * 100)}%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Droplets className="h-5 w-5" />
                    Recent Soundings
                  </CardTitle>
                  <CardDescription>
                    Raw observations stay local. Upload records are derived after consent, quality, and position-sharing rules.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleQueueSoundings} disabled={pendingShareableCount === 0}>
                  <Database className="mr-2 h-4 w-4" />
                  Queue Batch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rawSoundings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Droplets className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No depth soundings captured yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {rawSoundings.slice(0, 8).map((sounding) => {
                    const upload = prepareSoundingForCommunityUpload(sounding);
                    return (
                      <div key={sounding.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{sounding.depthMeters.toFixed(1)} m</p>
                            <Badge variant="outline" className={cn('text-xs', getConfidenceClass(sounding))}>
                              {Math.round(sounding.quality.confidence * 100)}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {sounding.depthReference.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(sounding.timestamp).toLocaleString()} · {sounding.sourceProtocol}
                          </p>
                        </div>
                        <div className="text-sm md:text-right">
                          <p className="font-medium capitalize">{sounding.sharing.state.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {upload ? `${upload.latitude.toFixed(2)}, ${upload.longitude.toFixed(2)}` : 'local only'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-5 w-5" />
                    Sync Queue
                  </CardTitle>
                  <CardDescription>
                    Queued batches are stored locally, then uploaded to the community API when available.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleSyncNextBatch} disabled={queuedBatches.length === 0 || syncingBatchId !== null}>
                  <Database className="mr-2 h-4 w-4" />
                  {syncingBatchId ? 'Syncing' : 'Sync Next'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {uploadBatches.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No community sounding batches queued.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {uploadBatches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{batch.payload.recordCount} records</p>
                          <Badge variant="outline" className={cn('text-xs capitalize', getBatchStatusClass(batch))}>
                            {batch.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(batch.queuedAt).toLocaleString()} · {batch.payload.region} · {batch.endpoint}
                        </p>
                      </div>
                      <div className="text-sm md:text-right">
                        <p className="font-medium">Attempt {batch.attemptCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.lastError ?? batch.acknowledgedId ?? batch.payload.schemaVersion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-500 dark:bg-blue-950/30">
                    <Ship className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Vessels</p>
                    <p className="text-2xl font-bold">{aisTargets.length + (latestPosition ? 1 : 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-950/30">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reports Today</p>
                    <p className="text-2xl font-bold">{reportsToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-500 dark:bg-amber-950/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Synced Hazards</p>
                    <p className="text-2xl font-bold">{acknowledgedHazardCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-500 dark:bg-amber-950/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local Hazards</p>
                    <p className="text-2xl font-bold">{hazards.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-500 dark:bg-purple-950/30">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Synced Soundings</p>
                    <p className="text-2xl font-bold">{acknowledgedRecordCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Your Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Raw soundings captured</span>
                  <span className="font-medium">{rawSoundings.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shareable soundings</span>
                  <span className="font-medium">{shareableSoundings.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Governed observations</span>
                  <span className="font-medium">{observations.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hazards reported</span>
                  <span className="font-medium">{hazards.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
