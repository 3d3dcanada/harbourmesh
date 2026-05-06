import type { Route, RouteWaypoint } from '@/types';
import { calculateBearing, calculateDistance } from '@/lib/utils';

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
