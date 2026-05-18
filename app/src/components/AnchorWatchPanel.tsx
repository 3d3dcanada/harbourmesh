import { useEffect, useRef, useState } from 'react';
import { Anchor, AlertTriangle, CheckCircle2, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAnchorWatchStore, type AnchorAlarmState } from '@/store/anchorWatchStore';
import { FeatureGate } from './FeatureGate';

interface AnchorWatchPanelProps {
  vesselLat?: number | null;
  vesselLon?: number | null;
  compact?: boolean;
}

const ALARM_COLORS: Record<AnchorAlarmState, string> = {
  normal: 'bg-emerald-500',
  warn: 'bg-amber-500',
  alarm: 'bg-red-500',
  emergency: 'bg-red-600 animate-pulse',
};

const ALARM_LABELS: Record<AnchorAlarmState, string> = {
  normal: 'Safe',
  warn: 'Warning',
  alarm: 'ALARM',
  emergency: 'EMERGENCY',
};

export function AnchorWatchPanel({ vesselLat = null, vesselLon = null, compact = false }: AnchorWatchPanelProps) {
  const {
    active, maxRadius, currentRadius,
    rodeLength, currentAlarm, alarmMessage, track, config,
    dropAnchor, raiseAnchor, setRadiusFromPosition,
    setRodeLength, checkPosition, addTrackPoint, updateConfig,
  } = useAnchorWatchStore();

  const [showConfig, setShowConfig] = useState(false);
  const [rodeInput, setRodeInput] = useState(rodeLength?.toFixed(0) || '');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || vesselLat === null || vesselLon === null) return;
    intervalRef.current = setInterval(() => {
      checkPosition(vesselLat, vesselLon);
      addTrackPoint(vesselLat, vesselLon);
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, vesselLat, vesselLon, checkPosition, addTrackPoint]);

  const handleDropAnchor = () => {
    if (vesselLat === null || vesselLon === null) return;
    dropAnchor({ latitude: vesselLat, longitude: vesselLon });
  };

  const handleSetRadius = () => {
    if (vesselLat === null || vesselLon === null) return;
    setRadiusFromPosition(vesselLat, vesselLon);
  };

  const handleRodeSubmit = () => {
    const val = parseFloat(rodeInput);
    if (!isNaN(val) && val > 0) setRodeLength(val);
  };

  const radiusPercent = maxRadius && currentRadius !== null
    ? Math.min(100, (currentRadius / maxRadius) * 100)
    : 0;

  if (compact) {
    return (
      <FeatureGate feature="anchor-watch">
        {!active ? (
          <Button
            size="sm"
            className="w-full h-8"
            onClick={handleDropAnchor}
            disabled={vesselLat === null}
          >
            <Anchor className="h-3.5 w-3.5 mr-1.5" />
            Drop Anchor
          </Button>
        ) : (
          <div className={cn(
            'flex items-center gap-2 p-2 rounded-lg border',
            currentAlarm === 'alarm' || currentAlarm === 'emergency'
              ? 'border-red-500 bg-red-500/10 animate-pulse'
              : currentAlarm === 'warn'
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          )}>
            <Badge variant="outline" className={cn('text-[9px] text-white border-0 shrink-0 px-1.5', ALARM_COLORS[currentAlarm])}>
              {ALARM_LABELS[currentAlarm]}
            </Badge>
            <div className="flex-1 min-w-0">
              <Progress
                value={radiusPercent}
                className={cn(
                  'h-1.5',
                  radiusPercent > 100 ? '[&>div]:bg-red-500' :
                  radiusPercent > config.warningPercentage ? '[&>div]:bg-amber-500' :
                  '[&>div]:bg-emerald-500'
                )}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums shrink-0">
              {currentRadius?.toFixed(0) ?? '--'}m
            </span>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2 shrink-0" onClick={raiseAnchor}>
              Raise
            </Button>
          </div>
        )}
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="anchor-watch">
      <Card className={cn(
        'pointer-events-auto bg-background/80 backdrop-blur-md shadow-lg transition-colors',
        currentAlarm === 'alarm' || currentAlarm === 'emergency'
          ? 'border-red-500 animate-pulse'
          : currentAlarm === 'warn'
          ? 'border-amber-500'
          : 'border-muted-foreground/20'
      )}>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-xs flex items-center gap-2">
            <Anchor className="h-3.5 w-3.5" /> Anchor Watch
            {active && (
              <Badge variant="outline" className={cn('ml-auto text-[10px] text-white border-0', ALARM_COLORS[currentAlarm])}>
                {ALARM_LABELS[currentAlarm]}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {!active ? (
            <Button
              size="sm"
              className="w-full"
              onClick={handleDropAnchor}
              disabled={vesselLat === null}
            >
              <Anchor className="h-3.5 w-3.5 mr-1.5" />
              Drop Anchor
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Radius Progress */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Distance: {currentRadius?.toFixed(1) ?? '--'}m</span>
                  <span>Max: {maxRadius?.toFixed(0) ?? '--'}m</span>
                </div>
                <Progress
                  value={radiusPercent}
                  className={cn(
                    'h-2',
                    radiusPercent > 100 ? '[&>div]:bg-red-500' :
                    radiusPercent > (config.warningPercentage) ? '[&>div]:bg-amber-500' :
                    '[&>div]:bg-emerald-500'
                  )}
                />
              </div>

              {/* Alarm Message */}
              {alarmMessage && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-red-600 dark:text-red-400">{alarmMessage}</span>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={handleSetRadius}>
                  Set Radius
                </Button>
                <div className="flex flex-1">
                  <input
                    type="number"
                    value={rodeInput}
                    onChange={(e) => setRodeInput(e.target.value)}
                    onBlur={handleRodeSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleRodeSubmit()}
                    placeholder="Rode m"
                    className="w-full h-7 px-2 text-xs rounded-l-md border border-r-0 bg-background"
                  />
                  <Button size="sm" variant="outline" className="h-7 rounded-l-none text-[10px] px-2" onClick={handleRodeSubmit}>
                    Set
                  </Button>
                </div>
              </div>

              {/* Track + Config toggle */}
              {!compact && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  {track.length} track points
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              )}

              {/* Config Section */}
              {!compact && showConfig && (
                <div className="space-y-2 p-2 rounded border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px]">Warning %</label>
                    <input
                      type="number"
                      value={config.warningPercentage}
                      onChange={(e) => updateConfig({ warningPercentage: parseInt(e.target.value) || 0 })}
                      className="w-14 h-6 px-1 text-[10px] rounded border bg-background text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px]">Delay (sec)</label>
                    <input
                      type="number"
                      value={config.delaySeconds}
                      onChange={(e) => updateConfig({ delaySeconds: parseInt(e.target.value) || 0 })}
                      className="w-14 h-6 px-1 text-[10px] rounded border bg-background text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px]">Fudge (m)</label>
                    <input
                      type="number"
                      value={config.fudgeMeters}
                      onChange={(e) => updateConfig({ fudgeMeters: parseInt(e.target.value) || 0 })}
                      className="w-14 h-6 px-1 text-[10px] rounded border bg-background text-right"
                    />
                  </div>
                </div>
              )}

              {/* Raise Anchor */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="w-full text-xs h-7">
                    Raise Anchor
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Raise Anchor?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disable anchor watch monitoring and clear the drift track.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={raiseAnchor}>Raise Anchor</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
