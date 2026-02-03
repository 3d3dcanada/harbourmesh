/**
 * HarborMesh - Logs & Tasks Section
 * Voyage logs, maintenance records, and task management
 */

import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Edit3,
  Trash2,
  User,
  Wrench,
  Droplets,
  Wind,
  Activity,
  Zap,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatRelativeTime, formatCoordinate } from '@/lib/utils';
import { useLogTaskStore } from '@/store';
import { LogEntryType, TaskType, TaskStatus, Severity, type LogEntry, type Task } from '@/types';

// Log type icons
const logTypeIcons: Record<string, React.ElementType> = {
  [LogEntryType.VOYAGE]: Navigation,
  [LogEntryType.ENGINE_HOURS]: Zap,
  [LogEntryType.MAINTENANCE]: Wrench,
  [LogEntryType.INCIDENT]: AlertTriangle,
  [LogEntryType.INSPECTION]: ClipboardList,
  [LogEntryType.FUELING]: Droplets,
  [LogEntryType.WEATHER_OBSERVATION]: Wind,
  [LogEntryType.CREW_CHANGE]: User,
  [LogEntryType.SYSTEM_CHECK]: Zap,
  [LogEntryType.CUSTOM]: FileText,
};

// Task type icons
const taskTypeIcons: Record<string, React.ElementType> = {
  [TaskType.MAINTENANCE]: Wrench,
  [TaskType.SAFETY]: AlertTriangle,
  [TaskType.DOCUMENTATION]: FileText,
  [TaskType.CHECKLIST_ITEM]: CheckSquare,
  [TaskType.INSPECTION]: ClipboardList,
  [TaskType.REPAIR]: Wrench,
  [TaskType.CLEANING]: Droplets,
  [TaskType.PROVISIONING]: Activity,
  [TaskType.CUSTOM]: FileText,
};

