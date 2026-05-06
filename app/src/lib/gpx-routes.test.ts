import { describe, expect, it } from 'vitest';
import { NB_PILOT_REFERENCE_ROUTE } from './navigation-planning';
import { parseGpxRoute, routeToGpx } from './gpx-routes';

describe('GPX route portability', () => {
  it('exports local routes as GPX 1.1 route points', () => {
    const gpx = routeToGpx(NB_PILOT_REFERENCE_ROUTE);

    expect(gpx).toContain('<gpx version="1.1" creator="HarbourMesh"');
    expect(gpx).toContain('<rte>');
    expect(gpx).toContain('<name>NB Pilot Reference Route</name>');
    expect(gpx.match(/<rtept /g)).toHaveLength(3);
    expect(gpx).toContain('lat="45.27331" lon="-66.06334"');
  });

  it('imports GPX routes into the navigation planning model', () => {
    const route = parseGpxRoute(`
      <gpx version="1.1" creator="test">
        <rte>
          <name>Saint John Test Run</name>
          <desc>Import smoke</desc>
          <rtept lat="45.27331" lon="-66.06334"><name>Start</name></rtept>
          <rtept lat="45.0205" lon="-66.9479"><name>Finish</name></rtept>
        </rte>
      </gpx>
    `, {
      id: 'imported-route',
      vesselId: 'vessel-1',
      createdAt: '2026-05-06T12:00:00.000Z',
      cruiseSpeedKnots: 6,
    });

    expect(route).toMatchObject({
      id: 'imported-route',
      vesselId: 'vessel-1',
      name: 'Saint John Test Run',
      description: 'Import smoke',
      status: 'planned',
    });
    expect(route.waypoints).toHaveLength(2);
    expect(route.totalDistance).toBeGreaterThan(35);
  });

  it('can import GPX tracks when no route element exists', () => {
    const route = parseGpxRoute(`
      <gpx version="1.1" creator="test">
        <trk>
          <name>Track Import</name>
          <trkseg>
            <trkpt lat="45.27" lon="-66.06" />
            <trkpt lat="45.28" lon="-66.07" />
          </trkseg>
        </trk>
      </gpx>
    `, {
      vesselId: 'vessel-1',
      createdAt: '2026-05-06T12:00:00.000Z',
    });

    expect(route.name).toBe('Track Import');
    expect(route.waypoints.map((waypoint) => waypoint.name)).toEqual(['Waypoint 1', 'Waypoint 2']);
  });

  it('rejects malformed GPX and routes with fewer than two valid points', () => {
    expect(() => parseGpxRoute('<gpx><rte><rtept lat="45" lon="-66"/></rte></gpx>', {
      vesselId: 'vessel-1',
    })).toThrow('GPX route needs at least two valid points');

    expect(() => parseGpxRoute('<gpx><rte>', {
      vesselId: 'vessel-1',
    })).toThrow('GPX file could not be parsed');
  });
});
