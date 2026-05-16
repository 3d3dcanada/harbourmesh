import type { RectGeometry, PolygonGeometry, SpaceGeometry } from '@/types';

export type Point = { x: number; y: number };

// Convert screen coordinates to SVG canvas coordinates using the element's CTM.
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

// Handles the legacy {x,y,width,height} shape stored in Zustand before the
// discriminated union was introduced.
export function normalizeGeometry(raw: unknown): SpaceGeometry | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const g = raw as Record<string, unknown>;

  if (g.kind === 'rect' || g.kind === 'polygon') return g as SpaceGeometry;

  // Legacy rect — no kind discriminant
  if (typeof g.x === 'number' && typeof g.width === 'number') {
    return {
      kind: 'rect',
      x: g.x as number,
      y: g.y as number,
      width: g.width as number,
      height: g.height as number,
      rotation: g.rotation as number | undefined,
    } satisfies RectGeometry;
  }

  return undefined;
}

export function rectToPolygon(rect: RectGeometry): PolygonGeometry {
  const { x, y, width, height } = rect;
  return {
    kind: 'polygon',
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    rotation: rect.rotation,
  };
}

export function polygonCentroid(points: Point[]): Point {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x, y };
}

// Shoelace formula — returns area in SVG canvas units squared.
export function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

// Ray-casting algorithm for point-in-polygon hit testing.
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export interface EdgeHit {
  edgeIndex: number; // index of the start vertex of the nearest edge
  t: number;         // 0-1 interpolation along the edge
  point: Point;      // nearest point on that edge
}

// Find the nearest point on any polygon edge to the given point.
// Returns null if all edges are farther than maxDistance.
export function nearestEdgePoint(point: Point, polygon: Point[], maxDistance = 12): EdgeHit | null {
  let bestDist = maxDistance;
  let best: EdgeHit | null = null;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
    const nearX = a.x + t * dx;
    const nearY = a.y + t * dy;
    const dist = Math.hypot(point.x - nearX, point.y - nearY);

    if (dist < bestDist) {
      bestDist = dist;
      best = { edgeIndex: i, t, point: { x: nearX, y: nearY } };
    }
  }

  return best;
}

// Get the bounding box of a SpaceGeometry (handles both rect and polygon).
export function geometryBounds(g: SpaceGeometry): { x: number; y: number; width: number; height: number } {
  if (g.kind === 'rect') return { x: g.x, y: g.y, width: g.width, height: g.height };
  return polygonBounds(g.points);
}

// Get the centroid of a SpaceGeometry.
export function geometryCentroid(g: SpaceGeometry): Point {
  if (g.kind === 'rect') {
    return { x: g.x + g.width / 2, y: g.y + g.height / 2 };
  }
  return polygonCentroid(g.points);
}

// Check if a point is inside a SpaceGeometry (both rect and polygon).
export function pointInGeometry(point: Point, g: SpaceGeometry): boolean {
  if (g.kind === 'rect') {
    return (
      point.x >= g.x &&
      point.x <= g.x + g.width &&
      point.y >= g.y &&
      point.y <= g.y + g.height
    );
  }
  return pointInPolygon(point, g.points);
}

// Build an SVG points attribute string from a polygon points array.
export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}
