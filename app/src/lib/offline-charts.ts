export interface OfflineRegion {
  id: string;
  name: string;
  bounds: { south: number; west: number; north: number; east: number };
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  downloadedAt: string;
  sizeBytes: number;
}

const CACHE_NAME = 'map-tiles';
const REGIONS_KEY = 'harbormesh-offline-regions';

export const PREDEFINED_REGIONS: Omit<OfflineRegion, 'id' | 'downloadedAt' | 'sizeBytes'>[] = [
  {
    name: 'Saint John & Bay of Fundy',
    bounds: { south: 44.5, west: -67.5, north: 45.6, east: -65.5 },
    minZoom: 7, maxZoom: 14, tileCount: 0,
  },
  {
    name: 'PEI & Northumberland Strait',
    bounds: { south: 45.8, west: -64.5, north: 47.2, east: -61.5 },
    minZoom: 7, maxZoom: 14, tileCount: 0,
  },
  {
    name: 'Halifax & Eastern Shore',
    bounds: { south: 43.8, west: -64.5, north: 45.0, east: -62.0 },
    minZoom: 7, maxZoom: 14, tileCount: 0,
  },
  {
    name: 'Full Maritime Coverage',
    bounds: { south: 43.5, west: -68.0, north: 48.0, east: -59.0 },
    minZoom: 6, maxZoom: 12, tileCount: 0,
  },
];

export function estimateRegionTileCount(
  bounds: { south: number; west: number; north: number; east: number },
  minZoom: number, maxZoom: number,
): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const xMin = Math.floor(((bounds.west + 180) / 360) * n);
    const xMax = Math.floor(((bounds.east + 180) / 360) * n);
    const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
    const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);
    total += (xMax - xMin + 1) * (yMax - yMin + 1);
  }
  return total;
}

export async function downloadRegionTiles(
  bounds: { south: number; west: number; north: number; east: number },
  minZoom: number, maxZoom: number,
  onProgress: (downloaded: number, total: number) => void,
): Promise<number> {
  const cache = await caches.open(CACHE_NAME);
  let downloaded = 0;
  const total = estimateRegionTileCount(bounds, minZoom, maxZoom);

  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const xMin = Math.floor(((bounds.west + 180) / 360) * n);
    const xMax = Math.floor(((bounds.east + 180) / 360) * n);
    const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
    const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        try {
          const existing = await cache.match(url);
          if (!existing) {
            const response = await fetch(url);
            if (response.ok) await cache.put(url, response);
          }
        } catch { /* skip failed tiles */ }
        downloaded++;
        onProgress(downloaded, total);
      }
    }
  }

  return downloaded;
}

export function getDownloadedRegions(): OfflineRegion[] {
  try {
    const stored = localStorage.getItem(REGIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveRegion(region: OfflineRegion): void {
  const regions = getDownloadedRegions();
  const existing = regions.findIndex((r) => r.id === region.id);
  if (existing >= 0) regions[existing] = region;
  else regions.push(region);
  localStorage.setItem(REGIONS_KEY, JSON.stringify(regions));
}

export async function deleteRegion(regionId: string): Promise<void> {
  const regions = getDownloadedRegions();
  const region = regions.find((r) => r.id === regionId);
  if (!region) return;

  const updated = regions.filter((r) => r.id !== regionId);
  localStorage.setItem(REGIONS_KEY, JSON.stringify(updated));
}

export async function estimateStorageUsed(): Promise<number> {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  }
  return 0;
}
