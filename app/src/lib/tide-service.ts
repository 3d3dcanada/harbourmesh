import tideStations from '@/data/tide-stations-atlantic.json';
import tidePredictions from '@/data/tide-predictions-maritime.json';

export type TideEvent = {
  time: string;
  height: number;
  type: 'high' | 'low';
};

export type NearestTideInfo = {
  stationName: string;
  stationId: string;
  distanceKm: number;
  nextHigh: TideEvent | null;
  nextLow: TideEvent | null;
  predictions: TideEvent[];
};

type StationRecord = {
  name: string;
  id: string;
  code: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  type: string;
  operating: boolean;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const stations = (tideStations as StationRecord[]).filter(
  (s) => s.type !== 'DISCONTINUED',
);

function findNearestStation(lat: number, lon: number): { station: StationRecord; distanceKm: number } | null {
  if (stations.length === 0) return null;

  let best = stations[0];
  let bestDist = haversineKm(lat, lon, best.latitude, best.longitude);

  for (let i = 1; i < stations.length; i++) {
    const d = haversineKm(lat, lon, stations[i].latitude, stations[i].longitude);
    if (d < bestDist) {
      bestDist = d;
      best = stations[i];
    }
  }

  return { station: best, distanceKm: bestDist };
}

type PredictionEntry = {
  stationId: string;
  predictions: { eventDate: string; value: number; qcFlagCode: string; reviewed: boolean; timeSeriesId: string }[];
};

function parsePredictions(stationName: string): TideEvent[] {
  const allPredictions = tidePredictions as Record<string, PredictionEntry>;
  const entry = allPredictions[stationName];
  if (!entry?.predictions) return [];

  const now = new Date();
  return entry.predictions
    .map((p, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1].value : p.value;
      return {
        time: p.eventDate,
        height: p.value,
        type: (p.value >= prev ? 'high' : 'low') as 'high' | 'low',
      };
    })
    .filter((p) => new Date(p.time) >= now);
}

export function getNearestTideInfo(lat: number, lon: number): NearestTideInfo | null {
  const nearest = findNearestStation(lat, lon);
  if (!nearest) return null;

  const predictions = parsePredictions(nearest.station.name);
  const nextHigh = predictions.find((p) => p.type === 'high') ?? null;
  const nextLow = predictions.find((p) => p.type === 'low') ?? null;

  return {
    stationName: nearest.station.name,
    stationId: nearest.station.id,
    distanceKm: nearest.distanceKm,
    nextHigh,
    nextLow,
    predictions: predictions.slice(0, 8),
  };
}

export async function fetchLivePredictions(stationId: string): Promise<TideEvent[]> {
  const now = new Date();
  const from = now.toISOString();
  const to = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  try {
    const response = await fetch(
      `https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/${stationId}/data?time-series-code=wlp-hilo&from=${from}&to=${to}`,
    );
    if (!response.ok) return [];

    const data: { eventDate: string; value: number }[] = await response.json();
    return data.map((d, idx, arr) => ({
      time: d.eventDate,
      height: d.value,
      type: (idx > 0 && d.value >= arr[idx - 1].value ? 'high' : 'low') as 'high' | 'low',
    }));
  } catch {
    return [];
  }
}
