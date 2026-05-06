import { describe, expect, it } from 'vitest';
import {
  GEONB_WMS_LAYERS,
  NB_PILOT_CENTER,
  OFFICIAL_CHART_BOUNDARY,
  getNBPilotMapCenter,
  getShareableLayerCount,
  isWithinNBPilotBounds,
} from './nb-chart-sources';

describe('New Brunswick chart source policy', () => {
  it('keeps official CHS charts out of shared upload paths', () => {
    expect(OFFICIAL_CHART_BOUNDARY.handling).toBe('local-only');
    expect(OFFICIAL_CHART_BOUNDARY.mayUpload).toBe(false);
    expect(OFFICIAL_CHART_BOUNDARY.mayCreateSharedTiles).toBe(false);
  });

  it('uses GeoNB WMS endpoints for the NB pilot reference layers', () => {
    expect(GEONB_WMS_LAYERS.length).toBeGreaterThanOrEqual(4);

    for (const layer of GEONB_WMS_LAYERS) {
      expect(layer.url).toContain('/WMSServer');
      expect(layer.sourceUrl).toContain('/MapServer');
      expect(layer.layer).toBe('0');
    }
  });

  it('recognizes New Brunswick pilot coordinates', () => {
    expect(isWithinNBPilotBounds({ latitude: 45.27, longitude: -66.06 })).toBe(true);
    expect(isWithinNBPilotBounds({ latitude: 37.77, longitude: -122.42 })).toBe(false);
  });

  it('falls back to the NB pilot center when telemetry is outside the region', () => {
    expect(getNBPilotMapCenter({ latitude: 37.77, longitude: -122.42 })).toEqual(NB_PILOT_CENTER);
  });

  it('counts only GeoNB reference layers as community-safe layer candidates', () => {
    expect(getShareableLayerCount()).toBe(3);
  });
});
