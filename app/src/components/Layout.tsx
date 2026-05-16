/**
 * HarborMesh - Main Layout Component
 * Provides the application shell with sidebar navigation and theme support
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, useVesselStore } from '@/store';
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

const bottomNavItems: NavItem[] = [
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
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const unreadCount = notifications.filter((n) => !n.read).length;
  
  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };
  
  const renderNavItem = (item: NavItem, isCollapsed: boolean = false) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;
    
    return (
      <TooltipProvider key={item.id} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 group',
                'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/50',
                isActive 
                  ? 'bg-accent text-accent-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-transform',
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
                  {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Anchor className="h-5 w-5 text-white" />
          </div>
          <div className={cn(
            'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background',
            connectionStatus === 'online' ? 'bg-emerald-500' : 
            connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
          )} />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg tracking-tight truncate">HarborMesh</h1>
            <p className="text-xs text-muted-foreground truncate">
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
        
        {/* Connection status */}
        {!isCollapsed && (
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
        <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
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
            
            {/* Current vessel */}
            {currentVessel && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[120px]">{currentVessel.name}</span>
              </div>
            )}
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn(
              'min-h-full',
              ['navigation', 'map', 'inventory', 'documents', 'logs', 'community', 'vessel'].includes(activeView)
                ? 'p-2 lg:p-3'
                : 'p-4 lg:p-6',
            )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
