import { describe, expect, it } from 'vitest';
import { NB_PILOT_REFERENCE_ROUTE, createRouteFromWaypoints } from './navigation-planning';

describe('navigation planning', () => {
  it('calculates route leg distance, course, and duration', () => {
    const route = createRouteFromWaypoints({
      id: 'test-route',
      vesselId: 'vessel-1',
      name: 'Test Route',
      createdAt: '2026-05-06T12:00:00.000Z',
      cruiseSpeedKnots: 6,
      waypoints: [
        { name: 'Start', latitude: 45.27, longitude: -66.06 },
        { name: 'Finish', latitude: 45.02, longitude: -66.95 },
      ],
    });

    expect(route.totalDistance).toBeGreaterThan(35);
    expect(route.estimatedDuration).toBeGreaterThan(350);
    expect(route.waypoints[0].distanceFromPrevious).toBeUndefined();
    expect(route.waypoints[1].distanceFromPrevious).toBeGreaterThan(35);
    expect(route.waypoints[1].courseFromPrevious).toBeGreaterThanOrEqual(0);
    expect(route.waypoints[1].courseFromPrevious).toBeLessThan(360);
  });

  it('keeps the NB reference route inside the pilot planning model', () => {
    expect(NB_PILOT_REFERENCE_ROUTE).toMatchObject({
      id: 'nb-pilot-saint-john-grand-manan',
      vesselId: 'demo-vessel',
      status: 'planned',
    });
    expect(NB_PILOT_REFERENCE_ROUTE.waypoints).toHaveLength(3);
    expect(NB_PILOT_REFERENCE_ROUTE.totalDistance).toBeGreaterThan(45);
  });
});
