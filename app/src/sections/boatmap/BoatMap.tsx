import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Map, Plus, Settings, Upload, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { useVesselStore, useAppStore, useSettingsStore } from '@/store';
import { SpaceType } from '@/types';
import type { Space, SpaceGeometry } from '@/types';
import { normalizeGeometry } from '@/lib/geometry';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { SpaceCanvas } from './SpaceCanvas';
import { DeckSelector } from './DeckSelector';
import { TemplateChooser } from './TemplateChooser';
import { SpaceDetailPanel } from './SpaceDetailPanel';
import type { VesselTemplate } from '@/lib/vessel-templates';

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  [SpaceType.COCKPIT]: 'Cockpit',
  [SpaceType.CABIN]: 'Cabin',
  [SpaceType.LOCKER]: 'Locker',
  [SpaceType.COMPARTMENT]: 'Compartment',
  [SpaceType.BILGE]: 'Bilge',
  [SpaceType.GALLEY]: 'Galley',
  [SpaceType.HEAD]: 'Head',
  [SpaceType.BERTH]: 'Berth',
  [SpaceType.SALON]: 'Salon',
  [SpaceType.ENGINE_ROOM]: 'Engine Room',
  [SpaceType.LAZARETTE]: 'Lazarette',
  [SpaceType.ANCHOR_LOCKER]: 'Anchor Locker',
  [SpaceType.DECK_STORAGE]: 'Deck Storage',
  [SpaceType.FLYBRIDGE]: 'Flybridge',
  [SpaceType.TENDER_GARAGE]: 'Tender Garage',
  [SpaceType.FUEL_TANK]: 'Fuel Tank',
  [SpaceType.WATER_TANK]: 'Water Tank',
  [SpaceType.HOLD]: 'Hold',
  [SpaceType.CUSTOM]: 'Custom',
};

