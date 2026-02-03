/**
 * HarborMesh - Fleet Management Section
 * Enterprise/Charter tier multi-vessel console
 */

import React, { useState } from 'react';
import {
  Ship,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  ClipboardList,
  Activity,
  Anchor,
  Navigation,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  UserCheck,
  BarChart3,
  Bell,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn, formatDate } from '@/lib/utils';

// Demo fleet data
const demoFleet = [
  {
    id: 'v1',
    name: 'Sea Venture',
    type: 'Sailboat Cruiser',
    status: 'underway',
    position: { lat: 37.7749, lon: -122.4194 },
    lastUpdate: '2 min ago',
    crew: 2,
    passengers: 0,
    nextMaintenance: '2024-03-15',
    certificateExpiry: '2024-06-01',
    alerts: [],
  },
  {
    id: 'v2',
    name: 'Coastal Dream',
    type: 'Motor Cruiser',
    status: 'in_port',
    position: { lat: 37.8044, lon: -122.4078 },
    lastUpdate: '15 min ago',
    crew: 1,
    passengers: 0,
    nextMaintenance: '2024-02-28',
    certificateExpiry: '2024-05-15',
    alerts: [{ type: 'maintenance', message: 'Maintenance due in 3 days' }],
  },
  {
    id: 'v3',
    name: 'Wind Dancer II',
    type: 'Catamaran',
    status: 'anchored',
    position: { lat: 37.7983, lon: -122.3778 },
    lastUpdate: '5 min ago',
    crew: 2,
    passengers: 4,
    nextMaintenance: '2024-04-01',
    certificateExpiry: '2024-07-20',
    alerts: [],
  },
  {
    id: 'v4',
    name: 'Bay Explorer',
    type: 'Trawler',
    status: 'offline',
    position: null,
    lastUpdate: '2 hours ago',
    crew: 0,
    passengers: 0,
    nextMaintenance: '2024-03-01',
    certificateExpiry: '2024-04-30',
    alerts: [{ type: 'offline', message: 'No telemetry received' }],
  },
];

const demoManifests = [
  {
    id: 'm1',
    vesselId: 'v3',
    vesselName: 'Wind Dancer II',
    departure: '2024-02-15T09:00:00',
    return: '2024-02-15T17:00:00',
    status: 'underway',
    crew: [
      { name: 'Capt. Sarah Johnson', role: 'Captain', checkedIn: true },
      { name: 'Mike Chen', role: 'Deckhand', checkedIn: true },
    ],
    passengers: [
      { name: 'John Smith', checkedIn: true },
      { name: 'Jane Doe', checkedIn: true },
      { name: 'Bob Wilson', checkedIn: true },
      { name: 'Alice Brown', checkedIn: false },
    ],
  },
];

const demoProcedures = [
  {
    id: 'p1',
    name: 'Pre-Departure Checklist',
    category: 'Safety',
    assignedTo: 'All Captains',
    frequency: 'Per Voyage',
    lastCompleted: '2024-02-14',
  },
  {
    id: 'p2',
    name: 'Engine Maintenance',
    category: 'Maintenance',
    assignedTo: 'Engineers',
    frequency: 'Monthly',
    lastCompleted: '2024-01-20',
  },
  {
    id: 'p3',
    name: 'Safety Equipment Inspection',
    category: 'Compliance',
    assignedTo: 'All Crew',
    frequency: 'Monthly',
    lastCompleted: '2024-02-01',
  },
];

