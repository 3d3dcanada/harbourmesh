import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { svgPoint, normalizeGeometry, pointsAttr, geometryCentroid } from '@/lib/geometry';
import { SpaceContextMenu } from './SpaceContextMenu';
import type { Space, SpaceType } from '@/types';
import type { RectGeometry, SpaceGeometry } from '@/types';

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
  onSelectSpace: (id: string | null) => void;
  onUpdateSpaceGeometry: (id: string, geometry: SpaceGeometry) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onRenameSpace: (space: Space) => void;
  onChangeSpaceType: (space: Space, type: SpaceType) => void;
  onViewInventory: (space: Space) => void;
  onDuplicateSpace: (space: Space) => void;
  onDeleteSpace: (space: Space) => void;
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
  onSelectSpace,
  onUpdateSpaceGeometry,
  onPanChange,
  onRenameSpace,
  onChangeSpaceType,
  onViewInventory,
  onDuplicateSpace,
  onDeleteSpace,
}: SpaceCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ spaceId: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const [draftPos, setDraftPos] = useState<{ x: number; y: number } | null>(null);

  const visibleSpaces = spaces.filter((s) => (s.deck ?? 0) === activeDeck);
  const hullPath = hullPoints.length >= 3
    ? `M${hullPoints.map((p) => `${p.x},${p.y}`).join(' L')} Z`
    : '';

  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as SVGElement).dataset.bg) {
      // Start pan
      setPanning({ startX: e.clientX, startY: e.clientY, startPan: pan });
      onSelectSpace(null);
    }
  }, [pan, onSelectSpace]);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panning) {
      onPanChange({
        x: panning.startPan.x + (e.clientX - panning.startX),
        y: panning.startPan.y + (e.clientY - panning.startY),
      });
    }
    if (dragging && svgRef.current) {
      const pt = svgPoint(svgRef.current, e.clientX, e.clientY);
      setDraftPos({ x: pt.x - dragging.offsetX, y: pt.y - dragging.offsetY });
    }
  }, [panning, dragging, onPanChange]);

  const handleSvgPointerUp = useCallback(() => {
    setPanning(null);
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
    setDragging(null);
    setDraftPos(null);
  }, [dragging, draftPos, spaces, onUpdateSpaceGeometry]);

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
        {hullPoints.length >= 3 && (
          <clipPath id="hull-clip">
            <polygon points={pointsAttr(hullPoints)} />
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
          />
        )}

        {/* Hull outline */}
        {hullPath && (
          <path
            d={hullPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground/40"
          />
        )}

        {/* Spaces clipped to hull */}
        <g clipPath={hullPoints.length >= 3 ? 'url(#hull-clip)' : undefined}>
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

        {/* Selection outline outside clip */}
        {selectedSpaceId && (() => {
          const space = visibleSpaces.find((s) => s.id === selectedSpaceId);
          if (!space) return null;
          const geo = normalizeGeometry(space.geometry);
          if (!geo) return null;
          const pos = (dragging?.spaceId === selectedSpaceId && draftPos) ? draftPos : null;
          if (geo.kind === 'rect') {
            const x = pos?.x ?? geo.x;
            const y = pos?.y ?? geo.y;
            return (
              <rect
                x={x - 2} y={y - 2}
                width={geo.width + 4} height={geo.height + 4}
                rx="4" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 2"
                pointerEvents="none"
              />
            );
          }
          return null;
        })()}
      </g>
    </svg>
  );
}
