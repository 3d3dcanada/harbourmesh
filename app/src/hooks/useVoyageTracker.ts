import { useEffect, useRef, useState } from 'react';
import { VoyageTracker, type VoyageSnapshot, type VoyageState } from '@/lib/voyage-tracker';
import { useTelemetryStore, useLogTaskStore, useVesselStore } from '@/store';
import type { LogEntry } from '@/types';

export function useVoyageTracker(enabled: boolean) {
  const latestPosition = useTelemetryStore((s) => s.latestPosition);
  const latestEngine = useTelemetryStore((s) => s.latestEngine);
  const addLog = useLogTaskStore((s) => s.addLog);
  const currentVessel = useVesselStore((s) => s.currentVessel);
  const [voyageState, setVoyageState] = useState<VoyageState>('idle');
  const [snapshot, setSnapshot] = useState<VoyageSnapshot | null>(null);
  const trackerRef = useRef<VoyageTracker | null>(null);

  useEffect(() => {
    if (!enabled) {
      trackerRef.current = null;
      setVoyageState('idle');
      setSnapshot(null);
      return;
    }

    trackerRef.current = new VoyageTracker((logData) => {
      const vesselId = currentVessel?.id ?? '';
      if (!vesselId) return;
      const now = new Date().toISOString();
      const log: LogEntry = {
        ...logData,
        id: crypto.randomUUID(),
        vesselId,
        createdAt: now,
        updatedAt: now,
      };
      addLog(log);
    });

    return () => { trackerRef.current = null; };
  }, [enabled, currentVessel?.id, addLog]);

  useEffect(() => {
    if (!trackerRef.current || !latestPosition || !enabled) return;

    const engineHours: Record<string, number> = {};
    for (const [id, data] of Object.entries(latestEngine)) {
      if (typeof data === 'object' && data && 'hours' in data) {
        engineHours[id] = (data as { hours: number }).hours ?? 0;
      }
    }

    if (!latestPosition.latitude || !latestPosition.longitude) return;

    trackerRef.current.update(latestPosition, engineHours);
    setVoyageState(trackerRef.current.getState());
    setSnapshot(trackerRef.current.getSnapshot());
  }, [latestPosition, latestEngine, enabled]);

  return { voyageState, snapshot, isUnderway: voyageState === 'underway' || voyageState === 'departing' };
}
