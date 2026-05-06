import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Bed,
  Box,
  ChevronRight,
  Droplets,
  Edit3,
  Map,
  Maximize2,
  Plus,
  Save,
  Settings,
  Utensils,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVesselStore } from '@/store';
import { SpaceType, type Space } from '@/types';

const spaceTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; darkColor: string }> = {
  [SpaceType.COCKPIT]: { label: 'Cockpit', icon: Map, color: '#3b82f6', darkColor: '#1d4ed8' },
  [SpaceType.CABIN]: { label: 'Cabin', icon: Bed, color: '#8b5cf6', darkColor: '#6d28d9' },
  [SpaceType.LOCKER]: { label: 'Locker', icon: Box, color: '#6b7280', darkColor: '#374151' },
  [SpaceType.COMPARTMENT]: { label: 'Compartment', icon: Box, color: '#6b7280', darkColor: '#374151' },
  [SpaceType.BILGE]: { label: 'Bilge', icon: Droplets, color: '#06b6d4', darkColor: '#0e7490' },
  [SpaceType.GALLEY]: { label: 'Galley', icon: Utensils, color: '#f97316', darkColor: '#c2410c' },
  [SpaceType.HEAD]: { label: 'Head', icon: Droplets, color: '#14b8a6', darkColor: '#0d9488' },
  [SpaceType.BERTH]: { label: 'Berth', icon: Bed, color: '#a78bfa', darkColor: '#7c3aed' },
  [SpaceType.SALON]: { label: 'Salon', icon: Map, color: '#f59e0b', darkColor: '#d97706' },
  [SpaceType.ENGINE_ROOM]: { label: 'Engine Room', icon: Zap, color: '#ef4444', darkColor: '#b91c1c' },
  [SpaceType.LAZARETTE]: { label: 'Lazarette', icon: Box, color: '#78716c', darkColor: '#44403c' },
  [SpaceType.ANCHOR_LOCKER]: { label: 'Anchor Locker', icon: Anchor, color: '#64748b', darkColor: '#334155' },
  [SpaceType.DECK_STORAGE]: { label: 'Deck Storage', icon: Box, color: '#84cc16', darkColor: '#4d7c0f' },
  [SpaceType.FLYBRIDGE]: { label: 'Flybridge', icon: Map, color: '#22d3ee', darkColor: '#0891b2' },
  [SpaceType.TENDER_GARAGE]: { label: 'Tender Garage', icon: Box, color: '#a3a3a3', darkColor: '#525252' },
  [SpaceType.FUEL_TANK]: { label: 'Fuel Tank', icon: Droplets, color: '#dc2626', darkColor: '#991b1b' },
  [SpaceType.WATER_TANK]: { label: 'Water Tank', icon: Droplets, color: '#2563eb', darkColor: '#1e40af' },
  [SpaceType.HOLD]: { label: 'Hold', icon: Box, color: '#a16207', darkColor: '#713f12' },
  [SpaceType.CUSTOM]: { label: 'Custom', icon: Settings, color: '#d946ef', darkColor: '#a21caf' },
};

