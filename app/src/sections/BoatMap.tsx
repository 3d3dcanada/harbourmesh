/**
 * HarborMesh - Boat Map Section
 * Interactive vessel layout and space management
 */

import React, { useState, useRef } from 'react';
import {
  Map,
  Plus,
  Search,
  Filter,
  Grid3X3,
  Layers,
  Maximize2,
  Minimize2,
  Edit3,
  Save,
  X,
  Package,
  QrCode,
  MoreHorizontal,
  ChevronRight,
  Box,
  Anchor,
  Droplets,
  Zap,
  Wind,
  Settings,
  Bed,
  Utensils,
  Wrench,
  LifeBuoy,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVesselStore } from '@/store';
import { SpaceType, ItemCategory, type Space, type Item } from '@/types';

// Space type icons
const spaceTypeIcons: Record<string, React.ElementType> = {
  [SpaceType.COCKPIT]: Map,
  [SpaceType.CABIN]: Bed,
  [SpaceType.LOCKER]: Box,
  [SpaceType.COMPARTMENT]: Grid3X3,
  [SpaceType.BILGE]: Droplets,
  [SpaceType.GALLEY]: Utensils,
  [SpaceType.HEAD]: Droplets,
  [SpaceType.BERTH]: Bed,
  [SpaceType.SALON]: Map,
  [SpaceType.ENGINE_ROOM]: Zap,
  [SpaceType.LAZARETTE]: Box,
  [SpaceType.ANCHOR_LOCKER]: Anchor,
  [SpaceType.DECK_STORAGE]: Box,
  [SpaceType.FLYBRIDGE]: Map,
  [SpaceType.TENDER_GARAGE]: Box,
  [SpaceType.FUEL_TANK]: Droplets,
  [SpaceType.WATER_TANK]: Droplets,
  [SpaceType.HOLD]: Box,
  [SpaceType.CUSTOM]: Settings,
};

// Item category icons
const itemCategoryIcons: Record<string, React.ElementType> = {
  [ItemCategory.FASTENERS]: Wrench,
  [ItemCategory.SPARES]: Box,
  [ItemCategory.TOOLS]: Wrench,
  [ItemCategory.GALLEY]: Utensils,
  [ItemCategory.SAFETY]: LifeBuoy,
  [ItemCategory.ELECTRONICS]: Zap,
  [ItemCategory.ELECTRICAL]: Zap,
  [ItemCategory.PLUMBING]: Droplets,
  [ItemCategory.RIGGING]: Wind,
  [ItemCategory.ENGINE]: Zap,
  [ItemCategory.NAVIGATION]: Map,
  [ItemCategory.COMMUNICATION]: Zap,
  [ItemCategory.CLEANING]: Droplets,
  [ItemCategory.LINES]: Wind,
  [ItemCategory.FENDERS]: Box,
  [ItemCategory.ANCHORING]: Anchor,
  [ItemCategory.CANVAS]: Box,
  [ItemCategory.DOCUMENTS]: Map,
  [ItemCategory.MEDICAL]: LifeBuoy,
  [ItemCategory.FISHING]: Anchor,
  [ItemCategory.DIVING]: Droplets,
  [ItemCategory.TENDER]: Box,
  [ItemCategory.CUSTOM]: Settings,
};

