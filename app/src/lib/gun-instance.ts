// Singleton Gun instance shared by mesh-sync and community-mesh-sync.
// A single Gun instance means a single set of WebSocket/WebRTC connections to relays.

import Gun from 'gun';
import 'gun/lib/rindexed'; // IndexedDB persistence for offline-first

// Minimal type shim for the Gun instance. Gun ships without full TS coverage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GunNode = any;
export interface GunInstance {
  get(path: string): GunNode;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(): void;
}

let _gun: GunInstance | null = null;

export function getGunInstance(peers: string[] = []): GunInstance {
  if (_gun) return _gun;

  _gun = Gun({
    peers,
    localStorage: false, // use IndexedDB only (rindexed)
    radisk: true,
    multicast: false,
    ws: { path: '/gun' },
  }) as unknown as GunInstance;

  return _gun;
}
