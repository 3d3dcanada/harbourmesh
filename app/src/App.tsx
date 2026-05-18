import { lazy, Suspense, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { AuthGate } from '@/components/AuthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardSkeleton, NavigationSkeleton, SectionSkeleton } from '@/components/Skeleton';
import { useAppStore, useOnboardingStore, useSettingsStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { meshSyncClient } from '@/lib/mesh-sync';
import { communityMeshSync } from '@/lib/community-mesh-sync';
import { setSyncGroupId } from '@/lib/device-sync';

const Dashboard = lazy(() => import('@/sections/Dashboard').then((module) => ({ default: module.Dashboard })));
const VesselView = lazy(() => import('@/sections/VesselView').then((module) => ({ default: module.VesselView })));
const BoatMap = lazy(() => import('@/sections/boatmap/BoatMap').then((module) => ({ default: module.BoatMap })));
const Inventory = lazy(() => import('@/sections/Inventory').then((module) => ({ default: module.Inventory })));
const Documents = lazy(() => import('@/sections/Documents').then((module) => ({ default: module.Documents })));
const LogsTasks = lazy(() => import('@/sections/LogsTasks').then((module) => ({ default: module.LogsTasks })));
const Navigation = lazy(() => import('@/sections/Navigation').then((module) => ({ default: module.Navigation })));
const Community = lazy(() => import('@/sections/Community').then((module) => ({ default: module.Community })));
const AICompanion = lazy(() => import('@/sections/AICompanion').then((module) => ({ default: module.AICompanion })));
const Settings = lazy(() => import('@/sections/Settings').then((module) => ({ default: module.Settings })));
const Fleet = lazy(() => import('@/sections/Fleet').then((module) => ({ default: module.Fleet })));
const Onboarding = lazy(() => import('@/sections/Onboarding').then((module) => ({ default: module.Onboarding })));
const Pricing = lazy(() => import('@/sections/Pricing').then((module) => ({ default: module.Pricing })));
const Updates = lazy(() => import('@/sections/Updates').then((module) => ({ default: module.Updates })));
const Legal = lazy(() => import('@/sections/Legal').then((module) => ({ default: module.Legal })));

function ViewFallback({ view }: { view: string }) {
  if (view === 'dashboard') return <DashboardSkeleton />;
  if (view === 'navigation') return <NavigationSkeleton />;
  return <SectionSkeleton />;
}

function ViewRenderer() {
  const { activeView } = useAppStore();
  const prevViewRef = useRef(activeView);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevViewRef.current !== activeView && containerRef.current) {
      containerRef.current.classList.remove('view-enter');
      void containerRef.current.offsetWidth;
      containerRef.current.classList.add('view-enter');
    }
    prevViewRef.current = activeView;
  }, [activeView]);

  return (
    <div ref={containerRef} className="view-enter">
      <Suspense fallback={<ViewFallback view={activeView} />}>
        {(() => {
          const wrap = (label: string, node: React.ReactNode) => (
            <ErrorBoundary fallbackLabel={label}>{node}</ErrorBoundary>
          );
          switch (activeView) {
            case 'dashboard':
              return wrap('Dashboard', <Dashboard />);
            case 'vessel':
              return wrap('Vessel', <VesselView />);
            case 'map':
              return wrap('Boat Map', <BoatMap />);
            case 'inventory':
              return wrap('Inventory', <Inventory />);
            case 'documents':
              return wrap('Documents', <Documents />);
            case 'logs':
            case 'tasks':
              return wrap('Logs & Tasks', <LogsTasks />);
            case 'navigation':
              return wrap('Navigation', <Navigation />);
            case 'community':
              return wrap('Community', <Community />);
            case 'ai':
              return wrap('AI Companion', <AICompanion />);
            case 'settings':
              return wrap('Settings', <Settings />);
            case 'fleet':
              return wrap('Fleet', <Fleet />);
            case 'onboarding':
              return wrap('Onboarding', <Onboarding />);
            case 'pricing':
              return wrap('Pricing', <Pricing />);
            case 'updates':
              return wrap('Updates', <Updates />);
            case 'legal':
              return wrap('Legal', <Legal />);
            default:
              return wrap('Dashboard', <Dashboard />);
          }
        })()}
      </Suspense>
    </div>
  );
}

function App() {
  const { startOnboarding } = useOnboardingStore();
  const { effectiveTheme } = useTheme();
  const { checkSession } = useAuthStore();
  const { addNotification } = useAppStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncGroup = params.get('sync');
    if (syncGroup) {
      setSyncGroupId(syncGroup);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const hasVisited = localStorage.getItem('harbormesh-visited');

    if (!hasVisited) {
      startOnboarding();
      localStorage.setItem('harbormesh-visited', 'true');
    }
  }, [startOnboarding]);

  const { setConnectionStatus } = useAppStore();

  useEffect(() => {
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');

    const handleOnline = () => {
      setConnectionStatus('online');
      addNotification({ type: 'success', title: 'Back Online', message: 'Network connection restored.' });
    };
    const handleOffline = () => {
      setConnectionStatus('offline');
      addNotification({ type: 'warning', title: 'Offline', message: 'Network lost. Cached data still available.' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addNotification, setConnectionStatus]);

  useEffect(() => {
    meshSyncClient.start();
    communityMeshSync.init(meshSyncClient.getGun());
    return () => meshSyncClient.stop();
  }, []);

  const boatNode = useSettingsStore((s) => s.boatNode);
  const demoModeEnabled = useSettingsStore((s) => s.demoModeEnabled);
  const updateBoatNodeSettings = useSettingsStore((s) => s.updateBoatNodeSettings);
  useEffect(() => {
    const isFakeMode = boatNode.telemetryMode === 'replay' || boatNode.telemetryMode === 'simulated';
    if (isFakeMode && !demoModeEnabled && 'geolocation' in navigator) {
      updateBoatNodeSettings({ telemetryMode: 'phone' });
    }
  }, [boatNode.telemetryMode, demoModeEnabled, updateBoatNodeSettings]);

  return (
    <AuthGate>
      <div className={cn('min-h-screen', effectiveTheme === 'night' ? 'dark' : '')}>
        <Layout>
          <ViewRenderer />
        </Layout>
      </div>
    </AuthGate>
  );
}

export default App;
