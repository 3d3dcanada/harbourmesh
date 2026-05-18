import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { svgPoint, normalizeGeometry, pointsAttr, geometryCentroid, nearestEdgePoint } from '@/lib/geometry';
import { SpaceContextMenu } from './SpaceContextMenu';
import type { Space, SpaceType } from '@/types';
import type { RectGeometry, SpaceGeometry } from '@/types';
import type { Point } from '@/lib/geometry';

const SPACE_COLORS: Record<string, { fill: string; stroke: string }> = {
  cockpit:      { fill: '#3b82f6', stroke: '#1d4ed8' },
  cabin:        { fill: '#8b5cf6', stroke: '#6d28d9' },
  locker:       { fill: '#6b7280', stroke: '#374151' },
  compartment:  { fill: '#6b7280', stroke: '#374151' },
  bilge:        { fill: '#06b6d4', stroke: '#0e7490' },
  galley:       { fill: '#f97316', stroke: '#c2410c' },
  head:         { fill: '#14b8a6', stroke: '#0d9488' },
  berth:        { fill: '#a78bfa', stroke: '#7c3aed' },
  salon:        { fill: '#f59e0b', stroke: '#d97706' },
  engine_room:  { fill: '#ef4444', stroke: '#b91c1c' },
  lazarette:    { fill: '#78716c', stroke: '#44403c' },
  anchor_locker:{ fill: '#64748b', stroke: '#334155' },
  deck_storage: { fill: '#84cc16', stroke: '#4d7c0f' },
  flybridge:    { fill: '#22d3ee', stroke: '#0891b2' },
  tender_garage:{ fill: '#a3a3a3', stroke: '#525252' },
  fuel_tank:    { fill: '#dc2626', stroke: '#991b1b' },
  water_tank:   { fill: '#2563eb', stroke: '#1e40af' },
  hold:         { fill: '#a16207', stroke: '#713f12' },
  custom:       { fill: '#d946ef', stroke: '#a21caf' },
};

const CANVAS_W = 800;
const CANVAS_H = 300;

interface SpaceCanvasProps {
  spaces: Space[];
  hullPoints: Array<{ x: number; y: number }>;
  activeDeck: number;
  selectedSpaceId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  blueprintImageUrl?: string | null;
  blueprintOpacity?: number;
  blueprintRotation?: number;
  editingHull?: boolean;
  snapEnabled?: boolean;
  onSelectSpace: (id: string | null) => void;
  onUpdateSpaceGeometry: (id: string, geometry: SpaceGeometry) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onRenameSpace: (space: Space) => void;
  onChangeSpaceType: (space: Space, type: SpaceType) => void;
  onViewInventory: (space: Space) => void;
  onDuplicateSpace: (space: Space) => void;
  onDeleteSpace: (space: Space) => void;
  onUpdateHullPoints?: (points: Point[]) => void;
}

