import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, AlertTriangle, Radio, Send } from 'lucide-react';
import { useCommunityDataStore, useTelemetryStore, useSettingsStore } from '@/store';
import { cn } from '@/lib/utils';
import type { RawDepthSounding } from '@/lib/community-soundings';
import { SharePositionLevel } from '@/types';

interface ChartBuilderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChartBuilderDrawer({ open, onOpenChange }: ChartBuilderDrawerProps) {
  const [isSurveyModeActive, setIsSurveyModeActive] = useState(false);
  const { latestPosition, latestEnvironment } = useTelemetryStore((state) => ({
    latestPosition: state.latestPosition,
    latestEnvironment: state.latestEnvironment,
  }));
  const { boatNode } = useSettingsStore();
  const { addRawSoundings, reportHazard } = useCommunityDataStore();

  useEffect(() => {
    if (!isSurveyModeActive) return;
    const interval = setInterval(() => {
      if (latestPosition && typeof latestEnvironment?.depth === 'number') {
        handleRecordSounding();
      }
    }, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSurveyModeActive, latestPosition, latestEnvironment]);

  const handleRecordSounding = () => {
    if (!latestPosition || typeof latestEnvironment?.depth !== 'number') return;
    
    const sounding: RawDepthSounding = {
      id: crypto.randomUUID(),
      vesselId: boatNode.deviceId,
      sourceDeviceId: boatNode.deviceId,
      sourceProtocol: 'manual',
      rawMessageId: 'manual',
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      position: {
        latitude: latestPosition.latitude,
        longitude: latestPosition.longitude,
        accuracyMeters: 5,
      },
      rawDepthMeters: latestEnvironment.depth,
      depthMeters: latestEnvironment.depth,
      depthReference: 'below_surface',
      tideCorrectionApplied: false,
      waterLevelCorrectionApplied: false,
      offsets: {
        surfaceToTransducerMeters: boatNode.surfaceToTransducerMeters,
        transducerToKeelMeters: boatNode.transducerToKeelMeters,
      },
      consent: {
        shareTelemetryForCommunity: true,
        shareLivePosition: SharePositionLevel.FULL,
        telemetryAnonymization: 'none',
        capturedAt: new Date().toISOString(),
      },
      sharing: {
        state: 'shareable_full',
        uploadLatitude: latestPosition.latitude,
        uploadLongitude: latestPosition.longitude,
      },
      quality: {
        confidence: 0.9,
        rejected: false,
        flags: [],
      },
    };
    
    addRawSoundings([sounding]);
  };

  const handleReportHazard = () => {
    if (!latestPosition) return;
    
    reportHazard({
      position: {
        latitude: latestPosition.latitude,
        longitude: latestPosition.longitude,
        source: latestPosition.source || 'gps',
        timestamp: latestPosition.timestamp || new Date().toISOString(),
      },
      vesselId: boatNode.deviceId,
      sourceDeviceId: boatNode.deviceId,
      type: 'obstruction',
      severity: 'medium',
      description: 'Reported via Survey Mode',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full border-l shadow-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-emerald-500" />
            Community Chart Builder
          </SheetTitle>
          <SheetDescription>
            Contribute depth soundings and navigational hazards to the HarbourMesh community.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <div className="p-4 rounded-lg border bg-card relative overflow-hidden">
            <div className={cn(
              "absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNjdXJyZW50Q29sb3IiLz48L3N2Zz4=')] transition-all",
              isSurveyModeActive && "animate-pulse opacity-30"
            )} />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">Survey Mode</h3>
                  <p className="text-xs text-muted-foreground mt-1">Automatically record depth data</p>
                </div>
                <Badge variant={isSurveyModeActive ? 'default' : 'secondary'} className={cn(
                  "transition-colors duration-300",
                  isSurveyModeActive && "bg-emerald-500 hover:bg-emerald-600"
                )}>
                  {isSurveyModeActive ? (
                    <span className="flex items-center gap-1"><Radio className="h-3 w-3 animate-pulse" /> Recording</span>
                  ) : 'Idle'}
                </Badge>
              </div>
              
              <Button 
                onClick={() => setIsSurveyModeActive(!isSurveyModeActive)}
                variant={isSurveyModeActive ? 'destructive' : 'default'}
                className="w-full"
              >
                {isSurveyModeActive ? 'Stop Surveying' : 'Start Surveying'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Manual Contributions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 items-center justify-center bg-card hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                onClick={handleRecordSounding}
                disabled={!latestPosition || typeof latestEnvironment?.depth !== 'number'}
              >
                <Droplets className="h-5 w-5" />
                <span className="text-xs font-medium">Log Sounding</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 items-center justify-center bg-card hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors"
                onClick={handleReportHazard}
                disabled={!latestPosition}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-medium">Report Hazard</span>
              </Button>
            </div>
            
            {!latestPosition && (
              <p className="text-xs text-red-500 text-center mt-2">
                Waiting for valid GPS position...
              </p>
            )}
            {latestPosition && typeof latestEnvironment?.depth !== 'number' && (
              <p className="text-xs text-amber-500 text-center mt-2">
                Waiting for depth sensor data...
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t mt-auto">
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onOpenChange(false)}>
            <Send className="h-4 w-4 mr-2" />
            Sync to Mesh
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
