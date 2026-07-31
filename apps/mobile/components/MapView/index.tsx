import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image,
  Platform,
  ScrollView,
  UIManager,
  Alert,
} from "react-native";
import MapView, { Marker, UrlTile, Polyline } from "react-native-maps";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { 
  X, 
  CheckCircle,
  Mountain,
  Layers,
  Map,
  Rss,
  Trophy,
  Sparkles,
  Info,
  Pencil,
  Trash2,
  Navigation,
  Compass
} from "lucide-react-native";
import { fetchPeaks, Peak } from "@/services/peakDbService";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import Constants from "expo-constants";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "@/hooks/useAuth";
import { LinearGradient } from "expo-linear-gradient";
import { 
  getUserCheckins, 
  checkinPeak, 
  getDistanceMeters, 
  PeakCheckin,
  deleteCheckin,
  updateCheckinImage,
  uploadCheckinImage
} from "@/services/peakCheckinService";
import { PeakFeed } from "../PeakFeed";
import { ChildCheckinSheet } from "../ChildCheckinSheet";
import { PeaksList } from "../PeaksList";
import { LeaderboardView } from "../LeaderboardView";
import { PeakLeaderboard } from "../leaderboard/PeakLeaderboard";
import { PeakProfileSheet } from "../PeakProfileSheet";
import { fetchBoundary } from "@/services/boundaryService";
import KOMMUNER_DATA from "@/data/kommuner.json";
import { useRoute } from "@/context/RouteContext";
import { CustomRouteBar } from "../CustomRouteBar";
import { RouteStartPicker } from "../RouteStartPicker";

let Mapbox: any = null;
let MapboxMapView: any = null;
let MapboxCamera: any = null;
let MapboxMarkerView: any = null;

try {
  if (Platform.OS !== "web") {
    const RNMapbox = require("@rnmapbox/maps");
    Mapbox = RNMapbox.default;
    MapboxMapView = RNMapbox.MapView;
    MapboxCamera = RNMapbox.Camera;
    MapboxMarkerView = RNMapbox.MarkerView;

    const token = Constants.expoConfig?.extra?.mapboxAccessToken;
    if (token) {
      Mapbox.setAccessToken(token);
    }
  }
} catch (err) {
  console.warn("Failed to load @rnmapbox/maps native modules:", err);
}

const isMapboxAvailable = !!MapboxMapView;

const TABS = [
  { id: "kart", label: "Fjellkart", icon: Mountain },
  { id: "topper", label: "Topper", icon: Mountain },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "lederliste", label: "Lederliste", icon: Trophy },
  { id: "ar", label: "AR", icon: Sparkles },
] as const;

const FYLKE_PALETTE = [
  { fill: "hsla(152,65%,40%,0.30)", outline: "hsla(152,65%,35%,0.75)" },
  { fill: "hsla(210,70%,50%,0.25)", outline: "hsla(210,70%,45%,0.65)" },
  { fill: "hsla(330,65%,45%,0.28)", outline: "hsla(330,65%,40%,0.70)" },
  { fill: "hsla(24,80%,45%,0.32)", outline: "hsla(24,80%,40%,0.75)" },
  { fill: "hsla(275,60%,45%,0.30)", outline: "hsla(275,60%,40%,0.72)" },
  { fill: "hsla(185,75%,35%,0.28)", outline: "hsla(185,75%,30%,0.68)" },
  { fill: "hsla(45,85%,40%,0.30)", outline: "hsla(45,85%,35%,0.75)" },
  { fill: "hsla(80,60%,40%,0.32)", outline: "hsla(80,60%,35%,0.78)" },
];

const KOMMUNE_PALETTE = FYLKE_PALETTE.map(p => ({
  ...p,
  fill: p.fill.replace("0.30)", "0.32)").replace("0.25)", "0.32)").replace("0.28)", "0.32)").replace("0.32)", "0.35)")
}));

