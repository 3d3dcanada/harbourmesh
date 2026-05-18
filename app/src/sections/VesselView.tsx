import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  Ship,
  Ruler,
  Anchor,
  Edit3,
  Save,
  X,
  Plus,
  Droplets,
  Settings2,
  Info,
  Camera,
  Zap,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

const VesselViews = lazy(() => import('@/components/VesselViews'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { BlueprintViewer } from '@/components/BlueprintViewer';
import { cn } from '@/lib/utils';
import { resizeImage } from '@/lib/image-resize';
import { useAppStore, useSettingsStore, useVesselStore, useLogTaskStore } from '@/store';
import { useVoyageTracker } from '@/hooks/useVoyageTracker';
import { Navigation, Clock } from 'lucide-react';
import { VesselType, type Engine, type Tank, type Vessel } from '@/types';

const vesselTypeNames: Record<string, string> = {
  [VesselType.KAYAK]: 'Kayak',
  [VesselType.CANOE]: 'Canoe',
  [VesselType.SUP]: 'Stand-Up Paddleboard',
  [VesselType.SAILBOAT_DINGHY]: 'Dinghy (Sailing)',
  [VesselType.SAILBOAT_DAYSAILOR]: 'Daysailer',
  [VesselType.SAILBOAT_CRUISER]: 'Cruising Sailboat',
  [VesselType.SAILBOAT_RACING]: 'Racing Sailboat',
  [VesselType.MOTORBOAT_CENTER_CONSOLE]: 'Center Console',
  [VesselType.MOTORBOAT_BOWRIDER]: 'Bowrider',
  [VesselType.MOTORBOAT_CRUISER]: 'Motor Cruiser',
  [VesselType.MOTORBOAT_SPORTFISH]: 'Sportfisher',
  [VesselType.TRAWLER]: 'Trawler',
  [VesselType.CATAMARAN_SAILING]: 'Sailing Catamaran',
  [VesselType.CATAMARAN_POWER]: 'Power Catamaran',
  [VesselType.TRIMARAN]: 'Trimaran',
  [VesselType.YACHT_FLYBRIDGE]: 'Flybridge Yacht',
  [VesselType.YACHT_EXPEDITION]: 'Expedition Yacht',
  [VesselType.YACHT_SUPER]: 'Superyacht',
  [VesselType.COMMERCIAL_FERRY]: 'Ferry',
  [VesselType.COMMERCIAL_TOW]: 'Tow Vessel',
  [VesselType.COMMERCIAL_FISHING]: 'Fishing Vessel',
};

const demoVessel: Vessel = {
  id: 'demo-vessel',
  ownerId: 'demo-user',
  name: 'Bay of Fundy Surveyor',
  type: VesselType.SAILBOAT_CRUISER,
  lengthOverall: 12.5,
  lengthWaterline: 10.8,
  beam: 4.2,
  draft: 2.1,
  displacement: 8500,
  tonnage: 15,
  mmsi: '316123456',
  callSign: 'CFA123',
  hin: 'CA3D3DNB0001',
  registrationNumber: 'NB 1234 AB',
  flag: 'CA',
  portOfRegistry: 'Saint John, NB',
  engines: [
    {
      id: 'engine-001',
      vesselId: 'demo-vessel',
      name: 'Main Engine',
      type: 'inboard',
      make: 'Yanmar',
      model: '3YM30',
      serialNumber: 'YM123456',
      power: 21,
      fuelType: 'diesel',
      year: 2018,
      hours: 1250.5,
      installedAt: '2018-03-15',
    },
  ],
  tanks: [
    { id: 'tank-001', vesselId: 'demo-vessel', name: 'Diesel Tank', type: 'diesel', capacity: 120, currentLevel: 85, location: 'Aft compartment' },
    { id: 'tank-002', vesselId: 'demo-vessel', name: 'Water Tank', type: 'water', capacity: 200, currentLevel: 150, location: 'Forward compartment' },
    { id: 'tank-003', vesselId: 'demo-vessel', name: 'Holding Tank', type: 'blackwater', capacity: 60, currentLevel: 20, location: 'Midship' },
  ],
  operationalProfile: {
    primaryUse: 'recreational',
    typicalCrewSize: 2,
    maxPassengers: 6,
    homePort: 'Saint John, NB',
    typicalCruisingRange: 100,
    typicalTripDuration: 48,
  },
  createdAt: '2026-01-01',
  updatedAt: '2026-05-01',
  photoUrl: undefined,
};

function createBlankVessel(): Vessel {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerId: 'local-owner',
    name: '',
    type: VesselType.MOTORBOAT_CENTER_CONSOLE,
    lengthOverall: 0,
    lengthWaterline: 0,
    beam: 0,
    draft: 0,
    engines: [],
    tanks: [],
    operationalProfile: {
      primaryUse: 'recreational',
      typicalCrewSize: 1,
      maxPassengers: 1,
      homePort: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createBlankEngine(vesselId: string): Engine {
  return {
    id: crypto.randomUUID(),
    vesselId,
    name: '',
    type: 'inboard',
    make: '',
    model: '',
    serialNumber: '',
    power: 0,
    fuelType: 'diesel',
    year: new Date().getFullYear(),
    hours: 0,
    installedAt: new Date().toISOString().slice(0, 10),
  };
}

function createBlankTank(vesselId: string): Tank {
  return {
    id: crypto.randomUUID(),
    vesselId,
    name: '',
    type: 'fuel',
    capacity: 0,
    currentLevel: 0,
    location: '',
  };
}

interface EditableFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  unit?: string;
  placeholder?: string;
}

function EditableField({ label, value, onChange, isEditing, type = 'text', options, unit, placeholder }: EditableFieldProps) {
  if (!isEditing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="font-medium">{value || '--'}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8"
          placeholder={placeholder}
        />
        {unit && <span className="text-sm text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

// ---- Add Engine Dialog ----
function AddEngineDialog({
  open,
  onOpenChange,
  onSave,
  vesselId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (engine: Engine) => void;
  vesselId: string;
}) {
  const [engine, setEngine] = useState(() => createBlankEngine(vesselId));

  const update = (field: keyof Engine, value: unknown) => {
    setEngine((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!engine.name.trim()) return;
    onSave({ ...engine, name: engine.name.trim() });
    setEngine(createBlankEngine(vesselId));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Engine</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Engine Name</Label>
            <Input value={engine.name} onChange={(e) => update('name', e.target.value)} placeholder="Main Engine" className="h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={engine.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inboard">Inboard</SelectItem>
                  <SelectItem value="outboard">Outboard</SelectItem>
                  <SelectItem value="sterndrive">Sterndrive</SelectItem>
                  <SelectItem value="jet">Jet</SelectItem>
                  <SelectItem value="saildrive">Saildrive</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fuel Type</Label>
              <Select value={engine.fuelType ?? 'diesel'} onValueChange={(v) => update('fuelType', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Make</Label>
              <Input value={engine.make ?? ''} onChange={(e) => update('make', e.target.value)} placeholder="Yanmar" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Model</Label>
              <Input value={engine.model ?? ''} onChange={(e) => update('model', e.target.value)} placeholder="3YM30" className="h-8" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Power (kW)</Label>
              <Input type="number" value={engine.power ?? ''} onChange={(e) => update('power', parseFloat(e.target.value) || 0)} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Input type="number" value={engine.year ?? ''} onChange={(e) => update('year', parseInt(e.target.value) || 0)} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hours</Label>
              <Input type="number" value={engine.hours} onChange={(e) => update('hours', parseFloat(e.target.value) || 0)} className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Serial Number</Label>
            <Input value={engine.serialNumber ?? ''} onChange={(e) => update('serialNumber', e.target.value)} className="h-8" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!engine.name.trim()}>Add Engine</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Add Tank Dialog ----
function AddTankDialog({
  open,
  onOpenChange,
  onSave,
  vesselId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tank: Tank) => void;
  vesselId: string;
}) {
  const [tank, setTank] = useState(() => createBlankTank(vesselId));

  const update = (field: keyof Tank, value: unknown) => {
    setTank((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!tank.name.trim()) return;
    onSave({ ...tank, name: tank.name.trim() });
    setTank(createBlankTank(vesselId));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tank</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tank Name</Label>
            <Input value={tank.name} onChange={(e) => update('name', e.target.value)} placeholder="Diesel Tank" className="h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={tank.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="water">Fresh Water</SelectItem>
                  <SelectItem value="waste">Waste</SelectItem>
                  <SelectItem value="blackwater">Blackwater</SelectItem>
                  <SelectItem value="greywater">Greywater</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input value={tank.location ?? ''} onChange={(e) => update('location', e.target.value)} placeholder="Aft compartment" className="h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Capacity (L)</Label>
              <Input type="number" value={tank.capacity || ''} onChange={(e) => update('capacity', parseFloat(e.target.value) || 0)} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Current Level (L)</Label>
              <Input type="number" value={tank.currentLevel ?? ''} onChange={(e) => update('currentLevel', parseFloat(e.target.value) || 0)} className="h-8" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!tank.name.trim()}>Add Tank</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VesselView() {
  const { currentVessel, addVessel, updateVessel, setCurrentVessel } = useVesselStore();
  const setCurrentVesselId = useAppStore((state) => state.setCurrentVessel);
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const blankVessel = useMemo(() => createBlankVessel(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVessel, setEditedVessel] = useState<Vessel>(blankVessel);
  const [activeTab, setActiveTab] = useState('general');
  const [showAddEngine, setShowAddEngine] = useState(false);
  const [showAddTank, setShowAddTank] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { voyageState, snapshot, isUnderway } = useVoyageTracker(Boolean(currentVessel));
  const { logs } = useLogTaskStore();
  const recentVoyages = logs.filter((l) => l.type === 'voyage' && l.vesselId === currentVessel?.id).slice(0, 5);

  const usingDemoVessel = !currentVessel && demoModeEnabled && !isEditing;
  const vessel = isEditing ? editedVessel : currentVessel || (usingDemoVessel ? demoVessel : blankVessel);
  const hasSavedVessel = Boolean(currentVessel);

  const handleSave = () => {
    const now = new Date().toISOString();
    const nextVessel = {
      ...editedVessel,
      name: editedVessel.name.trim() || 'Untitled Vessel',
      updatedAt: now,
      createdAt: editedVessel.createdAt || now,
    };

    if (hasSavedVessel) {
      updateVessel(nextVessel.id, nextVessel);
    } else {
      addVessel(nextVessel);
    }
    setCurrentVessel(nextVessel);
    setCurrentVesselId(nextVessel.id);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedVessel(currentVessel ?? blankVessel);
    setIsEditing(false);
  };

  const updateVesselField = (field: keyof Vessel, value: unknown) => {
    setEditedVessel((prev) => ({ ...prev, [field]: value }));
  };

  const updateOperationalProfile = (field: keyof typeof editedVessel.operationalProfile, value: unknown) => {
    setEditedVessel((prev) => ({
      ...prev,
      operationalProfile: { ...prev.operationalProfile, [field]: value },
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await resizeImage(file, 1200, 800);
      if (isEditing) {
        updateVesselField('photoUrl', dataUrl);
      } else if (currentVessel) {
        const now = new Date().toISOString();
        updateVessel(currentVessel.id, { photoUrl: dataUrl, updatedAt: now });
        setCurrentVessel({ ...currentVessel, photoUrl: dataUrl, updatedAt: now });
      }
    } catch {
      // silently fail on invalid image
    }
    e.target.value = '';
  };

  const handleAddEngine = (engine: Engine) => {
    if (isEditing) {
      setEditedVessel((prev) => ({ ...prev, engines: [...prev.engines, engine] }));
    } else if (currentVessel) {
      const engines = [...currentVessel.engines, engine];
      const now = new Date().toISOString();
      updateVessel(currentVessel.id, { engines, updatedAt: now });
      setCurrentVessel({ ...currentVessel, engines, updatedAt: now });
    }
  };

  const handleRemoveEngine = (engineId: string) => {
    if (isEditing) {
      setEditedVessel((prev) => ({ ...prev, engines: prev.engines.filter((e) => e.id !== engineId) }));
    } else if (currentVessel) {
      const engines = currentVessel.engines.filter((e) => e.id !== engineId);
      const now = new Date().toISOString();
      updateVessel(currentVessel.id, { engines, updatedAt: now });
      setCurrentVessel({ ...currentVessel, engines, updatedAt: now });
    }
  };

  const handleAddTank = (tank: Tank) => {
    if (isEditing) {
      setEditedVessel((prev) => ({ ...prev, tanks: [...prev.tanks, tank] }));
    } else if (currentVessel) {
      const tanks = [...currentVessel.tanks, tank];
      const now = new Date().toISOString();
      updateVessel(currentVessel.id, { tanks, updatedAt: now });
      setCurrentVessel({ ...currentVessel, tanks, updatedAt: now });
    }
  };

  const handleRemoveTank = (tankId: string) => {
    if (isEditing) {
      setEditedVessel((prev) => ({ ...prev, tanks: prev.tanks.filter((t) => t.id !== tankId) }));
    } else if (currentVessel) {
      const tanks = currentVessel.tanks.filter((t) => t.id !== tankId);
      const now = new Date().toISOString();
      updateVessel(currentVessel.id, { tanks, updatedAt: now });
      setCurrentVessel({ ...currentVessel, tanks, updatedAt: now });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {vessel.photoUrl ? (
            <button
              className="h-16 w-16 rounded-xl overflow-hidden shadow-lg flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
              onClick={() => photoInputRef.current?.click()}
              title="Change photo"
            >
              <img src={vessel.photoUrl} alt={vessel.name} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Ship className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vessel.name || 'No Vessel Configured'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{vesselTypeNames[vessel.type]}</Badge>
              {vessel.lengthOverall > 0 && (
                <span className="text-sm text-muted-foreground">{vessel.lengthOverall}m LOA</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditedVessel(currentVessel ?? createBlankVessel());
                setIsEditing(true);
              }}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {currentVessel ? 'Edit Vessel' : 'Create Vessel'}
            </Button>
          )}
        </div>
      </div>

      {usingDemoVessel && (
        <DataSourceNotice title="Demo vessel">
          This vessel profile is sample data and has not been saved as your active vessel.
        </DataSourceNotice>
      )}

      {!currentVessel && !demoModeEnabled && !isEditing && (
        <Card>
          <CardContent className="py-10 text-center">
            <Ship className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Create your first vessel</h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              Add a vessel to unlock inventory, spaces, documents, logs, and telemetry.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setEditedVessel(createBlankVessel());
                setIsEditing(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Vessel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {(currentVessel || demoModeEnabled || isEditing) && (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="identification">ID & Reg</TabsTrigger>
          <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
          <TabsTrigger value="voyage">Voyage</TabsTrigger>
          <TabsTrigger value="views">Views</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EditableField
                  label="Vessel Name"
                  value={isEditing ? editedVessel.name : vessel.name}
                  onChange={(v) => updateVesselField('name', v)}
                  isEditing={isEditing}
                  placeholder="My Vessel"
                />
                <EditableField
                  label="Vessel Type"
                  value={isEditing ? editedVessel.type : vessel.type}
                  onChange={(v) => updateVesselField('type', v)}
                  isEditing={isEditing}
                  type="select"
                  options={Object.entries(vesselTypeNames).map(([value, label]) => ({ value, label }))}
                />
                <EditableField
                  label="Flag"
                  value={isEditing ? editedVessel.flag || '' : vessel.flag || ''}
                  onChange={(v) => updateVesselField('flag', v)}
                  isEditing={isEditing}
                  placeholder="CA"
                />
                <EditableField
                  label="Home Port"
                  value={isEditing ? editedVessel.portOfRegistry || '' : vessel.portOfRegistry || ''}
                  onChange={(v) => updateVesselField('portOfRegistry', v)}
                  isEditing={isEditing}
                  placeholder="Saint John, NB"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                  Operational Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EditableField
                  label="Primary Use"
                  value={isEditing ? editedVessel.operationalProfile.primaryUse : vessel.operationalProfile.primaryUse}
                  onChange={(v) => updateOperationalProfile('primaryUse', v)}
                  isEditing={isEditing}
                  type="select"
                  options={[
                    { label: 'Recreational', value: 'recreational' },
                    { label: 'Charter', value: 'charter' },
                    { label: 'Commercial', value: 'commercial' },
                    { label: 'Racing', value: 'racing' },
                    { label: 'Fishing', value: 'fishing' },
                    { label: 'Expedition', value: 'expedition' },
                  ]}
                />
                <EditableField
                  label="Typical Crew Size"
                  value={isEditing ? String(editedVessel.operationalProfile.typicalCrewSize) : String(vessel.operationalProfile.typicalCrewSize)}
                  onChange={(v) => updateOperationalProfile('typicalCrewSize', Number(v))}
                  isEditing={isEditing}
                  type="number"
                />
                <EditableField
                  label="Max Passengers"
                  value={isEditing ? String(editedVessel.operationalProfile.maxPassengers) : String(vessel.operationalProfile.maxPassengers)}
                  onChange={(v) => updateOperationalProfile('maxPassengers', Number(v))}
                  isEditing={isEditing}
                  type="number"
                />
                <EditableField
                  label="Typical Range"
                  value={isEditing ? String(editedVessel.operationalProfile.typicalCruisingRange || '') : String(vessel.operationalProfile.typicalCruisingRange || '')}
                  onChange={(v) => updateOperationalProfile('typicalCruisingRange', Number(v))}
                  isEditing={isEditing}
                  type="number"
                  unit="NM"
                />
              </CardContent>
            </Card>
          </div>

          {/* Vessel Photo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-muted-foreground" />
                Vessel Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vessel.photoUrl ? (
                <div className="relative group">
                  <img
                    src={vessel.photoUrl}
                    alt={vessel.name}
                    className="w-full max-h-80 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (isEditing) {
                          updateVesselField('photoUrl', undefined);
                        } else if (currentVessel) {
                          const now = new Date().toISOString();
                          updateVessel(currentVessel.id, { photoUrl: undefined, updatedAt: now });
                          setCurrentVessel({ ...currentVessel, photoUrl: undefined, updatedAt: now });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center border-2 border-dashed hover:border-primary hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">Click to upload vessel photo</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP up to 5MB</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dimensions Tab */}
        <TabsContent value="dimensions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                Dimensions & Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <EditableField label="Length Overall (LOA)" value={isEditing ? editedVessel.lengthOverall : vessel.lengthOverall} onChange={(v) => updateVesselField('lengthOverall', parseFloat(v) || 0)} isEditing={isEditing} type="number" unit="m" />
                <EditableField label="Length Waterline (LWL)" value={isEditing ? editedVessel.lengthWaterline : vessel.lengthWaterline} onChange={(v) => updateVesselField('lengthWaterline', parseFloat(v) || 0)} isEditing={isEditing} type="number" unit="m" />
                <EditableField label="Beam" value={isEditing ? editedVessel.beam : vessel.beam} onChange={(v) => updateVesselField('beam', parseFloat(v) || 0)} isEditing={isEditing} type="number" unit="m" />
                <EditableField label="Draft" value={isEditing ? editedVessel.draft : vessel.draft} onChange={(v) => updateVesselField('draft', parseFloat(v) || 0)} isEditing={isEditing} type="number" unit="m" />
                <EditableField label="Displacement" value={isEditing ? editedVessel.displacement || '' : vessel.displacement || ''} onChange={(v) => updateVesselField('displacement', parseFloat(v) || undefined)} isEditing={isEditing} type="number" unit="kg" />
                <EditableField label="Tonnage" value={isEditing ? editedVessel.tonnage || '' : vessel.tonnage || ''} onChange={(v) => updateVesselField('tonnage', parseFloat(v) || undefined)} isEditing={isEditing} type="number" unit="GT" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Systems Tab */}
        <TabsContent value="systems" className="space-y-6">
          {/* Engines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                Engines
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAddEngine(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Engine
              </Button>
            </CardHeader>
            <CardContent>
              {vessel.engines.length === 0 ? (
                <button
                  onClick={() => setShowAddEngine(true)}
                  className="w-full text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg hover:border-primary hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No engines configured</p>
                  <p className="text-sm mt-1">Click to add your first engine</p>
                </button>
              ) : (
                <div className="space-y-4">
                  {vessel.engines.map((engine) => (
                    <div key={engine.id} className="p-4 rounded-lg border bg-card/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{engine.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {[engine.make, engine.model].filter(Boolean).join(' ') || 'No make/model'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{engine.type}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveEngine(engine.id)}
                            title="Remove engine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Power</span>
                          <p className="font-medium">{engine.power ? `${engine.power} kW` : '--'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fuel</span>
                          <p className="font-medium capitalize">{engine.fuelType || '--'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hours</span>
                          <p className="font-medium">{engine.hours.toFixed(1)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Year</span>
                          <p className="font-medium">{engine.year || '--'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tanks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-muted-foreground" />
                Tanks
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAddTank(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Button>
            </CardHeader>
            <CardContent>
              {vessel.tanks.length === 0 ? (
                <button
                  onClick={() => setShowAddTank(true)}
                  className="w-full text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg hover:border-primary hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Droplets className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No tanks configured</p>
                  <p className="text-sm mt-1">Click to add fuel, water, or waste tanks</p>
                </button>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vessel.tanks.map((tank) => (
                    <div key={tank.id} className="p-4 rounded-lg border bg-card/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{tank.name}</h4>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="capitalize">{tank.type}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveTank(tank.id)}
                            title="Remove tank"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Capacity</span>
                          <span className="font-medium">{tank.capacity} L</span>
                        </div>
                        {tank.currentLevel !== undefined && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current</span>
                              <span className="font-medium">{tank.currentLevel} L</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  tank.capacity > 0 && (tank.currentLevel / tank.capacity) < 0.25
                                    ? 'bg-red-500'
                                    : tank.capacity > 0 && (tank.currentLevel / tank.capacity) < 0.5
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                )}
                                style={{ width: `${tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0}%` }}
                              />
                            </div>
                          </>
                        )}
                        {tank.location && (
                          <p className="text-xs text-muted-foreground mt-2">Location: {tank.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identification Tab */}
        <TabsContent value="identification" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Anchor className="h-5 w-5 text-muted-foreground" />
                Registration & Identification
              </CardTitle>
              {!isEditing && currentVessel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedVessel(currentVessel);
                    setIsEditing(true);
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <EditableField label="MMSI" value={isEditing ? editedVessel.mmsi || '' : vessel.mmsi || ''} onChange={(v) => updateVesselField('mmsi', v || undefined)} isEditing={isEditing} placeholder="316000000" />
                <EditableField label="Call Sign" value={isEditing ? editedVessel.callSign || '' : vessel.callSign || ''} onChange={(v) => updateVesselField('callSign', v || undefined)} isEditing={isEditing} placeholder="CFA123" />
                <EditableField label="HIN (Hull ID)" value={isEditing ? editedVessel.hin || '' : vessel.hin || ''} onChange={(v) => updateVesselField('hin', v || undefined)} isEditing={isEditing} placeholder="CA-XXX-12345-X-XX" />
                <EditableField label="Registration Number" value={isEditing ? editedVessel.registrationNumber || '' : vessel.registrationNumber || ''} onChange={(v) => updateVesselField('registrationNumber', v || undefined)} isEditing={isEditing} placeholder="NB 1234 AB" />
                <EditableField label="Flag State" value={isEditing ? editedVessel.flag || '' : vessel.flag || ''} onChange={(v) => updateVesselField('flag', v || undefined)} isEditing={isEditing} placeholder="CA" />
                <EditableField label="Port of Registry" value={isEditing ? editedVessel.portOfRegistry || '' : vessel.portOfRegistry || ''} onChange={(v) => updateVesselField('portOfRegistry', v || undefined)} isEditing={isEditing} placeholder="Saint John, NB" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blueprint" className="space-y-6">
          {vessel.deckPlan?.templateId ? (
            <BlueprintViewer templateId={vessel.deckPlan.templateId} vesselName={vessel.name} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No deck plan template selected. Choose one in Boat Map to generate a blueprint.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="voyage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Current Voyage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge variant={isUnderway ? 'default' : 'secondary'} className="capitalize">
                  {voyageState}
                </Badge>
                {isUnderway && snapshot && (
                  <div className="flex items-center gap-4 text-sm">
                    <span>{snapshot.totalDistance.toFixed(1)} nm</span>
                    <span>Max {snapshot.maxSpeed.toFixed(1)} kn</span>
                    {snapshot.departureTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {(() => {
                          const mins = Math.round((Date.now() - new Date(snapshot.departureTime).getTime()) / 60000);
                          return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                        })()}
                      </span>
                    )}
                  </div>
                )}
                {voyageState === 'idle' && (
                  <span className="text-sm text-muted-foreground">No active voyage. Start moving to begin auto-logging.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Voyages</CardTitle>
            </CardHeader>
            <CardContent>
              {recentVoyages.length > 0 ? (
                <div className="space-y-2">
                  {recentVoyages.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <p className="font-medium">{log.summary}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No voyage logs yet. Voyages are auto-logged when you start moving.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <VesselViews vessel={vessel} />
          </Suspense>
        </TabsContent>
      </Tabs>
      )}

      {/* Dialogs */}
      <AddEngineDialog
        open={showAddEngine}
        onOpenChange={setShowAddEngine}
        onSave={handleAddEngine}
        vesselId={vessel.id}
      />
      <AddTankDialog
        open={showAddTank}
        onOpenChange={setShowAddTank}
        onSave={handleAddTank}
        vesselId={vessel.id}
      />
    </div>
  );
}
