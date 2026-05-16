import L, { type LatLngExpression } from 'leaflet';
import { CircleMarker, LayerGroup, LayersControl, MapContainer, Pane, Polygon, Popup, Polyline, TileLayer, WMSTileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import { AlertTriangle, Database, Droplets, FileLock2, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCoordinate, formatHeading } from '@/lib/utils';
import type { CommunityAggregateFeature, CommunityOverlayFeature } from '@/lib/community-overlay';
import type { Route } from '@/types';
import {
  GEONB_WMS_LAYERS,
  NB_PILOT_BOUNDS,
  OFFICIAL_CHART_BOUNDARY,
  getNBPilotMapCenter,
  isWithinNBPilotBounds,
  type MapPosition,
} from '@/lib/nb-chart-sources';

import type { MeshVessel } from '@/store/meshStore';

type AisTarget = {
  mmsi: string;
  name?: string;
  position: MapPosition;
  cog: number;
  sog: number;
};

type NBPilotChartProps = {
  position: MapPosition | null;
  heading: number;
  aisTargets: AisTarget[];
  meshVessels?: MeshVessel[];
  routes?: Route[];
  activeRouteId?: string | null;
  communityFeatures?: CommunityOverlayFeature[];
  communityAggregateFeatures?: CommunityAggregateFeature[];
  className?: string;
};

const NB_MAX_BOUNDS: [[number, number], [number, number]] = [
  [NB_PILOT_BOUNDS.south, NB_PILOT_BOUNDS.west],
  [NB_PILOT_BOUNDS.north, NB_PILOT_BOUNDS.east],
];

const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function toLatLng(position: MapPosition): LatLngExpression {
  return [position.latitude, position.longitude];
}

function getHeadingLine(position: MapPosition, heading: number): [LatLngExpression, LatLngExpression] {
  const radians = (heading * Math.PI) / 180;
  const length = 0.045;

  return [
    toLatLng(position),
    [
      position.latitude + Math.cos(radians) * length,
      position.longitude + Math.sin(radians) * length,
    ],
  ];
}

function getFeaturePosition(feature: CommunityOverlayFeature): MapPosition {
  const [longitude, latitude] = feature.geometry.coordinates;
  return { latitude, longitude };
}

function getFeatureKind(feature: CommunityOverlayFeature): 'sounding' | 'hazard' | 'unknown' {
  if (feature.properties.kind === 'sounding') return 'sounding';
  if (feature.properties.kind === 'hazard') return 'hazard';
  return 'unknown';
}

function getFeatureColor(feature: CommunityOverlayFeature): string {
  if (getFeatureKind(feature) === 'sounding') return '#0891b2';
  if (feature.properties.severity === 'high') return '#dc2626';
  if (feature.properties.severity === 'medium') return '#d97706';
  return '#2563eb';
}

function getAggregateCenter(feature: CommunityAggregateFeature): MapPosition {
  const ring = feature.geometry.coordinates[0].slice(0, -1);
  const totals = ring.reduce(
    (sum, [longitude, latitude]) => ({
      latitude: sum.latitude + latitude,
      longitude: sum.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / ring.length,
    longitude: totals.longitude / ring.length,
  };
}

function getAggregateColor(feature: CommunityAggregateFeature): string {
  if (feature.properties.highHazardCount > 0) return '#dc2626';
  if (feature.properties.hazardCount > 0) return '#d97706';
  if (feature.properties.observationCount > 0) return '#2563eb';
  return '#0891b2';
}

function getAggregatePositions(feature: CommunityAggregateFeature): LatLngExpression[] {
  return feature.geometry.coordinates[0].map(([longitude, latitude]) => [latitude, longitude]);
}

function RecenterOnPosition({ center }: { center: MapPosition }) {
  const map = useMap();
  const { latitude, longitude } = center;

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, map]);

  return null;
}

function SourceLedger() {
  return (
    <div className="absolute bottom-3 left-3 z-[500] max-w-[min(28rem,calc(100%-1.5rem))] rounded-md border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1">
          <Database className="h-3 w-3" />
          GeoNB NBHN
        </Badge>
        <Badge variant="outline" className="gap-1">
          <FileLock2 className="h-3 w-3" />
          CHS local-only
        </Badge>
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Reference
        </Badge>
      </div>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        GeoNB layers are reference overlays. Official CHS chart products stay local unless a separate licence allows shared processing.
      </p>
      <p className="mt-1 text-muted-foreground">
        CHS upload allowed: {OFFICIAL_CHART_BOUNDARY.mayUpload ? 'yes' : 'no'}
      </p>
    </div>
  );
}

export function NBPilotChart({
  position,
  heading,
  aisTargets,
  meshVessels = [],
  routes = [],
  activeRouteId = null,
  communityFeatures = [],
  communityAggregateFeatures = [],
  className,
}: NBPilotChartProps) {
  const usablePosition = isWithinNBPilotBounds(position) ? position : null;
  const mapCenter = useMemo(() => getNBPilotMapCenter(position), [position]);
  const chartCenter = useMemo<LatLngExpression>(() => toLatLng(mapCenter), [mapCenter]);
  const headingLine = useMemo(
    () => (usablePosition ? getHeadingLine(usablePosition, heading) : null),
    [heading, usablePosition],
  );
  const visibleAisTargets = useMemo(
    () => aisTargets.filter((target) => isWithinNBPilotBounds(target.position)),
    [aisTargets],
  );
  const visibleMeshVessels = useMemo(
    () => meshVessels.filter((vessel) => vessel.position && isWithinNBPilotBounds(vessel.position)),
    [meshVessels],
  );
  const visibleCommunityFeatures = useMemo(
    () => communityFeatures.filter((feature) => isWithinNBPilotBounds(getFeaturePosition(feature))),
    [communityFeatures],
  );
  const visibleAggregateFeatures = useMemo(
    () => communityAggregateFeatures.filter((feature) => isWithinNBPilotBounds(getAggregateCenter(feature))),
    [communityAggregateFeatures],
  );

  return (
    <div className={cn('relative h-full min-h-[30rem] overflow-hidden rounded-md border bg-muted', className)}>
      <MapContainer
        center={chartCenter}
        zoom={usablePosition ? 11 : 7}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom
        maxBounds={NB_MAX_BOUNDS}
        className="h-full w-full"
      >
        <RecenterOnPosition center={mapCenter} />
        <TileLayer attribution={MAP_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <LayersControl position="topright">
          {GEONB_WMS_LAYERS.map((layer) => (
            <LayersControl.Overlay key={layer.id} checked={layer.checked} name={layer.label}>
              <WMSTileLayer
                url={layer.url}
                layers={layer.layer}
                format="image/png"
                transparent
                opacity={layer.opacity}
                version="1.3.0"
                crs={L.CRS.EPSG4326}
                attribution="GeoNB"
              />
            </LayersControl.Overlay>
          ))}
        </LayersControl>

        <Pane name="harbourmesh-routes" style={{ zIndex: 620 }}>
          {routes.map((route) => {
            const routeWaypoints = route.waypoints.filter((waypoint) => isWithinNBPilotBounds(waypoint));
            const routePositions = routeWaypoints.map((waypoint) => toLatLng(waypoint));
            const isActiveRoute = route.id === activeRouteId;

            if (routePositions.length === 0) return null;

            return (
              <LayerGroup key={route.id}>
                {routePositions.length > 1 && (
                  <Polyline
                    positions={routePositions}
                    pathOptions={{
                      color: isActiveRoute ? '#047857' : '#7c3aed',
                      weight: isActiveRoute ? 4 : 3,
                      opacity: isActiveRoute ? 0.9 : 0.65,
                    }}
                  />
                )}

                {routeWaypoints.map((waypoint) => (
                  <CircleMarker
                    key={waypoint.id}
                    center={toLatLng(waypoint)}
                    radius={isActiveRoute ? 5 : 4}
                    pathOptions={{
                      color: isActiveRoute ? '#065f46' : '#6d28d9',
                      fillColor: isActiveRoute ? '#10b981' : '#a78bfa',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <strong>{waypoint.name}</strong>
                        <div>{route.name}</div>
                        {waypoint.distanceFromPrevious !== undefined && (
                          <div>{waypoint.distanceFromPrevious.toFixed(1)} nm from previous</div>
                        )}
                        {waypoint.courseFromPrevious !== undefined && (
                          <div>{formatHeading(waypoint.courseFromPrevious)}</div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            );
          })}
        </Pane>

        <Pane name="harbourmesh-community-overlay" style={{ zIndex: 635 }}>
          {visibleAggregateFeatures.map((feature) => {
            const color = getAggregateColor(feature);

            return (
              <Polygon
                key={feature.id}
                positions={getAggregatePositions(feature)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.18,
                  opacity: 0.65,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <strong>Community aggregate</strong>
                    <div>{feature.properties.soundingCount} soundings</div>
                    {typeof feature.properties.averageDepthMeters === 'number' && (
                      <div>{feature.properties.averageDepthMeters.toFixed(1)} m avg depth</div>
                    )}
                    <div>{feature.properties.observationCount} observations</div>
                    <div>{feature.properties.trackPointObservationCount} track points</div>
                    <div>{feature.properties.hazardCount} accepted hazards</div>
                    <div>Raw vessel IDs: excluded</div>
                    <div>Official chart data: excluded</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {visibleCommunityFeatures.map((feature) => {
            const position = getFeaturePosition(feature);
            const kind = getFeatureKind(feature);
            const color = getFeatureColor(feature);

            return (
              <CircleMarker
                key={feature.id}
                center={toLatLng(position)}
                radius={kind === 'sounding' ? 4 : 7}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: kind === 'sounding' ? 0.55 : 0.8,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <strong className="flex items-center gap-1">
                      {kind === 'sounding' ? <Droplets className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {kind === 'sounding' ? 'Community sounding' : 'Community hazard'}
                    </strong>
                    {kind === 'sounding' && typeof feature.properties.depthMeters === 'number' && (
                      <div>{feature.properties.depthMeters.toFixed(1)} m</div>
                    )}
                    {kind === 'hazard' && typeof feature.properties.description === 'string' && (
                      <div>{feature.properties.description}</div>
                    )}
                    {kind === 'hazard' && typeof feature.properties.severity === 'string' && (
                      <div className="capitalize">{feature.properties.severity}</div>
                    )}
                    {typeof feature.properties.officialChartDataIncluded === 'boolean' && (
                      <div>Official chart data: {feature.properties.officialChartDataIncluded ? 'included' : 'excluded'}</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        <Pane name="harbourmesh-vessels" style={{ zIndex: 650 }}>
          {usablePosition && (
            <>
              <CircleMarker
                center={toLatLng(usablePosition)}
                radius={8}
                pathOptions={{ color: '#0369a1', fillColor: '#0ea5e9', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <strong>Own vessel</strong>
                    <div>{formatCoordinate(usablePosition.latitude, 'lat')}</div>
                    <div>{formatCoordinate(usablePosition.longitude, 'lon')}</div>
                    <div>{formatHeading(heading)}</div>
                  </div>
                </Popup>
              </CircleMarker>
              {headingLine && <Polyline positions={headingLine} pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.8 }} />}
            </>
          )}

          {visibleAisTargets.map((target) => (
            <CircleMarker
              key={target.mmsi}
              center={toLatLng(target.position)}
              radius={6}
              pathOptions={{ color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <strong>{target.name || `MMSI ${target.mmsi}`}</strong>
                  <div>{target.sog.toFixed(1)} kn</div>
                  <div>{formatHeading(target.cog)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {visibleMeshVessels.map((vessel) => (
            <CircleMarker
              key={vessel.vesselId}
              center={toLatLng(vessel.position!)}
              radius={6}
              pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <strong>{vessel.name || 'Mesh Vessel'}</strong>
                  <div>Mesh Sync Live</div>
                  {vessel.windSpeed !== null && (
                    <div>Wind: {vessel.windSpeed.toFixed(1)} kn</div>
                  )}
                  {vessel.windDirection !== null && (
                    <div>Wind Dir: {Math.round(vessel.windDirection)}°</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Last update: {new Date(vessel.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </Pane>
      </MapContainer>

      {!usablePosition && (
        <div className="absolute left-3 top-3 z-[500] rounded-md border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 font-medium">
            <Ship className="h-3.5 w-3.5" />
            NB pilot map
          </div>
          <p className="mt-1 text-muted-foreground">Current telemetry is outside New Brunswick pilot bounds.</p>
        </div>
      )}

      <SourceLedger />
    </div>
  );
}
