/**
 * HarborMesh - Vessel View Section
 * Digital twin and vessel details management
 */

import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { cn } from '@/lib/utils';
import { useAppStore, useSettingsStore, useVesselStore } from '@/store';
import { VesselType, type Vessel } from '@/types';

// Vessel type display names
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

// Demo vessel data
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
    {
      id: 'tank-001',
      vesselId: 'demo-vessel',
      name: 'Diesel Tank',
      type: 'diesel',
      capacity: 120,
      currentLevel: 85,
      location: 'Aft compartment',
    },
    {
      id: 'tank-002',
      vesselId: 'demo-vessel',
      name: 'Water Tank',
      type: 'water',
      capacity: 200,
      currentLevel: 150,
      location: 'Forward compartment',
    },
    {
      id: 'tank-003',
      vesselId: 'demo-vessel',
      name: 'Holding Tank',
      type: 'blackwater',
      capacity: 60,
      currentLevel: 20,
      location: 'Midship',
    },
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
  const vesselId = crypto.randomUUID();

  return {
    id: vesselId,
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

interface EditableFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  unit?: string;
}

function EditableField({ label, value, onChange, isEditing, type = 'text', options, unit }: EditableFieldProps) {
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
        />
        {unit && <span className="text-sm text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
    </div>
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Ship className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vessel.name || 'No Vessel Configured'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{vesselTypeNames[vessel.type]}</Badge>
              <span className="text-sm text-muted-foreground">
                {vessel.lengthOverall}m LOA
              </span>
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
              The launch workspace starts empty. Add a vessel to unlock real inventory, spaces, documents, logs, and telemetry ownership.
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="identification">ID & Registration</TabsTrigger>
        </TabsList>
        
        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
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
                />
                <EditableField
                  label="Home Port"
                  value={isEditing ? editedVessel.portOfRegistry || '' : vessel.portOfRegistry || ''}
                  onChange={(v) => updateVesselField('portOfRegistry', v)}
                  isEditing={isEditing}
                />
              </CardContent>
            </Card>
            
            {/* Operational Profile */}
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
                  onChange={(v) => updateOperationalProfile('primaryUse', v as 'recreational' | 'charter' | 'commercial' | 'racing' | 'fishing' | 'expedition')}
                  isEditing={isEditing}
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
          
          {/* Photo Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-muted-foreground" />
                Vessel Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                <div className="text-center">
                  <Ship className="h-16 w-16 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No vessel photo uploaded</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
              </div>
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
                <EditableField
                  label="Length Overall (LOA)"
                  value={isEditing ? editedVessel.lengthOverall : vessel.lengthOverall}
                  onChange={(v) => updateVesselField('lengthOverall', parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  unit="m"
                />
                <EditableField
                  label="Length Waterline (LWL)"
                  value={isEditing ? editedVessel.lengthWaterline : vessel.lengthWaterline}
                  onChange={(v) => updateVesselField('lengthWaterline', parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  unit="m"
                />
                <EditableField
                  label="Beam"
                  value={isEditing ? editedVessel.beam : vessel.beam}
                  onChange={(v) => updateVesselField('beam', parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  unit="m"
                />
                <EditableField
                  label="Draft"
                  value={isEditing ? editedVessel.draft : vessel.draft}
                  onChange={(v) => updateVesselField('draft', parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  unit="m"
                />
                <EditableField
                  label="Displacement"
                  value={isEditing ? editedVessel.displacement || '' : vessel.displacement || ''}
                  onChange={(v) => updateVesselField('displacement', parseFloat(v) || undefined)}
                  isEditing={isEditing}
                  type="number"
                  unit="kg"
                />
                <EditableField
                  label="Tonnage"
                  value={isEditing ? editedVessel.tonnage || '' : vessel.tonnage || ''}
                  onChange={(v) => updateVesselField('tonnage', parseFloat(v) || undefined)}
                  isEditing={isEditing}
                  type="number"
                  unit="GT"
                />
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
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Engine
              </Button>
            </CardHeader>
            <CardContent>
              {vessel.engines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No engines configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vessel.engines.map((engine) => (
                    <div key={engine.id} className="p-4 rounded-lg border bg-card/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{engine.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {engine.make} {engine.model}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{engine.type}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Power</span>
                          <p className="font-medium">{engine.power} kW</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fuel</span>
                          <p className="font-medium capitalize">{engine.fuelType}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hours</span>
                          <p className="font-medium">{engine.hours.toFixed(1)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Year</span>
                          <p className="font-medium">{engine.year}</p>
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
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vessel.tanks.map((tank) => (
                  <div key={tank.id} className="p-4 rounded-lg border bg-card/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{tank.name}</h4>
                      <Badge variant="outline" className="capitalize">
                        {tank.type}
                      </Badge>
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
                                (tank.currentLevel / tank.capacity) < 0.25
                                  ? 'bg-red-500'
                                  : (tank.currentLevel / tank.capacity) < 0.5
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              )}
                              style={{ width: `${(tank.currentLevel / tank.capacity) * 100}%` }}
                            />
                          </div>
                        </>
                      )}
                      {tank.location && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Location: {tank.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Identification Tab */}
        <TabsContent value="identification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Anchor className="h-5 w-5 text-muted-foreground" />
                Registration & Identification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <EditableField
                  label="MMSI"
                  value={isEditing ? editedVessel.mmsi || '' : vessel.mmsi || ''}
                  onChange={(v) => updateVesselField('mmsi', v || undefined)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Call Sign"
                  value={isEditing ? editedVessel.callSign || '' : vessel.callSign || ''}
                  onChange={(v) => updateVesselField('callSign', v || undefined)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="HIN (Hull ID)"
                  value={isEditing ? editedVessel.hin || '' : vessel.hin || ''}
                  onChange={(v) => updateVesselField('hin', v || undefined)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Registration Number"
                  value={isEditing ? editedVessel.registrationNumber || '' : vessel.registrationNumber || ''}
                  onChange={(v) => updateVesselField('registrationNumber', v || undefined)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Flag State"
                  value={isEditing ? editedVessel.flag || '' : vessel.flag || ''}
                  onChange={(v) => updateVesselField('flag', v || undefined)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Port of Registry"
                  value={isEditing ? editedVessel.portOfRegistry || '' : vessel.portOfRegistry || ''}
                  onChange={(v) => updateVesselField('portOfRegistry', v || undefined)}
                  isEditing={isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
