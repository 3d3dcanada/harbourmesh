/**
 * HarborMesh - Onboarding Section
 * Step-by-step vessel setup wizard for new users
 */

import React, { useRef, useState } from 'react';
import {
  Ship,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Map,
  Package,
  FileText,
  Wrench,
  Sparkles,
  Camera,
  Plus,
  Check,
  Lightbulb,
  Anchor,
  Compass,
  Info,
  Bot,
  Zap,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useOnboardingStore, useAppStore, useVesselStore } from '@/store';
import { VesselType, SpaceType, ItemCategory, type Item, type OnboardingStep, type Space, type Vessel } from '@/types';
import vesselSpecsData from '@/data/vessel-specs-maritime.json';

const vesselTemplates = vesselSpecsData.vessels.slice(0, 10);

const steps: { id: OnboardingStep; title: string; description: string; icon: React.ElementType }[] = [
  { id: 'welcome', title: 'Welcome', description: 'Introduction to HarborMesh', icon: Anchor },
  { id: 'vessel_details', title: 'Vessel Details', description: 'Basic information about your boat', icon: Ship },
  { id: 'blueprint', title: 'Blueprint', description: 'Create your vessel layout', icon: Map },
  { id: 'spaces', title: 'Spaces', description: 'Define compartments and storage', icon: Map },
  { id: 'inventory', title: 'Inventory', description: 'Add key items and equipment', icon: Package },
  { id: 'documents', title: 'Documents', description: 'Upload important documents', icon: FileText },
  { id: 'systems', title: 'Systems', description: 'Document vessel systems', icon: Wrench },
  { id: 'ai_setup', title: 'AI Setup', description: 'Configure your AI companion', icon: Sparkles },
  { id: 'complete', title: 'Complete', description: 'You\'re ready to go!', icon: CheckCircle2 },
];

const vesselTypes = [
  { value: VesselType.SAILBOAT_CRUISER, label: 'Cruising Sailboat' },
  { value: VesselType.SAILBOAT_DAYSAILOR, label: 'Daysailer' },
  { value: VesselType.MOTORBOAT_CENTER_CONSOLE, label: 'Center Console' },
  { value: VesselType.MOTORBOAT_CRUISER, label: 'Motor Cruiser' },
  { value: VesselType.CATAMARAN_SAILING, label: 'Sailing Catamaran' },
  { value: VesselType.CATAMARAN_POWER, label: 'Power Catamaran' },
  { value: VesselType.TRAWLER, label: 'Trawler' },
  { value: VesselType.YACHT_FLYBRIDGE, label: 'Flybridge Yacht' },
  { value: VesselType.KAYAK, label: 'Kayak' },
  { value: VesselType.CANOE, label: 'Canoe' },
];

// AI suggestions for spaces
const spaceSuggestions = [
  { type: SpaceType.COCKPIT, name: 'Cockpit', description: 'Main steering and control area' },
  { type: SpaceType.SALON, name: 'Main Salon', description: 'Primary living area' },
  { type: SpaceType.GALLEY, name: 'Galley', description: 'Kitchen and food preparation' },
  { type: SpaceType.CABIN, name: 'Forward Cabin', description: 'Sleeping quarters' },
  { type: SpaceType.HEAD, name: 'Head', description: 'Bathroom' },
  { type: SpaceType.ENGINE_ROOM, name: 'Engine Room', description: 'Engine and mechanical systems' },
  { type: SpaceType.LOCKER, name: 'Storage Lockers', description: 'Various storage compartments' },
  { type: SpaceType.ANCHOR_LOCKER, name: 'Anchor Locker', description: 'Anchor and windlass storage' },
];

// AI suggestions for inventory
const inventorySuggestions = [
  { category: ItemCategory.SAFETY, name: 'Fire Extinguisher', description: 'Required safety equipment' },
  { category: ItemCategory.SAFETY, name: 'Life Jackets', description: 'PFDs for all crew' },
  { category: ItemCategory.SAFETY, name: 'First Aid Kit', description: 'Medical supplies' },
  { category: ItemCategory.NAVIGATION, name: 'Charts/Electronic Charts', description: 'Navigation materials' },
  { category: ItemCategory.ANCHORING, name: 'Anchor & Rode', description: 'Primary anchor system' },
  { category: ItemCategory.LINES, name: 'Dock Lines', description: 'Mooring lines' },
  { category: ItemCategory.FENDERS, name: 'Fenders', description: 'Hull protection' },
  { category: ItemCategory.TOOLS, name: 'Basic Tool Kit', description: 'Essential tools' },
];