export function Fleet() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [showAddVessel, setShowAddVessel] = useState(false);
  
  const statusCounts = {
    underway: demoFleet.filter((v) => v.status === 'underway').length,
    anchored: demoFleet.filter((v) => v.status === 'anchored').length,
    inPort: demoFleet.filter((v) => v.status === 'in_port').length,
    offline: demoFleet.filter((v) => v.status === 'offline').length,
  };
  
  const totalAlerts = demoFleet.reduce((acc, v) => acc + v.alerts.length, 0);
  
  const getStatusBadge = (status: string) => {
    const configs = {
      underway: { variant: 'default', className: 'bg-blue-500', label: 'Underway' },
      anchored: { variant: 'outline', className: 'text-emerald-500 border-emerald-200', label: 'Anchored' },
      in_port: { variant: 'outline', className: '', label: 'In Port' },
      offline: { variant: 'secondary', className: '', label: 'Offline' },
    };
    const config = configs[status as keyof typeof configs] || configs.offline;
    return (
      <Badge variant={config.variant as never} className={config.className}>
        {config.label}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground mt-1">
            Multi-vessel operations and charter management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button size="sm" onClick={() => setShowAddVessel(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vessel
          </Button>
        </div>
      </div>
      
      {/* Fleet Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Underway</p>
                <p className="text-2xl font-bold">{statusCounts.underway}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                <Anchor className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Anchored</p>
                <p className="text-2xl font-bold">{statusCounts.anchored}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-950/30">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Port</p>
                <p className="text-2xl font-bold">{statusCounts.inPort}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold">{statusCounts.offline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/30">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alerts</p>
                <p className="text-2xl font-bold">{totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Fleet Overview</TabsTrigger>
          <TabsTrigger value="manifests">Manifests</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>
        
        {/* Fleet Overview */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5" />
                  Vessel Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search vessels..." className="pl-9 w-[200px]" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Filter</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="underway">Underway</SelectItem>
                      <SelectItem value="anchored">Anchored</SelectItem>
                      <SelectItem value="in_port">In Port</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {demoFleet.map((vessel) => (
                    <div 
                      key={vessel.id}
                      className={cn(
                        'flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors',
                        selectedVessel === vessel.id && 'bg-muted'
                      )}
                      onClick={() => setSelectedVessel(vessel.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'p-2 rounded-lg',
                          vessel.status === 'underway' ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' :
                          vessel.status === 'anchored' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' :
                          vessel.status === 'in_port' ? 'bg-slate-50 text-slate-500 dark:bg-slate-950/30' :
                          'bg-red-50 text-red-500 dark:bg-red-950/30'
                        )}>
                          <Ship className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{vessel.name}</h4>
                            {getStatusBadge(vessel.status)}
                            {vessel.alerts.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {vessel.alerts.length}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {vessel.type} • {vessel.crew} crew
                            {vessel.passengers > 0 && ` • ${vessel.passengers} passengers`}
                          </p>
                          {vessel.alerts.length > 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              {vessel.alerts[0].message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {vessel.position ? `${vessel.position.lat.toFixed(2)}, ${vessel.position.lon.toFixed(2)}` : 'No position'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vessel.lastUpdate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Manifests */}
        <TabsContent value="manifests" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {demoManifests.map((manifest) => (
              <Card key={manifest.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {manifest.vesselName}
                    </CardTitle>
                    <Badge variant={manifest.status === 'underway' ? 'default' : 'outline'}>
                      {manifest.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Departure: {formatDate(manifest.departure)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Crew ({manifest.crew.length})</p>
                    <div className="space-y-1">
                      {manifest.crew.map((crew, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{crew.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{crew.role}</Badge>
                            {crew.checkedIn && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Passengers ({manifest.passengers.length})</p>
                    <div className="space-y-1">
                      {manifest.passengers.map((pax, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{pax.name}</span>
                          {pax.checkedIn ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Badge variant="secondary" className="text-xs">Not checked in</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Check In
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No active manifests</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a manifest for your next trip
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Manifest
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Procedures */}
        <TabsContent value="procedures" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Standard Procedures
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Procedure
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {demoProcedures.map((procedure) => (
                  <div key={procedure.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{procedure.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {procedure.category} • {procedure.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Assigned to</p>
                        <p className="text-sm">{procedure.assignedTo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last completed</p>
                        <p className="text-sm">{procedure.lastCompleted}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Compliance */}
        <TabsContent value="compliance" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Renewals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoFleet.map((vessel) => (
                  <div key={vessel.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{vessel.name}</p>
                      <p className="text-xs text-muted-foreground">Certificate expires</p>
                    </div>
                    <Badge variant="outline">
                      {formatDate(vessel.certificateExpiry)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoFleet.map((vessel) => (
                  <div key={vessel.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{vessel.name}</p>
                      <p className="text-xs text-muted-foreground">Next maintenance</p>
                    </div>
                    <Badge variant="outline">
                      {formatDate(vessel.nextMaintenance)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Vessel Dialog */}
      <Dialog open={showAddVessel} onOpenChange={setShowAddVessel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vessel to Fleet</DialogTitle>
            <DialogDescription>
              Add a new vessel to your fleet management system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vessel Name</Label>
              <Input placeholder="e.g., Sea Venture" />
            </div>
            <div className="space-y-2">
              <Label>Vessel Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sailboat">Sailboat</SelectItem>
                  <SelectItem value="motorboat">Motorboat</SelectItem>
                  <SelectItem value="catamaran">Catamaran</SelectItem>
                  <SelectItem value="trawler">Trawler</SelectItem>
                  <SelectItem value="yacht">Yacht</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>MMSI (optional)</Label>
              <Input placeholder="9-digit MMSI number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVessel(false)}>Cancel</Button>
            <Button onClick={() => setShowAddVessel(false)}>Add Vessel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
