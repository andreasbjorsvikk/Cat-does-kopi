import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Peak } from '@/data/peaks';
import { getUserCheckins, PeakCheckin } from '@/services/peakCheckinService';
import { fetchPeaks, dbPeakToLegacy, createPeak, updatePeak, deletePeak, DbPeak } from '@/services/peakDbService';
import { fetchPendingSuggestions, PeakSuggestion } from '@/services/peakSuggestionService';
import MapSubTabs, { MapSubTab } from '@/components/map/MapSubTabs';
import MapView from '@/components/map/MapView';
import PeaksList from '@/components/map/PeaksList';
import PeakDetailDrawer from '@/components/map/PeakDetailDrawer';
import AdminPeakForm from '@/components/map/AdminPeakForm';
import AdminSuggestionsDrawer from '@/components/map/AdminSuggestionsDrawer';
import SuggestPeakDrawer from '@/components/map/SuggestPeakDrawer';
import MapSettingsSheet from '@/components/map/MapSettingsSheet';
import PeakFeed from '@/components/map/PeakFeed';
import GlobalLeaderboard from '@/components/map/GlobalLeaderboard';
import MapTutorial from '@/components/map/MapTutorial';
import ARView from '@/components/map/ARView';
import CustomRouteBar from '@/components/map/CustomRouteBar';
import RouteStartPicker from '@/components/map/RouteStartPicker';
import { Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { toast } from 'sonner';
import { get, set } from 'idb-keyval';

type PeakFilter = 'all' | 'taken' | 'not_taken';
type HeatmapPeriod = 'year' | 'total';

const MapPage = () => {
  const { user } = useAuth();
  const { adminMode } = useAdmin();
  const [subTab, setSubTab] = useState<MapSubTab>('kart');
  const [returnToTopperPeak, setReturnToTopperPeak] = useState<Peak | null>(null);
  const [checkins, setCheckins] = useState<PeakCheckin[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [dbPeaks, setDbPeaks] = useState<DbPeak[]>([]);

  // Admin state
  const [addMode, setAddMode] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPeak, setEditingPeak] = useState<DbPeak | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [routeStartPickForPeak, setRouteStartPickForPeak] = useState<DbPeak | null>(null);
  const [routeStartCoords, setRouteStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mapClickEvent, setMapClickEvent] = useState<{lat: number, lng: number, timestamp: number} | null>(null);
  const [waypointClickEvent, setWaypointClickEvent] = useState<{index: number, timestamp: number} | null>(null);
  const [waypointDragEvent, setWaypointDragEvent] = useState<{index: number, lat: number, lng: number, timestamp: number} | null>(null);

  // User suggestion state
  const [suggestCoords, setSuggestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Active route — restore from sessionStorage so it survives bottom-nav tab switches.
  const [activeRouteGeojson, setActiveRouteGeojson] = useState<any>(() => {
    try {
      const raw = sessionStorage.getItem('map_custom_route');
      if (!raw) return null;
      const cr = JSON.parse(raw);
      return { type: 'LineString', coordinates: cr.coords3d.map((c: number[]) => [c[0], c[1]]) };
    } catch { return null; }
  });
  const [activeRoutePeakId, setActiveRoutePeakId] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem('map_custom_route');
      return raw ? JSON.parse(raw).peak.id : null;
    } catch { return null; }
  });
  const [routeFocus, setRouteFocus] = useState<{ latitude: number; longitude: number; requestId: number } | null>(() => {
    try {
      const raw = sessionStorage.getItem('map_custom_route');
      if (!raw) return null;
      const cr = JSON.parse(raw);
      return { latitude: cr.peak.latitude, longitude: cr.peak.longitude, requestId: Date.now() };
    } catch { return null; }
  });
  const [previewWaypoints, setPreviewWaypoints] = useState<{lat: number, lng: number}[]>([]);
  const [pendingRoutePeak, setPendingRoutePeak] = useState<Peak | null>(null);

  // User-created ("Lag rute") route state — persisted in sessionStorage so it
  // survives navigating away from the Kart bottom-nav tab and back.
  const [pickingStartForPeak, setPickingStartForPeak] = useState<Peak | null>(null);
  const [creatingCustomRoute, setCreatingCustomRoute] = useState(false);
  const [customRoute, setCustomRoute] = useState<{
    peak: Peak;
    coords3d: [number, number, number][];
    distanceM: number;
    elevGainM: number;
    elevLossM: number;
    roundTrip: boolean;
  } | null>(() => {
    try {
      const raw = sessionStorage.getItem('map_custom_route');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  // Start GPS immediately on mount if a custom route was restored, so the user
  // marker reappears when returning to the Kart tab.
  const [gpsTrackTrigger, setGpsTrackTrigger] = useState(() => {
    try { return sessionStorage.getItem('map_custom_route') ? 1 : 0; } catch { return 0; }
  });

  // Persist customRoute so it survives bottom-nav tab switches (MapPage unmount).
  useEffect(() => {
    try {
      if (customRoute) sessionStorage.setItem('map_custom_route', JSON.stringify(customRoute));
      else sessionStorage.removeItem('map_custom_route');
    } catch {}
  }, [customRoute]);

  // The info bar is backed by `customRoute`, while the map line is backed by
  // `activeRouteGeojson`. Keep them re-synced on every Kart remount/tab return
  // so the route line cannot disappear while the route bar stays visible.
  useEffect(() => {
    if (!customRoute) return;

    const geo2d = {
      type: 'LineString',
      coordinates: customRoute.coords3d.map((c) => [c[0], c[1]]),
    };

    setActiveRouteGeojson(geo2d);
    setActiveRoutePeakId(customRoute.peak.id);

    if (subTab === 'kart') {
      setRouteFocus({
        latitude: customRoute.peak.latitude,
        longitude: customRoute.peak.longitude,
        requestId: Date.now(),
      });
      // MapView unmounts when leaving the Kart sub-tab, so re-trigger GPS when
      // returning. If tracking is already active in the new MapView this is a no-op.
      setGpsTrackTrigger((n) => n + 1);
    }
  }, [customRoute?.coords3d, customRoute?.peak.id, customRoute?.peak.latitude, customRoute?.peak.longitude, subTab]);

  // Custom route info and custom route line must never depend on two separate
  // pieces of state after tab remounts. Always derive the visible line directly
  // from `customRoute` when it exists, and only fall back to saved peak routes.
  const visibleRouteGeojson = useMemo(() => {
    if (customRoute && customRoute.coords3d.length >= 2) {
      return {
        type: 'LineString',
        coordinates: customRoute.coords3d.map((c) => [c[0], c[1]]),
      };
    }

    return activeRouteGeojson;
  }, [activeRouteGeojson, customRoute?.coords3d]);



  // Map settings
  const [showSettings, setShowSettings] = useState(false);
  const [peakFilter, setPeakFilter] = useState<PeakFilter>('all');
  const [showAreaStats, setShowAreaStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>('year');
  const [onlyReachedThisYear, setOnlyReachedThisYear] = useState(false);
  const [defaultMapStyle, setDefaultMapStyle] = useState<'satellite' | 'streets' | 'topo' | 'terrain'>(() => {
    const raw = (localStorage.getItem('treningslogg_default_map_style') as string) || 'satellite';
    if (raw === 'outdoors') return 'terrain';
    if (raw === 'satellite' || raw === 'streets' || raw === 'topo' || raw === 'terrain') return raw as any;
    return 'satellite';
  });
  const [areaStatsMode, setAreaStatsMode] = useState<'off' | 'kommune' | 'fylke'>('off');

  // Suggested peaks (pending, visible to all)
  const [suggestedPeaks, setSuggestedPeaks] = useState<PeakSuggestion[]>([]);

  const checkedPeakIds = useMemo(() => new Set(checkins.map(c => c.peak_id)), [checkins]);
  const peaksCacheKey = `treningslogg_peaks_cache_${adminMode ? 'admin' : 'user'}`;

  // Filter peaks for map display
  const filteredPeaks = useMemo(() => {
    if (peakFilter === 'all') return peaks;
    if (peakFilter === 'taken') return peaks.filter(p => checkedPeakIds.has(p.id));
    return peaks.filter(p => !checkedPeakIds.has(p.id));
  }, [peaks, peakFilter, checkedPeakIds]);

  const loadPeaks = useCallback(async () => {
    try {
      const data = await fetchPeaks();
      setDbPeaks(data);
      setPeaks(data.map(dbPeakToLegacy));
      set(peaksCacheKey, data).catch(() => {});
    } catch {
      const cached = await get<DbPeak[]>(peaksCacheKey).catch(() => undefined);
      if (cached && cached.length > 0) {
        setDbPeaks(cached);
        setPeaks(cached.map(dbPeakToLegacy));
      }
    }
  }, [peaksCacheKey]);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserCheckins(user.id);
      setCheckins(data);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => { loadPeaks(); }, [loadPeaks]);
  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  // Load pending suggestions for all users
  useEffect(() => {
    if (!user) return;
    fetchPendingSuggestions().then(setSuggestedPeaks).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleOpenAdminSuggestions = () => {
      if (!adminMode) return;
      setSubTab('kart');
      setShowSuggestions(true);
    };

    window.addEventListener('open-admin-peak-suggestions', handleOpenAdminSuggestions);
    return () => window.removeEventListener('open-admin-peak-suggestions', handleOpenAdminSuggestions);
  }, [adminMode]);


  const handleSelectPeak = (peak: Peak) => {
    setSelectedPeak(peak);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (adminMode && addMode) {
      setAddCoords({ lat, lng });
      setAddMode(false);
    } else if (adminMode && routeStartPickForPeak) {
      setRouteStartCoords({ lat, lng });
      setEditingPeak(routeStartPickForPeak);
      setRouteStartPickForPeak(null);
    } else if (adminMode && editingPeak) {
      setMapClickEvent({ lat, lng, timestamp: Date.now() });
    }
  };

  const handleCreatePeak = async (data: any) => {
    if (!user) return;
    await createPeak({ ...data, created_by: user.id });
    toast.success('Toppen ble opprettet');
    loadPeaks();
  };

  const handleUpdatePeak = async (data: any) => {
    if (!editingPeak) return;
    await updatePeak(editingPeak.id, data);
    toast.success('Toppen ble oppdatert');
    loadPeaks();
  };

  const handleDeletePeak = async (peakId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne toppen?')) return;
    await deletePeak(peakId);
    toast.success('Toppen ble slettet');
    loadPeaks();
  };

  const handleEditPeak = (peak: Peak) => {
    const dbPeak = dbPeaks.find(p => p.id === peak.id);
    if (dbPeak) {
      setEditingPeak(dbPeak);
      setSelectedPeak(null);
    }
  };

  const handleMarkerDrag = async (peakId: string, lat: number, lng: number) => {
    await updatePeak(peakId, { latitude: lat, longitude: lng });
    toast.success('Posisjon oppdatert');
    loadPeaks();
  };

  const handleLongPress = (lat: number, lng: number) => {
    if (!adminMode) setSuggestCoords({ lat, lng });
  };

  const handlePickRouteStart = () => {
    setRouteStartPickForPeak(editingPeak);
    setEditingPeak(null);
    toast.info('Trykk på kartet for å velge startpunkt for ruten.');
  };

  const normalizeRouteGeojson = useCallback((route: Peak['route_geojson']) => {
    if (!route) return null;
    if (typeof route === 'string') return route;

    try {
      return JSON.parse(JSON.stringify(route));
    } catch {
      return route;
    }
  }, []);

  const applyRouteForPeak = useCallback((peak: Peak) => {
    const routePayload = normalizeRouteGeojson(peak.route_geojson);
    if (!routePayload) return;

    setActiveRouteGeojson(routePayload);
    setActiveRoutePeakId(peak.id);
    setRouteFocus({ latitude: peak.latitude, longitude: peak.longitude, requestId: Date.now() });
  }, [normalizeRouteGeojson]);

  const primeMapForRoute = useCallback((peak: Peak) => {
    localStorage.setItem('map_last_center', JSON.stringify([peak.longitude, peak.latitude]));
    localStorage.setItem('map_last_zoom', '13');
  }, []);

  const schedulePendingRoute = useCallback((peak: Peak) => {
    const delays = [0, 180, 700, 1400];
    const timers = delays.map((delay) => window.setTimeout(() => {
      window.requestAnimationFrame(() => applyRouteForPeak(peak));
    }, delay));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [applyRouteForPeak]);

  const handleShowRoute = (peak: Peak, fromTopper?: boolean) => {
    if (peak.route_status !== 'approved' || !peak.route_geojson) return;

    const openedFromTopper = subTab === 'topper' || fromTopper === true;

    // Close the peak detail drawer so the map/route is visible
    setSelectedPeak(null);
    primeMapForRoute(peak);

    if (openedFromTopper) {
      setActiveRouteGeojson(null);
      setActiveRoutePeakId(null);
      setRouteFocus(null);
      setPendingRoutePeak(peak);
      setSubTab('kart');
      return;
    }

    applyRouteForPeak(peak);
  };

  const handleMapReady = useCallback(() => {
    if (pendingRoutePeak) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          applyRouteForPeak(pendingRoutePeak);
        });
      });
    }
  }, [applyRouteForPeak, pendingRoutePeak]);

  useEffect(() => {
    if (subTab !== 'kart' || !pendingRoutePeak) return;

    return schedulePendingRoute(pendingRoutePeak);
  }, [subTab, pendingRoutePeak, schedulePendingRoute]);

  // Re-nudge routeFocus when returning to the kart tab so a persisted route
  // (custom or peak route) redraws and refits after MapView remounts.
  useEffect(() => {
    if (subTab !== 'kart') return;
    if (!visibleRouteGeojson) return;
    const target = customRoute
      ? { lat: customRoute.peak.latitude, lng: customRoute.peak.longitude }
      : (activeRoutePeakId
        ? peaks.find(p => p.id === activeRoutePeakId)
        : null);
    if (!target) return;
    const lat = 'lat' in target ? target.lat : (target as Peak).latitude;
    const lng = 'lng' in target ? target.lng : (target as Peak).longitude;
    setRouteFocus({ latitude: lat, longitude: lng, requestId: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  useEffect(() => {
    if (showSuggestions && adminMode) {
      window.dispatchEvent(new CustomEvent('admin-peak-suggestions-opened'));
    }
  }, [showSuggestions, adminMode]);

  const handleHideRoute = () => {
    setPendingRoutePeak(null);
    setActiveRouteGeojson(null);
    setActiveRoutePeakId(null);
    setRouteFocus(null);
    setCustomRoute(null);
  };

  const buildCustomRoute = useCallback(async (peak: Peak, startLat: number, startLng: number) => {
    setCreatingCustomRoute(true);
    try {
      const { data, error } = await supabase.functions.invoke('ors-route', {
        body: { coordinates: [[startLng, startLat], [peak.longitude, peak.latitude]] },
      });
      if (error) throw error;
      const feature = data?.features?.[0];
      if (!feature) throw new Error('No route');
      const coords3d = (feature.geometry?.coordinates || []) as [number, number, number][];
      if (coords3d.length < 2) throw new Error('Empty route');
      let elevGain = 0;
      let elevLoss = 0;
      for (let i = 1; i < coords3d.length; i++) {
        const d = (coords3d[i][2] || 0) - (coords3d[i - 1][2] || 0);
        if (d > 0) elevGain += d;
        else elevLoss += -d;
      }
      const distance = feature.properties?.summary?.distance || 0;
      const geo2d = { type: 'LineString', coordinates: coords3d.map(c => [c[0], c[1]]) };
      setCustomRoute({ peak, coords3d, distanceM: distance, elevGainM: elevGain, elevLossM: elevLoss, roundTrip: false });
      setActiveRouteGeojson(geo2d);
      setActiveRoutePeakId(peak.id);
      setRouteFocus({ latitude: peak.latitude, longitude: peak.longitude, requestId: Date.now() });
      setSubTab('kart');
      // Start GPS tracking so the user can see their own position moving along the route.
      setGpsTrackTrigger((n) => n + 1);
      toast.success('Rute laget');
    } catch (e: any) {
      console.error('Custom route error:', e);
      toast.error('Kunne ikke lage rute. Prøv et annet startpunkt.');
    } finally {
      setCreatingCustomRoute(false);
    }
  }, []);

  const handleCreateRoute = useCallback((peak: Peak, source: 'gps' | 'pick') => {
    if (source === 'pick') {
      // Do NOT prime map_last_center to the peak here — MapView is already
      // mounted on the Kart tab, so writing peak coords would make the
      // crosshair (which sits over the ACTUAL current center) disagree with
      // the value confirm reads back. Just enter picking mode; the user pans
      // the map to their desired start point.
      setPickingStartForPeak(peak);
      setSubTab('kart');
      return;
    }
    if (!navigator.geolocation) {
      toast.error('GPS er ikke tilgjengelig');
      return;
    }
    toast.info('Henter din posisjon...');
    navigator.geolocation.getCurrentPosition(
      (pos) => buildCustomRoute(peak, pos.coords.latitude, pos.coords.longitude),
      (err) => {
        if (err.code === 1) toast.error('Aktiver posisjonstilgang for å lage rute fra din posisjon');
        else if (err.code === 2) toast.error('Posisjon ikke tilgjengelig');
        else toast.error('Kunne ikke hente posisjon');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [buildCustomRoute]);

  const handleConfirmPickedStart = useCallback(() => {
    const peak = pickingStartForPeak;
    if (!peak) return;
    // Prefer the live map center from MapView (updates on every frame of
    // panning). Fall back to localStorage only if the getter isn't ready yet.
    const getCenter = (window as any).__mapGetCenter as (() => [number, number]) | undefined;
    let lng: number | undefined;
    let lat: number | undefined;
    if (typeof getCenter === 'function') {
      try {
        const c = getCenter();
        if (Array.isArray(c) && c.length === 2) { lng = c[0]; lat = c[1]; }
      } catch {}
    }
    if (lng == null || lat == null) {
      const raw = localStorage.getItem('map_last_center');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          lng = parsed[0]; lat = parsed[1];
        } catch {}
      }
    }
    if (lng == null || lat == null) {
      toast.error('Kunne ikke finne kartsenter');
      return;
    }
    setPickingStartForPeak(null);
    buildCustomRoute(peak, lat, lng);
  }, [pickingStartForPeak, buildCustomRoute]);


  return (
    <div className={`relative h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] ${subTab !== 'kart' ? 'flex flex-col' : ''}`}>
      {/* Map renders full height behind everything when on kart tab */}
      {subTab === 'kart' && (
        <div className="absolute inset-0">
          <MapView
            peaks={filteredPeaks}
            checkins={checkins}
            onSelectPeak={handleSelectPeak}
            adminMode={adminMode}
            addMode={addMode || !!routeStartPickForPeak}
            onMapClick={handleMapClick}
            onMarkerDrag={handleMarkerDrag}
            onEditPeak={handleEditPeak}
            onDeletePeak={handleDeletePeak}
            onLongPress={handleLongPress}
            routeGeojson={visibleRouteGeojson}
            routeFocus={routeFocus}
            suppressInitialGeolocate={!!routeFocus || !!pendingRoutePeak}
            onClearRoute={handleHideRoute}
            onMapReady={handleMapReady}
            previewWaypoints={previewWaypoints}
            onWaypointClick={(index) => setWaypointClickEvent({ index, timestamp: Date.now() })}
            onWaypointDrag={(index, lat, lng) => setWaypointDragEvent({ index, lat, lng, timestamp: Date.now() })}
            showHeatmap={showHeatmap}
            heatmapPeriod={heatmapPeriod}
            showAreaStats={showAreaStats}
            areaStatsMode={areaStatsMode}
            onlyReachedThisYear={onlyReachedThisYear}
            suggestedPeaks={suggestedPeaks}
            onSettingsClick={() => setShowSettings(true)}
            gpsTrackTrigger={gpsTrackTrigger}
          />
        </div>
      )}

      {/* Sub-tab bar - overlaid on map with blur background */}
      <div className="relative z-10 px-4 pt-3 pb-2">
        <MapSubTabs active={subTab} onChange={setSubTab} />
      </div>

      {/* Admin toolbar */}
      {adminMode && subTab === 'kart' && (
        <div className="relative z-10 pl-24 pr-4 pb-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setAddMode(!addMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              addMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'
            }`}
          >
            {addMode ? '✕ Avbryt' : '+ Legg til topp'}
          </button>
          <button
            onClick={() => setShowSuggestions(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            📋 Forslag
          </button>
        </div>
      )}
      {adminMode && addMode && subTab === 'kart' && (
        <div className="relative z-10 px-4 pb-2">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Trykk på kartet for å velge posisjon for ny topp.
          </p>
        </div>
      )}

      {/* Map overlay buttons when on kart tab */}
      {subTab === 'kart' && (
        <>
          {visibleRouteGeojson && !selectedPeak && activeRoutePeakId && (
            <button
              onClick={() => {
                const peak = peaks.find(p => p.id === activeRoutePeakId);
                if (peak) setSelectedPeak(peak);
                handleHideRoute();
              }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold shadow-lg border border-border bg-background/95 backdrop-blur-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Skjul rute
            </button>
          )}
          {returnToTopperPeak && !visibleRouteGeojson && (
            <button
              onClick={() => {
                setSubTab('topper');
                setSelectedPeak(returnToTopperPeak);
                setReturnToTopperPeak(null);
                setRouteFocus(null);
              }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold shadow-lg border border-border bg-background/95 backdrop-blur-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Tilbake
            </button>
          )}
          <MapTutorial />

          {/* User-created route: live stats bar */}
          {customRoute && (
            <CustomRouteBar
              language={/^en/i.test(navigator.language) ? 'en' : 'no'}
              peakName={customRoute.peak.name}
              coords3d={customRoute.coords3d}
              distanceM={customRoute.distanceM}
              elevGainM={customRoute.elevGainM}
              elevLossM={customRoute.elevLossM}
              roundTrip={customRoute.roundTrip}
              onRoundTripChange={(v) => setCustomRoute(prev => prev ? { ...prev, roundTrip: v } : prev)}
              onClose={handleHideRoute}
            />
          )}

          {/* User-created route: start-point picker overlay */}
          {pickingStartForPeak && (
            <RouteStartPicker
              language={/^en/i.test(navigator.language) ? 'en' : 'no'}
              loading={creatingCustomRoute}
              onConfirm={handleConfirmPickedStart}
              onCancel={() => setPickingStartForPeak(null)}
            />
          )}
        </>
      )}

      {/* Non-map tab content */}
      {subTab !== 'kart' && (
        <div className="flex-1 min-h-0">
          {subTab === 'topper' && (
            <div className="h-full overflow-y-auto">
              <PeaksList
                peaks={peaks}
                checkins={checkins}
                onSelectPeak={handleSelectPeak}
                adminMode={adminMode}
                onEditPeak={handleEditPeak}
                onDeletePeak={handleDeletePeak}
              />
            </div>
          )}

          {subTab === 'feed' && (
            <div className="h-full overflow-y-auto">
              <PeakFeed />
            </div>
          )}

          {subTab === 'lederliste' && (
            <div className="h-full overflow-y-auto">
              <GlobalLeaderboard />
            </div>
          )}

          {subTab === 'ar' && (
            <div className="h-full">
              <ARView
                peaks={peaks}
                checkins={checkins}
                onSelectPeak={handleSelectPeak}
              />
            </div>
          )}
        </div>
      )}

      {/* Map settings sheet */}
      <MapSettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        peakFilter={peakFilter}
        onPeakFilterChange={setPeakFilter}
        showAreaStats={showAreaStats}
        onShowAreaStatsChange={setShowAreaStats}
        showHeatmap={showHeatmap}
        onShowHeatmapChange={setShowHeatmap}
        heatmapPeriod={heatmapPeriod}
        onHeatmapPeriodChange={setHeatmapPeriod}
        onlyReachedThisYear={onlyReachedThisYear}
        onOnlyReachedThisYearChange={setOnlyReachedThisYear}
        defaultMapStyle={defaultMapStyle}
        onDefaultMapStyleChange={(s) => {
          setDefaultMapStyle(s);
          localStorage.setItem('treningslogg_default_map_style', s);
        }}
        areaStatsMode={areaStatsMode}
        onAreaStatsModeChange={setAreaStatsMode}
      />




      {/* Peak detail drawer */}
      <PeakDetailDrawer
        peak={selectedPeak}
        open={!!selectedPeak}
        onClose={() => setSelectedPeak(null)}
        checkins={checkins}
        onCheckinSuccess={fetchCheckins}
        adminMode={adminMode}
        onEdit={handleEditPeak}
        onDelete={handleDeletePeak}
        onShowRoute={handleShowRoute}
        onHideRoute={handleHideRoute}
        isRouteShown={!!activeRoutePeakId && activeRoutePeakId === selectedPeak?.id}
        fromTopperTab={subTab === 'topper'}
        onShowOnMap={(peak) => {
          setReturnToTopperPeak(peak);
          setSelectedPeak(null);
          primeMapForRoute(peak);
          setSubTab('kart');
          // Focus map on this peak after switching
          setTimeout(() => {
            setRouteFocus({ latitude: peak.latitude, longitude: peak.longitude, requestId: Date.now() });
          }, 300);
        }}
        onCreateRoute={handleCreateRoute}
      />

      {/* Admin: Add new peak form */}
      {addCoords && (
        <AdminPeakForm
          open={!!addCoords}
          onClose={() => setAddCoords(null)}
          onSave={handleCreatePeak}
          initial={{ latitude: addCoords.lat, longitude: addCoords.lng }}
          title="Legg til ny topp"
        />
      )}

      {/* Admin: Edit peak form */}
      {editingPeak && (
        <AdminPeakForm
          open={!!editingPeak}
          onClose={() => { setEditingPeak(null); setRouteStartCoords(null); setActiveRouteGeojson(null); }}
          onSave={handleUpdatePeak}
          initial={editingPeak}
          title="Rediger topp"
          peakId={editingPeak.id}
          onPickRouteStart={handlePickRouteStart}
          routeStartCoordsProp={routeStartCoords}
          onPreviewRoute={(geojson) => setActiveRouteGeojson(geojson)}
          mapClickEvent={mapClickEvent}
          waypointClickEvent={waypointClickEvent}
          waypointDragEvent={waypointDragEvent}
          onWaypointsChange={setPreviewWaypoints}
        />
      )}

      {/* Admin: Suggestions drawer */}
      <AdminSuggestionsDrawer
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        onApproved={loadPeaks}
      />

      {/* User: Suggest peak */}
      {suggestCoords && (
        <SuggestPeakDrawer
          open={!!suggestCoords}
          onClose={() => setSuggestCoords(null)}
          latitude={suggestCoords.lat}
          longitude={suggestCoords.lng}
        />
      )}
    </div>
  );
};

export default MapPage;
