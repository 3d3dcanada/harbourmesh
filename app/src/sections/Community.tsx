/**
 * HarborMesh - Community Section
 * Opt-in community telemetry network and shared safety features
 */

import React, { useMemo, useState } from 'react';
import {
  Users,
  Map,
  Wind,
  Waves,
  AlertTriangle,
  Info,
  CheckCircle2,
  Shield,
  Eye,
  Activity,
  Ship,
  BarChart3,
  Database,
  Droplets,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCommunityDataStore, useSettingsStore, useTelemetryStore, type CommunitySyncBatch } from '@/store';
import { SharePositionLevel } from '@/types';
import { prepareSoundingForCommunityUpload, type RawDepthSounding } from '@/lib/community-soundings';
import { uploadCommunitySoundingBatch } from '@/lib/community-sync';

// Demo community data
const demoVessels = [
  { id: 'v1', name: 'Sea Breeze', type: 'Sailboat', lat: 37.78, lon: -122.42, sog: 5.2, cog: 180, lastUpdate: '2 min ago' },
  { id: 'v2', name: 'Coastal Runner', type: 'Powerboat', lat: 37.76, lon: -122.40, sog: 12.5, cog: 90, lastUpdate: '5 min ago' },
  { id: 'v3', name: 'Wind Dancer', type: 'Catamaran', lat: 37.80, lon: -122.44, sog: 7.8, cog: 270, lastUpdate: '1 min ago' },
  { id: 'v4', name: 'Bay Cruiser', type: 'Trawler', lat: 37.77, lon: -122.38, sog: 8.0, cog: 45, lastUpdate: '8 min ago' },
];

const demoConditions = [
  { area: 'Golden Gate', seaState: 'moderate', waveHeight: '1.5-2m', wind: '15-20 kn NW', vessels: 12 },
  { area: 'Angel Island', seaState: 'calm', waveHeight: '0.5-1m', wind: '5-10 kn W', vessels: 8 },
  { area: 'Alcatraz', seaState: 'moderate', waveHeight: '1-1.5m', wind: '12-18 kn NW', vessels: 6 },
  { area: 'Bay Bridge', seaState: 'slight', waveHeight: '0.5-1m', wind: '8-12 kn W', vessels: 15 },
];

const demoHazards = [
  { id: 'h1', type: 'traffic', severity: 'medium', description: 'Heavy ferry traffic near SF Ferry Building', reported: '10 min ago' },
  { id: 'h2', type: 'weather', severity: 'low', description: 'Fog bank forming near Golden Gate', reported: '25 min ago' },
  { id: 'h3', type: 'obstruction', severity: 'high', description: 'Debris reported in channel', reported: '5 min ago' },
];

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