// Demo logs
const demoLogs: LogEntry[] = [
  {
    id: 'log-001',
    vesselId: 'demo-vessel',
    type: LogEntryType.VOYAGE,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: 'America/Los_Angeles',
    position: {
      latitude: 37.7749,
      longitude: -122.4194,
      heading: 180,
      speed: 6.5,
      cog: 185,
      sog: 6.2,
      source: 'gps',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    summary: 'Day sail to Angel Island',
    details: 'Departed from Marina at 09:00. Light winds 8-12 knots from NW. Arrived at Angel Island at 11:30. Spent afternoon exploring. Departed at 16:00, returned to marina by 18:30.',
    engineHours: { 'engine-001': 1248.5 },
    createdBy: 'user-001',
    createdByName: 'Captain Smith',
    weatherSnapshot: {
      windSpeed: 10,
      windDirection: 315,
      waveHeight: 0.5,
      airTemperature: 18,
      barometricPressure: 1015,
      conditions: 'Partly cloudy',
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-002',
    vesselId: 'demo-vessel',
    type: LogEntryType.MAINTENANCE,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Engine oil change',
    details: 'Changed engine oil and filter. Used 3.5L of 15W-40 diesel oil. Inspected belts and hoses - all in good condition.',
    relatedSystemIds: ['system-001'],
    engineHours: { 'engine-001': 1245.0 },
    createdBy: 'user-002',
    createdByName: 'Engineer Jones',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-003',
    vesselId: 'demo-vessel',
    type: LogEntryType.INSPECTION,
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Monthly safety inspection',
    details: 'Checked all safety equipment. Fire extinguishers charged and within date. Flares current. Life jackets in good condition. First aid kit stocked. EPIRB tested OK.',
    createdBy: 'user-001',
    createdByName: 'Captain Smith',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-004',
    vesselId: 'demo-vessel',
    type: LogEntryType.WEATHER_OBSERVATION,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Strong wind warning',
    details: 'Observed winds increasing to 25-30 knots in the afternoon. Seas building to 6-8 feet. Decided to return to port early.',
    position: {
      latitude: 37.8,
      longitude: -122.4,
      source: 'manual',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    severity: 'medium' as Severity,
    createdBy: 'user-001',
    createdByName: 'Captain Smith',
    weatherSnapshot: {
      windSpeed: 28,
      windDirection: 280,
      windGust: 35,
      waveHeight: 2.5,
      airTemperature: 15,
      barometricPressure: 1008,
      conditions: 'Strong winds, rough seas',
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-005',
    vesselId: 'demo-vessel',
    type: LogEntryType.FUELING,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Diesel fueling',
    details: 'Added 85 liters of diesel at SF Marina fuel dock. Tank now at 95% full.',
    engineHours: { 'engine-001': 1246.2 },
    createdBy: 'user-001',
    createdByName: 'Captain Smith',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo tasks
const demoTasks: Task[] = [
  {
    id: 'task-001',
    vesselId: 'demo-vessel',
    title: 'Replace raw water impeller',
    description: 'Annual maintenance - replace engine raw water pump impeller',
    type: TaskType.MAINTENANCE,
    status: TaskStatus.OPEN,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-002',
    assignedTo: 'user-002',
    requiresApproval: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-002',
    vesselId: 'demo-vessel',
    title: 'Inspect standing rigging',
    description: 'Check all shrouds, stays, and turnbuckles for wear or damage',
    type: TaskType.SAFETY,
    status: TaskStatus.IN_PROGRESS,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-001',
    assignedTo: 'user-001',
    requiresApproval: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-003',
    vesselId: 'demo-vessel',
    title: 'Renew insurance documentation',
    description: 'Submit updated survey and documentation to insurance provider',
    type: TaskType.DOCUMENTATION,
    status: TaskStatus.OPEN,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-001',
    requiresApproval: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-004',
    vesselId: 'demo-vessel',
    title: 'Replace navigation light bulb',
    description: 'Port navigation light not working - replace bulb',
    type: TaskType.REPAIR,
    status: TaskStatus.COMPLETE,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-001',
    assignedTo: 'user-002',
    requiresApproval: false,
    signedOffBy: 'user-001',
    signedOffAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    signOffNote: 'Replaced with LED bulb, tested OK',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-005',
    vesselId: 'demo-vessel',
    title: 'Bottom cleaning and inspection',
    description: 'Schedule haul-out for bottom cleaning, inspection, and new bottom paint',
    type: TaskType.MAINTENANCE,
    status: TaskStatus.OPEN,
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-001',
    requiresApproval: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function LogsTasks() {
  const { logs, tasks, setLogs, setTasks, completeTask } = useLogTaskStore();
  const [activeTab, setActiveTab] = useState('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Initialize with demo data
  React.useEffect(() => {
    if (logs.length === 0) setLogs(demoLogs);
    if (tasks.length === 0) setTasks(demoTasks);
  }, [logs.length, tasks.length, setLogs, setTasks]);
  
  const currentLogs = logs.length > 0 ? logs : demoLogs;
  const currentTasks = tasks.length > 0 ? tasks : demoTasks;
  
  // Filter logs
  const filteredLogs = currentLogs.filter((log) => {
    const matchesSearch = log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesType;
  });
  
  // Filter tasks
  const filteredTasks = currentTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || task.type === filterType;
    return matchesSearch && matchesType;
  });
  
  // Task stats
  const openTasks = currentTasks.filter((t) => t.status === TaskStatus.OPEN || t.status === TaskStatus.IN_PROGRESS);
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const completedTasks = currentTasks.filter((t) => t.status === TaskStatus.COMPLETE);
  
  // Get status badge
  const getTaskStatusBadge = (task: Task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETE;
    
    const configs = {
      [TaskStatus.OPEN]: { variant: 'outline', className: 'text-amber-500 border-amber-200', label: 'Open' },
      [TaskStatus.IN_PROGRESS]: { variant: 'outline', className: 'text-blue-500 border-blue-200', label: 'In Progress' },
      [TaskStatus.COMPLETE]: { variant: 'outline', className: 'text-emerald-500 border-emerald-200', label: 'Complete' },
      [TaskStatus.NEEDS_APPROVAL]: { variant: 'outline', className: 'text-purple-500 border-purple-200', label: 'Needs Approval' },
      [TaskStatus.CANCELLED]: { variant: 'outline', className: 'text-slate-500 border-slate-200', label: 'Cancelled' },
    };
    
    const config = configs[task.status];
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
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
          <h1 className="text-2xl font-bold tracking-tight">Logs & Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Voyage records, maintenance logs, and task management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddLog(true)}>
            <ClipboardList className="h-4 w-4 mr-2" />
            New Log
          </Button>
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>
      
      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tasks</p>
                <p className="text-2xl font-bold">{openTasks.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/30">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{currentLogs.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="logs">Voyage Logs</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{openTasks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-0 space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <span>Type</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(LogEntryType).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {value.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Logs List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredLogs.map((log) => {
                    const Icon = logTypeIcons[log.type] || FileText;
                    
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <div className={cn(
                          'p-2.5 rounded-lg',
                          log.severity === 'critical' ? 'bg-red-50 text-red-500 dark:bg-red-950/30' :
                          log.severity === 'high' ? 'bg-orange-50 text-orange-500 dark:bg-orange-950/30' :
                          log.severity === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' :
                          'bg-blue-50 text-blue-500 dark:bg-blue-950/30'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{log.summary}</h4>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                {log.details}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(log.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {log.type.replace(/_/g, ' ')}
                            </Badge>
                            {log.position && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {formatCoordinate(log.position.latitude, 'lat').split(' ')[0]}
                              </span>
                            )}
                            {log.engineHours && Object.entries(log.engineHours).map(([engineId, hours]) => (
                              <span key={engineId} className="text-xs text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {hours.toFixed(1)} hrs
                              </span>
                            ))}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.createdByName}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-0 space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <span>Type</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TaskType).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {value.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tasks List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredTasks.map((task) => {
                    const Icon = taskTypeIcons[task.type] || ClipboardList;
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className={cn(
                          'p-2.5 rounded-lg',
                          task.status === TaskStatus.COMPLETE ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' :
                          task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' :
                          'bg-amber-50 text-amber-500 dark:bg-amber-950/30'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                'font-medium',
                                task.status === TaskStatus.COMPLETE && 'line-through text-muted-foreground'
                              )}>
                                {task.title}
                              </h4>
                              {getTaskStatusBadge(task)}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {task.status !== TaskStatus.COMPLETE && (
                                  <DropdownMenuItem onClick={() => completeTask(task.id, 'user-001')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.type.replace(/_/g, ' ')}
                            </Badge>
                            {task.dueDate && (
                              <span className={cn(
                                'text-xs flex items-center gap-1',
                                task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETE
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                              )}>
                                <Clock className="h-3 w-3" />
                                Due {formatRelativeTime(task.dueDate)}
                              </span>
                            )}
                            {task.assignedTo && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Log Dialog */}
      <Dialog open={showAddLog} onOpenChange={setShowAddLog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Log Entry</DialogTitle>
            <DialogDescription>
              Record a voyage, maintenance, or other event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Log Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LogEntryType).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {value.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title/Summary</Label>
              <Input placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea placeholder="Additional details..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Engine Hours (optional)</Label>
              <Input type="number" placeholder="Current engine hours" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddLog(false)}>Save Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a new maintenance or operational task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TaskType).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {value.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Task title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Task details..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input type="date" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="requires-approval" />
              <Label htmlFor="requires-approval" className="text-sm">
                Requires approval before completion
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={() => setShowAddTask(false)}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
