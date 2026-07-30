import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { 
  CustomRoute, 
  RouteProgress, 
  fetchRoute, 
  calculateElevation, 
  findNearestPointIndex, 
  calculateCoveredMetrics 
} from '@/services/routeService';

interface RouteContextType {
  activeRoute: CustomRoute | null;
  progress: RouteProgress | null;
  isPickingStart: boolean;
  isPickingWaypoint: boolean;
  setIsPickingStart: (val: boolean) => void;
  setIsPickingWaypoint: (val: boolean) => void;
  createRoute: (start: { latitude: number; longitude: number }, targetPeak: { id: string; latitude: number; longitude: number }, waypoints?: { latitude: number; longitude: number }[]) => Promise<void>;
  updateRoute: (updates: Partial<CustomRoute>) => Promise<void>;
  clearRoute: () => void;
  toggleRoundTrip: () => void;
  removeWaypoint: (index: number) => Promise<void>;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<CustomRoute | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [isPickingStart, setIsPickingStart] = useState(false);
  const [isPickingWaypoint, setIsPickingWaypoint] = useState(false);
  
  const maxCoveredDist = useRef(0);
  const maxCoveredGain = useRef(0);
  const reachedPeak = useRef(false);

  const clearRoute = useCallback(() => {
    setActiveRoute(null);
    setProgress(null);
    maxCoveredDist.current = 0;
    maxCoveredGain.current = 0;
    reachedPeak.current = false;
  }, []);

  const createRoute = useCallback(async (
    start: { latitude: number; longitude: number }, 
    targetPeak: { id: string; latitude: number; longitude: number },
    waypoints: { latitude: number; longitude: number }[] = []
  ) => {
    try {
      const coords: [number, number][] = [
        [start.longitude, start.latitude],
        ...waypoints.map(w => [w.longitude, w.latitude] as [number, number]),
        [targetPeak.longitude, targetPeak.latitude]
      ];

      const { points, distance, duration } = await fetchRoute(coords);
      const { gain, loss } = calculateElevation(points);

      const newRoute: CustomRoute = {
        points,
        summary: {
          distance,
          duration,
          elevGain: gain,
          elevLoss: loss
        },
        waypoints,
        startPoint: start,
        targetPeakId: targetPeak.id,
        isRoundTrip: false
      };

      setActiveRoute(newRoute);
      maxCoveredDist.current = 0;
      maxCoveredGain.current = 0;
      reachedPeak.current = false;
      
      // Initial progress
      setProgress({
        coveredDistance: 0,
        coveredGain: 0,
        remainingDistance: distance,
        remainingGain: gain,
        reachedPeak: false
      });
    } catch (err) {
      console.error('Failed to create route:', err);
      throw err;
    }
  }, []);

  const updateRoute = useCallback(async (updates: Partial<CustomRoute>) => {
    if (!activeRoute) return;
    
    const updatedRoute = { ...activeRoute, ...updates };
    
    // If coordinates changed, refetch
    if (updates.waypoints || updates.startPoint) {
      // Need to find the target peak coordinates again
      // For now, assume it's the last point of the previous route
      const lastPoint = activeRoute.points[activeRoute.points.length - 1];
      await createRoute(updatedRoute.startPoint, { id: activeRoute.targetPeakId, ...lastPoint }, updatedRoute.waypoints);
    } else {
      setActiveRoute(updatedRoute);
    }
  }, [activeRoute, createRoute]);

  const toggleRoundTrip = useCallback(() => {
    if (!activeRoute) return;
    setActiveRoute(prev => prev ? { ...prev, isRoundTrip: !prev.isRoundTrip } : null);
  }, [activeRoute]);

  const removeWaypoint = useCallback(async (index: number) => {
    if (!activeRoute) return;
    const newWaypoints = [...activeRoute.waypoints];
    newWaypoints.splice(index, 1);
    await updateRoute({ waypoints: newWaypoints });
  }, [activeRoute, updateRoute]);

  // Tracking logic
  useEffect(() => {
    if (!activeRoute) return;

    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const points = activeRoute.points;
          const nearestIdx = findNearestPointIndex(latitude, longitude, points);
          
          // Off-route protection: if > 100m from route and no progress, show 0
          const distToRoute = haversineDistance(latitude, longitude, points[nearestIdx].latitude, points[nearestIdx].longitude);

          const metrics = calculateCoveredMetrics(points, nearestIdx);
          
          // Reached peak detection (within 80m of the peak)
          const peakIdx = points.length - 1;
          const distToPeak = haversineDistance(latitude, longitude, points[peakIdx].latitude, points[peakIdx].longitude);
          
          if (distToPeak < 80) {
            reachedPeak.current = true;
          }

          let finalCoveredDist = metrics.distance;
          let finalCoveredGain = metrics.gain;

          if (distToRoute > 100 && maxCoveredDist.current === 0) {
            finalCoveredDist = 0;
            finalCoveredGain = 0;
          }

          if (activeRoute.isRoundTrip && reachedPeak.current) {
            finalCoveredDist = activeRoute.summary.distance + (activeRoute.summary.distance - metrics.distance);
            finalCoveredGain = activeRoute.summary.elevGain + Math.max(0, activeRoute.summary.elevLoss - metrics.loss);
          }

          // Monotonic max
          maxCoveredDist.current = Math.max(maxCoveredDist.current, finalCoveredDist);
          maxCoveredGain.current = Math.max(maxCoveredGain.current, finalCoveredGain);

          const totalDist = activeRoute.isRoundTrip ? activeRoute.summary.distance * 2 : activeRoute.summary.distance;
          const totalGain = activeRoute.isRoundTrip ? activeRoute.summary.elevGain + activeRoute.summary.elevLoss : activeRoute.summary.elevGain;

          setProgress({
            coveredDistance: maxCoveredDist.current,
            coveredGain: maxCoveredGain.current,
            remainingDistance: Math.max(0, totalDist - maxCoveredDist.current),
            remainingGain: Math.max(0, totalGain - maxCoveredGain.current),
            reachedPeak: reachedPeak.current
          });
        }
      );
    };

    startTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [activeRoute]);

  return (
    <RouteContext.Provider value={{
      activeRoute,
      progress,
      isPickingStart,
      isPickingWaypoint,
      setIsPickingStart,
      setIsPickingWaypoint,
      createRoute,
      updateRoute,
      clearRoute,
      toggleRoundTrip,
      removeWaypoint
    }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
}