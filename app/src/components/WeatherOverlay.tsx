import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayerGroup, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wind, Waves, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchMarineWeather,
  fetchWeatherGrid,
  beaufortScale,
  getWindBarbSvgPath,
  waveHeightColor,
  type MarineWeatherData,
  type MarineWeatherHourly,
  type WeatherGridPoint,
} from '@/lib/weather-service';
import { FeatureGate } from './FeatureGate';

interface WeatherTimelineCardProps {
  latitude: number | null;
  longitude: number | null;
}

export function WeatherTimelineCard({ latitude, longitude }: WeatherTimelineCardProps) {
  const [weather, setWeather] = useState<MarineWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMarineWeather(latitude, longitude, 48)
      .then((data) => { if (!cancelled) setWeather(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [latitude, longitude]);

  const upcoming = useMemo(() => {
    if (!weather) return [];
    const now = Date.now();
    return weather.hourly.filter((h) => new Date(h.time).getTime() >= now).slice(0, 24);
  }, [weather]);

  if (latitude === null || longitude === null) return null;

  return (
    <FeatureGate feature="weather-routing">
      <Card className="pointer-events-auto bg-background/80 backdrop-blur-md border-muted-foreground/20 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wind className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Weather Forecast</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
          </div>

          {error && (
            <p className="text-[10px] text-red-500">{error}</p>
          )}

          {!weather && !loading && !error && (
            <p className="text-[10px] text-muted-foreground">No forecast data available</p>
          )}

          {upcoming.length > 0 && (
            <div className="overflow-x-auto -mx-1">
              <div className="flex gap-0.5 min-w-max px-1 pb-1">
                {upcoming.map((hour) => (
                  <WeatherHourCell key={hour.time} hour={hour} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}

function WeatherHourCell({ hour }: { hour: MarineWeatherHourly }) {
  const bf = beaufortScale(hour.windSpeed);
  const time = new Date(hour.time);
  const isNow = Math.abs(time.getTime() - Date.now()) < 3600000;

  return (
    <div className={cn(
      'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded text-center min-w-[40px]',
      isNow && 'bg-primary/10 ring-1 ring-primary/30',
    )}>
      <span className="text-[9px] text-muted-foreground font-mono">
        {time.getHours().toString().padStart(2, '0')}:00
      </span>

      {/* Wind arrow */}
      <svg viewBox="-12 -12 24 24" className="h-5 w-5" style={{ transform: `rotate(${hour.windDirection}deg)` }}>
        <line x1="0" y1="6" x2="0" y2="-6" stroke={bf.color} strokeWidth="1.5" />
        <polygon points="0,-8 -3,-3 3,-3" fill={bf.color} />
      </svg>

      <span className="text-[10px] font-medium" style={{ color: bf.color }}>
        {Math.round(hour.windSpeed)}
      </span>

      {hour.waveHeight > 0 && (
        <div className="flex items-center gap-0.5">
          <Waves className="h-2.5 w-2.5 text-blue-400" />
          <span className="text-[9px] text-blue-400">{hour.waveHeight.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

interface WeatherSummaryBadgeProps {
  weather: MarineWeatherData | null;
}

export function WeatherSummaryBadge({ weather }: WeatherSummaryBadgeProps) {
  if (!weather || weather.hourly.length === 0) return null;
  const now = Date.now();
  const current = weather.hourly.find((h) => Math.abs(new Date(h.time).getTime() - now) < 3600000);
  if (!current) return null;

  const bf = beaufortScale(current.windSpeed);
  return (
    <Badge variant="outline" className="text-[10px]" style={{ borderColor: bf.color, color: bf.color }}>
      <Wind className="h-3 w-3 mr-1" />
      {Math.round(current.windSpeed)}kn {bf.label}
    </Badge>
  );
}

interface WeatherMapLayerProps {
  weatherData: MarineWeatherData | null;
  showWind?: boolean;
  showWaves?: boolean;
  showPressure?: boolean;
}

export function WeatherMapLayer({ weatherData, showWind = true, showWaves = true, showPressure = false }: WeatherMapLayerProps) {
  const map = useMap();
  const [gridPoints, setGridPoints] = useState<WeatherGridPoint[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef(0);

  const rebuildGrid = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const spanLat = bounds.getNorthEast().lat - bounds.getSouthWest().lat;
      const zoom = map.getZoom();
      const gridSize = zoom < 8 ? 2 : zoom < 12 ? 3 : 3;
      const id = ++fetchRef.current;
      try {
        const points = await fetchWeatherGrid(center.lat, center.lng, gridSize, spanLat);
        if (id === fetchRef.current) setGridPoints(points);
      } catch { /* weather grid fetch failed silently */ }
    }, 1500);
  }, [map]);

  useEffect(() => {
    rebuildGrid();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rebuildGrid]);

  useMapEvents({ moveend: rebuildGrid, zoomend: rebuildGrid });

  if (!weatherData || weatherData.hourly.length === 0) return null;

  const now = Date.now();
  const fallback = weatherData.hourly.find((h) => Math.abs(new Date(h.time).getTime() - now) < 3600000) ?? weatherData.hourly[0];
  const displayPoints = gridPoints.length > 0 ? gridPoints : [{ lat: weatherData.latitude, lon: weatherData.longitude, ...fallback }];

  return (
    <LayerGroup>
      {showWind && displayPoints.map((pt, i) => {
        const bf = beaufortScale(pt.windSpeed);
        const svgPath = getWindBarbSvgPath(pt.windSpeed, pt.windDirection);
        const icon = L.divIcon({
          className: 'weather-barb-icon',
          html: `<svg viewBox="-30 -35 60 70" width="44" height="52" xmlns="http://www.w3.org/2000/svg">
            <path d="${svgPath}" fill="${bf.color}" stroke="${bf.color}" stroke-width="1.5" />
            <text x="0" y="22" text-anchor="middle" font-size="7" font-weight="600" fill="${bf.color}">${Math.round(pt.windSpeed)}kn</text>
          </svg>`,
          iconSize: [44, 52],
          iconAnchor: [22, 26],
        });
        const tip = `Wind: ${Math.round(pt.windSpeed)}kn ${Math.round(pt.windDirection)}°\nGusts: ${Math.round(pt.windGusts)}kn\nBF ${bf.force} (${bf.label})`;
        return (
          <Marker key={`wind-${i}`} position={[pt.lat, pt.lon]} icon={icon}
            eventHandlers={{ mouseover: (e) => e.target.bindTooltip(tip, { sticky: true }).openTooltip() }} />
        );
      })}

      {showWaves && displayPoints.map((pt, i) => (
        pt.waveHeight > 0.1 ? (
          <Circle key={`wave-${i}`} center={[pt.lat, pt.lon]}
            radius={15000} pathOptions={{ color: waveHeightColor(pt.waveHeight), fillColor: waveHeightColor(pt.waveHeight), fillOpacity: 0.15, weight: 1 }}>
          </Circle>
        ) : null
      ))}

      {showPressure && displayPoints.map((pt, i) => {
        const icon = L.divIcon({
          className: 'pressure-label',
          html: `<span style="font-size:9px;color:#94a3b8;font-weight:600;text-shadow:0 0 3px rgba(0,0,0,0.5)">${Math.round(pt.pressure)} hPa</span>`,
          iconSize: [50, 14],
          iconAnchor: [25, 7],
        });
        return <Marker key={`pres-${i}`} position={[pt.lat, pt.lon]} icon={icon} />;
      })}
    </LayerGroup>
  );
}