// Demo spaces positioned like a real sailboat layout (SVG coords: 0-800 x, 0-300 y, bow at top)
const demoSpaces: Space[] = [
  { id: 'sp-anchor', vesselId: 'v1', name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { x: 340, y: 8, width: 120, height: 35 }, description: 'Forward chain locker', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-fwd-cabin', vesselId: 'v1', name: 'Forward Cabin', type: SpaceType.BERTH, deck: 0, deckName: 'Main Deck', geometry: { x: 300, y: 50, width: 200, height: 55 }, description: 'V-berth forward', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-head', vesselId: 'v1', name: 'Head', type: SpaceType.HEAD, deck: 0, deckName: 'Main Deck', geometry: { x: 220, y: 110, width: 80, height: 50 }, description: 'Marine head', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-salon', vesselId: 'v1', name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { x: 310, y: 110, width: 180, height: 55 }, description: 'Main salon', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-galley', vesselId: 'v1', name: 'Galley', type: SpaceType.GALLEY, deck: 0, deckName: 'Main Deck', geometry: { x: 500, y: 110, width: 80, height: 50 }, description: 'Galley to starboard', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-nav', vesselId: 'v1', name: 'Nav Station', type: SpaceType.COMPARTMENT, deck: 0, deckName: 'Main Deck', geometry: { x: 220, y: 168, width: 90, height: 35 }, description: 'Chart table and instruments', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-engine', vesselId: 'v1', name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Lower Deck', geometry: { x: 340, y: 170, width: 120, height: 50 }, description: 'Yanmar 3YM30', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-aft-cabin', vesselId: 'v1', name: 'Aft Cabin', type: SpaceType.BERTH, deck: 0, deckName: 'Main Deck', geometry: { x: 500, y: 168, width: 80, height: 40 }, description: 'Aft cabin starboard', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-cockpit', vesselId: 'v1', name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { x: 280, y: 220, width: 240, height: 45 }, description: 'Main cockpit', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-laz', vesselId: 'v1', name: 'Lazarette', type: SpaceType.LAZARETTE, deck: -1, deckName: 'Lower Deck', geometry: { x: 350, y: 268, width: 100, height: 22 }, description: 'Aft storage', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-fuel', vesselId: 'v1', name: 'Fuel Tank', type: SpaceType.FUEL_TANK, deck: -1, deckName: 'Lower Deck', geometry: { x: 220, y: 170, width: 60, height: 50 }, description: '75L diesel', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'sp-water', vesselId: 'v1', name: 'Water Tank', type: SpaceType.WATER_TANK, deck: -1, deckName: 'Lower Deck', geometry: { x: 520, y: 170, width: 60, height: 50 }, description: '150L water', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

// SVG hull path — a sailboat profile (bow up, stern down)
const HULL_PATH = 'M 400 5 C 380 5, 290 20, 260 60 C 230 110, 220 170, 220 210 C 220 250, 260 285, 300 295 L 500 295 C 540 285, 580 250, 580 210 C 580 170, 570 110, 540 60 C 510 20, 420 5, 400 5 Z';

export function BoatMap() {
  const { spaces: storeSpaces } = useVesselStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeDeck, setActiveDeck] = useState<number>(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  const currentSpaces = storeSpaces.length > 0 ? storeSpaces : demoSpaces;
  const decks = useMemo(() => [...new Set(currentSpaces.map((s) => s.deck ?? 0))].sort((a, b) => b - a), [currentSpaces]);
  const deckSpaces = useMemo(() => currentSpaces.filter((s) => (s.deck ?? 0) === activeDeck), [currentSpaces, activeDeck]);
  const selected = useMemo(() => currentSpaces.find((s) => s.id === selectedSpaceId) ?? null, [currentSpaces, selectedSpaceId]);

  const handleZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(3, Math.max(0.3, z + delta)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleSpaceClick = useCallback((space: Space) => {
    setSelectedSpaceId(space.id);
  }, []);

  const handleSpaceDoubleClick = useCallback((space: Space) => {
    setEditingSpace(space);
    setIsEditDialogOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" /> Boat Map
          </h1>
          <p className="text-muted-foreground mt-1">Interactive deck plan — click spaces, scroll to zoom, Alt+drag to pan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Space</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SVG Deck Plan */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {/* Deck Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Deck:</span>
                  {decks.map((deck) => (
                    <Button key={deck} variant={activeDeck === deck ? 'default' : 'outline'} size="sm" onClick={() => setActiveDeck(deck)}>
                      {deck === 0 ? 'Main' : deck > 0 ? `Upper ${deck}` : 'Lower'}
                    </Button>
                  ))}
                </div>
                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom(-0.2)}><ZoomOut className="h-4 w-4" /></Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom(0.2)}><ZoomIn className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={resetView}><Maximize2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="relative bg-muted/30 dark:bg-muted/10 rounded-lg border overflow-hidden"
                style={{ height: '500px', cursor: isPanning ? 'grabbing' : 'default' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <svg
                  ref={svgRef}
                  viewBox="0 0 800 300"
                  className="w-full h-full"
                  style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center center', transition: isPanning ? 'none' : 'transform 0.15s ease' }}
                >
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid)" />

                  {/* Hull outline */}
                  <path d={HULL_PATH} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                  <path d={HULL_PATH} fill="currentColor" opacity="0.03" />

                  {/* Centerline */}
                  <line x1="400" y1="5" x2="400" y2="295" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8,4" opacity="0.2" />

                  {/* Bow label */}
                  <text x="400" y="2" textAnchor="middle" className="fill-muted-foreground text-[10px]">BOW</text>
                  {/* Stern label */}
                  <text x="400" y="298" textAnchor="middle" className="fill-muted-foreground text-[10px]">STERN</text>
                  {/* Port/Starboard */}
                  <text x="225" y="150" textAnchor="middle" className="fill-muted-foreground text-[9px]">PORT</text>
                  <text x="575" y="150" textAnchor="middle" className="fill-muted-foreground text-[9px]">STBD</text>

                  {/* Spaces */}
                  {deckSpaces.map((space) => {
                    const config = spaceTypeConfig[space.type];
                    const isSelected = selectedSpaceId === space.id;
                    const geo = space.geometry;
                    if (!geo) return null;
                    const fill = config?.color || '#6b7280';

                    return (
                      <g key={space.id} onClick={() => handleSpaceClick(space)} onDoubleClick={() => handleSpaceDoubleClick(space)} style={{ cursor: 'pointer' }}>
                        <rect
                          x={geo.x} y={geo.y} width={geo.width} height={geo.height}
                          rx={4} ry={4}
                          fill={fill} fillOpacity={isSelected ? 0.35 : 0.15}
                          stroke={isSelected ? fill : 'currentColor'}
                          strokeWidth={isSelected ? 2 : 1}
                          strokeOpacity={isSelected ? 1 : 0.4}
                          className="transition-all duration-150"
                        />
                        {/* Space label */}
                        <text
                          x={geo.x + geo.width / 2} y={geo.y + geo.height / 2 - 4}
                          textAnchor="middle" dominantBaseline="middle"
                          className="fill-foreground text-[10px] font-medium pointer-events-none select-none"
                        >
                          {space.name}
                        </text>
                        <text
                          x={geo.x + geo.width / 2} y={geo.y + geo.height / 2 + 8}
                          textAnchor="middle" dominantBaseline="middle"
                          className="fill-muted-foreground text-[8px] pointer-events-none select-none"
                        >
                          {config?.label || space.type}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Space Details */}
        <div className="space-y-4">
          {/* Selected Space Detail */}
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {React.createElement(spaceTypeConfig[selected.type]?.icon || Box, { className: 'h-4 w-4' })}
                    {selected.name}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSpaceId(null)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{spaceTypeConfig[selected.type]?.label || selected.type}</span></div>
                  <div><span className="text-muted-foreground">Deck:</span> <span className="font-medium">{selected.deckName || (selected.deck === 0 ? 'Main' : `Level ${selected.deck}`)}</span></div>
                </div>
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                {selected.geometry && (
                  <div className="text-xs text-muted-foreground">
                    Position: ({selected.geometry.x}, {selected.geometry.y}) · {selected.geometry.width}×{selected.geometry.height}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSpaceDoubleClick(selected)}><Edit3 className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="flex-1"><ChevronRight className="h-3 w-3 mr-1" /> Items</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Map className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Click a space on the deck plan to see details</p>
              </CardContent>
            </Card>
          )}

          {/* Space List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spaces ({deckSpaces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {deckSpaces.map((space) => {
                    const config = spaceTypeConfig[space.type];
                    const Icon = config?.icon || Box;
                    return (
                      <button
                        key={space.id}
                        className={cn('w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted/50 transition-colors', selectedSpaceId === space.id && 'bg-muted')}
                        onClick={() => handleSpaceClick(space)}
                      >
                        <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: `${config?.color || '#6b7280'}20` }}>
                          <Icon className="h-4 w-4" style={{ color: config?.color || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{space.name}</p>
                          <p className="text-xs text-muted-foreground">{config?.label || space.type}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Space Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Space: {editingSpace?.name}</DialogTitle>
          </DialogHeader>
          {editingSpace && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input defaultValue={editingSpace.name} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue={editingSpace.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(spaceTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input defaultValue={editingSpace.description || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deck</Label>
                  <Select defaultValue={String(editingSpace.deck)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Lower Deck</SelectItem>
                      <SelectItem value="0">Main Deck</SelectItem>
                      <SelectItem value="1">Upper Deck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsEditDialogOpen(false)}><Save className="h-4 w-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