const CustomMountainIcon = ({ isChecked }: { isChecked: boolean }) => {
  // User wants outline icons. 
  // Checked: White outline on green circle (fill none means green bg shows through)
  // Not Checked: Green outline on white circle (fill none means white bg shows through)
  return (
    <Mountain 
      size={18} 
      color={isChecked ? "#FFFFFF" : "#10B981"} 
      strokeWidth={2.5}
      fill="none"
    />
  );
};

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, profile } = useAuth();
  const { 
    activeRoute, 
    isPickingStart, 
    isPickingWaypoint, 
    setIsPickingStart, 
    setIsPickingWaypoint,
    createRoute,
    updateRoute,
    clearRoute
  } = useRoute();

  const mapRef = useRef<MapView | null>(null);
  const mapboxMapRef = useRef<any>(null);
  const mapboxCameraRef = useRef<any>(null);
  const hasInitialRegionSet = useRef(false);
  const currentHeading = useRef(0);

  const [loadingPeaks, setLoadingPeaks] = useState(true);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedPeakIds, setCheckedPeakIds] = useState<Set<string>>(new Set());
  const [userCheckins, setUserCheckins] = useState<PeakCheckin[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showChildCheckinSheet, setShowChildCheckinSheet] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Top Tabs State
  const [activeTab, setActiveTab] = useState<"kart" | "topper" | "feed" | "lederliste" | "ar">("kart");
  
  // Map settings
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "norgeskart" | "satellite2">("satellite");
  const isMapboxLayer = mapType === "satellite" || mapType === "satellite2" || mapType === "terrain" || mapType === "norgeskart";
  const [areaStatsMode, setAreaStatsMode] = useState<'off' | 'kommune' | 'fylke'>('off');
  const [areaBoundaries, setAreaBoundaries] = useState<Record<string, any>>({});
  const [currentZoom, setCurrentZoom] = useState(15);

  const getMapCenter = useCallback(async () => {
    try {
      if (isMapboxAvailable && isMapboxLayer && mapboxMapRef.current) {
        // Mapbox center coordinate is [lng, lat]
        const center = await mapboxMapRef.current.getCenter();
        if (center && Array.isArray(center)) {
          return { latitude: center[1], longitude: center[0] };
        }
      }
    } catch (err) {
      console.warn("Error getting Mapbox center:", err);
    }

    // Fallback to current region ref
    return { latitude: regionRef.current.latitude, longitude: regionRef.current.longitude };
  }, [isMapboxLayer]);

  const loadPeaks = useCallback(async () => {
    setLoadingPeaks(true);
    setError(null);
    try {
      const data = await fetchPeaks();
      setPeaks(data);
    } catch (err) {
      console.error("Error fetching peaks in MapScreen", err);
      setError("Kunne ikke laste fjelltopper.");
    } finally {
      setLoadingPeaks(false);
    }
  }, []);

  const handleConfirmStart = async (coord: { latitude: number; longitude: number }) => {
    if (!selectedPeak) return;
    try {
      await createRoute(coord, selectedPeak);
      setIsPickingStart(false);
      // Clear selected peak to hide the sheet and show the map "in front"
      setSelectedPeak(null);
    } catch (err) {
      Alert.alert("Feil", "Kunne ikke lage rute. Prøv igjen.");
    }
  };

  const handleConfirmWaypoint = useCallback(async (coord: { latitude: number; longitude: number }) => {
    if (!activeRoute) return;
    try {
      const newWaypoints = [...activeRoute.waypoints, coord];
      await updateRoute({ waypoints: newWaypoints });
      setIsPickingWaypoint(false);
    } catch (err) {
      Alert.alert("Feil", "Kunne ikke legge til veipunkt.");
    }
  }, [activeRoute, updateRoute, setIsPickingWaypoint]);

  const declutteredPeaks = React.useMemo(() => {
    // Show all peaks when zoomed in enough
    if (currentZoom >= 12.5) return peaks;

    const result: Peak[] = [];
    // Dynamic distance based on zoom level
    const minLatDist = 0.08 / Math.pow(2, currentZoom - 7);
    const minLngDist = 0.08 / Math.pow(2, currentZoom - 7);

    // Sort by height to prioritize showing higher peaks
    const sorted = [...peaks].sort((a, b) => b.heightMoh - a.heightMoh);

    for (const peak of sorted) {
      const isTooClose = result.some(p => 
        Math.abs(p.latitude - peak.latitude) < minLatDist && 
        Math.abs(p.longitude - peak.longitude) < minLngDist
      );
      if (!isTooClose) {
        result.push(peak);
      }
    }
    return result;
  }, [peaks, currentZoom]);

  const areaStats = React.useMemo(() => {
    if (areaStatsMode === 'off') return [];

    const statsMap: Record<string, { 
      name: string, 
      total: number, 
      checked: number, 
      sumLat: number, 
      sumLng: number,
      id: string 
    }> = {};

    peaks.forEach(peak => {
      const areaName = areaStatsMode === 'fylke' ? peak.county : peak.municipality;
      if (!areaName || areaName === "Ukjent") return;

      if (!statsMap[areaName]) {
        let areaId = "";
        if (areaStatsMode === 'fylke') {
          const matchingKommune = (KOMMUNER_DATA as any[]).find(k => k.fylke === areaName);
          areaId = matchingKommune?.fylkesnummer || "";
        } else {
          const matchingKommune = (KOMMUNER_DATA as any[]).find(k => k.name === areaName);
          areaId = matchingKommune?.id || "";
        }

        if (!areaId) return;

        statsMap[areaName] = {
          name: areaName,
          total: 0,
          checked: 0,
          sumLat: 0,
          sumLng: 0,
          id: areaId
        };
      }

      statsMap[areaName].total++;
      if (checkedPeakIds.has(peak.id)) {
        statsMap[areaName].checked++;
      }
      statsMap[areaName].sumLat += peak.latitude;
      statsMap[areaName].sumLng += peak.longitude;
    });

    return Object.values(statsMap).map((stat, index) => ({
      ...stat,
      avgLat: stat.sumLat / stat.total,
      avgLng: stat.sumLng / stat.total,
      percent: Math.round((stat.checked / stat.total) * 100),
      paletteIndex: index % 8
    }));
  }, [peaks, checkedPeakIds, areaStatsMode]);

  useEffect(() => {
    if (areaStatsMode === 'off') return;

    const loadBoundaries = async () => {
      const newBoundaries: Record<string, any> = { ...areaBoundaries };
      let changed = false;

      for (const stat of areaStats) {
        if (!newBoundaries[stat.id]) {
          const data = await fetchBoundary(areaStatsMode, stat.id);
          if (data) {
            // Geonorge returns the GeoJSON geometry in the 'omrade' field
            newBoundaries[stat.id] = data.omrade || data;
            changed = true;
          }
        }
      }

      if (changed) {
        setAreaBoundaries(newBoundaries);
      }
    };

    loadBoundaries();
  }, [areaStats, areaStatsMode]);

  const mapboxStyleURL = React.useMemo(() => {
    switch(mapType) {
      case "satellite": return "mapbox://styles/mapbox/satellite-streets-v12";
      case "satellite2": return "mapbox://styles/mapbox/satellite-v9";
      case "terrain": return "mapbox://styles/mapbox/outdoors-v12";
      default: return "mapbox://styles/mapbox/streets-v12";
    }
  }, [mapType]);

  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const styleHasPeakLayers = React.useMemo(() => {
    return mapboxStyleURL.includes("outdoors-v12");
  }, [mapboxStyleURL]);

  // Resolve mapType to use flyover modes on iOS for maximum possible 3D/tilt
  const resolvedMapType = React.useMemo(() => {
    if (mapType === "norgeskart" || mapType === "satellite2") {
      // On iOS, 'none' prevents 3D tilt, so we use 'standard' with shouldReplaceMapContent on UrlTile.
      // On Android, 'none' works perfectly to hide the standard map underneath and allows tilt.
      return Platform.OS === "ios" ? "standard" : "none";
    }
    if (Platform.OS === "ios") {
      if (mapType === "satellite") {
        return "satelliteFlyover";
      }
      if (mapType === "terrain") {
        return "hybridFlyover";
      }
    }
    return mapType;
  }, [mapType]);

  // Long press peak creation modal state
  const [showAddPeakModal, setShowAddPeakModal] = useState(false);
  const [show3DInfoModal, setShow3DInfoModal] = useState(false);
  const isAdjustingCamera = useRef(false);
  const [pendingCoordinate, setPendingCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [newPeakName, setNewPeakName] = useState("");
  const [newPeakMoh, setNewPeakMoh] = useState("");
  const screenHeight = Dimensions.get("window").height;
  const isFirstLoad = useRef(true);
  const isCameraAnimating = useRef(false);

  // Use a ref for the current camera state to avoid render loops.
  const regionRef = useRef({
    latitude: 59.9139,
    longitude: 10.7522,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Load last known region on startup
  useEffect(() => {
    const loadLastRegion = async () => {
      try {
        const saved = await AsyncStorage.getItem('last_map_region');
        if (saved && isFirstLoad.current) {
          const parsed = JSON.parse(saved);
          regionRef.current = parsed;
          
          if (isMapboxAvailable && isMapboxLayer && mapboxCameraRef.current) {
             mapboxCameraRef.current.setCamera({
               centerCoordinate: [parsed.longitude, parsed.latitude],
               zoomLevel: Math.max(12, Math.log2(360 / parsed.latitudeDelta)),
               animationDuration: 0,
             });
          } else if (mapRef.current) {
             mapRef.current.setCamera({
               center: { latitude: parsed.latitude, longitude: parsed.longitude },
               zoom: Math.max(12, Math.log2(360 / parsed.latitudeDelta)),
             });
          }
        }
      } catch (e) {
        console.warn("Failed to load last region", e);
      } finally {
        isFirstLoad.current = false;
      }
    };
    loadLastRegion();
  }, [isMapboxLayer]);

  useEffect(() => {
    loadPeaks();
  }, [loadPeaks]);

  const loadUserCheckins = async () => {
    if (!user) return;
    try {
      const data = await getUserCheckins(user.id);
      setUserCheckins(data);
      const checkedIds = new Set(data.map((c) => c.peak_id));
      setCheckedPeakIds(checkedIds);
    } catch (err) {
      console.error("Error fetching user checkins:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserCheckins();
    } else {
      setUserCheckins([]);
      setCheckedPeakIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    const fetchLocation = async () => {
      try {
        if (Platform.OS === "web") {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (isMounted) {
                  setUserLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  });
                }
              },
              (err) => console.warn("Web geolocation error", err)
            );
          }
        } else {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            let loc = await Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.Balanced 
            }).catch(() => null);

            // Fallback to last known position if current is unavailable
            if (!loc) {
              loc = await Location.getLastKnownPositionAsync();
            }

            if (loc?.coords && isMounted) {
              const newLocation = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              };
              setUserLocation(newLocation);
            }
            
            subscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 10000,
                distanceInterval: 10,
              },
              (newLoc) => {
                if (newLoc?.coords && isMounted) {
                  setUserLocation({
                    latitude: newLoc.coords.latitude,
                    longitude: newLoc.coords.longitude,
                  });
                }
              }
            );
          }
        }
      } catch (err) {
        console.warn("Location permission or fetch error", err);
      }
    };

    fetchLocation();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Auto-center reliably on user location once it's available
  useEffect(() => {
    // Only auto-center if we haven't set a region yet (initial load)
    if (userLocation && !hasInitialRegionSet.current && !isFirstLoad.current) {
      let attempted = false;
      if (isMapboxAvailable && isMapboxLayer) {
        if (mapboxCameraRef.current) {
          mapboxCameraRef.current.setCamera({
            centerCoordinate: [userLocation.longitude, userLocation.latitude],
            zoomLevel: 15,
            pitch: 45,
            animationDuration: 0,
          });
          attempted = true;
        }
      } else if (mapRef.current) {
        mapRef.current.setCamera({
          center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
          zoom: 15,
          pitch: 45,
        });
        attempted = true;
      }

      if (attempted) {
        hasInitialRegionSet.current = true;
      }
    }
  }, [userLocation, isMapboxLayer, isStyleLoaded, isFirstLoad.current]);

  useEffect(() => {
    setIsStyleLoaded(false);
  }, [mapboxStyleURL]);

  // Auto-zoom to fit active route when it changes or is created
  useEffect(() => {
    if (activeRoute && activeRoute.points.length > 0) {
      const fitRoute = async () => {
        try {
          if (isMapboxAvailable && isMapboxLayer && mapboxCameraRef.current) {
            const points = activeRoute.points;
            const lngs = points.map(p => p.longitude);
            const lats = points.map(p => p.latitude);
            const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
            const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
            
            mapboxCameraRef.current.fitBounds(
              ne,
              sw,
              [50, 50, 150, 50], // padding [top, right, bottom, left]
              1000 // duration
            );
          } else if (mapRef.current) {
            mapRef.current.fitToCoordinates(activeRoute.points, {
              edgePadding: { top: 50, right: 50, bottom: 150, left: 50 },
              animated: true,
            });
          }
        } catch (e) {
          console.warn("Failed to fit map to route:", e);
        }
      };
      
      // Delay slightly to ensure map is ready and layout has settled
      const timer = setTimeout(fitRoute, 500);
      return () => clearTimeout(timer);
    }
  }, [activeRoute, isMapboxLayer]);

  useEffect(() => {
    if (isStyleLoaded && is3DEnabled && mapboxMapRef.current) {
      // Small timeout to allow terrain DEM tiles to load/render
      const timer = setTimeout(async () => {
        try {
          if (mapboxMapRef.current) {
            const result = await mapboxMapRef.current.queryTerrainElevation([10.7522, 59.9139]);
            const elevation = (result && typeof result === "object" && result.data !== undefined) ? result.data : result;
            if (elevation && elevation > 0) {
              // Terrain verified
            }
          }
        } catch (err) {
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isStyleLoaded, is3DEnabled]);

  const mapboxToken = Constants.expoConfig?.extra?.mapboxAccessToken || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const themeClasses = {
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100",
  };

  const handlePeakSelect = (peak: Peak) => {
    console.log("Peak selected:", peak.name);
    setSelectedPeak(peak);

    // When a peak is selected, we consider the initial load "complete"
    hasInitialRegionSet.current = true;

    // Ensure we are on the map tab when a peak is selected
    if (activeTab !== "kart") {
      setActiveTab("kart");
    }

    const headingRad = (currentHeading.current * Math.PI) / 180;

    if (isMapboxAvailable && isMapboxLayer && mapboxCameraRef.current) {
      try {
        if (is3DEnabled) {
          const latOffset = 0.012;
          const centerLat = peak.latitude - latOffset * Math.cos(headingRad);
          const centerLng = peak.longitude - latOffset * Math.sin(headingRad);

          mapboxCameraRef.current.setCamera({
            centerCoordinate: [centerLng, centerLat],
            zoomLevel: 14,
            pitch: 60,
            animationDuration: 1000,
            heading: currentHeading.current,
          });
        } else {
          mapboxCameraRef.current.setCamera({
            centerCoordinate: [peak.longitude, peak.latitude],
            zoomLevel: 14,
            pitch: 0,
            animationDuration: 1000,
            padding: {
              bottom: screenHeight * 0.7,
              top: 0, left: 0, right: 0
            },
            heading: currentHeading.current,
          });
        }
      } catch (err) {
        console.warn("Failed to set Mapbox camera center to selected peak:", err);
      }
    } else if (mapRef.current) {
      try {
        if (is3DEnabled) {
          const latOffset = 0.012;
          const centerLat = peak.latitude - latOffset * Math.cos(headingRad);
          const centerLng = peak.longitude - latOffset * Math.sin(headingRad);

          mapRef.current.animateCamera({
            center: { latitude: centerLat, longitude: centerLng },
            zoom: 14,
            pitch: 60,
            heading: currentHeading.current,
          }, { duration: 1000 });
        } else {
          mapRef.current.animateCamera({
            center: { latitude: peak.latitude, longitude: peak.longitude },
            zoom: 14,
            pitch: 0,
            heading: currentHeading.current,
            padding: {
              bottom: screenHeight * 0.7,
              top: 0, left: 0, right: 0
            },
          } as any, { duration: 1000 });
        }
      } catch (err) {
        console.warn("Failed to animate Google Maps camera:", err);
      }
    }
  };

  const distanceToPeak = React.useMemo(() => {
    if (!selectedPeak || !userLocation) return null;
    return getDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      selectedPeak.latitude,
      selectedPeak.longitude
    );
  }, [selectedPeak, userLocation]);

  const formattedDistance = React.useMemo(() => {
    if (distanceToPeak === null) return "Avstand ukjent";
    if (distanceToPeak < 1000) {
      const value = distanceToPeak.toFixed(1).replace(".", ",");
      return `${value} m`;
    }
    const value = (distanceToPeak / 1000).toFixed(1).replace(".", ",");
    return `${value} km`;
  }, [distanceToPeak]);

  const selectedPeakCheckins = React.useMemo(() => {
    if (!selectedPeak) return [];
    return userCheckins
      .filter((c) => c.peak_id === selectedPeak.id)
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime());
  }, [selectedPeak, userCheckins]);

  const lastCheckinDateStr = React.useMemo(() => {
    if (selectedPeakCheckins.length === 0) return null;
    const lastDate = new Date(selectedPeakCheckins[0].checked_in_at);
    return lastDate.toLocaleDateString("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [selectedPeakCheckins]);

  const canCheckin = distanceToPeak !== null && distanceToPeak < 100;

  const handleCheckinPress = () => {
    setShowChildCheckinSheet(true);
  };

  const confirmCheckin = async () => {
    if (!user || !selectedPeak) return;
    setCheckinLoading(true);
    setShowConfirmModal(false);
    try {
      await checkinPeak(user.id, selectedPeak.id);
      await loadUserCheckins();
      Alert.alert("Innsjekk registrert!", `Gratulerer, du har sjekket inn på ${selectedPeak.name}!`);
    } catch (err: any) {
      console.error("Checkin failed:", err);
      Alert.alert("Feil under innsjekk", err?.message || "Kunne ikke fullføre innsjekking.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckinSuccess = (checkedInNames: string[], imageUrl: string | null) => {
    if (!selectedPeak || !user) return;

    const parentUsername = profile?.username || user?.email?.split('@')[0] || 'Bruker';
    const parentCheckedIn = checkedInNames.includes(parentUsername);

    if (parentCheckedIn) {
      // Optimistically update checkedPeakIds and userCheckins so indicators update instantly
      setCheckedPeakIds(prev => {
        const next = new Set(prev);
        next.add(selectedPeak.id);
        return next;
      });

      const timestamp = new Date().toISOString();
      const optimisticCheckins: PeakCheckin[] = [
        {
          id: `optimistic-${Date.now()}`,
          user_id: user.id,
          peak_id: selectedPeak.id,
          checked_in_at: timestamp,
          verified: true,
          activity_id: null,
          image_url: imageUrl,
        }
      ];

      setUserCheckins(prev => [...optimisticCheckins, ...prev]);
    }

    // Reload from server in background to sync actual database state
    loadUserCheckins();
  };

  const handleDeleteCheckinPress = (checkinId: string) => {
    Alert.alert(
      "Slett innsjekk",
      "Er du sikker på at du vil slette denne innsjekken? Dette kan ikke angres.",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Slett", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteCheckin(checkinId);
              await loadUserCheckins();
              Alert.alert("Slettet", "Innsjekken har blitt slettet.");
            } catch (err: any) {
              Alert.alert("Feil", err.message || "Kunne ikke slette innsjekk.");
            }
          }
        }
      ]
    );
  };

  const handleEditImagePress = async (checkinId: string) => {
    Alert.alert(
      "Endre bilde",
      "Velg hvordan du vil legge til et nytt bilde for denne innsjekken:",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta nytt bilde",
          onPress: () => editImagePick(checkinId, 'camera')
        },
        {
          text: "Velg fra galleri",
          onPress: () => editImagePick(checkinId, 'library')
        }
      ]
    );
  };

  const editImagePick = async (checkinId: string, source: 'camera' | 'library') => {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Tilgang', 'Kamera-tilgang kreves for å ta bilde.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Tilgang', 'Bildegalleri-tilgang kreves for å velge bilde.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0 && user) {
        setCheckinLoading(true);
        const localUri = result.assets[0].uri;
        const uploadedUrl = await uploadCheckinImage(localUri, user.id, selectedPeak?.id || '');
        if (uploadedUrl) {
          await updateCheckinImage(checkinId, uploadedUrl);
          await loadUserCheckins();
          Alert.alert("Oppdatert", "Innsjekksbildet har blitt oppdatert!");
        } else {
          throw new Error("Kunne ikke laste opp bilde.");
        }
      }
    } catch (err: any) {
      Alert.alert("Feil", err.message || "Kunne ikke oppdatere bilde.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleMapLongPress = (event: any) => {
    if (event?.nativeEvent?.coordinate) {
      setPendingCoordinate(event.nativeEvent.coordinate);
      setNewPeakName("");
      setNewPeakMoh("");
      setShowAddPeakModal(true);
    }
  };

  const handleMapboxLongPress = (feature: any) => {
    if (feature?.geometry?.coordinates) {
      const [longitude, latitude] = feature.geometry.coordinates;
      setPendingCoordinate({ latitude, longitude });
      setNewPeakName("");
      setNewPeakMoh("");
      setShowAddPeakModal(true);
    }
  };

  const handleAddPeak = () => {
    if (!newPeakName.trim()) {
      return;
    }
    const mohValue = parseInt(newPeakMoh, 10);
    if (isNaN(mohValue) || mohValue < 0) {
      return;
    }
    if (!pendingCoordinate) return;

    const newPeak: Peak = {
      id: `local-${Date.now()}`,
      name: newPeakName.trim(),
      heightMoh: mohValue,
      latitude: pendingCoordinate.latitude,
      longitude: pendingCoordinate.longitude,
      area: "Ukjent",
      municipality: "Ukjent",
      county: "Ukjent",
      description: "Egendefinert fjelltopp lagt til direkte på kartet.",
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
      isPublished: true,
    };

    setPeaks((prev) => [newPeak, ...prev]);
    setShowAddPeakModal(false);
    setPendingCoordinate(null);
  };

  const toggle3D = () => {
    const next3D = !is3DEnabled;
    setIs3DEnabled(next3D);
    if (isMapboxAvailable && isMapboxLayer) {
      try {
        mapboxCameraRef.current?.setCamera({
          pitch: next3D ? 60 : 0,
          duration: 600,
        });
      } catch (e) {
        console.warn("Could not animate Mapbox camera:", e);
      }
    } else {
      try {
        mapRef.current?.animateCamera({
          pitch: next3D ? 60 : 0,
        }, { duration: 600 });
      } catch (e) {
        console.warn("Could not animate map camera:", e);
      }
    }
  };

  const handleMapReady = () => {
    try {
      mapRef.current?.animateCamera({
        pitch: is3DEnabled ? 60 : 0,
      }, { duration: 800 });
    } catch (e) {
      console.warn("Could not tilt map on ready:", e);
    }
  };

  const handleMapboxCameraChanged = (state: any) => {
    const { center, zoom, gesture } = state.properties;

    // If the user moved the map, don't snap to GPS anymore
    if (gesture) {
      hasInitialRegionSet.current = true;
    }

    if (state?.properties?.zoom) {
      // Only update if zoom is reasonable
      if (state.properties.zoom > 1) {
        setCurrentZoom(state.properties.zoom);
      }
    }
    if (state?.properties?.heading !== undefined) {
      currentHeading.current = state.properties.heading;
    }

    // Update ref and save to storage
    if (center && Array.isArray(center)) {
      // Guard against invalid coordinates that cause "jump to ocean/jordklode"
      if (Math.abs(center[1]) < 0.001 && Math.abs(center[0]) < 0.001) return;
      
      const newRegion = {
        latitude: center[1],
        longitude: center[0],
        latitudeDelta: 0.2 / Math.pow(2, (zoom || currentZoom || 15) - 12),
        longitudeDelta: 0.2 / Math.pow(2, (zoom || currentZoom || 15) - 12),
      };
      regionRef.current = newRegion;
      AsyncStorage.setItem('last_map_region', JSON.stringify(newRegion)).catch(() => {});
    }
  };

  const handleRegionChangeComplete = async (currentRegion: any, details: any) => {
    regionRef.current = currentRegion;
    AsyncStorage.setItem('last_map_region', JSON.stringify(currentRegion)).catch(() => {});
    
    if (details?.isGesture) {
      hasInitialRegionSet.current = true;
    }

    if (mapRef.current) {
      try {
        const camera = await mapRef.current.getCamera();
        if (camera.heading !== undefined) {
          currentHeading.current = camera.heading;
        }
      } catch (err) {}
    }

    // Approximate zoom from latitudeDelta
    const zoom = Math.log2(360 / currentRegion.latitudeDelta);
    setCurrentZoom(zoom);

    if (!mapRef.current || isAdjustingCamera.current) return;

    // Only adjust pitch if 3D is active and it's a user gesture (pan/pinch/zoom)
    if (is3DEnabled && details?.isGesture) {
      try {
        isAdjustingCamera.current = true;
        const camera = await mapRef.current.getCamera();
        
        // If the pitch has been flattened/clamped below 75 degrees, and zoom level is reasonable
        // (latitudeDelta < 1.5, representing regional or local view), we request a high pitch (85 degrees).
        // MapKit will dynamically clamp this to the highest allowed angle for the current zoom/altitude,
        // preventing the map from bouncing back all the way to 0 degrees (completely flat).
        if (camera.pitch < 55 && currentRegion.latitudeDelta < 1.5) {
          await mapRef.current.animateCamera({
            pitch: 60,
          }, { duration: 300 });
        }
      } catch (e) {
        console.warn("Error restoring camera pitch on region change:", e);
      } finally {
        isAdjustingCamera.current = false;
      }
    }
  };

  const handleDidFinishLoadingStyle = () => {
    setIsStyleLoaded(true);
    console.log("Style loaded");
    if (is3DEnabled) {
      console.log("Terrain enabled");
    }
  };

  return (
    <View style={styles.container}>
      {loadingPeaks && peaks.length === 0 ? (
        <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : loadingPeaks ? (
        <View 
          style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            justifyContent: 'center', alignItems: 'center', 
            backgroundColor: isDark ? 'rgba(3, 7, 18, 0.3)' : 'rgba(249, 250, 251, 0.3)',
            zIndex: 1000 
          }}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : null}

      {isMapboxAvailable && isMapboxLayer ? (
        <MapboxMapView
          ref={mapboxMapRef}
          style={styles.map}
          styleURL={mapboxStyleURL}
          maxPitch={85}
          pitchEnabled={true}
          rotateEnabled={true}
          logoEnabled={false}
          attributionEnabled={false}
          onPress={() => setSelectedPeak(null)}
          onLongPress={handleMapboxLongPress}
          onDidFinishLoadingStyle={handleDidFinishLoadingStyle}
          onCameraChanged={handleMapboxCameraChanged}
        >
          {areaStatsMode !== 'off' && areaStats.map((stat) => {
            const boundary = areaBoundaries[stat.id];
            if (!boundary) return null;

            const palette = areaStatsMode === 'fylke' ? FYLKE_PALETTE : KOMMUNE_PALETTE;
            const colors = palette[stat.paletteIndex];

            // Zoom-based label visibility
            const minZoom = areaStatsMode === 'fylke' ? 5 : 7;
            const isLabelVisible = currentZoom >= minZoom;
            
            // Scaling factor for label
            const scale = Math.max(0.6, Math.min(1.2, (currentZoom - minZoom + 2) / 4));

            return (
              <React.Fragment key={`${areaStatsMode}-${stat.id}`}>
                <Mapbox.ShapeSource id={`source-${stat.id}`} shape={boundary}>
                  <Mapbox.FillLayer
                    id={`fill-${stat.id}`}
                    style={{
                      fillColor: colors.fill,
                      fillAntialias: true,
                    }}
                  />
                  <Mapbox.LineLayer
                    id={`outline-${stat.id}`}
                    style={{
                      lineColor: colors.outline,
                      lineWidth: 3,
                    }}
                  />
                </Mapbox.ShapeSource>

                {isLabelVisible && (
                  <MapboxMarkerView
                    id={`label-${stat.id}`}
                    coordinate={[stat.avgLng, stat.avgLat]}
                  >
                    <View style={flattenStyle([
                      styles.areaLabelContainer,
                      { transform: [{ scale }] }
                    ])}>
                      <Text style={styles.areaLabelName}>{stat.name}</Text>
                      <HStack style={{ gap: 4, alignItems: 'center' }}>
                        <Text style={styles.areaLabelStats}>
                          {stat.checked} / {stat.total} topper
                        </Text>
                        <Text style={flattenStyle([
                          styles.areaLabelPercent,
                          stat.percent >= 50 ? { color: '#10B981' } : null
                        ])}>
                          {stat.percent}%
                        </Text>
                      </HStack>
                    </View>
                  </MapboxMarkerView>
                )}
              </React.Fragment>
            );
          })}

          {isStyleLoaded && (
            <>
              <Mapbox.UserLocation
                animated={true}
                androidRenderMode="gps"
                renderMode="normal"
                showsUserHeadingIndicator={true}
              />
              <Mapbox.Atmosphere
                style={{
                  range: [0, 15],
                  horizonBlend: 0.05,
                  color: 'rgba(135, 206, 235, 0.7)',
                  highColor: '#245cdf',
                  spaceColor: '#0b1026',
                }}
              />
            </>
          )}
          {is3DEnabled && isStyleLoaded && (
            <>
              <Mapbox.RasterDemSource
                id="mapbox-dem"
                url="mapbox://mapbox.mapbox-terrain-dem-v1"
                tileSize={512}
              />
              <Mapbox.Terrain
                sourceID="mapbox-dem"
                style={{ exaggeration: 1.2 }}
              />
            </>
          )}
          {isStyleLoaded && mapType === "norgeskart" && (
            <Mapbox.RasterSource
              id="norgeskart-source"
              tileUrlTemplates={["https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"]}
              tileSize={256}
            >
              <Mapbox.RasterLayer
                id="norgeskart-layer"
                sourceID="norgeskart-source"
                style={{ rasterOpacity: 1 }}
              />
            </Mapbox.RasterSource>
          )}
          {isStyleLoaded && styleHasPeakLayers && (
            <>
              {/* Show built-in Mapbox peak layers */}
              <Mapbox.SymbolLayer
                id="mountain_peak"
                existing={true}
                style={{ visibility: "none" }}
              />
              <Mapbox.SymbolLayer
                id="mountain_peak-label"
                existing={true}
                style={{ visibility: "none" }}
              />
              <Mapbox.SymbolLayer
                id="natural-point-label"
                existing={true}
                style={{ visibility: "none" }}
              />
            </>
          )}
          <MapboxCamera
            ref={mapboxCameraRef}
            defaultSettings={{
              centerCoordinate: [regionRef.current.longitude, regionRef.current.latitude],
              zoomLevel: currentZoom,
            }}
            followUserLocation={false}
          />
          {isStyleLoaded && activeRoute && (
            <>
              <Mapbox.ShapeSource
                id="routeSource"
                shape={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: activeRoute.points.map(p => [p.longitude, p.latitude])
                  },
                  properties: {}
                }}
              >
                <Mapbox.LineLayer
                  id="routeLayer"
                  style={{
                    lineColor: "#10B981",
                    lineWidth: 4,
                    lineCap: "round",
                    lineJoin: "round"
                  }}
                />
              </Mapbox.ShapeSource>

              {activeRoute.waypoints.map((wp, idx) => (
                <MapboxMarkerView
                  key={`wp-${idx}`}
                  id={`wp-${idx}`}
                  coordinate={[wp.longitude, wp.latitude]}
                >
                  <View style={styles.waypointMarker}>
                    <Text style={styles.waypointText}>{idx + 1}</Text>
                  </View>
                </MapboxMarkerView>
              ))}
            </>
          )}
          {isStyleLoaded && peaks.map((peak) => {
            // Always render the selected peak regardless of decluttering
            const isSelected = selectedPeak?.id === peak.id;
            const isVisible = isSelected || declutteredPeaks.some(p => p.id === peak.id);
            if (!isVisible) return null;

            const isChecked = checkedPeakIds.has(peak.id);
            return (
              <MapboxMarkerView
                key={peak.id}
                id={peak.id}
                coordinate={[peak.longitude, peak.latitude]}
              >
                <TouchableOpacity 
                  onPress={() => handlePeakSelect(peak)}
                  activeOpacity={0.8}
                >
                  <View style={styles.customMarkerContainer}>
                    <View style={flattenStyle([
                      styles.customMarkerCircle,
                      isChecked
                        ? { backgroundColor: "#10B981", borderColor: "#FFFFFF" }
                        : { backgroundColor: "#FFFFFF", borderColor: "#10B981" }
                    ])}>
                      <CustomMountainIcon isChecked={isChecked} />
                    </View>
                    <View style={styles.customMarkerPill}>
                      <Text style={styles.customMarkerLabel} numberOfLines={1}>
                        {peak.name}
                      </Text>
                      <Text style={styles.customMarkerSubLabel}>
                        {peak.heightMoh} moh
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </MapboxMarkerView>
            );
          })}
        </MapboxMapView>
      ) : (
        <MapView
          key={mapType}
          ref={mapRef}
          style={styles.map}
          initialRegion={regionRef.current}
          mapType={resolvedMapType}
          pitchEnabled={true}
          rotateEnabled={true}
          showsBuildings={false}
          showsCompass={true}
          showsScale={true}
          showsUserLocation={true}
          followsUserLocation={false}
          onLongPress={handleMapLongPress}
          onMapReady={handleMapReady}
          onPress={() => setSelectedPeak(null)}
          onRegionChangeComplete={handleRegionChangeComplete}
          userInterfaceStyle={colorScheme as any}
          {...({
            maxPitch: 90,
          } as any)}
        >
          {mapType === "norgeskart" && Platform.OS !== "web" && (
            <UrlTile
              key="norgeskart-tile"
              urlTemplate="https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"
              tileSize={256}
              maximumZ={19}
              zIndex={-1}
              shouldReplaceMapContent={false}
            />
          )}
          {activeRoute && (
            <>
              <Polyline
                coordinates={activeRoute.points}
                strokeColor="#10B981"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                zIndex={10}
              />
              {activeRoute.waypoints.map((wp, idx) => (
                <Marker
                  key={`wp-${idx}`}
                  coordinate={wp}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.waypointMarker}>
                    <Text style={styles.waypointText}>{idx + 1}</Text>
                  </View>
                </Marker>
              ))}
            </>
          )}
          {peaks.map((peak) => {
            const isSelected = selectedPeak?.id === peak.id;
            const isVisible = isSelected || declutteredPeaks.some(p => p.id === peak.id);
            if (!isVisible) return null;

            const isChecked = checkedPeakIds.has(peak.id);
            return (
              <Marker
                key={peak.id}
                coordinate={{ latitude: peak.latitude, longitude: peak.longitude }}
                onPress={() => handlePeakSelect(peak)}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={styles.customMarkerContainer}>
                  <View style={flattenStyle([
                    styles.customMarkerCircle,
                    isChecked
                      ? { backgroundColor: "#10B981", borderColor: "#FFFFFF" }
                      : { backgroundColor: "#FFFFFF", borderColor: "#10B981" }
                  ])}>
                    <CustomMountainIcon isChecked={isChecked} />
                  </View>
                  <View style={styles.customMarkerPill}>
                    <Text style={styles.customMarkerLabel} numberOfLines={1}>
                      {peak.name}
                    </Text>
                    <Text style={styles.customMarkerSubLabel}>
                      {peak.heightMoh} moh
                    </Text>
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Top Tabs Overlay */}
      <View style={flattenStyle([styles.topTabsContainer, { backgroundColor: isDark ? "rgba(17, 24, 39, 0.85)" : "rgba(255, 255, 255, 0.85)" }])}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={flattenStyle([
                  styles.tabButton,
                  isActive ? styles.tabButtonActive : null,
                ])}
              >
                <TabIcon 
                  size={14} 
                  color={isActive ? "#FFFFFF" : (isDark ? "#9CA3AF" : "#4B5563")} 
                />
                <Text 
                  style={flattenStyle([
                    styles.tabText,
                    isActive 
                      ? styles.tabTextActive 
                      : (isDark ? styles.tabTextInactiveDark : styles.tabTextInactiveLight)
                  ])}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Side Controls */}
      {error && (
        <Card className="m-4 p-4 border-red-500 bg-red-50" style={{ position: 'absolute', top: 120, left: 16, right: 16, zIndex: 100 }}>
          <VStack style={{ alignItems: 'center', gap: 8 }}>
            <Text className="text-red-600 font-bold text-center">{error}</Text>
            <TouchableOpacity 
              onPress={() => loadPeaks()}
              style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text className="text-white font-bold">Prøv igjen</Text>
            </TouchableOpacity>
          </VStack>
        </Card>
      )}

      {activeTab === "kart" && (
        <>
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              onPress={toggle3D} 
              style={flattenStyle([
                styles.controlButton, 
                { backgroundColor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)" }
              ])}
            >
              <Text style={flattenStyle([styles.controlButtonText, { color: is3DEnabled ? "#10B981" : (isDark ? "#FFFFFF" : "#111827") }])}>
                {is3DEnabled ? "3D" : "2D"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowLayerMenu(!showLayerMenu)} 
              style={flattenStyle([
                styles.controlButton, 
                { backgroundColor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)" }
              ])}
            >
              <Layers size={18} color={showLayerMenu ? "#10B981" : (isDark ? "#FFFFFF" : "#111827")} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                if (userLocation) {
                  if (isMapboxAvailable && isMapboxLayer) {
                    mapboxCameraRef.current?.setCamera({ 
                      centerCoordinate: [userLocation.longitude, userLocation.latitude], 
                      zoomLevel: 14, 
                      animationDuration: 1000 
                    });
                  } else {
                    mapRef.current?.animateCamera({ 
                      center: { latitude: userLocation.latitude, longitude: userLocation.longitude }, 
                      zoom: 14 
                    });
                  }
                }
              }} 
              style={flattenStyle([
                styles.controlButton, 
                { backgroundColor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)" }
              ])}
            >
              <Navigation size={18} color={isDark ? "#FFFFFF" : "#111827"} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                if (isMapboxAvailable && isMapboxLayer) {
                  mapboxCameraRef.current?.setCamera({ heading: 0, animationDuration: 1000 });
                } else {
                  mapRef.current?.animateCamera({ heading: 0 });
                }
              }} 
              style={flattenStyle([
                styles.controlButton, 
                { backgroundColor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)" }
              ])}
            >
              <Compass size={18} color={isDark ? "#FFFFFF" : "#111827"} />
            </TouchableOpacity>
          </View>

          {showLayerMenu && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                style={StyleSheet.absoluteFill}
                onPress={() => setShowLayerMenu(false)}
              />
              <View style={flattenStyle([
                styles.layerMenu,
                { backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)" }
              ])}>
                <TouchableOpacity 
                  onPress={() => setShowLayerMenu(false)} 
                  style={styles.layerMenuCloseBtn}
                >
                  <X size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>

                <VStack style={{ gap: 12, padding: 8 }}>
                  <VStack style={{ gap: 6 }}>
                    <Text style={flattenStyle([styles.layerMenuSectionTitle, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>Karttype</Text>
                    <HStack style={{ gap: 6 }}>
                      {(["satellite", "satellite2", "terrain", "norgeskart"] as const).map((type) => {
                        const isActive = mapType === type;
                        let label = "Standard";
                        if (type === "satellite") label = "Satellitt";
                        if (type === "satellite2") label = "Satellitt 2";
                        if (type === "terrain") label = "Terreng";
                        if (type === "norgeskart") label = "Norgeskart";
                        
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setMapType(type)}
                            style={flattenStyle([
                              styles.layerOption,
                              isActive ? { backgroundColor: "#10B981" } : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                            ])}
                          >
                            <Text style={flattenStyle([
                              styles.layerOptionText,
                              { color: isActive ? "#FFFFFF" : (isDark ? "#E5E7EB" : "#1F2937") }
                            ])}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </HStack>
                  </VStack>

                  <VStack style={{ gap: 6 }}>
                    <Text style={flattenStyle([styles.layerMenuSectionTitle, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>Områdestatistikk</Text>
                    <HStack style={{ gap: 6 }}>
                      {(['off', 'kommune', 'fylke'] as const).map((mode) => {
                        const isActive = areaStatsMode === mode;
                        let label = "Av";
                        if (mode === 'kommune') label = "Kommune";
                        if (mode === 'fylke') label = "Fylke";
                        
                        return (
                          <TouchableOpacity
                            key={mode}
                            onPress={() => setAreaStatsMode(mode)}
                            style={flattenStyle([
                              styles.layerOption,
                              isActive ? { backgroundColor: "#10B981" } : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                            ])}
                          >
                            <Text style={flattenStyle([
                              styles.layerOptionText,
                              { color: isActive ? "#FFFFFF" : (isDark ? "#E5E7EB" : "#1F2937") }
                            ])}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </HStack>
                  </VStack>
                </VStack>
              </View>
            </>
          )}
        </>
      )}

      {/* Non-map Tabs Overlay Screens */}
      {activeTab !== "kart" && (
        <View 
          style={flattenStyle([
            styles.placeholderContainer, 
            // Only show background for non-feed tabs
            activeTab !== "feed" ? { backgroundColor: isDark ? "#030712" : "#F9FAFB" } : null
          ])}
        >
          {activeTab === "feed" ? (
            <View style={{ flex: 1, width: '100%' }}>
              <PeakFeed />
            </View>
          ) : activeTab === "topper" ? (
            <View style={{ flex: 1, width: '100%' }}>
              <PeaksList
                peaks={peaks}
                checkins={userCheckins}
                userLocation={userLocation}
                onSelectPeak={handlePeakSelect}
                loading={loadingPeaks}
              />
            </View>
          ) : activeTab === "lederliste" ? (
            <View style={{ flex: 1, width: '100%' }}>
              <LeaderboardView />
            </View>
          ) : (
            <VStack style={styles.placeholderContent} className="items-center justify-center p-6 text-center">
            {activeTab === "ar" && (
              <>
                <Sparkles size={48} color="#10B981" />
                <Heading className={`text-xl font-bold mt-4 ${themeClasses.text}`}>Augmented Reality (AR)</Heading>
                <Text className={`text-sm text-center mt-2 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
                  Retter du kameraet mot horisonten, vil AR-visningen tegne inn navn og høyde på fjelltoppene rundt deg!
                </Text>
                <TouchableOpacity 
                  style={styles.placeholderBtn} 
                  onPress={() => setActiveTab("kart")}
                >
                  <Text style={styles.placeholderBtnText}>Tilbake til kartet</Text>
                </TouchableOpacity>
              </>
            )}
            </VStack>
          )}
        </View>
      )}

      {selectedPeak && activeTab === "kart" && !isPickingStart && !isPickingWaypoint && (
        <PeakProfileSheet
          peak={selectedPeak}
          userLocation={userLocation}
          canCheckin={canCheckin}
          checkinLoading={checkinLoading}
          onCheckin={handleCheckinPress}
          onClose={() => {
            // Only clear the selected peak if we aren't currently in a "picking" state.
            // This allows the sheet to hide while we use the peak's data for routing.
            if (!isPickingStart && !isPickingWaypoint) {
              setSelectedPeak(null);
            }
          }}
        />
      )}

      {activeRoute && activeTab === "kart" && <CustomRouteBar />}

      {isPickingStart && (
        <RouteStartPicker 
          onConfirm={handleConfirmStart}
          onCancel={() => setIsPickingStart(false)}
          getCenter={getMapCenter}
        />
      )}

      {isPickingWaypoint && (
        <RouteStartPicker 
          onConfirm={handleConfirmWaypoint}
          onCancel={() => setIsPickingWaypoint(false)}
          title="Velg veipunkt"
          confirmLabel="Legg til veipunkt"
          getCenter={getMapCenter}
        />
      )}

      {/* Add Peak Modal */}
      <Modal
        isOpen={showAddPeakModal}
        onClose={() => {
          setShowAddPeakModal(false);
          setPendingCoordinate(null);
        }}
        useRNModal={Platform.OS !== "web"}
      >
        <ModalBackdrop />
        <ModalContent className={isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100"}>
          <ModalHeader>
            <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-950"}>
              Legg til ny fjelltopp
            </Heading>
          </ModalHeader>
          <ModalBody className="mt-3 mb-4">
            <Text size="sm" className={`mb-4 ${isDark ? "text-typography-400" : "text-typography-600"}`}>
              Du har valgt et punkt på kartet. Oppgi navn og høyde for å registrere denne fjelltoppen lokalt.
            </Text>

            <Text size="xs" className={`mb-1 font-semibold ${isDark ? "text-typography-300" : "text-typography-700"}`} style={{ paddingBottom: 4 }}>
              Navn på fjelltopp
            </Text>
            <Input variant="outline" size="md" className="mb-4">
              <InputField 
                placeholder="f.eks. Galdhøpiggen" 
                value={newPeakName}
                onChangeText={setNewPeakName}
                className={isDark ? "text-typography-50" : "text-typography-950"}
              />
            </Input>

            <Text size="xs" className={`mb-1 font-semibold ${isDark ? "text-typography-300" : "text-typography-700"}`} style={{ paddingBottom: 4 }}>
              Høyde over havet (moh)
            </Text>
            <Input variant="outline" size="md">
              <InputField 
                placeholder="f.eks. 2469" 
                value={newPeakMoh}
                onChangeText={setNewPeakMoh}
                keyboardType="numeric"
                className={isDark ? "text-typography-50" : "text-typography-950"}
              />
            </Input>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={() => {
                setShowAddPeakModal(false);
                setPendingCoordinate(null);
              }}
              size="sm"
            >
              <ButtonText className={isDark ? "text-typography-200" : "text-typography-700"}>
                Avbryt
              </ButtonText>
            </Button>
            <Button 
              size="sm" 
              onPress={handleAddPeak}
              className="bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700"
            >
              <ButtonText className="text-white">
                Lagre topp
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 3D Info Modal */}
      <Modal
        isOpen={show3DInfoModal}
        onClose={() => setShow3DInfoModal(false)}
        useRNModal={Platform.OS !== "web"}
      >
        <ModalBackdrop />
        <ModalContent className={isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100"}>
          <ModalHeader>
            <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-950"}>
              3D-helning og horisont
            </Heading>
          </ModalHeader>
          <ModalBody className="mt-3 mb-4">
            <VStack style={{ gap: 12 }}>
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700"}>
                Kartmotoren på iOS (Apple Maps) justerer helningsvinkelen dynamisk basert på zoomnivået ditt:
              </Text>
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700"}>
                • <Text size="sm" style={{ fontWeight: "bold" }} className={isDark ? "text-typography-50" : "text-typography-950"}>Zoome inn:</Text> Jo nærmere bakken du er, desto flatere (mer horisontalt) kan du vinkle kartet (f.eks. slik du opplever i Bergen).
              </Text>
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700"}>
                • <Text size="sm" style={{ fontWeight: "bold" }} className={isDark ? "text-typography-50" : "text-typography-950"}>Zoome ut:</Text> Når du zoomer langt ut, tvinger systemet kartet til en flatere vinkel for å opprettholde lesbarheten.
              </Text>
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700"}>
                • <Text size="sm" style={{ fontWeight: "bold" }} className={isDark ? "text-typography-50" : "text-typography-950"}>Automatisk stabilisering:</Text> Vi tilpasser nå kameravinkelen automatisk for å gi deg maksimal helning til enhver tid mens du navigerer på kartet, uten at det spretter helt tilbake!
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              size="sm"
              onPress={() => setShow3DInfoModal(false)}
              className="bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700"
            >
              <ButtonText className="text-white">Forstått</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Checkin Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        useRNModal={Platform.OS !== "web"}
      >
        <ModalBackdrop />
        <ModalContent className={isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100"}>
          <ModalHeader>
            <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-950"}>
              Bekreft innsjekk
            </Heading>
          </ModalHeader>
          <ModalBody className="mt-3 mb-4">
            <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700"}>
              Vil du sjekke inn på {selectedPeak?.name}? Du må være innenfor 100 meter fra toppen for å sjekke inn.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={() => setShowConfirmModal(false)}
              size="sm"
            >
              <ButtonText className={isDark ? "text-typography-200" : "text-typography-700"}>
                Avbryt
              </ButtonText>
            </Button>
            <Button 
              size="sm" 
              onPress={confirmCheckin}
              className="bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700 ml-2"
            >
              <ButtonText className="text-white">
                Sjekk inn
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Child and parent unified checkin bottom sheet */}
      {selectedPeak && (
        <ChildCheckinSheet
          isOpen={showChildCheckinSheet}
          onClose={() => setShowChildCheckinSheet(false)}
          peakId={selectedPeak.id}
          peakName={selectedPeak.name}
          userId={user?.id || ''}
          username={profile?.username || user?.email?.split('@')[0] || 'Bruker'}
          userAvatarUrl={profile?.avatarUrl || null}
          onSuccess={handleCheckinSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: "#F9FAFB" },
  bgDark: { backgroundColor: "#030712" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
  mapboxWarningBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 115 : 105,
    left: 12,
    right: 64, // leave space for side controls
    zIndex: 29,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapboxWarningText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
    flex: 1,
  },
  topTabsContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 45,
    left: 12,
    right: 12,
    zIndex: 30,
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginHorizontal: 3,
  },
  tabButtonActive: {
    backgroundColor: "#10B981",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextInactiveLight: {
    color: "#4B5563",
  },
  tabTextInactiveDark: {
    color: "#9CA3AF",
  },
  controlsContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 110,
    right: 12,
    zIndex: 30,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.15)",
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  layerOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  layerOptionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  customMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  customMarkerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  customMarkerPill: {
    marginTop: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  customMarkerLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  customMarkerSubLabel: {
    color: "#10B981",
    fontSize: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  placeholderContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 130 : 120,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  placeholderBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  placeholderBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  bottomSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, zIndex: 20,
  },
  sheetHeader: { alignItems: "flex-start", marginBottom: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F620", alignItems: "center", justifyContent: "center" },
  sheetImage: { width: "100%", height: 130, borderRadius: 16 },
  checkinBtn: { 
    backgroundColor: "#10B981", 
    height: 56, 
    minHeight: 56,
    borderRadius: 16, 
    justifyContent: "center", 
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkinBtnContent: { alignItems: "center", justifyContent: "center" },
  checkinBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  checkinBtnDisabled: { backgroundColor: "#9CA3AF" },
  layerMenu: {
    position: "absolute",
    top: Platform.OS === "ios" ? 172 : 162,
    right: 12,
    left: 12,
    zIndex: 40,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.15)",
  },
  layerMenuSectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  layerMenuCloseBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  areaLabelContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minWidth: 100,
  },
  areaLabelName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  areaLabelStats: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "500",
  },
  areaLabelPercent: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  waypointMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  waypointText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});