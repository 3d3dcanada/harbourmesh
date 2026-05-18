import { useEffect, useState } from 'react';
import { Navigation, Compass, Activity, Wind } from 'lucide-react';
import type { PhoneSensorManager, PhoneSensorState } from '@/lib/phone-sensors';
import { cn } from '@/lib/utils';

interface SensorStatusBarProps {
  manager: PhoneSensorManager | null;
}

interface SensorDot {
  label: string;
  icon: React.ElementType;
  active: boolean;
  error: string | null;
}

export function SensorStatusBar({ manager }: SensorStatusBarProps) {
  const [state, setState] = useState<PhoneSensorState | null>(null);

  useEffect(() => {
    if (!manager) {
      setState(null);
      return;
    }

    setState(manager.getState());
    const interval = setInterval(() => {
      setState(manager.getState());
    }, 2000);

    return () => clearInterval(interval);
  }, [manager]);

  if (!state) return null;

  const sensors: SensorDot[] = [
    {
      label: 'GPS',
      icon: Navigation,
      active: state.activeSensors.includes('geolocation'),
      error: state.errors.geolocation ?? null,
    },
    {
      label: 'Compass',
      icon: Compass,
      active: state.activeSensors.includes('orientation'),
      error: state.errors.orientation ?? null,
    },
    {
      label: 'Motion',
      icon: Activity,
      active: state.activeSensors.includes('motion'),
      error: state.errors.motion ?? null,
    },
    {
      label: 'Baro',
      icon: Wind,
      active: state.activeSensors.includes('barometer'),
      error: state.errors.barometer ?? null,
    },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/50 border-b text-xs">
      {sensors.map((sensor) => {
        const Icon = sensor.icon;
        const color = sensor.active
          ? 'text-emerald-500'
          : sensor.error
            ? 'text-red-500'
            : 'text-amber-500';

        return (
          <div key={sensor.label} className="flex items-center gap-1" title={sensor.error ?? undefined} role="status" aria-label={`${sensor.label}: ${sensor.active ? 'active' : sensor.error ? 'error' : 'inactive'}`}>
            <div className={cn('h-2 w-2 rounded-full', sensor.active ? 'bg-emerald-500' : sensor.error ? 'bg-red-500' : 'bg-amber-500')} />
            <Icon className={cn('h-3 w-3', color)} />
            <span className="text-muted-foreground">{sensor.label}</span>
          </div>
        );
      })}
      {state.wakeLockActive && (
        <span className="ml-auto text-muted-foreground">Wake Lock</span>
      )}
      {state.batteryLevel != null && (
        <span className={cn('text-muted-foreground', state.batteryLevel < 0.15 && !state.batteryCharging && 'text-red-500')}>
          {Math.round(state.batteryLevel * 100)}%
        </span>
      )}
    </div>
  );
}