export function Community() {
  const { consent, setConsent } = useSettingsStore();
  const { aisTargets } = useTelemetryStore();
  const {
    rawSoundings,
    uploadBatches,
    getShareableSoundings,
    queueShareableSoundingBatch,
    markUploadBatchStatus,
  } = useCommunityDataStore();
  const [activeTab, setActiveTab] = useState('map');
  const [isOptedIn, setIsOptedIn] = useState(consent?.shareTelemetryForCommunity || false);
  const [syncingBatchId, setSyncingBatchId] = useState<string | null>(null);
  const shareableSoundings = getShareableSoundings();
  const queuedBatches = useMemo(() => uploadBatches.filter((batch) => batch.status === 'queued'), [uploadBatches]);
  const queuedRecordIds = useMemo(
    () =>
      new Set(
        uploadBatches
          .filter((batch) => batch.status !== 'failed')
          .flatMap((batch) => batch.payload.records.map((record) => record.id))
      ),
    [uploadBatches]
  );
  const pendingShareableCount = useMemo(
    () => shareableSoundings.filter((record) => !queuedRecordIds.has(record.id)).length,
    [queuedRecordIds, shareableSoundings]
  );
  const queuedRecordCount = useMemo(
    () => queuedBatches.reduce((total, batch) => total + batch.payload.recordCount, 0),
    [queuedBatches]
  );
  const rejectedSoundings = useMemo(() => rawSoundings.filter((sounding) => sounding.quality.rejected), [rawSoundings]);
  const averageConfidence = useMemo(() => {
    if (rawSoundings.length === 0) return 0;
    return rawSoundings.reduce((total, sounding) => total + sounding.quality.confidence, 0) / rawSoundings.length;
  }, [rawSoundings]);
  
  const handleOptIn = (enabled: boolean) => {
    setIsOptedIn(enabled);
    if (consent) {
      setConsent({
        ...consent,
        shareTelemetryForCommunity: enabled,
        shareLivePosition: enabled ? SharePositionLevel.BLURRED : SharePositionLevel.NONE,
      });
    }
  };

  const handleQueueSoundings = () => {
    queueShareableSoundingBatch();
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Network</h1>
          <p className="text-muted-foreground mt-1">
            Opt-in shared telemetry and safety network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOptedIn ? 'default' : 'secondary'}>
            {isOptedIn ? 'Participating' : 'Not Participating'}
          </Badge>
        </div>
      </div>
      
      {/* Opt-in Banner */}
      {!isOptedIn && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  Join the HarborMesh Community
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Share anonymized telemetry to help other boaters with real-time conditions, 
                  traffic awareness, and safety alerts. You control what you share.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => handleOptIn(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Opt In
                  </Button>
                  <Button variant="ghost" size="sm">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Participation Settings */}
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
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Position</p>
                  <p className="text-xs text-muted-foreground">Blurred (±500m)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Telemetry</p>
                  <p className="text-xs text-muted-foreground">Motion & Environment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/30">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Training</p>
                  <p className="text-xs text-muted-foreground">Anonymized only</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Community Map
          </TabsTrigger>
          <TabsTrigger value="conditions">
            <Waves className="h-4 w-4 mr-2" />
            Conditions
          </TabsTrigger>
	          <TabsTrigger value="hazards">
	            <AlertTriangle className="h-4 w-4 mr-2" />
	            Hazards
	          </TabsTrigger>
	          <TabsTrigger value="bathymetry">
	            <Droplets className="h-4 w-4 mr-2" />
	            Bathymetry
	          </TabsTrigger>
	          <TabsTrigger value="stats">
	            <BarChart3 className="h-4 w-4 mr-2" />
	            Statistics
          </TabsTrigger>
        </TabsList>
        
        {/* Map View */}
        <TabsContent value="map" className="mt-4">
          <Card className="h-[500px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Live Vessel Positions
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Ship className="h-3 w-3 mr-1" />
                    {demoVessels.length + aisTargets.length} vessels
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <div className="relative w-full h-full rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden">
                {/* Simulated map background */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                
                {/* Land masses (simplified) */}
                <div className="absolute bottom-0 left-0 w-1/3 h-1/4 bg-emerald-200/30 dark:bg-emerald-900/30 rounded-tr-3xl" />
                <div className="absolute top-0 right-0 w-1/4 h-1/3 bg-emerald-200/30 dark:bg-emerald-900/30 rounded-bl-3xl" />
                
                {/* Demo vessels */}
                {demoVessels.map((vessel, index) => (
                  <div
                    key={vessel.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${20 + (index * 15)}%`,
                      top: `${30 + (index * 10)}%`,
                    }}
                  >
                    <div className="relative">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <div 
                        className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-blue-500/50 origin-left"
                        style={{ transform: `translate(-50%, -50%) rotate(${vessel.cog}deg)` }}
                      />
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-xs bg-background/80 px-1 rounded">{vessel.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Own vessel (center) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="absolute -inset-2 border-2 border-emerald-500/30 rounded-full" />
                  </div>
                </div>
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-background/90 backdrop-blur">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span>Your Vessel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>Community Vessel</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conditions View */}
        <TabsContent value="conditions" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {demoConditions.map((condition, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{condition.area}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'capitalize',
                            condition.seaState === 'calm' && 'text-emerald-500 border-emerald-200',
                            condition.seaState === 'slight' && 'text-blue-500 border-blue-200',
                            condition.seaState === 'moderate' && 'text-amber-500 border-amber-200',
                            condition.seaState === 'rough' && 'text-red-500 border-red-200',
                          )}
                        >
                          {condition.seaState}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {condition.vessels} vessels
                        </span>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Waves className="h-4 w-4 text-muted-foreground" />
                      <span>{condition.waveHeight}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-muted-foreground" />
                      <span>{condition.wind}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                How Conditions Are Calculated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sea-state estimates are derived from anonymized motion data shared by participating vessels. 
                Wave heights are estimated using accelerometer and gyroscope data. Conditions are updated 
                every 15 minutes based on recent reports.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Hazards View */}
        <TabsContent value="hazards" className="mt-4">
          <div className="space-y-3">
            {demoHazards.map((hazard) => (
              <Card 
                key={hazard.id}
                className={cn(
                  'border-l-4',
                  hazard.severity === 'high' ? 'border-l-red-500' :
                  hazard.severity === 'medium' ? 'border-l-amber-500' :
                  'border-l-blue-500'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      hazard.severity === 'high' ? 'bg-red-50 text-red-500 dark:bg-red-950/30' :
                      hazard.severity === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' :
                      'bg-blue-50 text-blue-500 dark:bg-blue-950/30'
                    )}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{hazard.description}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'capitalize text-xs',
                            hazard.severity === 'high' && 'text-red-500 border-red-200',
                            hazard.severity === 'medium' && 'text-amber-500 border-amber-200',
                            hazard.severity === 'low' && 'text-blue-500 border-blue-200',
                          )}
                        >
                          {hazard.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="capitalize">{hazard.type}</span>
                        <span>Reported {hazard.reported}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button className="w-full mt-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report Hazard
          </Button>
	        </TabsContent>
	        
	        {/* Bathymetry View */}
	        <TabsContent value="bathymetry" className="mt-4">
	          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
	            <Card>
	              <CardContent className="py-4">
	                <div className="flex items-center gap-3">
	                  <div className="rounded-lg bg-blue-50 p-2 text-blue-500 dark:bg-blue-950/30">
	                    <Database className="h-5 w-5" />
	                  </div>
	                  <div>
	                    <p className="text-sm text-muted-foreground">Raw Soundings</p>
	                    <p className="text-2xl font-bold">{rawSoundings.length}</p>
	                  </div>
	                </div>
	              </CardContent>
	            </Card>
	            <Card>
	              <CardContent className="py-4">
	                <div className="flex items-center gap-3">
	                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-950/30">
	                    <Shield className="h-5 w-5" />
	                  </div>
	                  <div>
	                    <p className="text-sm text-muted-foreground">Shareable</p>
	                    <p className="text-2xl font-bold">{shareableSoundings.length}</p>
	                  </div>
	                </div>
	              </CardContent>
	            </Card>
	            <Card>
	              <CardContent className="py-4">
	                <div className="flex items-center gap-3">
	                  <div className="rounded-lg bg-amber-50 p-2 text-amber-500 dark:bg-amber-950/30">
	                    <Database className="h-5 w-5" />
	                  </div>
	                  <div>
	                    <p className="text-sm text-muted-foreground">Queued</p>
	                    <p className="text-2xl font-bold">{queuedRecordCount}</p>
	                  </div>
	                </div>
	              </CardContent>
	            </Card>
	            <Card>
	              <CardContent className="py-4">
	                <div className="flex items-center gap-3">
	                  <div className="rounded-lg bg-red-50 p-2 text-red-500 dark:bg-red-950/30">
	                    <AlertTriangle className="h-5 w-5" />
	                  </div>
	                  <div>
	                    <p className="text-sm text-muted-foreground">Rejected</p>
	                    <p className="text-2xl font-bold">{rejectedSoundings.length}</p>
	                  </div>
	                </div>
	              </CardContent>
	            </Card>
	            <Card>
	              <CardContent className="py-4">
	                <div className="flex items-center gap-3">
	                  <div className="rounded-lg bg-purple-50 p-2 text-purple-500 dark:bg-purple-950/30">
	                    <BarChart3 className="h-5 w-5" />
	                  </div>
	                  <div>
	                    <p className="text-sm text-muted-foreground">Confidence</p>
	                    <p className="text-2xl font-bold">{Math.round(averageConfidence * 100)}%</p>
	                  </div>
	                </div>
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
	                    Raw depth observations stay local. Upload records are derived only after consent, quality, and position-sharing rules.
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
	        
	        {/* Stats View */}
	        <TabsContent value="stats" className="mt-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                    <Ship className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Vessels</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reports Today</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hazards</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/30">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Community</p>
                    <p className="text-2xl font-bold">1,247</p>
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
                  <span className="text-sm text-muted-foreground">Position reports shared</span>
                  <span className="font-medium">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sea-state contributions</span>
                  <span className="font-medium">89</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hazards reported</span>
                  <span className="font-medium">2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
