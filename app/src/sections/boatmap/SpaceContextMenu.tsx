import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { SpaceType } from '@/types';
import type { Space } from '@/types';

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

interface SpaceContextMenuProps {
  space: Space;
  children: React.ReactNode;
  onRename: (space: Space) => void;
  onChangeType: (space: Space, type: SpaceType) => void;
  onViewInventory: (space: Space) => void;
  onDuplicate: (space: Space) => void;
  onDelete: (space: Space) => void;
}

export function SpaceContextMenu({
  space,
  children,
  onRename,
  onChangeType,
  onViewInventory,
  onDuplicate,
  onDelete,
}: SpaceContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onRename(space)}>Rename</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Change Type</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 max-h-64 overflow-y-auto">
            {Object.values(SpaceType).map((type) => (
              <ContextMenuItem
                key={type}
                onClick={() => onChangeType(space, type)}
                className={space.type === type ? 'font-semibold' : ''}
              >
                {SPACE_TYPE_LABELS[type]}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onViewInventory(space)}>View Inventory</ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(space)}>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(space)}
          className="text-destructive focus:text-destructive"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
