/**
 * HarborMesh - Main Layout Component
 * Provides the application shell with sidebar navigation and theme support
 */

import React, { useState, useEffect } from 'react';
import {
  Ship,
  Map,
  Package,
  FileText,
  ClipboardList,
  Compass,
  Users,
  Bot,
  Settings,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  ChevronRight,
  Anchor,
  LayoutDashboard,
  MoreHorizontal,
  CreditCard,
  Megaphone,
  Scale,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useAppStore, useVesselStore, useSettingsStore } from '@/store';
import { SensorStatusBar } from '@/components/SensorStatusBar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useVoyageTracker } from '@/hooks/useVoyageTracker';
import { useDeviceSync } from '@/hooks/useDeviceSync';
import { getSyncGroupId } from '@/lib/device-sync';
import { replayPendingRequests, getPendingCount } from '@/lib/offline-sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ViewType } from '@/types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  badge?: number;
  description?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Vessel overview and status' },
  { id: 'vessel', label: 'Vessel', icon: Ship, description: 'Digital twin and details' },
  { id: 'map', label: 'Boat Map', icon: Map, description: 'Layout and spaces' },
  { id: 'inventory', label: 'Inventory', icon: Package, description: 'Items and storage' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Manuals and certificates' },
  { id: 'logs', label: 'Logs & Tasks', icon: ClipboardList, description: 'Records and maintenance' },
  { id: 'navigation', label: 'Navigation', icon: Compass, description: 'HUD and charts' },
  { id: 'community', label: 'Community', icon: Users, description: 'Network and telemetry' },
  { id: 'ai', label: 'AI Companion', icon: Bot, description: 'Assistant and guidance' },
];

declare const __APP_VERSION__: string;

