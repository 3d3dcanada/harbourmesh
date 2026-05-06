/**
 * HarborMesh - Dashboard Section
 * Main overview screen showing vessel status, alerts, and quick actions
 */

import React from 'react';
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
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatCoordinate, formatHeading, formatRelativeTime } from '@/lib/utils';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useLogTaskStore, useDocumentStore, useVesselStore, useAppStore } from '@/store';
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
    good: 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    warning: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    critical: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    neutral: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800',
  };
  
  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn(
            'p-2.5 rounded-xl border',
            statusColors[status]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-emerald-500' : 
              trend === 'down' ? 'text-red-500' : 'text-slate-500'
            )}>
              <TrendingUp className={cn(
                'h-3.5 w-3.5',
                trend === 'down' && 'rotate-180'
              )} />
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
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
    warning: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' },
    critical: { icon: AlertTriangle, color: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
    info: { icon: Activity, color: 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  };
  
  const { icon: Icon, color } = typeConfig[type];
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{title}</h4>
          {timestamp && (
            <span className="text-xs text-muted-foreground">{formatRelativeTime(timestamp)}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
        {action && (
          <Button variant="link" size="sm" className="h-auto p-0 mt-1" onClick={action.onClick}>
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
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate">{log.summary}</h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatRelativeTime(log.timestamp)}
          </span>
        </div>
        {log.details && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{log.details}</p>
        )}
        {log.position && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
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
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className={cn(
        'p-2 rounded-lg',
        task.status === 'complete' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' :
        isOverdue ? 'bg-red-50 text-red-500 dark:bg-red-950/30' :
        task.status === 'in_progress' ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' :
        'bg-amber-50 text-amber-500 dark:bg-amber-950/30'
      )}>
        <ClipboardList className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            'font-medium text-sm truncate',
            task.status === 'complete' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] h-5">Overdue</Badge>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Due {formatRelativeTime(task.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { latestPosition, latestMotion, latestEnvironment, latestEngine } = useTelemetry();
  const { logs, tasks } = useLogTaskStore();
  const { documents } = useDocumentStore();
  const { currentVessel } = useVesselStore();
  const { setActiveView } = useAppStore();
  
  // Get recent items
  const recentLogs = logs.slice(0, 5);
  const openTasks = tasks.filter((t) => t.status !== 'complete').slice(0, 5);
  const expiringDocs = documents.filter((d) => {
    if (!d.metadata.expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(d.metadata.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).slice(0, 3);
  
  // Calculate engine hours from first engine
  const firstEngine = Object.entries(latestEngine)[0];
  const engineHours = firstEngine ? firstEngine[1].hours : 0;
  
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentVessel ? currentVessel.name : 'Welcome to HarborMesh'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentVessel 
              ? `${currentVessel.type.replace(/_/g, ' ')} • Last updated ${formatRelativeTime(new Date().toISOString())}`
              : 'Your complete vessel management system'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveView('logs')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            New Log
          </Button>
          <Button size="sm" onClick={() => setActiveView('navigation')}>
            <Compass className="h-4 w-4 mr-2" />
            Navigation
          </Button>
        </div>
      </div>
      
      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Position"
          value={latestPosition 
            ? `${formatCoordinate(latestPosition.latitude, 'lat').split(' ')[0]} ${formatCoordinate(latestPosition.longitude, 'lon').split(' ')[0]}`
            : '--'
          }
          icon={MapPin}
          status="good"
          onClick={() => setActiveView('navigation')}
        />
        <StatCard
          title="Speed"
          value={latestPosition?.sog?.toFixed(1) || '--'}
          unit="kn"
          icon={Navigation}
          status={latestPosition && latestPosition.sog && latestPosition.sog > 0 ? 'good' : 'neutral'}
        />
        <StatCard
          title="Heading"
          value={latestMotion ? formatHeading(latestMotion.yaw).split(' ')[0] : '--'}
          icon={Compass}
          status="good"
        />
        <StatCard
          title="Depth"
          value={latestEnvironment?.depth?.toFixed(1) || '--'}
          unit="m"
          icon={Droplets}
          status={latestEnvironment?.depth && latestEnvironment.depth < 5 ? 'warning' : 'good'}
        />
        <StatCard
          title="Wind"
          value={latestEnvironment?.windSpeed?.toFixed(0) || '--'}
          unit="kn"
          icon={Wind}
          status="good"
        />
        <StatCard
          title="Engine"
          value={engineHours.toFixed(1)}
          unit="hrs"
          icon={Gauge}
          status="good"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Alerts & Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    System Status
                  </CardTitle>
                  <CardDescription>Current vessel systems and alerts</CardDescription>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-200">
                  All Systems Normal
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <AlertItem
                  type="info"
                  title="GPS Signal"
                  message="Strong signal with 12 satellites in view. Position accuracy within 3 meters."
                />
                {expiringDocs.length > 0 && (
                  <AlertItem
                    type="warning"
                    title="Documents Expiring"
                    message={`${expiringDocs.length} document(s) expire within 30 days. Review and renew as needed.`}
                    action={{ label: 'View Documents', onClick: () => setActiveView('documents') }}
                  />
                )}
                {openTasks.length > 0 && (
                  <AlertItem
                    type="info"
                    title={`${openTasks.length} Open Tasks`}
                    message="Maintenance and operational tasks pending completion."
                    action={{ label: 'View Tasks', onClick: () => setActiveView('logs') }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest logs and events</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveView('logs')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentLogs.length > 0 ? (
                <ScrollArea className="h-[280px]">
                  <div className="pr-4">
                    {recentLogs.map((log) => (
                      <ActivityItem key={log.id} log={log} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No recent activity</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveView('logs')}>
                    Create First Log
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Tasks & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" onClick={() => setActiveView('logs')}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Add Log
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveView('inventory')}>
                  <Package className="h-4 w-4 mr-2" />
                  Find Item
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveView('documents')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Doc
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveView('ai')}>
                  <Anchor className="h-4 w-4 mr-2" />
                  Ask AI
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Pending Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    Pending Tasks
                  </CardTitle>
                  <CardDescription>{openTasks.length} tasks require attention</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {openTasks.length > 0 ? (
                <ScrollArea className="h-[240px]">
                  <div className="pr-4">
                    {openTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">All tasks completed!</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Inventory Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="font-medium">247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Categories</span>
                  <span className="font-medium">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Low Stock</span>
                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-200">3 items</Badge>
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveView('inventory')}>
                  Manage Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
