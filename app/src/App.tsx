import { lazy, Suspense, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAppStore, useOnboardingStore } from '@/store';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { meshSyncClient } from '@/lib/mesh-sync';
import { communityMeshSync } from '@/lib/community-mesh-sync';

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

function ViewFallback() {
  return <div className="min-h-[20rem]" role="status" aria-busy="true" aria-label="Loading view" />;
}

function ViewRenderer() {
  const { activeView } = useAppStore();

  return (
    <Suspense fallback={<ViewFallback />}>
      {(() => {
        switch (activeView) {
          case 'dashboard':
            return <Dashboard />;
          case 'vessel':
            return <VesselView />;
          case 'map':
            return <BoatMap />;
          case 'inventory':
            return <Inventory />;
          case 'documents':
            return <Documents />;
          case 'logs':
          case 'tasks':
            return <LogsTasks />;
          case 'navigation':
            return <Navigation />;
          case 'community':
            return <Community />;
          case 'ai':
            return <AICompanion />;
          case 'settings':
            return <Settings />;
          case 'fleet':
            return <Fleet />;
          case 'onboarding':
            return <Onboarding />;
          default:
            return <Dashboard />;
        }
      })()}
    </Suspense>
  );
}

function App() {
  const { startOnboarding } = useOnboardingStore();
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    const hasVisited = localStorage.getItem('harbormesh-visited');

    if (!hasVisited) {
      startOnboarding();
      localStorage.setItem('harbormesh-visited', 'true');
    }
  }, [startOnboarding]);

  useEffect(() => {
    meshSyncClient.start();
    communityMeshSync.init(meshSyncClient.getGun());
    return () => meshSyncClient.stop();
  }, []);

  return (
    <div className={cn('min-h-screen', effectiveTheme === 'night' ? 'dark' : '')}>
      <Layout>
        <ViewRenderer />
      </Layout>
    </div>
  );
}

export default App;
