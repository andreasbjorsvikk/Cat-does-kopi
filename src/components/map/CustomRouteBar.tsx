import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X, Mountain, Route as RouteIcon } from 'lucide-react';

interface Props {
  language: 'no' | 'en';
  peakName: string;
  coords3d: [number, number, number][];
  distanceM: number;
  /** Elevation gain along the outbound direction (uphill only). */
  elevGainM: number;
  /** Elevation loss along the outbound direction — becomes uphill on the return leg. */
  elevLossM: number;
  roundTrip: boolean;
  onRoundTripChange: (v: boolean) => void;
  onClose: () => void;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Floating card shown at the top of the map when a user-created route is active.
 * Displays total and remaining distance / elevation gain, with an optional
 * round-trip toggle. Uses navigator.geolocation.watchPosition for live remaining stats.
 *
 * Elevation gain only counts uphill sections. On a round trip, the return-leg
 * uphill equals the outbound downhill (elevLossM), NOT double the outbound gain.
 */
export default function CustomRouteBar({
  language,
  peakName,
  coords3d,
  distanceM,
  elevGainM,
  elevLossM,
  roundTrip,
  onRoundTripChange,
  onClose,
}: Props) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  // Monotonic-max progress so brief GPS noise or a short detour off the route
  // cannot make the counters snap back to 0 mid-hike.
  const maxDistRef = useRef(0);
  const maxElevRef = useRef(0);
  // Round-trip return-leg detection: once the user has been near the peak
  // (last vertex of the outbound path), any subsequent progress back toward
  // the trailhead should COUNT UP on the return leg instead of retracing
  // the outbound sum backward toward 0.
  const reachedPeakRef = useRef(false);

  // Reset progress trackers whenever the underlying route changes.
  useEffect(() => {
    maxDistRef.current = 0;
    maxElevRef.current = 0;
    reachedPeakRef.current = false;
  }, [coords3d, distanceM]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Compute traveled distance and uphill elevation gain ALONG the route.
  // Outbound leg: sum from start (index 0) to nearest projected vertex.
  // Round-trip return leg (after user has reached the peak): add the
  // outbound total plus how far back from the peak we've retraced, and
  // add the return-leg uphill (which equals outbound downhill from the
  // peak back to the nearest vertex).
  const traveled = (() => {
    if (!pos || coords3d.length < 2) return null;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < coords3d.length; i++) {
      const d = haversineMeters(pos.lat, pos.lng, coords3d[i][1], coords3d[i][0]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    // Outbound cumulative stats up to nearestIdx.
    let outDist = 0;
    let outGain = 0;
    let outLoss = 0;
    for (let i = 1; i <= nearestIdx; i++) {
      outDist += haversineMeters(
        coords3d[i - 1][1], coords3d[i - 1][0],
        coords3d[i][1], coords3d[i][0],
      );
      const de = (coords3d[i][2] || 0) - (coords3d[i - 1][2] || 0);
      if (de > 0) outGain += de;
      else outLoss += -de;
    }

    // Detect "reached peak" (near the last vertex) to switch into return-leg
    // accounting for round trips.
    const lastIdx = coords3d.length - 1;
    const nearPeak = nearestIdx >= lastIdx - 1 && nearestDist < 80;
    if (nearPeak) reachedPeakRef.current = true;

    let dist: number;
    let elev: number;
    if (roundTrip && reachedPeakRef.current) {
      // Return leg: full outbound + how far we've retraced back from the peak.
      const retracedDist = distanceM - outDist;
      // Return-leg uphill = outbound downhill from peak back to nearestIdx
      //                   = elevLossM (total outbound loss) - outLoss (up to nearestIdx)
      const retracedUphill = Math.max(0, elevLossM - outLoss);
      dist = distanceM + Math.max(0, retracedDist);
      elev = elevGainM + retracedUphill;
    } else {
      // Outbound leg — but if the user is way off the route AND we haven't
      // built up any progress yet, just report 0 rather than counting a
      // random nearest-vertex projection.
      if (nearestDist > 100 && maxDistRef.current === 0) {
        return { dist: 0, elev: 0 };
      }
      dist = outDist;
      elev = outGain;
    }

    // Monotonic max — never let the counters decrease.
    if (dist > maxDistRef.current) maxDistRef.current = dist;
    if (elev > maxElevRef.current) maxElevRef.current = elev;
    return { dist: maxDistRef.current, elev: maxElevRef.current };
  })();

  // Round-trip totals: distance doubles; uphill counts outbound gain + return-leg
  // uphill (which equals the outbound downhill = elevLossM).
  const totalDist = roundTrip ? distanceM * 2 : distanceM;
  const totalElev = roundTrip ? elevGainM + elevLossM : elevGainM;
  const traveledDist = traveled ? traveled.dist : null;
  const traveledElev = traveled ? traveled.elev : null;

  return (
    <div className="absolute top-14 left-3 right-3 z-20 max-w-sm mx-auto rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-xl p-3 space-y-2 animate-in slide-in-from-top-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {language === 'no' ? 'Rute til' : 'Route to'}
          </p>
          <p className="text-sm font-semibold truncate">{peakName}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 -mr-1 -mt-1 shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4 mr-1" />
          <span className="text-xs">{language === 'no' ? 'Lukk rute' : 'Close route'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
          <RouteIcon className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-tight">
              {language === 'no' ? 'Distanse' : 'Distance'}
            </p>
            <p className="text-sm font-semibold leading-tight">
              {traveledDist != null
                ? `${(traveledDist / 1000).toFixed(1)} / ${(totalDist / 1000).toFixed(1)} km`
                : `${(totalDist / 1000).toFixed(1)} km`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
          <Mountain className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-tight">
              {language === 'no' ? 'Stigning' : 'Elev. gain'}
            </p>
            <p className="text-sm font-semibold leading-tight">
              {traveledElev != null
                ? `${Math.round(traveledElev)} / ${Math.round(totalElev)} m`
                : `${Math.round(totalElev)} m`}
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between px-1 pt-1 cursor-pointer">
        <span className="text-xs text-muted-foreground">
          {language === 'no' ? 'Tur/retur' : 'Round trip'}
        </span>
        <Checkbox checked={roundTrip} onCheckedChange={(v) => onRoundTripChange(!!v)} />
      </label>
      {traveled != null && (
        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          {language === 'no' ? 'Tilbakelagt oppdateres mens du beveger deg' : 'Progress updates as you move'}
        </p>
      )}
    </div>
  );
}
