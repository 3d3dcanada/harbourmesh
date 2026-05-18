import { getNearestTideInfo } from './tide-service';
import { fetchMarineWeather } from './weather-service';

export interface DeparturePlannerInput {
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  vesselDraftMeters: number;
  vesselSpeedKnots: number;
  safetyMarginMeters?: number;
}

export interface DepartureWindow {
  departureTime: string;
  arrivalTime: string;
  comfortScore: number;
  tideHeight: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  transitHours: number;
  warnings: string[];
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function rankDepartureWindows(
  input: DeparturePlannerInput,
): Promise<DepartureWindow[]> {
  const safetyMargin = input.safetyMarginMeters ?? 1.0;
  const distanceNm = haversineNm(
    input.originLat, input.originLon,
    input.destinationLat, input.destinationLon,
  );
  const weather = await fetchMarineWeather(input.originLat, input.originLon, 48);
  const tideInfo = getNearestTideInfo(input.originLat, input.originLon);

  const now = Date.now();
  const windows: DepartureWindow[] = [];

  for (const hour of weather.hourly) {
    const depTime = new Date(hour.time).getTime();
    if (depTime < now) continue;

    const warnings: string[] = [];
    let draftPenalty = 0;

    if (tideInfo) {
      const tideAtDeparture = estimateTideHeight(tideInfo, depTime);
      if (tideAtDeparture !== null && tideAtDeparture - input.vesselDraftMeters < safetyMargin) {
        draftPenalty = 1;
        warnings.push(`Low tide (${tideAtDeparture.toFixed(1)}m) may limit draft clearance`);
      }
    }

    const windPenalty = Math.max(0, hour.windSpeed - 15) * 3;
    const wavePenalty = hour.waveHeight * 15;

    let comfortScore = 100 - wavePenalty - windPenalty - draftPenalty * 20;
    comfortScore = Math.max(0, Math.min(100, comfortScore));

    if (hour.windSpeed > 30) warnings.push('Strong wind warning');
    if (hour.waveHeight > 2) warnings.push('Significant wave height');
    if (hour.windGusts > 40) warnings.push('Gust advisory');

    const adjustedSpeed = Math.max(1, input.vesselSpeedKnots - (hour.waveHeight > 1.5 ? hour.waveHeight * 0.5 : 0));
    const transitHours = distanceNm / adjustedSpeed;

    const arrivalTime = new Date(depTime + transitHours * 3600000).toISOString();

    windows.push({
      departureTime: hour.time,
      arrivalTime,
      comfortScore,
      tideHeight: tideInfo ? estimateTideHeight(tideInfo, depTime) ?? 0 : 0,
      windSpeed: hour.windSpeed,
      windDirection: hour.windDirection,
      waveHeight: hour.waveHeight,
      transitHours,
      warnings,
    });
  }

  return windows.sort((a, b) => b.comfortScore - a.comfortScore);
}

function estimateTideHeight(
  tideInfo: { nextHigh: { height: number; time: string } | null; nextLow: { height: number; time: string } | null },
  targetTime: number,
): number | null {
  if (!tideInfo.nextHigh || !tideInfo.nextLow) return null;

  const highTime = new Date(tideInfo.nextHigh.time).getTime();
  const lowTime = new Date(tideInfo.nextLow.time).getTime();
  const highH = tideInfo.nextHigh.height;
  const lowH = tideInfo.nextLow.height;

  const period = Math.abs(highTime - lowTime) * 2;
  if (period === 0) return (highH + lowH) / 2;

  const phase = ((targetTime - Math.min(highTime, lowTime)) % period) / period;
  const mean = (highH + lowH) / 2;
  const amp = (highH - lowH) / 2;

  return mean + amp * Math.cos(2 * Math.PI * phase);
}
