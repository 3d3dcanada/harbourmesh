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
  Database,
  Droplets,
  Eye,
  Globe,
  Info,
  Map,
  Shield,
  Ship,
  Thermometer,
  Waves,
} from 'lucide-react';
import { NBPilotChart } from '@/components/NBPilotChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { prepareSoundingForCommunityUpload, type RawDepthSounding } from '@/lib/community-soundings';
import { uploadCommunityHazardBatch, uploadCommunitySoundingBatch } from '@/lib/community-sync';
import { buildLocalCommunityOverlayFeatures } from '@/lib/local-community-overlay';
import { cn } from '@/lib/utils';
import {
  useCommunityDataStore,
  useSettingsStore,
  useTelemetryStore,
  type CommunityHazard,
  type CommunityHazardSyncBatch,
  type CommunitySyncBatch,
} from '@/store';
import { SharePositionLevel } from '@/types';

function getConfidenceClass(sounding: RawDepthSounding): string {
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

function formatOptionalNumber(value: number | undefined, suffix: string): string {
  return typeof value === 'number' ? `${value.toFixed(1)} ${suffix}` : '--';
}

export function Community() {
  const { consent, setConsent, boatNode } = useSettingsStore();
  const { aisTargets, latestPosition, latestMotion } = useTelemetryStore();
  const {
    hazards,
    hazardBatches,
    rawSoundings,
    uploadBatches,
    getShareableSoundings,
    markHazardBatchStatus,
    markUploadBatchStatus,
    queueShareableHazardBatch,
    queueShareableSoundingBatch,
    reportHazard,
  } = useCommunityDataStore();
  const [activeTab, setActiveTab] = useState('map');
  const [syncingBatchId, setSyncingBatchId] = useState<string | null>(null);
  const [syncingHazardBatchId, setSyncingHazardBatchId] = useState<string | null>(null);
  const isOptedIn = consent?.shareTelemetryForCommunity || false;
  const shareableSoundings = getShareableSoundings();
  const queuedBatches = useMemo(() => uploadBatches.filter((batch) => batch.status === 'queued'), [uploadBatches]);
  const queuedHazardBatches = useMemo(() => hazardBatches.filter((batch) => batch.status === 'queued'), [hazardBatches]);
  const acknowledgedBatches = useMemo(
    () => uploadBatches.filter((batch) => batch.status === 'acknowledged'),
    [uploadBatches]
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
  const pendingHazardCount = useMemo(
    () => hazards.filter((hazard) => hazard.status !== 'acknowledged' && !queuedHazardIds.has(hazard.id)).length,
    [hazards, queuedHazardIds]
  );
  const queuedRecordCount = useMemo(
    () => queuedBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [queuedBatches]
  );
  const acknowledgedRecordCount = useMemo(
    () => acknowledgedBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [acknowledgedBatches]
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
    hazards.filter((hazard) => hazard.reportedAt.startsWith(todayPrefix)).length;
  const communityOverlayFeatures = useMemo(
    () => buildLocalCommunityOverlayFeatures(rawSoundings, hazards),
    [hazards, rawSoundings]
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
    queueShareableSoundingBatch();
  };

  const handleQueueHazards = () => {
    queueShareableHazardBatch({
      sharePosition: consent?.shareLivePosition ?? SharePositionLevel.NONE,
      consentCapturedAt: consent?.lastUpdated ?? new Date().toISOString(),
    });
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
    reportHazard({
      vesselId: consent?.vesselId ?? 'demo-vessel',
      sourceDeviceId: boatNode.deviceId,
      type: 'debris',
      severity: 'medium',
      description: 'Local hazard report',
      position: latestPosition ?? undefined,
    });
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
        <TabsList>
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
          <Card className="h-[560px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  NB Community Map
                </CardTitle>
                <Badge variant="outline">
                  <Ship className="mr-1 h-3 w-3" />
                  {aisTargets.length + (latestPosition ? 1 : 0)} vessels
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <NBPilotChart
                position={latestPosition ? {
                  latitude: latestPosition.latitude,
                  longitude: latestPosition.longitude,
                } : null}
                heading={latestMotion?.yaw ?? 0}
                aisTargets={aisTargets}
                communityFeatures={communityOverlayFeatures}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
