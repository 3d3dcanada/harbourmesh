/**
 * HarborMesh - Dashboard Section
 * Main overview screen showing vessel status, alerts, and quick actions
 */

import React, { useState } from 'react';
import { useMemo } from 'react';
import {
  MapPin,
  Wind,
  Droplets,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  ClipboardList,
  TrendingUp,
  Activity,
  Anchor,
  Compass,
  Gauge,
  Waves,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIAssistButton } from '@/components/AIAssistButton';
import { cn, formatCoordinate, formatHeading, formatRelativeTime } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';
import { resolveHeading } from '@/lib/heading';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useLogTaskStore, useDocumentStore, useSettingsStore, useVesselStore, useAppStore } from '@/store';
import { getNearestTideInfo, type NearestTideInfo } from '@/lib/tide-service';
import type { LogEntry, Task } from '@/types';

// Quick stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  onClick?: () => void;
}

function StatCard({ title, value, unit, icon: Icon, trend, trendValue, status = 'neutral', onClick }: StatCardProps) {
  const statusColors = {
    good: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
    neutral: 'text-muted-foreground',
  };
  
  return (
    <div
      className={cn(
        'flex flex-col justify-center px-3 py-2.5 border rounded-xl bg-card shadow-xs min-w-0',
        'border-l-[3px]',
        status === 'good' ? 'border-l-emerald-500' :
        status === 'warning' ? 'border-l-amber-500' :
        status === 'critical' ? 'border-l-red-500' :
        'border-l-primary/30',
        onClick && 'cursor-pointer hover:bg-surface-2 hover:shadow-sm transition-all'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", statusColors[status])} />
          <span className="truncate">{title}</span>
        </div>
        {trend && (
          <div className={cn(
            'flex items-center text-[10px] font-medium ml-2 shrink-0',
            trend === 'up' ? 'text-emerald-500' :
            trend === 'down' ? 'text-red-500' : 'text-slate-500'
          )}>
            <TrendingUp className={cn('h-3 w-3 mr-0.5', trend === 'down' && 'rotate-180')} />
            {trendValue}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black tracking-tight truncate">{value}</span>
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

// Alert item component
interface AlertItemProps {
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp?: string;
  action?: { label: string; onClick: () => void };
}

function AlertItem({ type, title, message, timestamp, action }: AlertItemProps) {
  const typeConfig = {
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
    critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
    info: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  };
  
  const { icon: Icon, color, bg } = typeConfig[type];
  
  return (
    <div className={cn("flex items-start gap-2 p-2.5 rounded-md border text-sm", bg)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-xs text-foreground">{title}</h4>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{formatRelativeTime(timestamp)}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        {action && (
          <Button variant="link" size="sm" className={cn("h-auto p-0 mt-1 text-xs", color)} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Recent activity item
function ActivityItem({ log }: { log: LogEntry }) {
  const typeIcons: Record<string, React.ElementType> = {
    voyage: Navigation,
    engine_hours: Gauge,
    maintenance: CheckCircle2,
    incident: AlertTriangle,
    inspection: ClipboardList,
    fueling: Droplets,
    weather_observation: Wind,
    crew_change: Activity,
    system_check: Zap,
  };
  
  const Icon = typeIcons[log.type] || Activity;
  
  return (
    <div className="flex items-start gap-2.5 py-2 border-b last:border-0 border-muted/50">
      <div className="p-1.5 rounded-md bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-xs truncate text-foreground">{log.summary}</h4>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 shrink-0">
            {formatRelativeTime(log.timestamp)}
          </span>
        </div>
        {log.details && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{log.details}</p>
        )}
        {log.position && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {formatCoordinate(log.position.latitude, 'lat')}, {formatCoordinate(log.position.longitude, 'lon')}
          </div>
        )}
      </div>
    </div>
  );
}

// Task item component
function TaskItem({ task }: { task: Task }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'complete';
  
  return (
    <div className="flex items-start gap-2.5 py-2 border-b last:border-0 border-muted/50">
      <div className={cn(
        'p-1.5 rounded-md shrink-0',
        task.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' :
        isOverdue ? 'bg-red-500/10 text-red-500' :
        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
        'bg-amber-500/10 text-amber-500'
      )}>
        <ClipboardList className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            'font-medium text-xs truncate',
            task.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>
            {task.title}
          </h4>
          {isOverdue && (
            <Badge variant="destructive" className="text-[9px] font-medium px-1 h-4 shrink-0 ml-2">Overdue</Badge>
          )}
        </div>
        {task.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Due {formatRelativeTime(task.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [editMode, setEditMode] = useState(false);
  const { logs, tasks } = useLogTaskStore();
  const { documents } = useDocumentStore();
  const { currentVessel, items } = useVesselStore();
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const telemetryEnabled = Boolean(currentVessel) || demoModeEnabled;
  const { latestPosition, latestMotion, latestEnvironment, latestEngine } = useTelemetry({ autoConnect: telemetryEnabled });
  const resolvedHead = resolveHeading(latestMotion?.yaw, latestPosition?.cog, latestPosition?.sog);
  const { setActiveView } = useAppStore();
  
  // Get recent items
  const recentLogs = logs.slice(0, 5);
  const openTasks = tasks.filter((t) => t.status !== 'complete').slice(0, 5);
  const overdueTasks = tasks.filter((t) => t.status !== 'complete' && t.dueDate && new Date(t.dueDate) < new Date());
  const expiringDocs = documents.filter((d) => {
    if (!d.metadata.expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(d.metadata.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).slice(0, 3);
  
  // Calculate engine hours from first engine
  const firstEngine = Object.entries(latestEngine)[0];
  const engineHours = firstEngine ? firstEngine[1].hours : undefined;
  const lowStockItems = items.filter((item) => item.reorderThreshold !== undefined && item.quantity <= item.reorderThreshold);
  const categoryCount = new Set(items.map((item) => item.category)).size;

  const tideInfo = useMemo<NearestTideInfo | null>(() => {
    if (!latestPosition) return null;
    return getNearestTideInfo(latestPosition.latitude, latestPosition.longitude);
  }, [latestPosition?.latitude, latestPosition?.longitude]);

  const nextTideLabel = tideInfo?.nextHigh
    ? `H ${tideInfo.nextHigh.height.toFixed(1)}m`
    : tideInfo?.nextLow
      ? `L ${tideInfo.nextLow.height.toFixed(1)}m`
      : '--';

  const nextTideTime = tideInfo?.nextHigh?.time ?? tideInfo?.nextLow?.time;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)] flex-col gap-3">
      {/* Dense Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card border rounded-xl p-3 shadow-xs shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-600 shadow-sm shadow-primary/20">
            <Anchor className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight truncate leading-none">
              {currentVessel ? currentVessel.name : 'Welcome to HarborMesh'}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate leading-none">
              {currentVessel
                ? `${currentVessel.type.replace(/_/g, ' ')} • Active`
                : 'Setup required'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActiveView('logs')}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Log
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActiveView('documents')}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Doc
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setActiveView('navigation')}>
            <Compass className="h-3.5 w-3.5 mr-1.5" />
            Navigate
          </Button>
          <Button
            variant={editMode ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs hidden md:flex"
            onClick={() => setEditMode(!editMode)}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            {editMode ? 'Done' : 'Customize'}
          </Button>
          <AIAssistButton prompt="Give me a full status report on my vessel" label="Ask AI" />
        </div>
      </div>
      
      {/* Dense Stats Strip */}
      <div className="flex overflow-x-auto gap-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-7 shrink-0 -mx-2 px-2 md:mx-0 md:px-0">
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '0ms' }}>
          <StatCard
            title="Position"
            value={telemetryEnabled && latestPosition
              ? `${latestPosition.latitude.toFixed(4)}° ${latestPosition.longitude.toFixed(4)}°`
              : '--'
            }
            icon={MapPin}
            status="good"
            onClick={() => setActiveView('navigation')}
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '50ms' }}>
          <StatCard
            title="Speed"
            value={telemetryEnabled && latestPosition?.sog ? latestPosition.sog.toFixed(1) : '--'}
            unit="kn"
            icon={Navigation}
            status={latestPosition?.sog && latestPosition.sog > 0 ? 'good' : 'neutral'}
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '100ms' }}>
          <StatCard
            title="Heading"
            value={telemetryEnabled && resolvedHead.source !== 'none' ? formatHeading(resolvedHead.heading).split(' ')[0] : '--'}
            icon={Compass}
            status="good"
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '150ms' }}>
          <StatCard
            title="Depth"
            value={telemetryEnabled ? latestEnvironment?.depth?.toFixed(1) || '--' : '--'}
            unit="m"
            icon={Droplets}
            status={latestEnvironment?.depth && latestEnvironment.depth < 5 ? 'warning' : 'good'}
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '200ms' }}>
          <StatCard
            title="Wind"
            value={telemetryEnabled ? latestEnvironment?.windSpeed?.toFixed(0) || '--' : '--'}
            unit="kn"
            icon={Wind}
            status="good"
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '250ms' }}>
          <StatCard
            title="Tides"
            value={nextTideLabel}
            unit={nextTideTime ? new Date(nextTideTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            icon={Waves}
            status={tideInfo ? 'good' : 'neutral'}
            onClick={() => setActiveView('navigation')}
          />
        </div>
        <div className="card-stagger min-w-[140px] snap-center flex-shrink-0 md:min-w-0 md:flex-shrink" style={{ animationDelay: '300ms' }}>
          <StatCard
            title="Engine"
            value={telemetryEnabled && engineHours !== undefined ? engineHours.toFixed(1) : '--'}
            unit="hrs"
            icon={Gauge}
            status="good"
          />
        </div>
      </div>
      
      {/* Main Content Workspace Grid */}
      <div className={cn(
        "flex flex-1 flex-col lg:flex-row gap-3 min-h-0",
        editMode && "[&>div>div]:border-dashed [&>div>div]:border-blue-400/50"
      )}>
        
        {/* Left Column - System & Activity */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 lg:w-2/3">
          {/* Alerts / System Status */}
          <Card className="flex flex-col border rounded-xl shadow-xs shrink-0">
            <CardHeader className="p-2.5 border-b bg-surface-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-cyan-500" />
                  System Status
                </CardTitle>
                <Badge variant="outline" className={cn("text-[10px] font-medium h-5 px-1.5", currentVessel ? 'text-emerald-500 border-emerald-200' : 'text-amber-500 border-amber-200')}>
                  {currentVessel ? 'Ready' : 'Setup Required'}
                </Badge>
              </div>
            </CardHeader>
            <div className="p-2 space-y-2">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {!currentVessel ? (
                  <AlertItem
                    type="info"
                    title="No Vessel Configured"
                    message="Create a vessel profile before saving data."
                    action={{ label: 'Create Vessel', onClick: () => setActiveView('vessel') }}
                  />
                ) : (
                  <AlertItem
                    type={latestPosition ? 'info' : 'warning'}
                    title={latestPosition ? 'Telemetry Active' : 'No Telemetry'}
                    message={latestPosition ? 'Position updates receiving.' : 'Configure Signal K.'}
                    action={{ label: 'Navigation', onClick: () => setActiveView('navigation') }}
                  />
                )}
                {expiringDocs.length > 0 && (
                  <AlertItem
                    type="warning"
                    title="Docs Expiring"
                    message={`${expiringDocs.length} document(s) expiring soon.`}
                    action={{ label: 'View', onClick: () => setActiveView('documents') }}
                  />
                )}
                {overdueTasks.length > 0 && (
                  <AlertItem
                    type="warning"
                    title={`${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`}
                    message="Tasks past their due date."
                    action={{ label: 'View Tasks', onClick: () => setActiveView('tasks') }}
                  />
                )}
                {overdueTasks.length === 0 && openTasks.length > 0 && (
                  <AlertItem
                    type="info"
                    title={`${openTasks.length} Open Tasks`}
                    message="Maintenance tasks pending."
                    action={{ label: 'View Tasks', onClick: () => setActiveView('tasks') }}
                  />
                )}
              </div>
            </div>
          </Card>
          
          {/* Recent Activity */}
          <Card className="flex-1 flex flex-col border rounded-xl shadow-xs min-h-0">
            <CardHeader className="p-2.5 border-b bg-surface-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setActiveView('logs')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <div className="flex-1 overflow-auto">
              <div className="p-2">
                {recentLogs.length > 0 ? (
                  <div className="space-y-0.5">
                    {recentLogs.map((log) => (
                      <ActivityItem key={log.id} log={log} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Anchor className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">All quiet on the water</p>
                    <p className="text-xs mt-1">Your voyage logs and events will appear here.</p>
                    <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => setActiveView('logs')}>
                      Start Logging
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right Column - Tasks & Inventory */}
        <div className="flex flex-col gap-3 min-h-0 lg:w-1/3 shrink-0">
          
          {/* Pending Tasks */}
          <Card className="flex-1 flex flex-col border rounded-xl shadow-xs min-h-0">
            <CardHeader className="p-2.5 border-b bg-surface-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Pending Tasks
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{openTasks.length}</Badge>
              </div>
            </CardHeader>
            <div className="flex-1 overflow-auto">
              <div className="p-2">
                {openTasks.length > 0 ? (
                  <div className="space-y-0.5">
                    {openTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20 text-emerald-400" />
                    <p className="text-sm font-medium">Ship-shape and Bristol fashion</p>
                    <p className="text-xs mt-1">No pending tasks. Well done, Captain.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Inventory Overview */}
          <Card className="shrink-0 flex flex-col border rounded-xl shadow-xs">
            <CardHeader className="p-2.5 border-b bg-surface-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-500" />
                Inventory Overview
              </CardTitle>
            </CardHeader>
            <div className="p-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Items</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Categories</span>
                  <span className="font-semibold">{categoryCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-semibold">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Low Stock</span>
                  {lowStockItems.length > 0 ? (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">{lowStockItems.length}</Badge>
                  ) : (
                    <span className="font-semibold text-emerald-500">0</span>
                  )}
                </div>
                <Button variant="secondary" size="sm" className="w-full h-7 text-[10px] mt-2" onClick={() => setActiveView('inventory')}>
                  Manage Inventory
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
