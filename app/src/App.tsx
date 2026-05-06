import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/sections/Dashboard';
import { VesselView } from '@/sections/VesselView';
import { BoatMap } from '@/sections/BoatMap';
import { Inventory } from '@/sections/Inventory';
import { Documents } from '@/sections/Documents';
import { LogsTasks } from '@/sections/LogsTasks';
import { Navigation } from '@/sections/Navigation';
import { Community } from '@/sections/Community';
import { AICompanion } from '@/sections/AICompanion';
import { Settings } from '@/sections/Settings';
import { Fleet } from '@/sections/Fleet';
import { Onboarding } from '@/sections/Onboarding';
import { useAppStore, useOnboardingStore } from '@/store';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

function ViewRenderer() {
  const { activeView } = useAppStore();

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

  return (
    <div className={cn('min-h-screen', effectiveTheme === 'night' ? 'dark' : '')}>
      <Layout>
        <ViewRenderer />
      </Layout>
    </div>
  );
}

export default App;