export function BoatMap() {
  const { currentVessel, spaces, items, addSpace, updateSpace, deleteSpace, batchSetSpaces, updateVessel } =
    useVesselStore();
  const { setActiveView, openModal } = useAppStore();
  const { demoModeEnabled } = useSettingsStore();

  const [activeDeck, setActiveDeck] = useState(0);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [templateChooserOpen, setTemplateChooserOpen] = useState(false);
  const [addSpaceOpen, setAddSpaceOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingSpace, setRenamingSpace] = useState<Space | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newSpaceDraft, setNewSpaceDraft] = useState({ name: '', type: SpaceType.COMPARTMENT as SpaceType });
  const blueprintInputRef = useRef<HTMLInputElement>(null);

  const vesselSpaces = spaces.filter((s) => s.vesselId === currentVessel?.id);
  const hullPoints = currentVessel?.deckPlan?.hullPoints ?? [];
  const blueprintImageUrl = currentVessel?.deckPlan?.blueprintImageUrl ?? null;
  const blueprintOpacity = currentVessel?.deckPlan?.blueprintOpacity ?? 0.3;

  const selectedSpace = vesselSpaces.find((s) => s.id === selectedSpaceId) ?? null;

  const handleTemplateSelect = useCallback(
    (template: VesselTemplate) => {
      if (!currentVessel) return;
      updateVessel(currentVessel.id, {
        deckPlan: {
          hullPoints: template.hullPoints,
          templateId: template.id,
          blueprintImageUrl: undefined,
          blueprintOpacity: 0.3,
        },
      });
      const newSpaces: Space[] = template.defaultSpaces.map((s) => ({
        id: crypto.randomUUID(),
        vesselId: currentVessel.id,
        name: s.name,
        type: s.type,
        deck: s.deck,
        deckName: s.deckName,
        geometry: s.geometry,
        description: s.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      batchSetSpaces(currentVessel.id, newSpaces);
      setActiveDeck(0);
      setSelectedSpaceId(null);
    },
    [currentVessel, updateVessel, batchSetSpaces]
  );

  const handleAddSpace = () => {
    if (!currentVessel || !newSpaceDraft.name.trim()) return;
    const space: Space = {
      id: crypto.randomUUID(),
      vesselId: currentVessel.id,
      name: newSpaceDraft.name.trim(),
      type: newSpaceDraft.type,
      deck: activeDeck,
      deckName: ['Keel', 'Below Deck', 'Main Deck', 'Upper Deck', 'Flybridge'][activeDeck + 2] ?? 'Main Deck',
      geometry: { kind: 'rect', x: 320, y: 120, width: 120, height: 48 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSpace(space);
    setSelectedSpaceId(space.id);
    setAddSpaceOpen(false);
    setNewSpaceDraft({ name: '', type: SpaceType.COMPARTMENT });
  };

  const handleUpdateGeometry = useCallback(
    (id: string, geometry: SpaceGeometry) => {
      updateSpace(id, { geometry, updatedAt: new Date().toISOString() });
    },
    [updateSpace]
  );

  const handleRename = (space: Space) => {
    setRenamingSpace(space);
    setRenameDraft(space.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSave = () => {
    if (renamingSpace && renameDraft.trim()) {
      updateSpace(renamingSpace.id, { name: renameDraft.trim(), updatedAt: new Date().toISOString() });
    }
    setRenameDialogOpen(false);
    setRenamingSpace(null);
  };

  const handleChangeType = (space: Space, type: SpaceType) => {
    updateSpace(space.id, { type, updatedAt: new Date().toISOString() });
  };

  const handleViewInventory = useCallback(
    (space: Space) => {
      openModal('inventory-space-filter', { spaceId: space.id });
      setActiveView('inventory');
    },
    [openModal, setActiveView]
  );

  const handleDuplicate = (space: Space) => {
    if (!currentVessel) return;
    const geo = normalizeGeometry(space.geometry);
    const newGeo: SpaceGeometry | undefined = geo
      ? geo.kind === 'rect'
        ? { ...geo, x: geo.x + 20, y: geo.y + 20 }
        : { ...geo, points: geo.points.map((p) => ({ x: p.x + 20, y: p.y + 20 })) }
      : undefined;
    const dup: Space = {
      ...space,
      id: crypto.randomUUID(),
      name: `${space.name} (copy)`,
      geometry: newGeo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSpace(dup);
    setSelectedSpaceId(dup.id);
  };

  const handleDelete = (space: Space) => {
    deleteSpace(space.id);
    if (selectedSpaceId === space.id) setSelectedSpaceId(null);
  };

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentVessel) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateVessel(currentVessel.id, {
        deckPlan: { ...(currentVessel.deckPlan ?? { hullPoints: [] }), blueprintImageUrl: dataUrl },
      });
    };
    reader.readAsDataURL(file);
  };

  if (!currentVessel) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-8">
        <DataSourceNotice title="No Vessel Selected">
          Create or select a vessel in Fleet to set up your boat map.
        </DataSourceNotice>
        <Button variant="outline" onClick={() => setActiveView('fleet')}>Go to Fleet</Button>
      </div>
    );
  }

  const hasSpaces = vesselSpaces.length > 0;
  const hasHull = hullPoints.length >= 3;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{currentVessel.name}</span>
          <Badge variant="secondary" className="text-xs">{vesselSpaces.length} spaces</Badge>
        </div>

        <div className="flex items-center gap-1">
          <DeckSelector spaces={vesselSpaces} activeDeck={activeDeck} onDeckChange={setActiveDeck} />

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setTemplateChooserOpen(true)}>
            <Settings className="h-3 w-3" />
            {hasHull ? 'Change Template' : 'Choose Template'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => blueprintInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Blueprint
          </Button>
          <input
            ref={blueprintInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBlueprintUpload}
          />

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setAddSpaceOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Add Space
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main canvas + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative bg-muted/20">
          {!hasHull && !hasSpaces ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Map className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No deck plan yet</p>
              <Button onClick={() => setTemplateChooserOpen(true)}>Choose Template</Button>
              {demoModeEnabled && (
                <p className="text-xs text-muted-foreground">Demo mode: spaces will appear once a template is chosen</p>
              )}
            </div>
          ) : (
            <SpaceCanvas
              spaces={vesselSpaces}
              hullPoints={hullPoints}
              activeDeck={activeDeck}
              selectedSpaceId={selectedSpaceId}
              zoom={zoom}
              pan={pan}
              blueprintImageUrl={blueprintImageUrl}
              blueprintOpacity={blueprintOpacity}
              onSelectSpace={setSelectedSpaceId}
              onUpdateSpaceGeometry={handleUpdateGeometry}
              onPanChange={setPan}
              onRenameSpace={handleRename}
              onChangeSpaceType={handleChangeType}
              onViewInventory={handleViewInventory}
              onDuplicateSpace={handleDuplicate}
              onDeleteSpace={handleDelete}
            />
          )}
        </div>

        {/* Right sidebar */}
        {selectedSpace ? (
          <div className="w-52 border-l bg-background shrink-0">
            <SpaceDetailPanel
              space={selectedSpace}
              onViewInventory={(spaceId) => {
                openModal('inventory-space-filter', { spaceId });
                setActiveView('inventory');
              }}
              onClose={() => setSelectedSpaceId(null)}
            />
          </div>
        ) : (
          <div className="w-52 border-l bg-background shrink-0 overflow-y-auto">
            <div className="p-3 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spaces</p>
            </div>
            <div className="p-2 space-y-1">
              {vesselSpaces.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-2">No spaces yet. Add one or choose a template.</p>
              ) : (
                vesselSpaces.map((space) => {
                  const count = items.filter((i) => i.spaceId === space.id).length;
                  return (
                    <button
                      key={space.id}
                      onClick={() => { setActiveDeck(space.deck ?? 0); setSelectedSpaceId(space.id); }}
                      className="w-full flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                    >
                      <span className="truncate">{space.name}</span>
                      {count > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1">{count}</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template chooser */}
      <TemplateChooser
        open={templateChooserOpen}
        onOpenChange={setTemplateChooserOpen}
        onSelect={handleTemplateSelect}
      />

      {/* Add Space dialog */}
      <Dialog open={addSpaceOpen} onOpenChange={setAddSpaceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="space-name">Name</Label>
              <Input
                id="space-name"
                value={newSpaceDraft.name}
                onChange={(e) => setNewSpaceDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Forward Bilge"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpace(); }}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={newSpaceDraft.type}
                onValueChange={(v) => setNewSpaceDraft((d) => ({ ...d, type: v as SpaceType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {Object.values(SpaceType).map((t) => (
                    <SelectItem key={t} value={t}>{SPACE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSpaceOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSpace} disabled={!newSpaceDraft.name.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Space</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSave} disabled={!renameDraft.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
