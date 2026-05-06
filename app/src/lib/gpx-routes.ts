import type { Route } from '@/types';
import { createRouteFromWaypoints } from './navigation-planning';

export type ParseGpxRouteOptions = {
  id?: string;
  vesselId: string;
  createdAt?: string;
  cruiseSpeedKnots?: number;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'route';
}

function getText(parent: Element, selector: string): string | undefined {
  return parent.querySelector(selector)?.textContent?.trim() || undefined;
}

function parsePoint(point: Element, index: number) {
  const latitude = Number(point.getAttribute('lat'));
  const longitude = Number(point.getAttribute('lon'));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;

  return {
    name: getText(point, 'name') ?? `Waypoint ${index + 1}`,
    latitude,
    longitude,
  };
}

export function routeToGpx(route: Route): string {
  const waypoints = route.waypoints
    .map((waypoint) => [
      `    <rtept lat="${waypoint.latitude}" lon="${waypoint.longitude}">`,
      `      <name>${escapeXml(waypoint.name)}</name>`,
      waypoint.notes ? `      <desc>${escapeXml(waypoint.notes)}</desc>` : null,
      '    </rtept>',
    ].filter(Boolean).join('\n'))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="HarbourMesh" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    `    <name>${escapeXml(route.name)}</name>`,
    `    <time>${escapeXml(route.updatedAt)}</time>`,
    '  </metadata>',
    '  <rte>',
    `    <name>${escapeXml(route.name)}</name>`,
    route.description ? `    <desc>${escapeXml(route.description)}</desc>` : null,
    waypoints,
    '  </rte>',
    '</gpx>',
  ].filter(Boolean).join('\n');
}

export function parseGpxRoute(gpx: string, options: ParseGpxRouteOptions): Route {
  const parser = new DOMParser();
  const document = parser.parseFromString(gpx, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error('GPX file could not be parsed');
  }

  const routeElement = document.querySelector('rte');
  const trackElement = document.querySelector('trk');
  const pointElements = routeElement
    ? [...routeElement.querySelectorAll('rtept')]
    : trackElement
      ? [...trackElement.querySelectorAll('trkpt')]
      : [];
  const waypoints = pointElements
    .map((point, index) => parsePoint(point, index))
    .filter((point): point is NonNullable<ReturnType<typeof parsePoint>> => point !== null);

  if (waypoints.length < 2) {
    throw new Error('GPX route needs at least two valid points');
  }

  const name = getText(routeElement ?? trackElement ?? document.documentElement, 'name') ?? 'Imported GPX Route';
  const createdAt = options.createdAt ?? new Date().toISOString();

  return createRouteFromWaypoints({
    id: options.id ?? `gpx-${slugify(name)}-${createdAt.slice(0, 10)}`,
    vesselId: options.vesselId,
    name,
    description: getText(routeElement ?? trackElement ?? document.documentElement, 'desc'),
    createdAt,
    cruiseSpeedKnots: options.cruiseSpeedKnots,
    waypoints,
  });
}
