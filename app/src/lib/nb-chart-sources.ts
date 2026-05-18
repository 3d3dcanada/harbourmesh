export type MapPosition = {
  latitude: number;
  longitude: number;
};

export type GeoNbWmsLayer = {
  id: string;
  label: string;
  url: string;
  layer: string;
  opacity: number;
  checked: boolean;
  sourceUrl: string;
  purpose: 'base-reference' | 'hydrography' | 'bathymetry-reference';
};

export const NB_PILOT_BOUNDS = {
  south: 44.47,
  west: -67.15,
  north: 48.08,
  east: -63.66,
} as const;

export const NB_PILOT_CENTER: MapPosition = {
  latitude: 46.35,
  longitude: -65.9,
};

export const GEONB_WMS_LAYERS: GeoNbWmsLayer[] = [
  {
    id: 'geonb-waterbody',
    label: 'GeoNB NBHN waterbodies',
    url: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Waterbody/MapServer/WMSServer',
    layer: '0',
    opacity: 0.55,
    checked: true,
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Waterbody/MapServer',
    purpose: 'hydrography',
  },
  {
    id: 'geonb-watercourse',
    label: 'GeoNB NBHN watercourses',
    url: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Watercourse/MapServer/WMSServer',
    layer: '0',
    opacity: 0.75,
    checked: true,
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Watercourse/MapServer',
    purpose: 'hydrography',
  },
  {
    id: 'geonb-coastline',
    label: 'GeoNB NBHN coast lines',
    url: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Coast_Lines/MapServer/WMSServer',
    layer: '0',
    opacity: 0.85,
    checked: true,
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Coast_Lines/MapServer',
    purpose: 'base-reference',
  },
  {
    id: 'geonb-lake-depth',
    label: 'GeoNB lake depth points',
    url: 'https://gis-erd-der.gnb.ca/server/services/OpenData/Lake_Depth_Bathymetry_Points/MapServer/WMSServer',
    layer: '0',
    opacity: 0.7,
    checked: false,
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/Lake_Depth_Bathymetry_Points/MapServer',
    purpose: 'bathymetry-reference',
  },
];

export const OFFICIAL_CHART_BOUNDARY = {
  source: 'Canadian Hydrographic Service',
  handling: 'local-only',
  mayUpload: false,
  mayCreateSharedTiles: false,
  sourceUrl: 'https://charts.gc.ca/charts-cartes/index-eng.html',
  licenceUrl: 'https://www.charts.gc.ca/copyright-droitdauteur/eula-aluf-eng.html',
} as const;

export function isWithinNBPilotBounds(position: MapPosition | null | undefined): position is MapPosition {
  if (!position) return false;

  return (
    position.latitude >= NB_PILOT_BOUNDS.south &&
    position.latitude <= NB_PILOT_BOUNDS.north &&
    position.longitude >= NB_PILOT_BOUNDS.west &&
    position.longitude <= NB_PILOT_BOUNDS.east
  );
}

export function getNBPilotMapCenter(position: MapPosition | null | undefined): MapPosition {
  if (!position) return NB_PILOT_CENTER;
  return position;
}

export function getShareableLayerCount(): number {
  return GEONB_WMS_LAYERS.filter((layer) => layer.purpose !== 'base-reference').length;
}
