import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Box, Package } from 'lucide-react';
import { useVesselStore } from '@/store';
import { geometryBounds } from '@/lib/geometry';
import { normalizeGeometry } from '@/lib/geometry';
import type { Space } from '@/types';

const SPACE_TYPE_COLORS: Record<string, string> = {
  cockpit: 'bg-blue-500',
  cabin: 'bg-purple-500',
  galley: 'bg-orange-500',
  head: 'bg-teal-500',
  berth: 'bg-violet-500',
  salon: 'bg-amber-500',
  engine_room: 'bg-red-500',
  locker: 'bg-gray-500',
  bilge: 'bg-cyan-500',
  anchor_locker: 'bg-slate-500',
  deck_storage: 'bg-lime-500',
  flybridge: 'bg-sky-500',
};

interface SpaceDetailPanelProps {
  space: Space;
  onViewInventory: (spaceId: string) => void;
  onClose: () => void;
}

export function SpaceDetailPanel({ space, onViewInventory, onClose }: SpaceDetailPanelProps) {
  const { items, updateSpace } = useVesselStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(space.name);

  const itemCount = items.filter((i) => i.spaceId === space.id).length;
  const geo = normalizeGeometry(space.geometry);
  const bounds = geo ? geometryBounds(geo) : null;

  const handleNameSave = () => {
    if (nameValue.trim() && nameValue !== space.name) {
      updateSpace(space.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const color = SPACE_TYPE_COLORS[space.type] ?? 'bg-gray-500';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-sm ${color}`} />
          <span className="text-sm font-semibold truncate max-w-[140px]">{space.name}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>×</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          {editingName ? (
            <div className="flex gap-1">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleNameSave}>Save</Button>
            </div>
          ) : (
            <button
              className="text-sm font-medium w-full text-left hover:underline"
              onClick={() => { setNameValue(space.name); setEditingName(true); }}
            >
              {space.name}
            </button>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Badge variant="secondary" className="text-xs capitalize">
            {space.type.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Deck</Label>
          <p className="text-sm">{space.deckName ?? `Deck ${space.deck ?? 0}`}</p>
        </div>

        {bounds && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Size (canvas units)</Label>
            <p className="text-sm font-mono">{Math.round(bounds.width)} × {Math.round(bounds.height)}</p>
          </div>
        )}

        {space.description && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="text-sm text-muted-foreground">{space.description}</p>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewInventory(space.id)}
          >
            <Box className="h-3 w-3 mr-1" />
            Inventory
          </Button>
        </div>
      </div>
    </div>
  );
}
