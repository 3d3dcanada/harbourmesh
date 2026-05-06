/**
 * HarborMesh - Inventory Section
 * Manage vessel items, spare parts, safety equipment, and supplies
 */
import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, AlertTriangle, ArrowUpDown, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useVesselStore } from '@/store';
import { ItemCategory } from '@/types';

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

export function Inventory() {
  const { items } = useVesselStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'quantity' | 'expiry'>('category');
  const [sortAsc, setSortAsc] = useState(true);

  const displayItems = items.length > 0 ? items : mockItems;

  const filteredItems = useMemo(() => {
    let result = displayItems;
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
  }, [displayItems, searchQuery, selectedCategory, sortBy, sortAsc]);

  const totalItems = displayItems.length;
  const lowStock = displayItems.filter((i) => i.reorderThreshold && i.quantity <= i.reorderThreshold).length;
  const expiringSoon = displayItems.filter((i) => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() + 6);
    return exp <= cutoff && exp >= new Date();
  }).length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    displayItems.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [displayItems]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Inventory
          </h1>
          <p className="text-muted-foreground mt-1">Track everything on your vessel — parts, supplies, safety gear</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{totalItems}</p></div><Package className="h-8 w-8 text-muted-foreground/30" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-2xl font-bold text-amber-500">{lowStock}</p></div><AlertTriangle className="h-8 w-8 text-amber-500/30" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Expiring Soon</p><p className="text-2xl font-bold text-orange-500">{expiringSoon}</p></div><Clock className="h-8 w-8 text-orange-500/30" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Categories</p><p className="text-2xl font-bold">{categoryCounts.length}</p></div><BarChart3 className="h-8 w-8 text-muted-foreground/30" /></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items by name, part number, tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
          {categoryCounts.slice(0, 6).map(([cat]) => {
            const config = categoryConfig[cat];
            return (
              <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} className="text-xs">
                {config?.label || cat} ({categoryCounts.find(([c]) => c === cat)?.[1] ?? 0})
              </Button>
            );
          })}
          {categoryCounts.length > 6 && <Button variant="outline" size="sm" className="text-xs">+{categoryCounts.length - 6} more</Button>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Items ({filteredItems.length})</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(['category', 'name', 'quantity', 'expiry'] as const).map((field) => (
                <React.Fragment key={field}>
                  {field !== 'category' && <span>•</span>}
                  <button onClick={() => toggleSort(field)} className={cn('flex items-center gap-1 hover:text-foreground transition-colors', sortBy === field && 'text-foreground font-medium')}>
                    {field.charAt(0).toUpperCase() + field.slice(1)} <ArrowUpDown className="h-3 w-3" />
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-440px)] min-h-[400px]">
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No items found</p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const config = categoryConfig[item.category];
                  const low = isLowStock(item);
                  const expired = isExpired(item);
                  const expiring = isExpiringSoon(item);
                  return (
                    <div key={item.id} className={cn('flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors', low && 'border-amber-200 dark:border-amber-900/50', expired && 'border-red-200 dark:border-red-900/50')}>
                      <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', config?.color || 'bg-gray-100 text-gray-800')}>
                        {config?.label || item.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {expired && <Badge variant="destructive" className="text-[10px] px-1.5">EXPIRED</Badge>}
                          {expiring && !expired && <Badge variant="outline" className="text-[10px] px-1.5 border-orange-400 text-orange-600">EXPIRING</Badge>}
                          {low && <Badge variant="outline" className="text-[10px] px-1.5 border-amber-400 text-amber-600">LOW</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.description || item.manufacturer || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-sm">{item.quantity} {item.unit}</p>
                        {item.partNumber && <p className="text-xs text-muted-foreground">{item.partNumber}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}