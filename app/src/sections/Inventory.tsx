/**
 * HarborMesh - Inventory Section
 * Manage vessel items, spare parts, safety equipment, and supplies
 */
import { useState, useMemo } from 'react';
import { Package, Search, Plus, ArrowUpDown, Edit3, Trash2 } from 'lucide-react';
import { AIAssistButton } from '@/components/AIAssistButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { cn } from '@/lib/utils';
import { useAppStore, useSettingsStore, useVesselStore } from '@/store';
import { ItemCategory, type Item } from '@/types';

const categoryConfig: Record<string, { label: string; color: string }> = {
  [ItemCategory.SAFETY]: { label: 'Safety', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  [ItemCategory.SPARES]: { label: 'Spares', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  [ItemCategory.TOOLS]: { label: 'Tools', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  [ItemCategory.ENGINE]: { label: 'Engine', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400' },
  [ItemCategory.ELECTRICAL]: { label: 'Electrical', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  [ItemCategory.PLUMBING]: { label: 'Plumbing', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  [ItemCategory.RIGGING]: { label: 'Rigging', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  [ItemCategory.NAVIGATION]: { label: 'Navigation', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  [ItemCategory.LINES]: { label: 'Lines', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  [ItemCategory.ANCHORING]: { label: 'Anchoring', color: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400' },
  [ItemCategory.GALLEY]: { label: 'Galley', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  [ItemCategory.ELECTRONICS]: { label: 'Electronics', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
  [ItemCategory.MEDICAL]: { label: 'Medical', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
  [ItemCategory.FENDERS]: { label: 'Fenders', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  [ItemCategory.CLEANING]: { label: 'Cleaning', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400' },
  [ItemCategory.CANVAS]: { label: 'Canvas', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' },
  [ItemCategory.COMMUNICATION]: { label: 'Comms', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  [ItemCategory.FASTENERS]: { label: 'Fasteners', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400' },
  [ItemCategory.DOCUMENTS]: { label: 'Documents', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400' },
  [ItemCategory.FISHING]: { label: 'Fishing', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  [ItemCategory.DIVING]: { label: 'Diving', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  [ItemCategory.TENDER]: { label: 'Tender', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  [ItemCategory.CUSTOM]: { label: 'Other', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
};

const mockItems = [
  { id: '1', vesselId: 'v1', spaceId: 's1', category: ItemCategory.SAFETY, name: 'Life Jacket - Adult', description: 'Spinlock Deckvest', quantity: 6, unit: 'pcs', manufacturer: 'Spinlock', partNumber: 'DV-LJ-S', reorderThreshold: 4, expiryDate: '2028-06-01', tags: ['safety', 'flotation'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', vesselId: 'v1', spaceId: 's2', category: ItemCategory.SAFETY, name: 'Fire Extinguisher - 5lb ABC', description: 'Kidde marine rated', quantity: 3, unit: 'pcs', manufacturer: 'Kidde', partNumber: 'M5P', reorderThreshold: 2, expiryDate: '2026-03-15', tags: ['safety', 'fire'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '3', vesselId: 'v1', spaceId: 's3', category: ItemCategory.ENGINE, name: 'Oil Filter - Yanmar', description: 'OEM replacement for 3YM30', quantity: 3, unit: 'pcs', manufacturer: 'Yanmar', partNumber: '119573-35151', reorderThreshold: 2, tags: ['engine', 'spare'], relatedSystemIds: ['eng1'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '4', vesselId: 'v1', spaceId: 's3', category: ItemCategory.ENGINE, name: 'Raw Water Impeller', description: 'Jabsco replacement', quantity: 1, unit: 'pcs', manufacturer: 'Jabsco', partNumber: '17920-0001', reorderThreshold: 2, tags: ['engine', 'cooling'], relatedSystemIds: ['eng1'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '5', vesselId: 'v1', spaceId: 's4', category: ItemCategory.SPARES, name: 'Fuse Assortment - Marine', description: 'ATO/ATC blade fuse kit', quantity: 1, unit: 'kit', manufacturer: 'Blue Sea', partNumber: '5025', reorderThreshold: 1, tags: ['electrical', 'spare'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '6', vesselId: 'v1', spaceId: 's5', category: ItemCategory.LINES, name: 'Dock Line - 5/8" x 15ft', description: 'Double braid nylon', quantity: 6, unit: 'pcs', manufacturer: 'New England Ropes', reorderThreshold: 4, tags: ['lines', 'docking'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '7', vesselId: 'v1', spaceId: 's6', category: ItemCategory.ANCHORING, name: 'Anchor Chain - 5/16" G4', description: 'Hi-test galvanized', quantity: 150, unit: 'ft', manufacturer: 'Peerless', reorderThreshold: 100, tags: ['anchoring'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '8', vesselId: 'v1', spaceId: 's1', category: ItemCategory.MEDICAL, name: 'First Aid Kit - Offshore', description: 'Comprehensive marine first aid', quantity: 1, unit: 'kit', manufacturer: 'Adventure Medical', partNumber: '0120-0451', reorderThreshold: 1, expiryDate: '2025-12-01', tags: ['medical', 'safety'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '9', vesselId: 'v1', spaceId: 's7', category: ItemCategory.GALLEY, name: 'Propane Canister - 1lb', description: 'Coleman 16oz', quantity: 4, unit: 'pcs', reorderThreshold: 2, tags: ['galley', 'propane'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '10', vesselId: 'v1', spaceId: 's2', category: ItemCategory.ELECTRONICS, name: 'VHF Handheld - Backup', description: 'Standard Horizon HX890', quantity: 1, unit: 'pcs', manufacturer: 'Standard Horizon', partNumber: 'HX890', tags: ['communication', 'safety'], relatedSystemIds: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

function createBlankItem(vesselId: string, spaceId = 'unassigned'): Item {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    vesselId,
    spaceId,
    category: ItemCategory.SAFETY,
    name: '',
    description: '',
    quantity: 1,
    unit: 'each',
    tags: [],
    relatedSystemIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function Inventory() {
  const {
    currentVessel,
    spaces,
    items,
    addItem,
    updateItem,
    deleteItem,
  } = useVesselStore();
  const { setActiveView, modalData, closeModal } = useAppStore();
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterSpaceId, setFilterSpaceId] = useState<string | null>(
    (modalData as { spaceId?: string } | undefined)?.spaceId ?? null
  );
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'quantity' | 'expiry'>('category');
  const [sortAsc, setSortAsc] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<Item | null>(null);

  const usingDemoItems = items.length === 0 && demoModeEnabled;
  const displayItems = (usingDemoItems ? mockItems : items) as Item[];

  const filteredItems = useMemo(() => {
    let result = displayItems;
    if (filterSpaceId) {
      result = result.filter((item) => item.spaceId === filterSpaceId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q) ||
        item.partNumber?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }
    result = [...result].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortBy) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'category': return dir * a.category.localeCompare(b.category);
        case 'quantity': return dir * ((a.quantity ?? 0) - (b.quantity ?? 0));
        case 'expiry': {
          const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          return dir * (aExp - bExp);
        }
        default: return 0;
      }
    });
    return result;
  }, [displayItems, filterSpaceId, searchQuery, selectedCategory, sortBy, sortAsc]);

  const totalItems = displayItems.length;
  const lowStock = displayItems.filter((i) => i.reorderThreshold && i.quantity <= i.reorderThreshold).length;
  const expiringSoon = displayItems.filter((i) => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() + 6);
    return exp <= cutoff && exp >= new Date();
  }).length;


  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
  };

  const openAddItem = () => {
    if (!currentVessel) return;
    setEditingItemId(null);
    setItemDraft(createBlankItem(currentVessel.id, spaces[0]?.id ?? 'unassigned'));
    setItemDialogOpen(true);
  };

  const openEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setItemDraft(item);
    setItemDialogOpen(true);
  };

  const saveItem = () => {
    if (!itemDraft) return;
    const now = new Date().toISOString();
    const nextItem: Item = {
      ...itemDraft,
      name: itemDraft.name.trim() || 'Untitled Item',
      unit: itemDraft.unit.trim() || 'each',
      description: itemDraft.description?.trim() || undefined,
      updatedAt: now,
    };

    if (editingItemId) updateItem(editingItemId, nextItem);
    else addItem(nextItem);

    setItemDialogOpen(false);
    setEditingItemId(null);
    setItemDraft(null);
  };

  const isLowStock = (item: typeof displayItems[0]) => !!(item.reorderThreshold && item.quantity <= item.reorderThreshold);
  const isExpired = (item: typeof displayItems[0]) => !!(item.expiryDate && new Date(item.expiryDate) < new Date());
  const isExpiringSoon = (item: typeof displayItems[0]) => {
    if (!item.expiryDate) return false;
    const exp = new Date(item.expiryDate);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() + 6);
    return exp <= cutoff && exp >= new Date();
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)] flex-col gap-2">
      {/* Compact toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Inventory
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{totalItems} items</span>
            {lowStock > 0 && <span className="text-amber-500 font-medium">{lowStock} low</span>}
            {expiringSoon > 0 && <span className="text-orange-500 font-medium">{expiringSoon} expiring</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={selectedCategory ?? 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(categoryConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {spaces.filter((s) => s.vesselId === currentVessel?.id).length > 0 && (
            <Select
              value={filterSpaceId ?? 'all'}
              onValueChange={(v) => {
                setFilterSpaceId(v === 'all' ? null : v);
                if (v === 'all') closeModal();
              }}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All spaces" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All spaces</SelectItem>
                {spaces.filter((s) => s.vesselId === currentVessel?.id).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" className="h-8" onClick={openAddItem} disabled={!currentVessel}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
          <AIAssistButton prompt="What am I missing for a coastal passage?" label="Ask AI" />
        </div>
      </div>

      {usingDemoItems && (
        <DataSourceNotice title="Demo inventory">Sample records — not saved for a vessel.</DataSourceNotice>
      )}

      {!currentVessel && !demoModeEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Create a vessel first</h2>
            <p className="mt-1 text-sm text-muted-foreground">Inventory is saved against the active vessel.</p>
            <Button className="mt-4" onClick={() => setActiveView('vessel')}>Go to Vessel</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto rounded-lg border bg-card">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
              <tr>
                {(['category', 'name', 'quantity', 'expiry'] as const).map((field) => (
                  <th key={field} className={cn('px-3 py-2 font-medium', field === 'quantity' ? 'text-right' : 'text-left', field === 'expiry' && 'hidden lg:table-cell')}>
                    <button onClick={() => toggleSort(field)} className={cn('flex items-center gap-1', field === 'quantity' && 'ml-auto', sortBy === field && 'text-foreground')}>
                      {field.charAt(0).toUpperCase() + field.slice(1)} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Description</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Part #</th>
                <th className="px-3 py-2 text-left font-medium hidden xl:table-cell">Status</th>
                {!usingDemoItems && <th className="px-3 py-2 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {displayItems.length === 0 ? 'No inventory saved yet' : 'No items match'}
                </td></tr>
              ) : filteredItems.map((item) => {
                const config = categoryConfig[item.category];
                const low = isLowStock(item);
                const expired = isExpired(item);
                const expiring = isExpiringSoon(item);
                return (
                  <tr key={item.id} className={cn('hover:bg-muted/50 transition-colors cursor-pointer', low && 'bg-amber-50/50 dark:bg-amber-950/10', expired && 'bg-red-50/50 dark:bg-red-950/10')} onClick={() => !usingDemoItems && openEditItem(item)}>
                    <td className="px-3 py-2.5"><span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', config?.color || 'bg-gray-100 text-gray-800')}>{config?.label || item.category}</span></td>
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{item.quantity} <span className="text-muted-foreground font-normal">{item.unit}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{item.expiryDate?.slice(0, 10) || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px] hidden md:table-cell">{item.description || item.manufacturer || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{item.partNumber || '—'}</td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <div className="flex gap-1">
                        {expired && <Badge variant="destructive" className="text-[10px] px-1.5">EXPIRED</Badge>}
                        {expiring && !expired && <Badge variant="outline" className="text-[10px] px-1.5 border-orange-400 text-orange-600">EXPIRING</Badge>}
                        {low && <Badge variant="outline" className="text-[10px] px-1.5 border-amber-400 text-amber-600">LOW</Badge>}
                      </div>
                    </td>
                    {!usingDemoItems && (
                      <td className="px-3 py-2.5">
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItemId ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              Save an item to the active vessel inventory.
            </DialogDescription>
          </DialogHeader>
          {itemDraft && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={itemDraft.name} onChange={(event) => setItemDraft((draft) => draft ? { ...draft, name: event.target.value } : draft)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={itemDraft.category} onValueChange={(value) => setItemDraft((draft) => draft ? { ...draft, category: value as ItemCategory } : draft)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={itemDraft.description || ''} onChange={(event) => setItemDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemDraft.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      setItemDraft((draft) => draft && Number.isFinite(quantity) ? { ...draft, quantity } : draft);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={itemDraft.unit} onChange={(event) => setItemDraft((draft) => draft ? { ...draft, unit: event.target.value } : draft)} />
                </div>
                <div className="space-y-2">
                  <Label>Reorder At</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemDraft.reorderThreshold ?? ''}
                    onChange={(event) => {
                      const value = event.target.value === '' ? undefined : Number(event.target.value);
                      setItemDraft((draft) => draft ? { ...draft, reorderThreshold: Number.isFinite(value) ? value : undefined } : draft);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Space</Label>
                  <Select value={itemDraft.spaceId} onValueChange={(value) => setItemDraft((draft) => draft ? { ...draft, spaceId: value } : draft)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Part Number</Label>
                  <Input value={itemDraft.partNumber || ''} onChange={(event) => setItemDraft((draft) => draft ? { ...draft, partNumber: event.target.value || undefined } : draft)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveItem}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
