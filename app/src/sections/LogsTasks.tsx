/**
 * HarborMesh - Logs & Tasks Section
 * Voyage logs, maintenance records, and task management
 */

import { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataSourceNotice } from '@/components/DataSourceNotice';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn, formatRelativeTime, formatCoordinate } from '@/lib/utils';
import { useAppStore, useLogTaskStore, useSettingsStore, useVesselStore } from '@/store';
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
    timezone: 'America/Moncton',
    position: {
      latitude: 45.2733,
      longitude: -66.0633,
      heading: 180,
      speed: 6.5,
      cog: 185,
      sog: 6.2,
      source: 'gps',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    summary: 'Saint John harbour pilot run',
    details: 'Departed from Saint John at 09:00. Light winds 8-12 knots from NW. Completed a short harbour validation loop and returned before the afternoon tide change.',
    engineHours: { 'engine-001': 1248.5 },
    createdBy: 'user-001',
    createdByName: 'Demo Operator',
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
    createdByName: 'Demo Engineer',
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
    createdByName: 'Demo Operator',
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
      latitude: 45.31,
      longitude: -66.02,
      source: 'manual',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    severity: 'medium' as Severity,
    createdBy: 'user-001',
    createdByName: 'Demo Operator',
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
    details: 'Added 85 liters of diesel at a Saint John fuel dock. Tank now at 95% full.',
    engineHours: { 'engine-001': 1246.2 },
    createdBy: 'user-001',
    createdByName: 'Demo Operator',
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
  const { logs, tasks, addLog, addTask, deleteLog, deleteTask, completeTask } = useLogTaskStore();
  const currentVessel = useVesselStore((state) => state.currentVessel);
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const [activeTab, setActiveTab] = useState('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [logDraft, setLogDraft] = useState({
    type: LogEntryType.VOYAGE,
    summary: '',
    details: '',
    engineHours: '',
  });
  const [taskDraft, setTaskDraft] = useState({
    type: TaskType.MAINTENANCE,
    title: '',
    description: '',
    dueDate: '',
    requiresApproval: false,
  });
  
  const usingDemoLogs = logs.length === 0 && demoModeEnabled;
  const usingDemoTasks = tasks.length === 0 && demoModeEnabled;
  const currentLogs = usingDemoLogs ? demoLogs : logs;
  const currentTasks = usingDemoTasks ? demoTasks : tasks;

  const handleSaveLog = () => {
    if (!currentVessel) return;
    const now = new Date().toISOString();
    const engineHours = Number(logDraft.engineHours);
    const log: LogEntry = {
      id: crypto.randomUUID(),
      vesselId: currentVessel.id,
      type: logDraft.type,
      timestamp: now,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      summary: logDraft.summary.trim() || 'Untitled Log',
      details: logDraft.details.trim() || undefined,
      engineHours: Number.isFinite(engineHours) ? { main: engineHours } : undefined,
      createdBy: 'local-user',
      createdByName: 'Local Operator',
      createdAt: now,
      updatedAt: now,
    };

    addLog(log);
    setShowAddLog(false);
    setLogDraft({ type: LogEntryType.VOYAGE, summary: '', details: '', engineHours: '' });
  };

  const handleSaveTask = () => {
    if (!currentVessel) return;
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      vesselId: currentVessel.id,
      title: taskDraft.title.trim() || 'Untitled Task',
      description: taskDraft.description.trim() || undefined,
      type: taskDraft.type,
      status: TaskStatus.OPEN,
      dueDate: taskDraft.dueDate ? new Date(`${taskDraft.dueDate}T12:00:00`).toISOString() : undefined,
      createdBy: 'local-user',
      assignedTo: 'local-user',
      requiresApproval: taskDraft.requiresApproval,
      createdAt: now,
      updatedAt: now,
    };

    addTask(task);
    setShowAddTask(false);
    setTaskDraft({ type: TaskType.MAINTENANCE, title: '', description: '', dueDate: '', requiresApproval: false });
  };
  
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
    <div className="flex h-[calc(100vh-4.5rem)] flex-col gap-2">
      {/* Compact toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Logs & Tasks
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{currentLogs.length} logs</span>
            <span>{openTasks.length} open</span>
            {overdueTasks.length > 0 && <span className="text-red-500 font-medium">{overdueTasks.length} overdue</span>}
            <span className="text-emerald-500">{completedTasks.length} done</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.values(TaskType).map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAddLog(true)} disabled={!currentVessel}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Log
          </Button>
          <Button size="sm" className="h-8" onClick={() => setShowAddTask(true)} disabled={!currentVessel}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Task
          </Button>
        </div>
      </div>

      {(usingDemoLogs || usingDemoTasks) && (
        <DataSourceNotice title="Demo data">Sample records until vessel-owned data is created.</DataSourceNotice>
      )}

      {!currentVessel && !demoModeEnabled ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Create a vessel first</h2>
            <p className="mt-1 text-sm text-muted-foreground">Operational records need an active vessel context.</p>
            <Button className="mt-4" onClick={() => setActiveView('vessel')}>Go to Vessel</Button>
          </div>
        </div>
      ) : (
      <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="logs" className="text-xs h-7">Logs</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs h-7">
            Tasks {openTasks.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 h-4">{openTasks.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-auto rounded-lg border bg-card">
        {activeTab === 'logs' ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-10">Type</th>
                <th className="px-3 py-2 text-left font-medium">Summary</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Details</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Position</th>
                <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">Eng Hrs</th>
                <th className="px-3 py-2 text-left font-medium">When</th>
                {!usingDemoLogs && <th className="px-3 py-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />No logs yet</td></tr>
              ) : filteredLogs.map((log) => {
                const Icon = logTypeIcons[log.type] || FileText;
                return (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-3 py-2.5"><div className={cn('inline-flex p-1.5 rounded', log.severity === 'critical' ? 'bg-red-50 text-red-500 dark:bg-red-950/30' : log.severity === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' : 'bg-blue-50 text-blue-500 dark:bg-blue-950/30')}><Icon className="h-4 w-4" /></div></td>
                    <td className="px-3 py-2.5"><div className="font-medium">{log.summary}</div><Badge variant="outline" className="text-[10px] px-1 capitalize mt-0.5">{log.type.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[200px] hidden md:table-cell">{log.details || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{log.position ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{formatCoordinate(log.position.latitude, 'lat').split(' ')[0]}</span> : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground hidden lg:table-cell">{log.engineHours ? Object.values(log.engineHours).map(h => h.toFixed(1)).join(', ') : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(log.timestamp)}</td>
                    {!usingDemoLogs && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLog(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-10">Type</th>
                <th className="px-3 py-2 text-left font-medium">Task</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Description</th>
                <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Due</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />No tasks yet</td></tr>
              ) : filteredTasks.map((task) => {
                const Icon = taskTypeIcons[task.type] || ClipboardList;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETE;
                return (
                  <tr key={task.id} className={cn('hover:bg-muted/50 transition-colors cursor-pointer', isOverdue && 'bg-red-50/50 dark:bg-red-950/10')} onClick={() => setSelectedTask(task)}>
                    <td className="px-3 py-2.5"><div className={cn('inline-flex p-1.5 rounded', task.status === TaskStatus.COMPLETE ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' : task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' : 'bg-amber-50 text-amber-500 dark:bg-amber-950/30')}><Icon className="h-4 w-4" /></div></td>
                    <td className="px-3 py-2.5"><span className={cn('font-medium', task.status === TaskStatus.COMPLETE && 'line-through text-muted-foreground')}>{task.title}</span></td>
                    <td className="px-3 py-2.5">{getTaskStatusBadge(task)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[200px] hidden md:table-cell">{task.description || '—'}</td>
                    <td className="px-3 py-2.5 text-xs hidden lg:table-cell">{task.dueDate ? <span className={isOverdue ? 'text-red-500' : 'text-muted-foreground'}>{formatRelativeTime(task.dueDate)}</span> : '—'}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status !== TaskStatus.COMPLETE && <DropdownMenuItem disabled={usingDemoTasks} onClick={() => completeTask(task.id, 'local-user')}><CheckCircle2 className="h-4 w-4 mr-2" />Complete</DropdownMenuItem>}
                          <DropdownMenuItem><Edit3 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500" disabled={usingDemoTasks} onClick={() => deleteTask(task.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </>)
      }
      
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
              <Select value={logDraft.type} onValueChange={(value) => setLogDraft((draft) => ({ ...draft, type: value as LogEntryType }))}>
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
              <Input
                placeholder="Brief description"
                value={logDraft.summary}
                onChange={(event) => setLogDraft((draft) => ({ ...draft, summary: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Additional details..."
                rows={3}
                value={logDraft.details}
                onChange={(event) => setLogDraft((draft) => ({ ...draft, details: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Engine Hours (optional)</Label>
              <Input
                type="number"
                placeholder="Current engine hours"
                value={logDraft.engineHours}
                onChange={(event) => setLogDraft((draft) => ({ ...draft, engineHours: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLog(false)}>Cancel</Button>
            <Button onClick={handleSaveLog} disabled={!currentVessel}>Save Log</Button>
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
              <Select value={taskDraft.type} onValueChange={(value) => setTaskDraft((draft) => ({ ...draft, type: value as TaskType }))}>
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
              <Input
                placeholder="Task title"
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((draft) => ({ ...draft, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Task details..."
                rows={3}
                value={taskDraft.description}
                onChange={(event) => setTaskDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={taskDraft.dueDate}
                onChange={(event) => setTaskDraft((draft) => ({ ...draft, dueDate: event.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requires-approval"
                checked={taskDraft.requiresApproval}
                onCheckedChange={(checked) => setTaskDraft((draft) => ({ ...draft, requiresApproval: checked === true }))}
              />
              <Label htmlFor="requires-approval" className="text-sm">
                Requires approval before completion
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={!currentVessel}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log detail drawer */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          {selectedLog && (
            <>
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="flex items-center gap-2">
                  {logTypeIcons[selectedLog.type] && (() => { const Icon = logTypeIcons[selectedLog.type]; return <Icon className="h-4 w-4" />; })()}
                  {selectedLog.summary}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{selectedLog.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                {selectedLog.details && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedLog.details}</p>
                  </>
                )}
                {selectedLog.engineHours && Object.keys(selectedLog.engineHours).length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Engine Hours: </span>
                    {Object.entries(selectedLog.engineHours).map(([id, h]) => `${id}: ${h}`).join(', ')}
                  </div>
                )}
                {selectedLog.position && (
                  <div className="text-sm font-mono text-muted-foreground">
                    {selectedLog.position.latitude.toFixed(4)}°, {selectedLog.position.longitude.toFixed(4)}°
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Task detail drawer */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          {selectedTask && (
            <>
              <SheetHeader className="pb-3 border-b">
                <SheetTitle>{selectedTask.title}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedTask.status === TaskStatus.COMPLETE ? 'default' : selectedTask.status === 'in_progress' ? 'secondary' : 'outline'}>
                    {selectedTask.status.replace(/_/g, ' ')}
                  </Badge>
                  {selectedTask.dueDate && (
                    <span className="text-xs text-muted-foreground">Due {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
                {selectedTask.status !== TaskStatus.COMPLETE && (
                  <div className="flex gap-2">
                    {selectedTask.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => { const { updateTask } = useLogTaskStore.getState(); updateTask(selectedTask.id, { status: 'in_progress' as Task['status'] }); setSelectedTask({ ...selectedTask, status: 'in_progress' as Task['status'] }); }}>
                        Start
                      </Button>
                    )}
                    <Button size="sm" onClick={() => { completeTask(selectedTask.id, 'local-user'); setSelectedTask(null); }}>
                      Complete
                    </Button>
                  </div>
                )}
                {selectedTask.description && <p className="text-sm text-muted-foreground">{selectedTask.description}</p>}
                {selectedTask.checklistItems && selectedTask.checklistItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Checklist</p>
                      {selectedTask.checklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => {
                              const { updateTask } = useLogTaskStore.getState();
                              const updated = selectedTask.checklistItems!.map((ci, i) =>
                                i === idx ? { ...ci, completed: !!checked } : ci
                              );
                              updateTask(selectedTask.id, { checklistItems: updated });
                              setSelectedTask({ ...selectedTask, checklistItems: updated });
                            }}
                          />
                          <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
