/**
 * HarborMesh - Navigation Section
 * Real-time HUD with charts, AIS, and telemetry display
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Navigation as NavigationIcon,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Layers,
  Maximize2,
  Minimize2,
  Activity,
  Ship,
  AlertTriangle,
  Download,
  Upload,
  ShieldCheck,
  FileText,
  X,
  Info,
  Clock,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { cn, formatCoordinate, formatHeading } from '@/lib/utils';
import { useTelemetry } from '@/hooks/useTelemetry';
import { NBPilotChart } from '@/components/NBPilotChart';
import { useNavigationPlanStore, useSettingsStore, useTelemetryStore } from '@/store';
import { useMeshStore } from '@/store/meshStore';
import { ChartBuilderDrawer } from '@/components/ChartBuilderDrawer';
import {
  fetchNBPilotChartPackageArtifacts,
  type NBPilotChartPackageArtifactManifest,
} from '@/lib/chart-catalog';
import {
  formatTelemetryAge,
  getTelemetryHealth,
  type TelemetryHealthStatus,
} from '@/lib/telemetry-health';
import { parseGpxRoute, routeToGpx } from '@/lib/gpx-routes';
import {
  addLocalChartReference,
  forgetLocalChartReference,
  loadLocalChartLibrary,
  type LocalChartFormat,
  type LocalChartLibrary,
} from '@/lib/local-chart-library';

const LOCAL_CHART_FORMAT_LABELS: Record<LocalChartFormat, string> = {
  's57-enc': 'S-57 ENC',
  'bsb-rnc': 'BSB RNC',
  'pdf-chart': 'PDF',
  mbtiles: 'MBTiles',
  pmtiles: 'PMTiles',
  geojson: 'GeoJSON',
  unknown: 'Unknown',
};

function formatByteLength(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Compass rose component
function CompassRose({ heading, course, size = 200 }: { heading: number; course?: number; size?: number }) {
  return (
    <div 
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-muted bg-card shadow-inner">
        {/* Cardinal points */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">N</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold">S</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold">W</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold">E</div>
        
        {/* Degree markings */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <div
            key={deg}
            className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-muted-foreground/30 origin-bottom"
            style={{
              transform: `translate(-50%, -100%) rotate(${deg}deg) translateY(-${size / 2 - 12}px)`,
            }}
          />
        ))}
      </div>
      
      {/* Rotating compass card */}
      <div 
        className="absolute inset-4 rounded-full border-2 border-primary/20 transition-transform duration-500"
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        {/* Inner markings */}
        {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => (
          <div
            key={deg}
            className="absolute top-1/2 left-1/2 w-px bg-primary/30 origin-bottom"
            style={{
              height: deg % 90 === 0 ? 12 : 6,
              transform: `translate(-50%, -100%) rotate(${deg}deg) translateY(-${size / 2 - 28}px)`,
            }}
          />
        ))}
      </div>
      
      {/* Lubber line (fixed at top) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-red-500" />
      </div>
      
      {/* Course indicator */}
      {course !== undefined && (
        <div 
          className="absolute top-1/2 left-1/2 w-1 h-1/2 bg-blue-500/50 origin-top"
          style={{ 
            transform: `translate(-50%, 0) rotate(${course - heading}deg)`,
          }}
        />
      )}
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
    </div>
  );
}

