export interface MarineWeatherHourly {
  time: string;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  temperature: number;
  pressure: number;
  precipitation: number;
  waveHeight: number;
  waveDirection: number;
  wavePeriod: number;
}

export interface MarineWeatherData {
  latitude: number;
  longitude: number;
  fetchedAt: string;
  hourly: MarineWeatherHourly[];
}

interface WeatherCache {
  data: MarineWeatherData;
  expires: number;
}

const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<string, WeatherCache>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function fetchMarineWeather(
  lat: number, lon: number, hours = 48,
): Promise<MarineWeatherData> {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  const [windRes, waveRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,pressure_msl,precipitation` +
      `&forecast_hours=${hours}&wind_speed_unit=kn`,
    ),
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&hourly=wave_height,wave_direction,wave_period` +
      `&forecast_hours=${hours}`,
    ),
  ]);

  if (!windRes.ok) throw new Error(`Weather API error: ${windRes.status}`);

  const wind = await windRes.json();
  const wave = waveRes.ok ? await waveRes.json() : null;

  const times: string[] = wind.hourly.time;
  const hourly: MarineWeatherHourly[] = times.map((time: string, i: number) => ({
    time,
    windSpeed: wind.hourly.wind_speed_10m[i] ?? 0,
    windDirection: wind.hourly.wind_direction_10m[i] ?? 0,
    windGusts: wind.hourly.wind_gusts_10m[i] ?? 0,
    temperature: wind.hourly.temperature_2m[i] ?? 0,
    pressure: wind.hourly.pressure_msl[i] ?? 0,
    precipitation: wind.hourly.precipitation[i] ?? 0,
    waveHeight: wave?.hourly?.wave_height?.[i] ?? 0,
    waveDirection: wave?.hourly?.wave_direction?.[i] ?? 0,
    wavePeriod: wave?.hourly?.wave_period?.[i] ?? 0,
  }));

  const data: MarineWeatherData = {
    latitude: lat,
    longitude: lon,
    fetchedAt: new Date().toISOString(),
    hourly,
  };

  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

export function beaufortScale(knots: number): { force: number; label: string; color: string } {
  if (knots < 1) return { force: 0, label: 'Calm', color: '#94a3b8' };
  if (knots < 4) return { force: 1, label: 'Light air', color: '#60a5fa' };
  if (knots < 7) return { force: 2, label: 'Light breeze', color: '#34d399' };
  if (knots < 11) return { force: 3, label: 'Gentle breeze', color: '#22c55e' };
  if (knots < 17) return { force: 4, label: 'Moderate breeze', color: '#a3e635' };
  if (knots < 22) return { force: 5, label: 'Fresh breeze', color: '#facc15' };
  if (knots < 28) return { force: 6, label: 'Strong breeze', color: '#f59e0b' };
  if (knots < 34) return { force: 7, label: 'Near gale', color: '#f97316' };
  if (knots < 41) return { force: 8, label: 'Gale', color: '#ef4444' };
  if (knots < 48) return { force: 9, label: 'Strong gale', color: '#dc2626' };
  if (knots < 56) return { force: 10, label: 'Storm', color: '#b91c1c' };
  if (knots < 64) return { force: 11, label: 'Violent storm', color: '#991b1b' };
  return { force: 12, label: 'Hurricane', color: '#7f1d1d' };
}

export interface WeatherGridPoint {
  lat: number;
  lon: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  waveHeight: number;
  waveDirection: number;
  pressure: number;
  temperature: number;
}

export async function fetchWeatherGrid(
  centerLat: number,
  centerLon: number,
  gridSize: number,
  spanDeg: number,
): Promise<WeatherGridPoint[]> {
  const step = spanDeg / gridSize;
  const startLat = centerLat - spanDeg / 2;
  const startLon = centerLon - spanDeg / 2;

  const points: Array<{ lat: number; lon: number }> = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      points.push({
        lat: startLat + step * (r + 0.5),
        lon: startLon + step * (c + 0.5),
      });
    }
  }

  const results = await Promise.all(
    points.map(async (p) => {
      try {
        const data = await fetchMarineWeather(p.lat, p.lon, 6);
        const now = Date.now();
        const current = data.hourly.find((h) => Math.abs(new Date(h.time).getTime() - now) < 3600000) ?? data.hourly[0];
        return {
          lat: p.lat,
          lon: p.lon,
          windSpeed: current.windSpeed,
          windDirection: current.windDirection,
          windGusts: current.windGusts,
          waveHeight: current.waveHeight,
          waveDirection: current.waveDirection,
          pressure: current.pressure,
          temperature: current.temperature,
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is WeatherGridPoint => r !== null);
}

export function waveHeightColor(meters: number): string {
  if (meters < 0.5) return '#22c55e';
  if (meters < 1) return '#86efac';
  if (meters < 1.5) return '#facc15';
  if (meters < 2) return '#f59e0b';
  if (meters < 3) return '#f97316';
  return '#ef4444';
}

export function routeSegmentColor(windSpeed: number, waveHeight: number): string {
  if (windSpeed > 30 || waveHeight > 3) return '#ef4444';
  if (windSpeed > 20 || waveHeight > 2) return '#f59e0b';
  return '#22c55e';
}

export function getWindBarbSvgPath(speedKnots: number, directionDeg: number): string {
  const rad = (directionDeg + 180) * Math.PI / 180;
  const len = 20;
  const ex = Math.sin(rad) * len;
  const ey = -Math.cos(rad) * len;
  const barbLen = 8;

  let path = `M0,0 L${ex.toFixed(1)},${ey.toFixed(1)}`;

  const remaining = Math.round(speedKnots);
  const pennants = Math.floor(remaining / 50);
  const fullBarbs = Math.floor((remaining % 50) / 10);
  const halfBarbs = Math.floor((remaining % 10) / 5);

  const perpX = Math.cos(rad) * barbLen;
  const perpY = Math.sin(rad) * barbLen;

  let offset = 0;
  for (let i = 0; i < pennants; i++) {
    const t = 1 - offset / len;
    const bx = ex * t;
    const by = ey * t;
    const t2 = 1 - (offset + 4) / len;
    const mx = ex * t2;
    const my = ey * t2;
    path += ` M${bx.toFixed(1)},${by.toFixed(1)} L${(bx + perpX).toFixed(1)},${(by + perpY).toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} Z`;
    offset += 5;
  }

  for (let i = 0; i < fullBarbs; i++) {
    const t = 1 - offset / len;
    const bx = ex * t;
    const by = ey * t;
    path += ` M${bx.toFixed(1)},${by.toFixed(1)} L${(bx + perpX).toFixed(1)},${(by + perpY).toFixed(1)}`;
    offset += 3;
  }

  for (let i = 0; i < halfBarbs; i++) {
    const t = 1 - offset / len;
    const bx = ex * t;
    const by = ey * t;
    path += ` M${bx.toFixed(1)},${by.toFixed(1)} L${(bx + perpX * 0.5).toFixed(1)},${(by + perpY * 0.5).toFixed(1)}`;
    offset += 3;
  }

  return path;
}