export function Onboarding() {
  const { 
    vesselData, 
    spaces, 
    items, 
    nextStep, 
    prevStep, 
    updateVesselData,
    addSpace,
    addItem,
    completeOnboarding,
  } = useOnboardingStore();
  
  const { setActiveView, setCurrentVessel: setCurrentVesselId } = useAppStore();
  const {
    addVessel: saveVessel,
    setCurrentVessel,
    addSpace: saveSpace,
    addItem: saveItem,
  } = useVesselStore();
  const [activeStep, setActiveStep] = useState(0);
  const [setupMode, setSetupMode] = useState<'choose' | 'ai' | 'template' | 'manual'>('choose');
  const [aiDescription, setAiDescription] = useState('');
  const [customSpaceName, setCustomSpaceName] = useState('');
  const [customSpaceType, setCustomSpaceType] = useState(SpaceType.LOCKER);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState(ItemCategory.SAFETY);
  const blueprintInputRef = useRef<HTMLInputElement>(null);

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateVesselData({ deckPlan: { ...vesselData.deckPlan, hullPoints: vesselData.deckPlan?.hullPoints ?? [], blueprintImageUrl: reader.result as string } });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddCustomSpace = () => {
    if (!customSpaceName.trim()) return;
    addSpace({ name: customSpaceName.trim(), type: customSpaceType, vesselId: vesselData.id ?? 'onboarding-vessel' });
    setCustomSpaceName('');
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    addItem({ name: customItemName.trim(), category: customItemCategory, vesselId: vesselData.id ?? 'onboarding-vessel', spaceId: '', quantity: 1, unit: 'each' });
    setCustomItemName('');
  };

  // Calculate progress
  const progress = ((activeStep) / (steps.length - 1)) * 100;
  
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
      nextStep();
    }
  };
  
  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      prevStep();
    }
  };
  
  const handleComplete = () => {
    const now = new Date().toISOString();
    const vesselId = vesselData.id ?? crypto.randomUUID();
    const vessel: Vessel = {
      id: vesselId,
      ownerId: vesselData.ownerId ?? 'local-owner',
      name: vesselData.name?.trim() || 'Untitled Vessel',
      type: vesselData.type ?? VesselType.MOTORBOAT_CENTER_CONSOLE,
      lengthOverall: vesselData.lengthOverall ?? 0,
      lengthWaterline: vesselData.lengthWaterline ?? vesselData.lengthOverall ?? 0,
      beam: vesselData.beam ?? 0,
      draft: vesselData.draft ?? 0,
      displacement: vesselData.displacement,
      tonnage: vesselData.tonnage,
      mmsi: vesselData.mmsi,
      callSign: vesselData.callSign,
      hin: vesselData.hin,
      registrationNumber: vesselData.registrationNumber,
      flag: vesselData.flag,
      portOfRegistry: vesselData.portOfRegistry,
      engines: vesselData.engines ?? [],
      tanks: vesselData.tanks ?? [],
      operationalProfile: vesselData.operationalProfile ?? {
        primaryUse: 'recreational',
        typicalCrewSize: 1,
        maxPassengers: 1,
        homePort: vesselData.portOfRegistry,
      },
      createdAt: vesselData.createdAt ?? now,
      updatedAt: now,
    };

    saveVessel(vessel);
    setCurrentVessel(vessel);
    setCurrentVesselId(vessel.id);

    for (const space of spaces) {
      saveSpace({
        id: space.id ?? crypto.randomUUID(),
        vesselId,
        name: space.name?.trim() || 'Untitled Space',
        type: space.type ?? SpaceType.LOCKER,
        description: space.description,
        deck: space.deck ?? 0,
        deckName: space.deckName ?? 'Main Deck',
        geometry: space.geometry,
        createdAt: space.createdAt ?? now,
        updatedAt: now,
      } as Space);
    }

    for (const item of items) {
      saveItem({
        id: item.id ?? crypto.randomUUID(),
        vesselId,
        spaceId: item.spaceId || spaces[0]?.id || 'unassigned',
        category: item.category ?? ItemCategory.SAFETY,
        name: item.name?.trim() || 'Untitled Item',
        description: item.description,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'each',
        createdAt: item.createdAt ?? now,
        updatedAt: now,
      } as Item);
    }

    completeOnboarding();
    setActiveView('dashboard');
  };
  
  const renderStepContent = () => {
    const step = steps[activeStep];
    
    switch (step.id) {
      case 'welcome':
        if (setupMode === 'ai') {
          return (
            <div className="space-y-6 py-4 max-w-lg mx-auto">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-3">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-black">Describe Your Boat</h2>
                <p className="text-muted-foreground mt-1">Tell the AI about your vessel and it will set everything up.</p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder='e.g. "1986 Catalina 36 sailboat with Yanmar diesel"'
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Include: year, make, model, type, engine if known</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSetupMode('choose')}>Back</Button>
                <Button className="flex-1" disabled={!aiDescription.trim()} onClick={() => {
                  const name = aiDescription.trim();
                  updateVesselData({ name });
                  setSetupMode('manual');
                  setActiveStep(7);
                  for (let i = 0; i < 7; i++) nextStep();
                }}>
                  <Sparkles className="h-4 w-4 mr-2" /> Set Up With AI
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">You can refine details after setup</p>
            </div>
          );
        }

        if (setupMode === 'template') {
          return (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <h2 className="text-2xl font-black">Pick Your Boat</h2>
                <p className="text-muted-foreground mt-1">Select a template and start using HarborMesh immediately.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {vesselTemplates.map((template) => (
                  <button
                    key={template.model}
                    className="text-left p-4 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                      updateVesselData({
                        name: template.model,
                        type: template.type.replace(/_/g, '_') as VesselType,
                        lengthOverall: template.loa,
                        lengthWaterline: template.lwl,
                        beam: template.beam,
                        draft: template.draft,
                        displacement: template.displacement,
                      });
                      setSetupMode('manual');
                      setActiveStep(7);
                      for (let i = 0; i < 7; i++) nextStep();
                    }}
                  >
                    <p className="font-bold text-sm">{template.model}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.manufacturer} &middot; {template.loa}m &middot; {template.yearRange}
                    </p>
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSetupMode('choose')}>Back</Button>
            </div>
          );
        }

        return (
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-cyan-600 shadow-lg shadow-primary/20">
              <Anchor className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black">Welcome to HarborMesh</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                How would you like to set up your vessel?
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setSetupMode('ai')}
                className="p-5 rounded-xl border-2 transition-all hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-left"
              >
                <Bot className="h-8 w-8 mb-3 text-purple-500" />
                <p className="font-bold">AI Setup</p>
                <p className="text-sm text-muted-foreground mt-1">Describe your boat, AI does the rest</p>
                <Badge className="mt-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Fastest</Badge>
              </button>
              <button
                onClick={() => setSetupMode('template')}
                className="p-5 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 text-left"
              >
                <Zap className="h-8 w-8 mb-3 text-primary" />
                <p className="font-bold">Pick a Template</p>
                <p className="text-sm text-muted-foreground mt-1">Choose your boat type with pre-filled specs</p>
                <Badge variant="secondary" className="mt-2">Recommended</Badge>
              </button>
              <button
                onClick={() => { setSetupMode('manual'); handleNext(); }}
                className="p-5 rounded-xl border-2 transition-all hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-left"
              >
                <Settings2 className="h-8 w-8 mb-3 text-amber-500" />
                <p className="font-bold">Manual Setup</p>
                <p className="text-sm text-muted-foreground mt-1">Full step-by-step wizard, enter everything yourself</p>
                <Badge variant="outline" className="mt-2">Detailed</Badge>
              </button>
            </div>
          </div>
        );
        
      case 'vessel_details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Tell us about your vessel</h3>
              <p className="text-muted-foreground">Select a template or enter details manually</p>
            </div>

            {/* Vessel Template Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Popular Maritime Vessels</p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                {vesselTemplates.map((template) => (
                  <button
                    key={template.model}
                    type="button"
                    className={cn(
                      'text-left p-3 rounded-lg border transition-colors hover:bg-muted/50',
                      vesselData.name === template.model && 'border-primary bg-primary/5'
                    )}
                    onClick={() => updateVesselData({
                      name: template.model,
                      type: template.type.replace(/_/g, '_') as VesselType,
                      lengthOverall: template.loa,
                      lengthWaterline: template.lwl,
                      beam: template.beam,
                      draft: template.draft,
                      displacement: template.displacement,
                    })}
                  >
                    <p className="font-medium text-sm">{template.model}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {template.manufacturer} &middot; {template.loa}m &middot; {template.yearRange}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vessel Name</Label>
                <Input 
                  placeholder="e.g., Bay of Fundy Runner"
                  value={vesselData.name || ''}
                  onChange={(e) => updateVesselData({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vessel Type</Label>
                <Select 
                  value={vesselData.type}
                  onValueChange={(v) => updateVesselData({ type: v as VesselType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vesselTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Length Overall (m)</Label>
                <Input 
                  type="number"
                  placeholder="12.5"
                  value={vesselData.lengthOverall || ''}
                  onChange={(e) => updateVesselData({ lengthOverall: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Beam (m)</Label>
                <Input 
                  type="number"
                  placeholder="4.2"
                  value={vesselData.beam || ''}
                  onChange={(e) => updateVesselData({ beam: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Draft (m)</Label>
                <Input 
                  type="number"
                  placeholder="2.1"
                  value={vesselData.draft || ''}
                  onChange={(e) => updateVesselData({ draft: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Home Port</Label>
              <Input 
                placeholder="e.g., Saint John, NB"
                value={vesselData.portOfRegistry || ''}
                onChange={(e) => updateVesselData({ portOfRegistry: e.target.value })}
              />
            </div>
          </div>
        );
        
      case 'blueprint':
        return (
          <div className="space-y-6">
            <input ref={blueprintInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleBlueprintUpload} />
            <div>
              <h3 className="text-lg font-medium">Create your vessel blueprint</h3>
              <p className="text-muted-foreground">Map out the layout of your boat</p>
            </div>

            {vesselData.deckPlan?.blueprintImageUrl ? (
              <div className="relative group">
                <img src={vesselData.deckPlan.blueprintImageUrl} alt="Deck plan" className="w-full max-h-64 object-contain rounded-lg border" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button size="sm" variant="secondary" onClick={() => blueprintInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => blueprintInputRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed bg-muted flex items-center justify-center hover:border-primary hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Click to upload deck plan image</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, or PDF</p>
                </div>
              </button>
            )}

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Tip</p>
                <p className="text-sm">
                  You can skip this step and create your blueprint later in the Boat Map section.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'spaces':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Define your spaces</h3>
              <p className="text-muted-foreground">Add compartments, lockers, and areas on your vessel</p>
            </div>
            
            {/* AI Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">AI Suggestions</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {spaceSuggestions.slice(0, 4).map((space, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => addSpace({ ...space, vesselId: vesselData.id ?? 'onboarding-vessel' })}
                  >
                    <div>
                      <p className="font-medium text-sm">{space.name}</p>
                      <p className="text-xs text-muted-foreground">{space.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Added Spaces */}
            {spaces.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Added Spaces ({spaces.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {spaces.map((space, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {space.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Input placeholder="Space name" value={customSpaceName} onChange={(e) => setCustomSpaceName(e.target.value)} className="flex-1" />
              <Select value={customSpaceType} onValueChange={(v) => setCustomSpaceType(v as SpaceType)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(SpaceType).map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleAddCustomSpace} disabled={!customSpaceName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Add key inventory items</h3>
              <p className="text-muted-foreground">Track safety equipment, spares, and supplies</p>
            </div>
            
            {/* AI Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Recommended Items</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {inventorySuggestions.slice(0, 4).map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => addItem({ 
                      ...item, 
                      vesselId: vesselData.id ?? 'onboarding-vessel',
                      spaceId: '',
                      quantity: 1,
                      unit: 'each',
                    })}
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Added Items */}
            {items.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Added Items ({items.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Input placeholder="Item name" value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} className="flex-1" />
              <Select value={customItemCategory} onValueChange={(v) => setCustomItemCategory(v as ItemCategory)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ItemCategory).map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleAddCustomItem} disabled={!customItemName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Documents</h3>
              <p className="text-muted-foreground">You can upload documents after setup from the Documents section</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Registration', desc: 'Vessel documentation', color: 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' },
                { label: 'Insurance', desc: 'Policy documents', color: 'bg-green-50 text-green-500 dark:bg-green-950/30' },
                { label: 'Manuals', desc: 'Engine, systems, equipment', color: 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' },
                { label: 'Certificates', desc: 'Safety, compliance', color: 'bg-purple-50 text-purple-500 dark:bg-purple-950/30' },
              ].map((doc) => (
                <div key={doc.label} className="p-3 rounded-lg border flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${doc.color}`}><FileText className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-sm">{doc.label}</p>
                    <p className="text-xs text-muted-foreground">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Skip this for now. Upload registrations, insurance, manuals, and certificates from the Documents section anytime. All documents are stored locally on your device.
              </p>
            </div>
          </div>
        );
        
      case 'systems':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Vessel Systems</h3>
              <p className="text-muted-foreground">Configure engines and tanks from the Vessel section after setup</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Engine', desc: 'Propulsion system', color: 'bg-red-50 text-red-500 dark:bg-red-950/30' },
                { label: 'Electrical', desc: 'Batteries, panels, wiring', color: 'bg-yellow-50 text-yellow-500 dark:bg-yellow-950/30' },
                { label: 'Plumbing', desc: 'Water, waste systems', color: 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' },
                { label: 'Navigation', desc: 'GPS, charts, instruments', color: 'bg-green-50 text-green-500 dark:bg-green-950/30' },
              ].map((sys) => (
                <div key={sys.label} className="p-3 rounded-lg border flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sys.color}`}><Wrench className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-sm">{sys.label}</p>
                    <p className="text-xs text-muted-foreground">{sys.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Skip this for now. Add engines, tanks, and system details from the Vessel &gt; Systems tab after setup is complete.
              </p>
            </div>
          </div>
        );
        
      case 'ai_setup':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Set up your AI companion</h3>
              <p className="text-muted-foreground">Configure how the AI assistant works for you</p>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/30">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Local AI (Default)</p>
                        <p className="text-xs text-muted-foreground">Runs on your Boat Node - fully private</p>
                      </div>
                    </div>
                    <Badge>Selected</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Configure AI providers and preferences in the AI Companion section after setup. Supports local models (Ollama, LM Studio) and cloud AI (NVIDIA).
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your vessel is now configured in HarborMesh. You can always add more details later.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="p-4 rounded-lg bg-muted text-left">
                <Ship className="h-6 w-6 mb-2 text-primary" />
                <p className="font-medium">{vesselData.name || 'Your Vessel'}</p>
                <p className="text-sm text-muted-foreground">
                  {vesselData.lengthOverall}m {vesselData.type?.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-left">
                <Map className="h-6 w-6 mb-2 text-primary" />
                <p className="font-medium">{spaces.length} Spaces</p>
                <p className="text-sm text-muted-foreground">
                  {items.length} items tracked
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setActiveView('vessel')}>
                View Vessel
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {activeStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Step Indicators */}
      <div className="flex justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          
          return (
            <div 
              key={step.id}
              className={cn(
                'flex flex-col items-center min-w-[80px] cursor-pointer transition-opacity',
                !isActive && !isCompleted && 'opacity-50'
              )}
              onClick={() => index <= activeStep && setActiveStep(index)}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors',
                isActive ? 'bg-primary text-primary-foreground' :
                isCompleted ? 'bg-emerald-500 text-white' :
                'bg-muted text-muted-foreground'
              )}>
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className="text-xs font-medium text-center">{step.title}</span>
            </div>
          );
        })}
      </div>
      
      {/* Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {React.createElement(steps[activeStep].icon, { className: 'h-6 w-6 text-primary' })}
            <div>
              <CardTitle>{steps[activeStep].title}</CardTitle>
              <CardDescription>{steps[activeStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Button onClick={activeStep === steps.length - 1 ? handleComplete : handleNext}>
          {activeStep === steps.length - 1 ? (
            <>
              Get Started
              <Compass className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
