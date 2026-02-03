/**
 * HarborMesh - Main Application Component
 * AI-Powered Boating Ecosystem Platform
 */

import React, { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/sections/Dashboard';
import { VesselView } from '@/sections/VesselView';
import { BoatMap } from '@/sections/BoatMap';
import { Documents } from '@/sections/Documents';
import { LogsTasks } from '@/sections/LogsTasks';
import { Navigation } from '@/sections/Navigation';
import { Community } from '@/sections/Community';
import { AICompanion } from '@/sections/AICompanion';
import { Settings } from '@/sections/Settings';
import { Fleet } from '@/sections/Fleet';
import { Onboarding } from '@/sections/Onboarding';
import { useAppStore, useOnboardingStore } from '@/store';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

// View renderer based on active view
function ViewRenderer() {
  const { activeView } = useAppStore();
  
  switch (activeView) {
    case 'dashboard':
      return <Dashboard />;
    case 'vessel':
      return <VesselView />;
    case 'map':
    case 'inventory':
      return <BoatMap />;
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
  const { isOnboarding, startOnboarding } = useOnboardingStore();
  const { effectiveTheme } = useTheme();
  
  // Initialize telemetry connection
  useTelemetry({ autoConnect: true });
  
  // Check if first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('harbormesh-visited');
    if (!hasVisited) {
      startOnboarding();
      localStorage.setItem('harbormesh-visited', 'true');
    }
  }, [startOnboarding]);
  
  return (
    <div className={cn(
      'min-h-screen',
      effectiveTheme === 'night' ? 'dark' : ''
    )}>
      <Layout>
        <ViewRenderer />
      </Layout>
    </div>
  );
}

export default App;
