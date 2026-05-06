/**
 * HarborMesh - Onboarding Section
 * Step-by-step vessel setup wizard for new users
 */

import React, { useState } from 'react';
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
import { useOnboardingStore, useAppStore } from '@/store';
import { VesselType, SpaceType, ItemCategory, type OnboardingStep } from '@/types';

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
  
  const { setActiveView } = useAppStore();
  const [activeStep, setActiveStep] = useState(0);
  
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
    completeOnboarding();
    setActiveView('dashboard');
  };
  
  const renderStepContent = () => {
    const step = steps[activeStep];
    
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
              <Anchor className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Welcome to HarborMesh</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your complete AI-powered vessel management system. Let's get your boat set up in just a few minutes.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-lg bg-muted">
                <Ship className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Digital Twin</p>
                <p className="text-sm text-muted-foreground">Complete vessel profile</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Smart Inventory</p>
                <p className="text-sm text-muted-foreground">Track everything onboard</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">AI Assistant</p>
                <p className="text-sm text-muted-foreground">24/7 vessel companion</p>
              </div>
            </div>
          </div>
        );
        
      case 'vessel_details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Tell us about your vessel</h3>
              <p className="text-muted-foreground">Basic information to create your digital twin</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vessel Name</Label>
                <Input 
                  placeholder="e.g., Sea Venture"
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
                placeholder="e.g., San Francisco, CA"
                value={vesselData.portOfRegistry || ''}
                onChange={(e) => updateVesselData({ portOfRegistry: e.target.value })}
              />
            </div>
          </div>
        );
        
      case 'blueprint':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Create your vessel blueprint</h3>
              <p className="text-muted-foreground">Map out the layout of your boat</p>
            </div>
            
            <div className="aspect-video rounded-lg border-2 border-dashed bg-muted flex items-center justify-center">
              <div className="text-center">
                <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Upload deck plan or draw layout</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Supported: PDF, Image, or CAD files
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline">
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Tip</p>
                <p className="text-sm">
                  You can skip this step and create your blueprint later in the Boat Map section. 
                  A simple layout helps track where items are stored.
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
                    onClick={() => addSpace({ ...space, vesselId: 'demo-vessel' })}
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
            
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Space
            </Button>
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
                      vesselId: 'demo-vessel',
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
            
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </Button>
          </div>
        );
        
      case 'documents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Upload important documents</h3>
              <p className="text-muted-foreground">Store manuals, registrations, and certificates securely</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Registration</p>
                    <p className="text-xs text-muted-foreground">Vessel documentation</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 text-green-500 dark:bg-green-950/30">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Insurance</p>
                    <p className="text-xs text-muted-foreground">Policy documents</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/30">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Manuals</p>
                    <p className="text-xs text-muted-foreground">Engine, systems, equipment</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/30">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Certificates</p>
                    <p className="text-xs text-muted-foreground">Safety, compliance</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Privacy Note</p>
                <p className="text-sm">
                  All documents are encrypted and stored locally. Sensitive documents like passports 
                  are never used for AI training.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'systems':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Document your systems</h3>
              <p className="text-muted-foreground">Track engines, electrical, plumbing, and more</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Engine</p>
                      <p className="text-xs text-muted-foreground">Propulsion system</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-50 text-yellow-500 dark:bg-yellow-950/30">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Electrical</p>
                      <p className="text-xs text-muted-foreground">Batteries, panels, wiring</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Plumbing</p>
                      <p className="text-xs text-muted-foreground">Water, waste systems</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 text-green-500 dark:bg-green-950/30">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Navigation</p>
                      <p className="text-xs text-muted-foreground">GPS, charts, instruments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add System
            </Button>
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
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-summarize logs</p>
                    <p className="text-sm text-muted-foreground">AI will summarize your voyage logs</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Suggest maintenance</p>
                    <p className="text-sm text-muted-foreground">Get proactive maintenance reminders</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Voice input</p>
                    <p className="text-sm text-muted-foreground">Use voice commands with the AI</p>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
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
              <Button onClick={handleComplete}>
                Go to Dashboard
                <Compass className="h-4 w-4 ml-2" />
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
        
        <Button onClick={handleNext}>
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
