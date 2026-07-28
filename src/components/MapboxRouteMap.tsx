import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { addEnhancedTerrain } from '@/utils/mapTerrain';

const VITE_MAPBOX_ACCESS_TOKEN_KEY = 'VITE_MAPBOX' + '_ACCESS_TOKEN';
const EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_KEY = 'EXPO_PUBLIC_MAPBOX' + '_ACCESS_TOKEN';

const MAPBOX_TOKEN =
  (import.meta as any)?.env?.[VITE_MAPBOX_ACCESS_TOKEN_KEY] ??
  (typeof process !== 'undefined'
    ? (process as any)?.env?.[EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_KEY]
    : undefined) ??
  '';

interface MapboxRouteMapProps {
  routePoints: [number, number][];
  lineColor: string;
  height: number;
  isDark: boolean;
  totalDistance?: number;
  totalElevation?: number;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
}

function dpSimplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points;
  let maxDist = 0, maxIdx = 0;
  const [startLat, startLng] = points[0];
  const [endLat, endLng] = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = Math.abs(
      (endLng - startLng) * (startLat - points[i][0]) -
      (startLng - points[i][1]) * (endLat - startLat)
    ) / Math.sqrt((endLng - startLng) ** 2 + (endLat - startLat) ** 2);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = dpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = dpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRoute(points: [number, number][], target: number = 400): [number, number][] {
  if (points.length <= target) return points;
  let epsilon = 0.00002;
  let result = dpSimplify(points, epsilon);
  while (result.length > target && epsilon < 0.01) {
    epsilon *= 2;
    result = dpSimplify(points, epsilon);
  }
  return result;
}

export function getBounds(routePoints: [number, number][]): { sw: [number, number]; ne: [number, number]; center: [number, number] } {
  const lats = routePoints.map(p => p[0]);
  const lngs = routePoints.map(p => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    sw: [minLng - 0.005, minLat - 0.002],
    ne: [maxLng + 0.005, maxLat + 0.002],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  };
}

function getPreviewBounds(routePoints: [number, number][]): { sw: [number, number]; ne: [number, number]; center: [number, number] } {
  const lats = routePoints.map(p => p[0]);
  const lngs = routePoints.map(p => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.0012);
  const lngSpan = Math.max(maxLng - minLng, 0.0012);
  const latPad = Math.max(latSpan * 0.14, 0.00035);
  const lngPad = Math.max(lngSpan * 0.14, 0.00045);

  return {
    sw: [minLng - lngPad, minLat - latPad],
    ne: [maxLng + lngPad, maxLat + latPad],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  };
}

export const useMapFullscreen = () => {
  const [fullscreen, setFullscreen] = useState(false);
  return { isMapFullscreen: fullscreen, setMapFullscreen: setFullscreen };
};

export { simplifyRoute, MAPBOX_TOKEN };

function fitPreviewCamera(map: any, bounds: { sw: [number, number]; ne: [number, number] }) {
  map.fitBounds([bounds.sw, bounds.ne], {
    padding: { top: 20, right: 20, bottom: 26, left: 20 },
    duration: 0,
    maxZoom: 14.6,
  });

  const fittedZoom = map.getZoom();

  map.jumpTo({
    center: map.getCenter(),
    zoom: Math.max(fittedZoom - 0.22, 9.2),
    pitch: 60,
    bearing: -18,
  });
}

/**
 * Thumbnail-only component. Fullscreen map is rendered by WorkoutDetailDrawer
 * OUTSIDE the vaul Drawer to avoid event capture issues.
 */
const MapboxRouteMap = ({ routePoints, lineColor, height, isDark, onFullscreenChange }: MapboxRouteMapProps & { onFullscreenChange?: (fs: boolean) => void }) => {
  const [mapReady, setMapReady] = useState(false);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<any>(null);

  // Always use orange for route lines
  const routeColor = '#e67e22';

  const simplifiedRoute = useMemo(() => {
    if (routePoints.length < 2) return [];
    return simplifyRoute(routePoints, 300);
  }, [routePoints]);

  const initPreviewMap = useCallback(async () => {
    if (!previewMapContainerRef.current || previewMapRef.current) return;

    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    if (MAPBOX_TOKEN) (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const previewRoute = simplifiedRoute.length > 0 ? simplifiedRoute : routePoints;
    const bounds = getPreviewBounds(previewRoute);
    const coords = previewRoute.map(([lat, lng]) => [lng, lat]);

    const map = new mapboxgl.Map({
      container: previewMapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: bounds.center,
      zoom: 9,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      antialias: false,
    });

    map.once('style.load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });

      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': routeColor, 'line-width': 5, 'line-opacity': 0.95 },
      });

      addEnhancedTerrain(map, { exaggeration: 1.4, lightweight: true });
      fitPreviewCamera(map, bounds);
      map.once('idle', () => setMapReady(true));
    });

    previewMapRef.current = map;
  }, [routePoints, simplifiedRoute]);

  useEffect(() => {
    setMapReady(false);
    initPreviewMap();

    return () => {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, [initPreviewMap]);

  if (routePoints.length < 2) return null;

  return (
    <div
      className="w-full rounded-t-lg overflow-hidden relative cursor-pointer"
      style={{ height: `${height}px` }}
      onClick={() => onFullscreenChange?.(true)}
    >
      {isDark && (
        <div className="absolute inset-0 bg-black/30 z-[1] pointer-events-none rounded-t-lg" />
      )}

      <div
        ref={previewMapContainerRef}
        className="w-full h-full"
      />

      {!mapReady && (
        <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
      )}

      <button
        className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-10"
        title="Utforsk kartet"
      >
        <Maximize2 className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
};

export default MapboxRouteMap;