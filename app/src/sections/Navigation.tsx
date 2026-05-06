/**
 * HarborMesh - Navigation Section
 * Real-time HUD with charts, AIS, and telemetry display
 */

import React, { useState } from 'react';
import {
  Compass,
  Navigation as NavigationIcon,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Anchor,
  Layers,
  Maximize2,
  Minimize2,
  Target,
  Activity,
  Ship,
  AlertTriangle,
  Settings,
  Info,
  Crosshair,
  Clock,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn, formatCoordinate, formatHeading, formatSpeed, formatDepth, formatTemperature } from '@/lib/utils';
import { useTelemetry } from '@/hooks/useTelemetry';
import { NBPilotChart } from '@/components/NBPilotChart';
import { useNavigationPlanStore } from '@/store';

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
  const {
    routes,
    activeRouteId,
    setActiveRoute,
    seedNBPilotReferenceRoute,
  } = useNavigationPlanStore();
  
  // Get first engine data
  const engineData = Object.entries(latestEngine)[0]?.[1];
  const activeRoute = routes.find((route) => route.id === activeRouteId) ?? null;
  
  return (
    <div className={cn(
      'space-y-4',
      isFullscreen && 'fixed inset-0 z-50 bg-background p-4'
    )}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Navigation & HUD</h1>
          <p className="text-muted-foreground mt-1">
            Real-time vessel telemetry and navigation display
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            {isConnected ? 'Live Data' : 'Offline'}
          </Badge>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Connection Warning */}
      {!isConnected && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">No telemetry connection</span>
              <span className="text-sm">- Displaying simulated data</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="hud">Heads-Up Display</TabsTrigger>
          <TabsTrigger value="chart">Chart View</TabsTrigger>
          <TabsTrigger value="engine">Engine</TabsTrigger>
          <TabsTrigger value="ais">AIS Targets</TabsTrigger>
        </TabsList>
        
        {/* HUD View */}
        <TabsContent value="hud" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Primary Instruments */}
            <Card className="col-span-2 row-span-2">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <CompassRose 
                  heading={latestMotion?.yaw || 0} 
                  course={latestPosition?.cog}
                  size={180}
                />
                <div className="mt-4 text-center">
                  <p className="text-3xl font-bold">{Math.round(latestMotion?.yaw || 0)}°</p>
                  <p className="text-sm text-muted-foreground">
                    {formatHeading(latestMotion?.yaw || 0).split(' ').slice(1).join(' ')}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Speed */}
            <DigitalGauge
              label="Speed"
              value={latestPosition?.sog}
              unit="kn"
              icon={NavigationIcon}
            />
            
            {/* Depth */}
            <DigitalGauge
              label="Depth"
              value={latestEnvironment?.depth}
              unit="m"
              min={0}
              max={50}
              warning={5}
              danger={3}
              icon={Droplets}
            />
            
            {/* Wind */}
            <DigitalGauge
              label="Wind"
              value={latestEnvironment?.windSpeed}
              unit="kn"
              icon={Wind}
            />
            
            {/* Water Temp */}
            <DigitalGauge
              label="Water Temp"
              value={latestEnvironment?.waterTemp}
              unit="°C"
              icon={Thermometer}
            />
            
            {/* Engine RPM */}
            <DigitalGauge
              label="Engine RPM"
              value={engineData?.rpm}
              unit=""
              min={0}
              max={4000}
              warning={3500}
              danger={3800}
              icon={Gauge}
            />
            
            {/* Engine Temp */}
            <DigitalGauge
              label="Engine Temp"
              value={engineData?.temp}
              unit="°C"
              min={50}
              max={120}
              warning={95}
              danger={105}
              icon={Thermometer}
            />
            
            {/* Position */}
            <Card className="col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Position</span>
                </div>
                {latestPosition ? (
                  <div className="space-y-1">
                    <p className="font-mono text-lg">
                      {formatCoordinate(latestPosition.latitude, 'lat')}
                    </p>
                    <p className="font-mono text-lg">
                      {formatCoordinate(latestPosition.longitude, 'lon')}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">--</p>
                )}
              </CardContent>
            </Card>
            
            {/* Attitude */}
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Attitude</span>
                <AttitudeIndicator 
                  roll={latestMotion?.roll || 0} 
                  pitch={latestMotion?.pitch || 0} 
                />
                <div className="flex gap-4 mt-2 text-xs">
                  <span>Roll: {(latestMotion?.roll || 0).toFixed(1)}°</span>
                  <span>Pitch: {(latestMotion?.pitch || 0).toFixed(1)}°</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Barometer */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Pressure</span>
                </div>
                <p className="text-2xl font-bold">
                  {latestEnvironment?.barometricPressure?.toFixed(0) || '--'}
                </p>
                <p className="text-sm text-muted-foreground">hPa</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Chart View */}
        <TabsContent value="chart" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="h-[560px]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Chart View
                  </CardTitle>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant="outline">
                      <Ship className="h-3 w-3 mr-1" />
                      Own Vessel
                    </Badge>
                    <Badge variant="outline" className="text-red-500 border-red-200">
                      <Ship className="h-3 w-3 mr-1" />
                      AIS Target
                    </Badge>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-200">
                      <MapPin className="h-3 w-3 mr-1" />
                      {routes.length} Route{routes.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)]">
                <NBPilotChart
                  position={latestPosition ? {
                    latitude: latestPosition.latitude,
                    longitude: latestPosition.longitude,
                  } : null}
                  heading={latestMotion?.yaw || 0}
                  aisTargets={aisTargets}
                  routes={routes}
                  activeRouteId={activeRouteId}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5" />
                  Routes
                </CardTitle>
                <CardDescription>
                  Local planning routes render as reference overlays on the NB pilot chart.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {routes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">No local routes saved.</p>
                    <Button size="sm" className="mt-3" onClick={seedNBPilotReferenceRoute}>
                      Add NB Reference Route
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routes.map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => setActiveRoute(route.id)}
                        className={cn(
                          'w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted',
                          route.id === activeRouteId && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{route.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {route.waypoints.length} waypoints · {route.totalDistance.toFixed(1)} nm
                            </p>
                          </div>
                          <Badge variant={route.id === activeRouteId ? 'default' : 'outline'}>
                            {route.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeRoute && (
                  <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="h-4 w-4" />
                      {activeRoute.estimatedDuration} min
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Distance and duration are planning estimates only.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Engine View */}
        <TabsContent value="engine" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(latestEngine).map(([engineId, data]) => (
              <Card key={engineId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Engine {engineId}
                  </CardTitle>
                  <CardDescription>
                    Runtime: {data.hours.toFixed(1)} hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <DigitalGauge
                      label="RPM"
                      value={data.rpm}
                      unit=""
                      min={0}
                      max={4000}
                    />
                    <DigitalGauge
                      label="Temperature"
                      value={data.temp}
                      unit="°C"
                      min={50}
                      max={120}
                      warning={95}
                      danger={105}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {Object.keys(latestEngine).length === 0 && (
              <Card className="col-span-2">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No engine data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* AIS View */}
        <TabsContent value="ais" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                AIS Targets
              </CardTitle>
              <CardDescription>
                {aisTargets.length} vessel(s) in range
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aisTargets.length === 0 ? (
                <div className="text-center py-12">
                  <Ship className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No AIS targets detected</p>
                </div>
              ) : (
                <div className="divide-y">
                  {aisTargets.map((target) => (
                    <div key={target.mmsi} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30">
                          <Ship className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{target.name || `Vessel ${target.mmsi}`}</p>
                          <p className="text-sm text-muted-foreground">MMSI: {target.mmsi}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{target.sog.toFixed(1)} kn</p>
                        <p className="text-sm text-muted-foreground">
                          {formatHeading(target.cog)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>
          HarborMesh navigation display is for reference only. Always use approved navigation equipment 
          and maintain proper lookout. Autopilot control is read-only in this version.
        </span>
      </div>
    </div>
  );
}
