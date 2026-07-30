import { supabase } from '../lib/supabase';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface RouteSummary {
  distance: number; // meters
  duration: number; // seconds
  elevGain: number; // meters
  elevLoss: number; // meters
}

export interface CustomRoute {
  points: RoutePoint[];
  summary: RouteSummary;
  waypoints: { latitude: number; longitude: number }[];
  startPoint: { latitude: number; longitude: number };
  targetPeakCoord: { latitude: number; longitude: number };
  targetPeakId: string;
  isRoundTrip: boolean;
}

export interface RouteProgress {
  coveredDistance: number;
  coveredGain: number;
  remainingDistance: number;
  remainingGain: number;
  reachedPeak: boolean;
}

/**
 * Calls the ors-route Edge Function to generate a route between coordinates.
 * Profile used is foot-hiking.
 */
export async function fetchRoute(coordinates: [number, number][]): Promise<{ points: RoutePoint[]; distance: number; duration: number }> {
  const { data, error } = await supabase.functions.invoke('ors-route', {
    body: { coordinates }
  });

  if (error) {
    console.error('Error calling ors-route:', error);
    // Try to extract more detail from the error if available
    const errorDetail = error.message || (typeof error === 'string' ? error : 'Ukjent feil');
    throw new Error(`Kunne ikke hente rute fra rute-API-et: ${errorDetail}`);
  }

  const feature = data.features[0];
  const points: RoutePoint[] = feature.geometry.coordinates.map((coord: any) => ({
    longitude: coord[0],
    latitude: coord[1],
    elevation: coord[2] || 0
  }));

  const { distance, duration } = feature.properties.summary;

  return { points, distance, duration };
}

/**
 * Calculates elevation gain and loss from a list of points.
 */
export function calculateElevation(points: RoutePoint[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  return { gain, loss };
}

/**
 * Calculates haversine distance between two coordinates in meters.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds the nearest point index on the route for a given coordinate.
 */
export function findNearestPointIndex(lat: number, lon: number, points: RoutePoint[]): number {
  let minDist = Infinity;
  let index = 0;

  for (let i = 0; i < points.length; i++) {
    const d = haversineDistance(lat, lon, points[i].latitude, points[i].longitude);
    if (d < minDist) {
      minDist = d;
      index = i;
    }
  }

  return index;
}

/**
 * Calculates covered metrics from the start to a specific point on the route.
 */
export function calculateCoveredMetrics(points: RoutePoint[], nearestIndex: number): { distance: number; gain: number; loss: number } {
  let distance = 0;
  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= nearestIndex; i++) {
    distance += haversineDistance(
      points[i - 1].latitude, points[i - 1].longitude,
      points[i].latitude, points[i].longitude
    );
    const elevDiff = points[i].elevation - points[i - 1].elevation;
    if (elevDiff > 0) {
      gain += elevDiff;
    } else {
      loss += Math.abs(elevDiff);
    }
  }

  return { distance, gain, loss };
}