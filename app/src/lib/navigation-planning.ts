import type { Route, RouteWaypoint } from '@/types';
import { calculateBearing, calculateDistance } from '@/lib/utils';
import { getNearestTideInfo } from './tide-service';
import { fetchMarineWeather } from './weather-service';

const METERS_PER_NAUTICAL_MILE = 1852;
const DEFAULT_CRUISE_SPEED_KNOTS = 7;

export type RoutePlanningInput = {
  id: string;
  vesselId: string;
  name: string;
  description?: string;
  waypoints: Array<Omit<RouteWaypoint, 'id' | 'order' | 'distanceFromPrevious' | 'courseFromPrevious' | 'estimatedTimeFromPrevious'> & {
    id?: string;
  }>;
  createdAt: string;
  cruiseSpeedKnots?: number;
};

function metersToNauticalMiles(meters: number): number {
  return meters / METERS_PER_NAUTICAL_MILE;
}

function minutesForLeg(distanceNauticalMiles: number, cruiseSpeedKnots: number): number {
  if (cruiseSpeedKnots <= 0) return 0;
  return (distanceNauticalMiles / cruiseSpeedKnots) * 60;
}

export function createRouteFromWaypoints(input: RoutePlanningInput): Route {
  const cruiseSpeedKnots = input.cruiseSpeedKnots ?? DEFAULT_CRUISE_SPEED_KNOTS;
  let totalDistance = 0;
  let estimatedDuration = 0;

  const waypoints = input.waypoints.map<RouteWaypoint>((waypoint, index, allWaypoints) => {
    const previous = allWaypoints[index - 1];
    const routeWaypoint: RouteWaypoint = {
      ...waypoint,
      id: waypoint.id ?? `${input.id}-wp-${index + 1}`,
      order: index + 1,
    };

    if (previous) {
      const distanceFromPrevious = metersToNauticalMiles(calculateDistance(previous, waypoint));
      const estimatedTimeFromPrevious = minutesForLeg(distanceFromPrevious, cruiseSpeedKnots);

      routeWaypoint.distanceFromPrevious = Number(distanceFromPrevious.toFixed(2));
      routeWaypoint.courseFromPrevious = Number(calculateBearing(previous, waypoint).toFixed(0));
      routeWaypoint.estimatedTimeFromPrevious = Number(estimatedTimeFromPrevious.toFixed(0));
      totalDistance += distanceFromPrevious;
      estimatedDuration += estimatedTimeFromPrevious;
    }

    return routeWaypoint;
  });

  return {
    id: input.id,
    vesselId: input.vesselId,
    name: input.name,
    description: input.description,
    waypoints,
    totalDistance: Number(totalDistance.toFixed(2)),
    estimatedDuration: Number(estimatedDuration.toFixed(0)),
    status: 'planned',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

// ============================================================================
// ROUTE OPTIMIZATION
// ============================================================================

export interface OptimizedLeg {
  from: string;
  to: string;
  distanceNm: number;
  baseEtaMinutes: number;
  adjustedEtaMinutes: number;
  comfortScore: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  tideHeight: number | null;
  warnings: string[];
}

export interface OptimizedRoute {
  routeId: string;
  routeName: string;
  legs: OptimizedLeg[];
  totalDistanceNm: number;
  totalBaseMinutes: number;
  totalAdjustedMinutes: number;
  overallComfort: number;
}

export async function optimizeRouteForConditions(
  route: Route,
  options: { vesselDraft: number; cruiseSpeedKnots?: number },
): Promise<OptimizedRoute> {
  const speed = options.cruiseSpeedKnots ?? DEFAULT_CRUISE_SPEED_KNOTS;
  const legs: OptimizedLeg[] = [];
  let totalDist = 0;
  let totalBase = 0;
  let totalAdj = 0;

  const midpoint = route.waypoints[Math.floor(route.waypoints.length / 2)];
  const weatherData = midpoint
    ? await fetchMarineWeather(midpoint.latitude, midpoint.longitude, 12).catch(() => null)
    : null;
  const currentHour = weatherData?.hourly[0] ?? null;

  for (let i = 1; i < route.waypoints.length; i++) {
    const from = route.waypoints[i - 1];
    const to = route.waypoints[i];
    const distM = calculateDistance(from, to);
    const distNm = distM / METERS_PER_NAUTICAL_MILE;
    const baseMin = minutesForLeg(distNm, speed);
    const warnings: string[] = [];

    const tideInfo = getNearestTideInfo(to.latitude, to.longitude);
    const tideH = tideInfo?.nextLow?.height ?? null;

    if (tideH !== null && tideH - options.vesselDraft < 1.0) {
      warnings.push(`Shallow water risk at ${to.name}: ${tideH.toFixed(1)}m at low tide`);
    }

    const windSpd = currentHour?.windSpeed ?? 0;
    const windDir = currentHour?.windDirection ?? 0;
    const waveH = currentHour?.waveHeight ?? 0;

    const courseDeg = calculateBearing(from, to);
    const windAngleDiff = Math.abs(((windDir - courseDeg + 180) % 360) - 180);
    const headwindFactor = windAngleDiff < 45 ? 0.85 : windAngleDiff > 135 ? 1.1 : 1.0;
    const waveFactor = waveH > 1.5 ? 1 + (waveH - 1.5) * 0.1 : 1.0;

    const adjustedMin = baseMin / (headwindFactor * waveFactor);
    const comfort = Math.max(0, Math.min(100, 100 - waveH * 15 - Math.max(0, windSpd - 15) * 3));

    if (windSpd > 30) warnings.push('Strong wind');
    if (waveH > 2) warnings.push('High waves');

    legs.push({
      from: from.name,
      to: to.name,
      distanceNm: Number(distNm.toFixed(2)),
      baseEtaMinutes: Math.round(baseMin),
      adjustedEtaMinutes: Math.round(adjustedMin),
      comfortScore: Math.round(comfort),
      windSpeed: windSpd,
      windDirection: windDir,
      waveHeight: waveH,
      tideHeight: tideH,
      warnings,
    });

    totalDist += distNm;
    totalBase += baseMin;
    totalAdj += adjustedMin;
  }

  const overallComfort = legs.length > 0
    ? Math.round(legs.reduce((s, l) => s + l.comfortScore, 0) / legs.length)
    : 100;

  return {
    routeId: route.id,
    routeName: route.name,
    legs,
    totalDistanceNm: Number(totalDist.toFixed(2)),
    totalBaseMinutes: Math.round(totalBase),
    totalAdjustedMinutes: Math.round(totalAdj),
    overallComfort,
  };
}

// ============================================================================
// REFERENCE ROUTE
// ============================================================================

export const NB_PILOT_REFERENCE_ROUTE = createRouteFromWaypoints({
  id: 'nb-pilot-saint-john-grand-manan',
  vesselId: 'demo-vessel',
  name: 'NB Pilot Reference Route',
  description: 'Saint John Harbour to Grand Manan reference planning route.',
  createdAt: '2026-05-06T00:00:00.000Z',
  cruiseSpeedKnots: 7,
  waypoints: [
    {
      name: 'Saint John Harbour',
      latitude: 45.27331,
      longitude: -66.06334,
    },
    {
      name: 'Deer Island Sound',
      latitude: 45.0205,
      longitude: -66.9479,
    },
    {
      name: 'Grand Manan North Head',
      latitude: 44.7624,
      longitude: -66.7567,
    },
  ],
});
