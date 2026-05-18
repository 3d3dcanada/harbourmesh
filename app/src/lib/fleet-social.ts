export interface Friend {
  id: string;
  name: string;
  addedAt: string;
  online: boolean;
  lastSeen: string | null;
  position: { latitude: number; longitude: number } | null;
}

export interface FleetActivity {
  id: string;
  friendId: string;
  friendName: string;
  type: 'departed' | 'arrived' | 'anchored' | 'waypoint' | 'alert';
  message: string;
  timestamp: string;
  position?: { latitude: number; longitude: number };
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function blurPosition(lat: number, lon: number): { latitude: number; longitude: number } {
  return {
    latitude: Number(lat.toFixed(2)),
    longitude: Number(lon.toFixed(2)),
  };
}