export function SpaceCanvas({
  spaces,
  hullPoints,
  activeDeck,
  selectedSpaceId,
  zoom,
  pan,
  blueprintImageUrl,
  blueprintOpacity = 0.3,
  blueprintRotation = 0,
  editingHull = false,
  snapEnabled = false,
  onSelectSpace,
  onUpdateSpaceGeometry,
  onPanChange,
  onRenameSpace,
  onChangeSpaceType,
  onViewInventory,
  onDuplicateSpace,
  onDeleteSpace,
  onUpdateHullPoints,
}: SpaceCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ spaceId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{ spaceId: string; corner: string; startGeo: RectGeometry; startX: number; startY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const [draftPos, setDraftPos] = useState<{ x: number; y: number } | null>(null);
  const [draftResize, setDraftResize] = useState<RectGeometry | null>(null);

  const [draggingHullPoint, setDraggingHullPoint] = useState<number | null>(null);
  const [draftHullPoints, setDraftHullPoints] = useState<Point[] | null>(null);
  const [hullEdgeHover, setHullEdgeHover] = useState<Point | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const snapToGrid = snapEnabled;

  const activeHullPoints = draftHullPoints ?? hullPoints;
  const hasBlueprint = Boolean(blueprintImageUrl);
  const GRID = 20;

  const snap = (v: number) => snapToGrid ? Math.round(v / GRID) * GRID : v;

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const visibleSpaces = spaces.filter((s) => (s.deck ?? 0) === activeDeck);
  const hullPath = activeHullPoints.length >= 3
    ? `M${activeHullPoints.map((p) => `${p.x},${p.y}`).join(' L')} Z`
    : '';

  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (editingHull && svgRef.current && hullEdgeHover && onUpdateHullPoints) {
      const pts = [...activeHullPoints];
      const hit = nearestEdgePoint(hullEdgeHover, pts);
      if (hit) {
        pts.splice(hit.edgeIndex + 1, 0, { ...hullEdgeHover });
        setDraftHullPoints(pts);
        onUpdateHullPoints(pts);
      }
      setHullEdgeHover(null);
      return;
    }
    if (e.target === svgRef.current || (e.target as SVGElement).dataset.bg) {
      setPanning({ startX: e.clientX, startY: e.clientY, startPan: pan });
      onSelectSpace(null);
    }
  }, [pan, onSelectSpace, editingHull, activeHullPoints, hullEdgeHover, onUpdateHullPoints]);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panning) {
      onPanChange({
        x: panning.startPan.x + (e.clientX - panning.startX),
        y: panning.startPan.y + (e.clientY - panning.startY),
      });
    }
    if (draggingHullPoint !== null && svgRef.current) {
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
      const pts = [...activeHullPoints];
      pts[draggingHullPoint] = { x: pt.x, y: pt.y };
      setDraftHullPoints(pts);
    }
    if (editingHull && draggingHullPoint === null && !panning && svgRef.current) {
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
      const hit = nearestEdgePoint(pt, activeHullPoints, 8 / zoom);
      setHullEdgeHover(hit ? hit.point : null);
    }
    if (dragging && svgRef.current) {
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
      setDraftPos({ x: pt.x - dragging.offsetX, y: pt.y - dragging.offsetY });
    }
    if (resizing && svgRef.current) {
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
      const g = resizing.startGeo;
      let dx = pt.x - resizing.startX;
      let dy = pt.y - resizing.startY;
      const MIN = 30;

      if (shiftHeld && (resizing.corner === 'nw' || resizing.corner === 'ne' || resizing.corner === 'sw' || resizing.corner === 'se')) {
        const aspect = g.width / g.height;
        if (Math.abs(dx) > Math.abs(dy)) {
          dy = dx / aspect * (resizing.corner.includes('n') === resizing.corner.includes('w') ? 1 : -1);
        } else {
          dx = dy * aspect * (resizing.corner.includes('n') === resizing.corner.includes('w') ? 1 : -1);
        }
      }

      let nx = g.x, ny = g.y, nw = g.width, nh = g.height;
      if (resizing.corner.includes('e')) { nw = Math.max(MIN, g.width + dx); }
      if (resizing.corner.includes('w')) { nx = g.x + dx; nw = Math.max(MIN, g.width - dx); }
      if (resizing.corner.includes('s')) { nh = Math.max(MIN, g.height + dy); }
      if (resizing.corner.includes('n')) { ny = g.y + dy; nh = Math.max(MIN, g.height - dy); }

      setDraftResize({ kind: 'rect', x: snap(nx), y: snap(ny), width: snap(nw), height: snap(nh) });
    }
  }, [panning, dragging, draggingHullPoint, resizing, onPanChange, editingHull, activeHullPoints, zoom]);

  const handleSvgPointerUp = useCallback(() => {
    setPanning(null);
    if (draggingHullPoint !== null && draftHullPoints && onUpdateHullPoints) {
      onUpdateHullPoints(draftHullPoints);
      setDraggingHullPoint(null);
      setDraftHullPoints(null);
      return;
    }
    setDraggingHullPoint(null);
    if (dragging && draftPos) {
      const space = spaces.find((s) => s.id === dragging.spaceId);
      if (space) {
        const geo = normalizeGeometry(space.geometry);
        if (geo) {
          const updated: SpaceGeometry = geo.kind === 'rect'
            ? { ...(geo as RectGeometry), x: draftPos.x, y: draftPos.y }
            : { ...geo, points: geo.points.map((orig) => ({
                x: orig.x + draftPos.x - geo.points[0].x,
                y: orig.y + draftPos.y - geo.points[0].y,
              })) };
          onUpdateSpaceGeometry(dragging.spaceId, updated);
        }
      }
    }
    if (resizing && draftResize) {
      onUpdateSpaceGeometry(resizing.spaceId, draftResize);
    }
    setDragging(null);
    setDraftPos(null);
    setResizing(null);
    setDraftResize(null);
  }, [dragging, draftPos, draggingHullPoint, draftHullPoints, resizing, draftResize, spaces, onUpdateSpaceGeometry, onUpdateHullPoints]);

  const handleSpacePointerDown = useCallback((e: React.PointerEvent, space: Space) => {
    e.stopPropagation();
    onSelectSpace(space.id);
    if (!svgRef.current) return;
    const geo = normalizeGeometry(space.geometry);
    if (!geo) return;
    const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
    const origin = geo.kind === 'rect'
      ? { x: geo.x, y: geo.y }
      : geo.points[0];
    setDragging({ spaceId: space.id, offsetX: pt.x - origin.x, offsetY: pt.y - origin.y });
  }, [onSelectSpace]);

  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={handleSvgPointerDown}
      onPointerMove={handleSvgPointerMove}
      onPointerUp={handleSvgPointerUp}
      onPointerLeave={handleSvgPointerUp}
    >
      <defs>
        {activeHullPoints.length >= 3 && (
          <clipPath id="hull-clip">
            <polygon points={pointsAttr(activeHullPoints)} />
          </clipPath>
        )}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-border/30" />
        </pattern>
      </defs>

      <g transform={transform}>
        {/* Background grid */}
        <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" data-bg="1" />

        {/* Blueprint image */}
        {blueprintImageUrl && (
          <image
            href={blueprintImageUrl}
            x="0" y="0"
            width={CANVAS_W} height={CANVAS_H}
            opacity={blueprintOpacity}
            preserveAspectRatio="xMidYMid meet"
            transform={blueprintRotation ? `rotate(${blueprintRotation}, ${CANVAS_W / 2}, ${CANVAS_H / 2})` : undefined}
          />
        )}

        {/* Hull outline - hidden when blueprint image is loaded */}
        {hullPath && !hasBlueprint && (
          <path
            d={hullPath}
            fill={editingHull ? 'hsl(205 100% 44% / 0.05)' : 'none'}
            stroke={editingHull ? 'hsl(205 100% 44%)' : 'currentColor'}
            strokeWidth={editingHull ? 2.5 : 2}
            className={editingHull ? '' : 'text-foreground/40'}
            strokeDasharray={editingHull ? '6 3' : undefined}
          />
        )}

        {/* Spaces clipped to hull */}
        <g clipPath={activeHullPoints.length >= 3 && !hasBlueprint ? 'url(#hull-clip)' : undefined}>
          {visibleSpaces.map((space) => {
            const geo = normalizeGeometry(space.geometry);
            if (!geo) return null;

            const colors = SPACE_COLORS[space.type] ?? SPACE_COLORS.custom;
            const isSelected = space.id === selectedSpaceId;
            const pos = (dragging?.spaceId === space.id && draftPos) ? draftPos : null;
            const centroid = geometryCentroid(pos
              ? (geo.kind === 'rect' ? { ...geo, x: pos.x, y: pos.y } : geo)
              : geo);

            const shapeProps = {
              fill: colors.fill,
              fillOpacity: isSelected ? 0.55 : 0.4,
              stroke: isSelected ? colors.stroke : colors.fill,
              strokeWidth: isSelected ? 1.5 : 0.8,
              className: cn('transition-opacity cursor-move'),
              onPointerDown: (e: React.PointerEvent) => handleSpacePointerDown(e, space),
            };

            const shape = (() => {
              if (geo.kind === 'rect') {
                const x = pos?.x ?? geo.x;
                const y = pos?.y ?? geo.y;
                return <rect key="shape" x={x} y={y} width={geo.width} height={geo.height} rx="3" {...shapeProps} />;
              }
              const pts = pos
                ? geo.points.map((p) => ({ x: p.x + pos.x - geo.points[0].x, y: p.y + pos.y - geo.points[0].y }))
                : geo.points;
              return <polygon key="shape" points={pointsAttr(pts)} {...shapeProps} />;
            })();

            return (
              <SpaceContextMenu
                key={space.id}
                space={space}
                onRename={onRenameSpace}
                onChangeType={onChangeSpaceType}
                onViewInventory={onViewInventory}
                onDuplicate={onDuplicateSpace}
                onDelete={onDeleteSpace}
              >
                <g>
                  {shape}
                  <text
                    x={centroid.x}
                    y={centroid.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="white"
                    fillOpacity={0.9}
                    pointerEvents="none"
                    className="select-none"
                  >
                    {space.name.length > 12 ? space.name.slice(0, 11) + '…' : space.name}
                  </text>
                </g>
              </SpaceContextMenu>
            );
          })}
        </g>

        {/* Selection outline + resize handles */}
        {selectedSpaceId && (() => {
          const space = visibleSpaces.find((s) => s.id === selectedSpaceId);
          if (!space) return null;
          const geo = normalizeGeometry(space.geometry);
          if (!geo || geo.kind !== 'rect') return null;

          const isDragging = dragging?.spaceId === selectedSpaceId;
          const isResizingThis = resizing?.spaceId === selectedSpaceId;
          const r = isResizingThis && draftResize ? draftResize : geo;
          const x = isDragging && draftPos ? draftPos.x : r.x;
          const y = isDragging && draftPos ? draftPos.y : r.y;
          const w = r.width;
          const h = r.height;
          const hs = 6;

          const handles = [
            { id: 'nw', cx: x, cy: y, cursor: 'nwse-resize' },
            { id: 'ne', cx: x + w, cy: y, cursor: 'nesw-resize' },
            { id: 'sw', cx: x, cy: y + h, cursor: 'nesw-resize' },
            { id: 'se', cx: x + w, cy: y + h, cursor: 'nwse-resize' },
            { id: 'n', cx: x + w / 2, cy: y, cursor: 'ns-resize' },
            { id: 's', cx: x + w / 2, cy: y + h, cursor: 'ns-resize' },
            { id: 'w', cx: x, cy: y + h / 2, cursor: 'ew-resize' },
            { id: 'e', cx: x + w, cy: y + h / 2, cursor: 'ew-resize' },
          ];

          const handleResizeStart = (e: React.PointerEvent, corner: string) => {
            e.stopPropagation();
            if (!svgRef.current) return;
            const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
            setResizing({ spaceId: space.id, corner, startGeo: { kind: 'rect', x, y, width: w, height: h }, startX: pt.x, startY: pt.y });
          };

          return (
            <g>
              <rect
                x={x - 2} y={y - 2}
                width={w + 4} height={h + 4}
                rx="4" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 2"
                pointerEvents="none"
              />
              {!isDragging && handles.map((h) => (
                <rect
                  key={h.id}
                  x={h.cx - hs / 2} y={h.cy - hs / 2}
                  width={hs} height={hs}
                  rx="1"
                  fill="white"
                  stroke="hsl(205 100% 44%)"
                  strokeWidth="1.5"
                  style={{ cursor: h.cursor }}
                  onPointerDown={(e) => handleResizeStart(e, h.id)}
                />
              ))}
              {isResizingThis && draftResize && (
                <g pointerEvents="none">
                  <rect
                    x={x + w / 2 - 28} y={y + h + 8}
                    width="56" height="16" rx="3"
                    fill="hsl(220 40% 11%)" fillOpacity="0.9"
                  />
                  <text
                    x={x + w / 2} y={y + h + 18}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="8" fill="white" fontWeight="600"
                    className="select-none"
                  >
                    {Math.round(w)} x {Math.round(h)}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* Hull point editing handles */}
        {editingHull && activeHullPoints.length >= 3 && (
          <g>
            {activeHullPoints.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={7}
                  fill="hsl(205 100% 44%)"
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingHullPoint(i);
                    setDraftHullPoints([...activeHullPoints]);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (activeHullPoints.length <= 3 || !onUpdateHullPoints) return;
                    const pts = activeHullPoints.filter((_, idx) => idx !== i);
                    setDraftHullPoints(pts);
                    onUpdateHullPoints(pts);
                  }}
                />
                <text
                  x={p.x} y={p.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="7" fill="white" fontWeight="bold"
                  pointerEvents="none" className="select-none"
                >
                  {i + 1}
                </text>
              </g>
            ))}

            {hullEdgeHover && (
              <circle
                cx={hullEdgeHover.x} cy={hullEdgeHover.y} r={5}
                fill="hsl(160 84% 39%)"
                stroke="white" strokeWidth="1.5"
                opacity={0.8}
                pointerEvents="none"
              />
            )}
          </g>
        )}
      </g>
    </svg>
  );
}
