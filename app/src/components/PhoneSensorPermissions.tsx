import { useState, useCallback } from 'react';
import { Smartphone, Navigation, Compass, Activity, Wind, Lock, BatteryWarning, Check, X, AlertTriangle } from 'lucide-react';
import { PhoneSensorManager, type PhoneSensorCapabilities, type PhoneSensorPermissions as Perms } from '@/lib/phone-sensors';

function Badge({ status }: { status: string }) {
  if (status === 'granted' || status === 'true')
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /> Available</span>;
  if (status === 'denied' || status === 'false')
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400"><X className="w-3 h-3" /> Unavailable</span>;
  if (status === 'requires-gesture')
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400"><AlertTriangle className="w-3 h-3" /> Tap to enable</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">Unknown</span>;
}

export function PhoneSensorStatus() {
  const [caps, setCaps] = useState<PhoneSensorCapabilities | null>(null);
  const [perms, setPerms] = useState<Perms | null>(null);
  const [iosGranted, setIosGranted] = useState(false);

  const detect = useCallback(() => {
    const mgr = new PhoneSensorManager({}, () => {}, '', '');
    const detected = mgr.detectCapabilities();
    setCaps(detected);
    mgr.requestPermissions().then(setPerms);
  }, []);

  const handleIOSPermission = useCallback(async () => {
    const mgr = new PhoneSensorManager({}, () => {}, '', '');
    const result = await mgr.requestIOSPermissions();
    setIosGranted(result.orientation === 'granted');
    if (perms) {
      setPerms({
        ...perms,
        deviceOrientation: result.orientation === 'granted' ? 'granted' : 'denied',
        deviceMotion: result.motion === 'granted' ? 'granted' : 'denied',
      });
    }
  }, [perms]);

  if (!caps) {
    return (
      <div className="mt-3 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-sky-400" />
          <span className="font-medium text-sm text-white">Phone Sensor Status</span>
        </div>
        <button
          type="button"
          onClick={detect}
          className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
        >
          Detect Available Sensors
        </button>
      </div>
    );
  }

  const needsIOSPermission = perms?.deviceOrientation === 'requires-gesture' && !iosGranted;

  return (
    <div className="mt-3 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-sky-400" />
        <span className="font-medium text-sm text-white">Phone Sensor Status</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><Navigation className="w-3.5 h-3.5" /> GPS Position & Speed</span>
          <Badge status={String(caps.geolocation)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><Compass className="w-3.5 h-3.5" /> Compass Heading</span>
          <Badge status={perms?.deviceOrientation ?? String(caps.deviceOrientation)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><Activity className="w-3.5 h-3.5" /> Roll / Pitch / Heel</span>
          <Badge status={perms?.deviceMotion ?? String(caps.deviceMotion)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><Wind className="w-3.5 h-3.5" /> Barometric Pressure</span>
          <Badge status={String(caps.barometer)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><Lock className="w-3.5 h-3.5" /> Screen Wake Lock</span>
          <Badge status={String(caps.wakeLock)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-300"><BatteryWarning className="w-3.5 h-3.5" /> Battery Monitor</span>
          <Badge status={String(caps.battery)} />
        </div>
      </div>

      {needsIOSPermission && (
        <button
          type="button"
          onClick={handleIOSPermission}
          className="mt-3 w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Enable Compass & Motion (iOS requires tap)
        </button>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Switch to Phone Sensors mode above, then sensors activate automatically when the dashboard connects.
      </p>
    </div>
  );
}