const bottomNavItems: NavItem[] = [
  { id: 'updates', label: 'Updates', icon: Megaphone, description: 'Changelog and version info' },
  { id: 'pricing', label: 'Pricing', icon: CreditCard, description: 'Plans and features' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences and configuration' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { effectiveTheme, toggleTheme, isNight } = useTheme();
  const { 
    sidebarOpen, 
    toggleSidebar, 
    activeView, 
    setActiveView, 
    connectionStatus, 
    notifications,
    currentVesselId,
  } = useAppStore();
  const currentVessel = useVesselStore((state) => (
    state.currentVessel ?? state.vessels.find((vessel) => vessel.id === currentVesselId) ?? null
  ));
  
  const boatNode = useSettingsStore((state) => state.boatNode);
  const { phoneSensorManager } = useTelemetry({ autoConnect: false });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const voyageEnabled = Boolean(currentVessel);
  const { voyageState, snapshot, isUnderway } = useVoyageTracker(voyageEnabled);

  const syncEnabled = Boolean(currentVessel) && Boolean(getSyncGroupId());
  const { syncStatus } = useDeviceSync(syncEnabled);

  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const isOffline = connectionStatus === 'offline';

  useEffect(() => {
    const checkPending = () => getPendingCount().then(setPendingSyncCount).catch(() => {});
    checkPending();
    const interval = setInterval(checkPending, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connectionStatus === 'online' && pendingSyncCount > 0) {
      replayPendingRequests().then(() => getPendingCount().then(setPendingSyncCount));
    }
  }, [connectionStatus, pendingSyncCount]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  
  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };
  
  const navIconAccent: Partial<Record<ViewType, string>> = {
    dashboard: 'text-primary',
    vessel: 'text-cyan-500',
    map: 'text-emerald-500',
    inventory: 'text-amber-500',
    documents: 'text-violet-500',
    logs: 'text-orange-500',
    navigation: 'text-sky-500',
    community: 'text-pink-500',
    ai: 'text-purple-500',
    settings: 'text-slate-500',
  };

  const renderNavItem = (item: NavItem, isCollapsed: boolean = false) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;
    const iconColor = navIconAccent[item.id] ?? 'text-muted-foreground';

    return (
      <TooltipProvider key={item.id} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 group',
                'hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/30',
                isActive
                  ? 'bg-primary/10 text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-transform',
                isActive ? iconColor : 'text-muted-foreground group-hover:text-foreground',
                isActive && 'scale-110',
                !isActive && 'group-hover:scale-105'
              )} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 opacity-40" />}
                </>
              )}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b',
        isCollapsed && 'justify-center px-2'
      )}>
        <div className="relative">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Anchor className="h-5 w-5 text-white" />
          </div>
          <div className={cn(
            'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card',
            connectionStatus === 'online' ? 'bg-emerald-500' :
            connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
          )} />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg tracking-tight truncate">HarborMesh</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {connectionStatus === 'online' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className={cn('space-y-1', isCollapsed ? 'px-2' : 'px-3')}>          
          {/* Main nav items */}
          <div className="space-y-0.5">
            {navItems.map((item) => renderNavItem(item, isCollapsed))}
          </div>
          
          {/* Divider */}
          {!isCollapsed && <div className="my-3 border-t" />}
          
          {/* Bottom nav items */}
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => renderNavItem(item, isCollapsed))}
          </div>
        </nav>
      </ScrollArea>
      
      {/* Footer */}
      <div className={cn(
        'border-t p-3 space-y-2',
        isCollapsed && 'px-2'
      )}>
        {/* Theme toggle */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'sm'}
                onClick={toggleTheme}
                className={cn(
                  'w-full justify-start gap-2',
                  isCollapsed && 'justify-center'
                )}
              >
                {isNight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {!isCollapsed && <span className="text-xs">{isNight ? 'Day Mode' : 'Night Mode'}</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                {isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        {/* Connection & Sync status */}
        {!isCollapsed && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
              {connectionStatus === 'online' ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {connectionStatus === 'online' ? 'Online' : 'Offline Mode'}
              </span>
            </div>
            {syncStatus.connected && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-cyan-500/10">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  Synced{syncStatus.deviceCount > 1 ? ` (${syncStatus.deviceCount} devices)` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Version + Legal */}
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
            </span>
            <button
              onClick={() => handleNavClick('legal')}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Legal
            </button>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className={cn(
      'min-h-screen flex',
      effectiveTheme === 'night' ? 'night-mode' : 'day-mode'
    )}>
      {/* Desktop Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'hidden lg:flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <SidebarContent isCollapsed={!sidebarOpen} />
      </aside>
      
      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            
            {/* Current view title */}
            <div className="flex items-center gap-2">
              {(() => {
                const item = [...navItems, ...bottomNavItems].find((i) => i.id === activeView);
                const Icon = item?.icon || Ship;
                return (
                  <>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold">{item?.label || 'HarborMesh'}</h2>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Feedback */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setFeedbackOpen(true)}>
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send Feedback</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Active voyage indicator */}
            {isUnderway && snapshot && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {snapshot.totalDistance.toFixed(1)} nm
                </span>
              </div>
            )}

            {/* Current vessel */}
            {currentVessel && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[120px]">{currentVessel.name}</span>
              </div>
            )}
          </div>
        </header>
        
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-[max(1rem,env(safe-area-inset-left))] py-1.5 flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Offline — changes saved locally
              {pendingSyncCount > 0 && ` (${pendingSyncCount} pending)`}
            </span>
          </div>
        )}

        {/* Phone Sensor Status */}
        {boatNode.telemetryMode === 'phone' && (
          <SensorStatusBar manager={phoneSensorManager} />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className={cn(
              'min-h-full',
              ['navigation', 'map', 'inventory', 'documents', 'logs', 'community', 'vessel'].includes(activeView)
                ? 'p-2 lg:p-3'
                : 'p-4 lg:p-6',
            )}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav activeView={activeView} onNavigate={handleNavClick} />
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

const mobileBottomTabs: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'navigation', label: 'Navigate', icon: Compass },
  { id: 'logs', label: 'Logs', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

const moreItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'vessel', label: 'Vessel', icon: Ship },
  { id: 'map', label: 'Boat Map', icon: Map },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'ai', label: 'AI Companion', icon: Bot },
  { id: 'fleet', label: 'Fleet', icon: Anchor },
  { id: 'updates', label: 'Updates', icon: Megaphone },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function MobileBottomNav({ activeView, onNavigate }: { activeView: string; onNavigate: (view: ViewType) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => item.id === activeView);

  return (
    <>
      <nav role="navigation" aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-stretch justify-around border-t bg-card/95 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 min-h-[3.5rem] transition-colors touch-manipulation',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-2 min-h-[3.5rem] transition-colors touch-manipulation',
            isMoreActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 leading-none">More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="p-0 rounded-t-xl">
          <div className="p-4 space-y-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors touch-manipulation',
                    active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