// Digital gauge component
function DigitalGauge({ 
  value, 
  unit, 
  label, 
  min, 
  max, 
  warning,
  danger,
  icon: Icon,
}: { 
  value: number | undefined; 
  unit: string; 
  label: string;
  min?: number;
  max?: number;
  warning?: number;
  danger?: number;
  icon?: React.ElementType;
}) {
  const displayValue = value !== undefined ? value.toFixed(1) : '--';
  const isWarning = warning !== undefined && value !== undefined && value >= warning;
  const isDanger = danger !== undefined && value !== undefined && value >= danger;
  
  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-card border">
      {Icon && <Icon className="h-5 w-5 text-muted-foreground mb-2" />}
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn(
          'text-3xl font-bold tabular-nums',
          isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : ''
        )}>
          {displayValue}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {min !== undefined && max !== undefined && value !== undefined && (
        <div className="w-full mt-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-300',
                isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getTelemetryHealthClass(status: TelemetryHealthStatus): string {
  if (status === 'fresh') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200';
  if (status === 'stale') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200';
  return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200';
}

// Attitude indicator (artificial horizon)
function AttitudeIndicator({ roll, pitch }: { roll: number; pitch: number }) {
  return (
    <div className="relative w-40 h-40 rounded-full border-4 border-muted bg-gradient-to-b from-sky-400/30 to-amber-700/30 overflow-hidden">
      {/* Horizon line */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          transform: `rotate(${-roll}deg) translateY(${pitch * 2}px)`,
        }}
      >
        <div className="w-full h-0.5 bg-white" />
        <div className="absolute w-full h-1/2 top-1/2 bg-amber-700/50" />
      </div>
      
      {/* Fixed aircraft symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div className="w-12 h-0.5 bg-yellow-400" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-yellow-400" />
        </div>
      </div>
      
      {/* Pitch ladder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[-20, -10, 10, 20].map((deg) => (
          <div
            key={deg}
            className="absolute text-[8px] text-white/50"
            style={{ transform: `translateY(${-deg * 2}px)` }}
          >
            {Math.abs(deg)}°
          </div>
        ))}
      </div>
    </div>
  );
}

export function Navigation() {
  const { 
    latestPosition, 
    latestMotion, 
    latestEnvironment, 
    latestEngine, 
    aisTargets,
    isConnected,
  } = useTelemetry();
  
  const [activeView, setActiveView] = useState('hud');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [chartArtifacts, setChartArtifacts] = useState<NBPilotChartPackageArtifactManifest | null>(null);
  const [chartArtifactsLoading, setChartArtifactsLoading] = useState(false);
  const [chartArtifactsError, setChartArtifactsError] = useState<string | null>(null);
  const [localChartLibrary, setLocalChartLibrary] = useState<LocalChartLibrary>(() => loadLocalChartLibrary());
  const [localChartImportError, setLocalChartImportError] = useState<string | null>(null);
  const [routeImportError, setRouteImportError] = useState<string | null>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const localChartInputRef = useRef<HTMLInputElement>(null);
  const telemetryMessages = useTelemetryStore((state) => state.messages);
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const boatNode = useSettingsStore((state) => state.boatNode);
  const telemetryHealth = getTelemetryHealth(telemetryMessages);
  const {
    routes,
    activeRouteId,
    addRoute,
    setActiveRoute,
    seedNBPilotReferenceRoute,
  } = useNavigationPlanStore();
  
  const { meshVessels, isConnected: isMeshConnected } = useMeshStore();
  const meshVesselsList = Object.values(meshVessels);
  
  // Get first engine data
  const engineData = Object.entries(latestEngine)[0]?.[1];
  const activeRoute = routes.find((route) => route.id === activeRouteId) ?? null;
  const telemetrySourceLabel = !isConnected
    ? 'Offline'
    : boatNode.telemetryMode === 'replay'
      ? 'Recorded Replay'
      : boatNode.telemetryMode === 'simulated'
        ? 'Demo Simulation'
        : 'Live Signal K';
  const chartArtifactCounts = chartArtifacts?.artifacts.reduce<Record<string, number>>((counts, artifact) => {
    counts[artifact.format] = (counts[artifact.format] ?? 0) + 1;
    return counts;
  }, {}) ?? {};

  useEffect(() => {
    setLocalChartLibrary(loadLocalChartLibrary());
  }, []);

  const handleLoadChartArtifacts = async () => {
    setChartArtifactsLoading(true);
    setChartArtifactsError(null);

    try {
      const artifacts = await fetchNBPilotChartPackageArtifacts();
      setChartArtifacts(artifacts);
    } catch (error) {
      setChartArtifactsError(error instanceof Error ? error.message : 'Chart package artifact load failed');
    } finally {
      setChartArtifactsLoading(false);
    }
  };

  const handleExportActiveRouteGpx = () => {
    if (!activeRoute) return;

    const blob = new Blob([routeToGpx(activeRoute)], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeRoute.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'route'}.gpx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRouteGpx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const importedRoute = parseGpxRoute(await file.text(), {
        id: `gpx-${crypto.randomUUID()}`,
        vesselId: 'local-vessel',
      });
      addRoute(importedRoute);
      setRouteImportError(null);
    } catch (error) {
      setRouteImportError(error instanceof Error ? error.message : 'GPX import failed');
    } finally {
      event.currentTarget.value = '';
    }
  };

  const handleAddLocalChartReference = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const library = addLocalChartReference(file);
      setLocalChartLibrary(library);
      setLocalChartImportError(null);
    } catch (error) {
      setLocalChartImportError(error instanceof Error ? error.message : 'Local chart registration failed');
    } finally {
      event.currentTarget.value = '';
    }
  };

  const handleForgetLocalChartReference = (chartId: string) => {
    const library = forgetLocalChartReference(chartId);
    setLocalChartLibrary(library);
    setLocalChartImportError(null);
  };

  const chartPackageCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5" />
              Chart Packages
            </CardTitle>
            <CardDescription>
              Generated NB reference artifacts exclude official CHS chart data.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleLoadChartArtifacts} disabled={chartArtifactsLoading}>
            {chartArtifactsLoading ? 'Loading' : 'Load Artifacts'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chartArtifactsError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
            {chartArtifactsError}
          </div>
        )}

        {!chartArtifacts ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No package artifacts loaded.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{chartArtifactCounts.geojson ?? 0} GeoJSON</Badge>
              <Badge variant="outline">{chartArtifactCounts.mbtiles ?? 0} MBTiles</Badge>
              <Badge variant="outline">{chartArtifactCounts.pmtiles ?? 0} PMTiles</Badge>
              {chartArtifacts.rules.pmtilesGenerationPending && <Badge variant="secondary">PMTiles pending</Badge>}
              {chartArtifacts.rules.mbtilesGenerationPending && <Badge variant="secondary">MBTiles pending</Badge>}
            </div>
            <div className="divide-y">
              {chartArtifacts.artifacts.map((artifact) => (
                <div key={artifact.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{artifact.fileName}</p>
                    <Badge variant="outline" className="text-xs">{artifact.format}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {artifact.byteLength} bytes · {artifact.sha256.slice(0, 12)}
                  </p>
                  {artifact.tileSummary && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      z{artifact.tileSummary.minZoom}-{artifact.tileSummary.maxZoom} · {artifact.tileSummary.tileCount} tiles
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Excludes {artifact.excludedSourceIds.join(', ')}
                  </p>
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
        )}
      </CardContent>
    </Card>
  );

  const localChartLibraryCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5" />
              Local Chart Library
            </CardTitle>
            <CardDescription>
              Licensed chart file bytes stay on this device; HarbourMesh stores metadata only.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={localChartInputRef}
              type="file"
              accept=".000,.001,.002,.003,.004,.005,.kap,.bsb,.pdf,.mbtiles,.pmtiles,.geojson,.json"
              className="hidden"
              onChange={handleAddLocalChartReference}
            />
            <Button size="sm" variant="outline" onClick={() => localChartInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Add Local Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {localChartImportError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
            {localChartImportError}
          </div>
        )}

        {localChartLibrary.charts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No local chart metadata saved.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localChartLibrary.charts.map((chart) => (
              <div key={chart.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{chart.fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatByteLength(chart.byteLength)}
                      {chart.lastModified ? ` · Modified ${chart.lastModified.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Forget ${chart.fileName}`}
                    onClick={() => handleForgetLocalChartReference(chart.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{LOCAL_CHART_FORMAT_LABELS[chart.format]}</Badge>
                  <Badge variant="secondary">Local only</Badge>
                  <Badge variant="secondary">No community upload</Badge>
                  <Badge variant="secondary">No shared tiles</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className={cn(
      'flex h-[calc(100vh-4.5rem)] w-full overflow-hidden',
      isFullscreen && 'fixed inset-0 z-50 bg-background'
    )}>
      {/* Main Chart Area */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-muted/20">
        
        {/* Top Compact Sensor Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-4 pointer-events-none">
          <div className="flex flex-wrap gap-2 pointer-events-auto max-w-[60%]">
            {telemetryHealth.map((item) => (
              <Badge key={item.channel} variant="outline" className={cn("bg-background/80 backdrop-blur-sm shadow-sm border-muted-foreground/20", getTelemetryHealthClass(item.status))}>
                <span className="opacity-70 mr-1">{item.label}:</span>
                <span className="capitalize">{item.status}</span>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {!isConnected && (
              <Badge variant="destructive" className="shadow-sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No connection
              </Badge>
            )}
            <Badge variant={isMeshConnected ? 'default' : 'outline'} className="shadow-sm bg-background/80 backdrop-blur-sm">
              <Ship className="h-3 w-3 mr-1" />
              Mesh: {isMeshConnected ? 'Live' : 'Offline'}
            </Badge>
            <Badge variant={isConnected ? (boatNode.telemetryMode === 'replay' ? 'secondary' : 'default') : 'outline'} className="shadow-sm bg-background/80 backdrop-blur-sm">
              <Activity className="h-3 w-3 mr-1" />
              {telemetrySourceLabel}
            </Badge>
            <Button 
              variant="outline" 
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
              onClick={() => setIsChartBuilderOpen(true)}
              title="Community Chart Builder"
            >
              <Droplets className="h-4 w-4 text-emerald-500" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Chart Background */}
        <div className="absolute inset-0 z-0">
          <NBPilotChart
            position={latestPosition ? {
              latitude: latestPosition.latitude,
              longitude: latestPosition.longitude,
            } : null}
            heading={latestMotion?.yaw || 0}
            aisTargets={aisTargets}
            meshVessels={meshVesselsList}
            routes={routes}
            activeRouteId={activeRouteId}
          />
        </div>

        {/* Floating Instruments (Left Side) */}
        <div className="absolute top-16 left-4 bottom-4 w-64 z-10 overflow-y-auto pointer-events-none custom-scrollbar pb-4 pr-2 space-y-4 hidden sm:block">
          <Card className="pointer-events-auto bg-background/80 backdrop-blur-md border-muted-foreground/20 shadow-lg">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <CompassRose 
                heading={latestMotion?.yaw || 0} 
                course={latestPosition?.cog}
                size={160}
              />
              <div className="mt-4 text-center">
                <p className="text-2xl font-bold">{Math.round(latestMotion?.yaw || 0)}°</p>
                <p className="text-xs text-muted-foreground">
                  {formatHeading(latestMotion?.yaw || 0).split(' ').slice(1).join(' ')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="pointer-events-auto bg-background/80 backdrop-blur-md border-muted-foreground/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Position</span>
              </div>
              {latestPosition ? (
                <div className="space-y-1">
                  <p className="font-mono text-base">
                    {formatCoordinate(latestPosition.latitude, 'lat')}
                  </p>
                  <p className="font-mono text-base">
                    {formatCoordinate(latestPosition.longitude, 'lon')}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">--</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2 pointer-events-auto">
            <DigitalGauge label="Speed" value={latestPosition?.sog} unit="kn" icon={NavigationIcon} />
            <DigitalGauge label="Depth" value={latestEnvironment?.depth} unit="m" min={0} max={50} warning={5} danger={3} icon={Droplets} />
            <DigitalGauge label="Wind" value={latestEnvironment?.windSpeed} unit="kn" icon={Wind} />
            <DigitalGauge label="Water" value={latestEnvironment?.waterTemp} unit="°C" icon={Thermometer} />
          </div>

          <Card className="pointer-events-auto bg-background/80 backdrop-blur-md border-muted-foreground/20 shadow-lg">
            <CardContent className="p-3 flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Attitude</span>
              <div className="scale-75 origin-top">
                <AttitudeIndicator roll={latestMotion?.roll || 0} pitch={latestMotion?.pitch || 0} />
              </div>
              <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                <span>R: {(latestMotion?.roll || 0).toFixed(1)}°</span>
                <span>P: {(latestMotion?.pitch || 0).toFixed(1)}°</span>
              </div>
            </CardContent>
          </Card>

          {Object.entries(latestEngine).map(([engineId, data]) => (
            <Card key={engineId} className="pointer-events-auto bg-background/80 backdrop-blur-md border-muted-foreground/20 shadow-lg">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Zap className="h-3 w-3" /> Engine {engineId}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="flex justify-between text-xs">
                  <span>{data.rpm} RPM</span>
                  <span className={cn(data.temp && data.temp > 95 ? 'text-red-500' : '')}>{data.temp}°C</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden xl:flex flex-col shrink-0">
        <div className="h-12 border-b bg-muted/30 flex items-center px-4 shrink-0">
          <NavigationIcon className="h-4 w-4 mr-2" />
          <span className="font-medium text-sm">Navigation Manager</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Routes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Routes
              </h3>
              <div className="flex gap-1">
                <input
                  ref={gpxInputRef}
                  type="file"
                  accept=".gpx,application/gpx+xml,application/xml,text/xml"
                  className="hidden"
                  onChange={(event) => void handleImportRouteGpx(event)}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => gpxInputRef.current?.click()} title="Import GPX">
                  <Upload className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleExportActiveRouteGpx} disabled={!activeRoute} title="Export active GPX">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {routeImportError && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                {routeImportError}
              </div>
            )}

            {routes.length === 0 ? (
              <div className="rounded border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground">No routes saved.</p>
                {demoModeEnabled && (
                  <Button size="sm" variant="secondary" className="mt-2 text-xs h-7" onClick={seedNBPilotReferenceRoute}>
                    Add Reference Route
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setActiveRoute(route.id)}
                    className={cn(
                      'w-full text-left rounded border p-2 transition-colors hover:bg-muted text-xs',
                      route.id === activeRouteId && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{route.name}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {route.waypoints.length} pts · {route.totalDistance.toFixed(1)} nm
                        </p>
                      </div>
                      <Badge variant={route.id === activeRouteId ? 'default' : 'outline'} className="text-[10px] px-1 h-4 font-normal">
                        {route.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {activeRoute && (
              <div className="rounded bg-muted p-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Est. Duration</span>
                <span className="font-medium">{activeRoute.estimatedDuration} min</span>
              </div>
            )}
          </div>

          {/* AIS Targets Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ship className="h-4 w-4" /> AIS Targets
              </h3>
              <Badge variant="secondary" className="text-[10px]">{aisTargets.length}</Badge>
            </div>
            
            {aisTargets.length === 0 ? (
              <div className="text-center py-4 rounded border border-dashed">
                <p className="text-xs text-muted-foreground">No targets in range</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {aisTargets.map((target) => (
                  <div key={target.mmsi} className="flex items-center justify-between p-2 rounded border bg-card text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-1.5 rounded bg-red-50 text-red-500 dark:bg-red-950/30 shrink-0">
                        <Ship className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{target.name || `MMSI ${target.mmsi}`}</p>
                        {target.name && <p className="text-muted-foreground truncate">{target.mmsi}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">{target.sog.toFixed(1)} kn</p>
                      <p className="text-muted-foreground">
                        {Math.round(target.cog)}°
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mesh Network Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ship className="h-4 w-4 text-amber-500" /> Mesh Network
              </h3>
              <Badge variant={isMeshConnected ? "default" : "secondary"} className="text-[10px]">
                {meshVesselsList.length} Online
              </Badge>
            </div>
            
            {meshVesselsList.length === 0 ? (
              <div className="text-center py-4 rounded border border-dashed">
                <p className="text-xs text-muted-foreground">{isMeshConnected ? 'No mesh vessels nearby' : 'Mesh offline'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {meshVesselsList.map((vessel) => (
                  <div key={vessel.vesselId} className="flex flex-col p-2 rounded border bg-card text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="p-1.5 rounded bg-amber-50 text-amber-500 dark:bg-amber-950/30 shrink-0">
                          <Ship className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{vessel.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {vessel.windSpeed !== null && (
                          <span className="font-medium">{vessel.windSpeed.toFixed(1)} kn wind</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[10px]">
                      <span>{vessel.position ? `${formatCoordinate(vessel.position.latitude, 'lat')} ${formatCoordinate(vessel.position.longitude, 'lon')}` : 'No Pos'}</span>
                      <span>{Math.round((Date.now() - new Date(vessel.lastUpdate).getTime()) / 1000)}s ago</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart Packages Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" /> Chart Packages
            </h3>
            <div className="space-y-4">
              {chartPackageCard}
              {localChartLibraryCard}
            </div>
          </div>

        </div>

        {/* Footer Disclaimer */}
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground leading-tight">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              Navigation display is for reference only. Always use approved navigation equipment 
              and maintain proper lookout.
            </span>
          </div>
        </div>
      </div>
      
      <ChartBuilderDrawer open={isChartBuilderOpen} onOpenChange={setIsChartBuilderOpen} />
    </div>
  );
}