// Demo spaces
const demoSpaces: Space[] = [
  {
    id: 'space-001',
    vesselId: 'demo-vessel',
    name: 'Cockpit',
    type: SpaceType.COCKPIT,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Main steering and control area',
    geometry: { x: 50, y: 10, width: 40, height: 20 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-002',
    vesselId: 'demo-vessel',
    name: 'Main Salon',
    type: SpaceType.SALON,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Primary living area',
    geometry: { x: 10, y: 30, width: 80, height: 30 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-003',
    vesselId: 'demo-vessel',
    name: 'Galley',
    type: SpaceType.GALLEY,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Kitchen and food preparation',
    geometry: { x: 10, y: 60, width: 30, height: 20 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-004',
    vesselId: 'demo-vessel',
    name: 'Forward Cabin',
    type: SpaceType.CABIN,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Master berth and storage',
    geometry: { x: 50, y: 60, width: 40, height: 25 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-005',
    vesselId: 'demo-vessel',
    name: 'Engine Room',
    type: SpaceType.ENGINE_ROOM,
    deck: -1,
    deckName: 'Lower Deck',
    description: 'Engine and mechanical systems',
    geometry: { x: 10, y: 10, width: 35, height: 25 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-006',
    vesselId: 'demo-vessel',
    name: 'Port Locker',
    type: SpaceType.LOCKER,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Storage locker port side',
    geometry: { x: 5, y: 10, width: 15, height: 15 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-007',
    vesselId: 'demo-vessel',
    name: 'Anchor Locker',
    type: SpaceType.ANCHOR_LOCKER,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Anchor and windlass storage',
    geometry: { x: 70, y: 85, width: 20, height: 10 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'space-008',
    vesselId: 'demo-vessel',
    name: 'Lazarette',
    type: SpaceType.LAZARETTE,
    deck: 0,
    deckName: 'Main Deck',
    description: 'Aft storage compartment',
    geometry: { x: 5, y: 85, width: 25, height: 10 },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

// Demo items
const demoItems: Item[] = [
  {
    id: 'item-001',
    vesselId: 'demo-vessel',
    spaceId: 'space-006',
    category: ItemCategory.SAFETY,
    name: 'Fire Extinguisher',
    description: 'ABC dry chemical extinguisher',
    quantity: 2,
    unit: 'each',
    partNumber: 'FE-ABC-5LB',
    manufacturer: 'Kidde',
    reorderThreshold: 1,
    expiryDate: '2026-05-15',
    tags: ['safety', 'required', 'inspection'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'item-002',
    vesselId: 'demo-vessel',
    spaceId: 'space-006',
    category: ItemCategory.FASTENERS,
    name: 'Stainless Steel Screws',
    description: '#10 x 1" Phillips head',
    quantity: 50,
    unit: 'pieces',
    reorderThreshold: 10,
    tags: ['hardware', 'stainless'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'item-003',
    vesselId: 'demo-vessel',
    spaceId: 'space-003',
    category: ItemCategory.GALLEY,
    name: 'Coffee Filters',
    description: '#4 cone filters',
    quantity: 100,
    unit: 'each',
    reorderThreshold: 20,
    tags: ['consumable', 'galley'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'item-004',
    vesselId: 'demo-vessel',
    spaceId: 'space-008',
    category: ItemCategory.LINES,
    name: 'Dock Lines',
    description: '3/4" x 25\' nylon double-braid',
    quantity: 4,
    unit: 'each',
    partNumber: 'DL-34-25',
    reorderThreshold: 2,
    tags: ['docking', 'lines'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 'item-005',
    vesselId: 'demo-vessel',
    spaceId: 'space-005',
    category: ItemCategory.SPARES,
    name: 'Fuel Filter',
    description: 'Primary fuel filter element',
    quantity: 2,
    unit: 'each',
    partNumber: 'FF-1234',
    manufacturer: 'Racor',
    reorderThreshold: 1,
    tags: ['engine', 'maintenance', 'spare'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

export function BoatMap() {
  const { spaces, items, setSpaces, setItems } = useVesselStore();
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [activeDeck, setActiveDeck] = useState<number>(0);
  const [zoom, setZoom] = useState(1);
  
  // Initialize with demo data
  React.useEffect(() => {
    if (spaces.length === 0) setSpaces(demoSpaces);
    if (items.length === 0) setItems(demoItems);
  }, [spaces.length, items.length, setSpaces, setItems]);
  
  const currentSpaces = spaces.length > 0 ? spaces : demoSpaces;
  const currentItems = items.length > 0 ? items : demoItems;
  
  // Filter spaces by deck
  const deckSpaces = currentSpaces.filter((s) => s.deck === activeDeck);
  
  // Filter items
  const filteredItems = currentItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Get items for selected space
  const spaceItems = selectedSpace 
    ? currentItems.filter((i) => i.spaceId === selectedSpace.id)
    : [];
  
  // Get unique decks
  const decks = Array.from(new Set(currentSpaces.map((s) => s.deck))).sort();
  
  // Get space name for item
  const getSpaceName = (spaceId: string) => {
    const space = currentSpaces.find((s) => s.id === spaceId);
    return space?.name || 'Unknown';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Boat Map & Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Visual layout and item tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddSpace(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Space
          </Button>
          <Button size="sm" onClick={() => setShowAddItem(true)}>
            <Package className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Deck Plan */}
        <div className="lg:col-span-2 space-y-4">
          {/* Deck Selector */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Deck:</span>
            <div className="flex gap-1">
              {decks.map((deck) => (
                <Button
                  key={deck}
                  variant={activeDeck === deck ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDeck(deck)}
                >
                  {deck === 0 ? 'Main' : deck > 0 ? `+${deck}` : `${deck}`}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Deck Plan Canvas */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-slate-100 dark:bg-slate-900 overflow-auto" style={{ minHeight: '400px' }}>
                <div 
                  className="relative"
                  style={{ 
                    width: '100%', 
                    height: '500px',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {/* Grid background */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, currentColor 1px, transparent 1px),
                        linear-gradient(to bottom, currentColor 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px',
                    }}
                  />
                  
                  {/* Spaces */}
                  {deckSpaces.map((space) => {
                    const Icon = spaceTypeIcons[space.type] || Box;
                    const isSelected = selectedSpace?.id === space.id;
                    const spaceItemCount = currentItems.filter((i) => i.spaceId === space.id).length;
                    
                    return (
                      <div
                        key={space.id}
                        className={cn(
                          'absolute border-2 rounded-lg cursor-pointer transition-all',
                          'hover:shadow-lg hover:scale-[1.02]',
                          isSelected 
                            ? 'border-primary bg-primary/10 shadow-lg' 
                            : 'border-slate-300 dark:border-slate-700 bg-card/80 hover:bg-card'
                        )}
                        style={{
                          left: `${space.geometry?.x || 0}%`,
                          top: `${space.geometry?.y || 0}%`,
                          width: `${space.geometry?.width || 20}%`,
                          height: `${space.geometry?.height || 15}%`,
                        }}
                        onClick={() => setSelectedSpace(space)}
                      >
                        <div className="p-2 h-full flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium truncate">{space.name}</span>
                          </div>
                          {spaceItemCount > 0 && (
                            <div className="mt-auto flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{spaceItemCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(SpaceType).slice(0, 8).map(([key, value]) => {
              const Icon = spaceTypeIcons[value] || Box;
              return (
                <div key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="capitalize">{value.replace(/_/g, ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Right Column - Details Panel */}
        <div className="space-y-4">
          {/* Selected Space Details */}
          {selectedSpace ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(spaceTypeIcons[selectedSpace.type] || Box, { className: 'h-5 w-5 text-muted-foreground' })}
                      {selectedSpace.name}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {selectedSpace.type.replace(/_/g, ' ')} • {selectedSpace.deckName}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Space
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <QrCode className="h-4 w-4 mr-2" />
                        Print QR Code
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSpace.description && (
                  <p className="text-sm text-muted-foreground">{selectedSpace.description}</p>
                )}
                
                <Separator />
                
                {/* Items in this space */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Items ({spaceItems.length})
                  </h4>
                  {spaceItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No items in this space</p>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {spaceItems.map((item) => {
                          const Icon = itemCategoryIcons[item.category] || Box;
                          return (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} {item.unit}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item to Space
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="py-8 text-center">
                <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a space on the deck plan to view details</p>
              </CardContent>
            </Card>
          )}
          
          {/* Inventory Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                Find Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Filter</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(ItemCategory).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {filteredItems.slice(0, 10).map((item) => {
                    const Icon = itemCategoryIcons[item.category] || Box;
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer"
                        onClick={() => {
                          const space = currentSpaces.find((s) => s.id === item.spaceId);
                          if (space) setSelectedSpace(space);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              in {getSpaceName(item.spaceId)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.quantity}
                        </Badge>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Add Space Dialog */}
      <Dialog open={showAddSpace} onOpenChange={setShowAddSpace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Space</DialogTitle>
            <DialogDescription>
              Create a new compartment or area on your vessel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g., Port Storage Locker" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select space type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SpaceType).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {value.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSpace(false)}>Cancel</Button>
            <Button onClick={() => setShowAddSpace(false)}>Add Space</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Track an item in your vessel inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Item name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ItemCategory).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Space</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSpaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input placeholder="e.g., pieces, liters" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={() => setShowAddItem(false)}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
