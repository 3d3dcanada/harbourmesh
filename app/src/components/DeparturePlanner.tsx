import { useState } from 'react';
import { Clock, Wind, Waves, AlertTriangle, Star, Loader2, Navigation } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { rankDepartureWindows, type DepartureWindow, type DeparturePlannerInput } from '@/lib/departure-planner';
import { useVesselStore, useNavigationPlanStore } from '@/store';
import { FeatureGate } from './FeatureGate';

interface DeparturePlannerProps {
  originLat: number | null;
  originLon: number | null;
}

function comfortColor(score: number): string {
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function comfortBg(score: number): string {
  if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 40) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

export function DeparturePlanner({ originLat, originLon }: DeparturePlannerProps) {
  const [open, setOpen] = useState(false);
  const [windows, setWindows] = useState<DepartureWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentVessel = useVesselStore((s) => s.currentVessel);
  const { routes, activeRouteId } = useNavigationPlanStore();
  const activeRoute = routes.find((r) => r.id === activeRouteId);

  const handleCalculate = async () => {
    if (!originLat || !originLon || !activeRoute || activeRoute.waypoints.length < 2) return;

    const dest = activeRoute.waypoints[activeRoute.waypoints.length - 1];
    const input: DeparturePlannerInput = {
      originLat,
      originLon,
      destinationLat: dest.latitude,
      destinationLon: dest.longitude,
      vesselDraftMeters: currentVessel?.draft ?? 1.5,
      vesselSpeedKnots: 6,
    };

    setLoading(true);
    setError(null);
    try {
      const result = await rankDepartureWindows(input);
      setWindows(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureGate feature="departure-planner">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="w-full" disabled={!activeRoute}>
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Plan Departure
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Departure Planner
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Route Info */}
            {activeRoute && (
              <Card>
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium">{activeRoute.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeRoute.waypoints.length} waypoints
                    {currentVessel && ` · Draft: ${currentVessel.draft ?? '?'}m`}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleCalculate} disabled={loading || !activeRoute} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
              {loading ? 'Calculating...' : 'Find Best Departure Times'}
            </Button>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Results */}
            {windows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{windows.length} departure windows ranked by comfort</p>

                {windows.slice(0, 24).map((w, i) => {
                  const depDate = new Date(w.departureTime);
                  const isBest = i === 0;

                  return (
                    <div
                      key={w.departureTime}
                      className={cn(
                        'p-3 rounded-lg border',
                        isBest ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-muted',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isBest && <Star className="h-3.5 w-3.5 text-emerald-500" />}
                          <span className="text-sm font-medium">
                            {depDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' '}
                            {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', comfortBg(w.comfortScore), comfortColor(w.comfortScore))}>
                          {Math.round(w.comfortScore)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Wind className="h-3 w-3" />
                          {Math.round(w.windSpeed)}kn
                        </div>
                        <div className="flex items-center gap-1">
                          <Waves className="h-3 w-3" />
                          {w.waveHeight.toFixed(1)}m
                        </div>
                        <div>Tide: {w.tideHeight.toFixed(1)}m</div>
                        <div>{w.transitHours.toFixed(1)}h transit</div>
                      </div>

                      {w.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {w.warnings.map((warning, j) => (
                            <div key={j} className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </FeatureGate>
  );
}
