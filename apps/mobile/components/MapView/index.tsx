import React, { useEffect, useState, useRef } from "react";
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
  Alert
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
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
  { id: "kart", label: "Kart", icon: Map },
  { id: "topper", label: "Topper", icon: Mountain },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "lederliste", label: "Lederliste", icon: Trophy },
  { id: "ar", label: "AR", icon: Sparkles },
] as const;

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, profile } = useAuth();

  const mapRef = useRef<MapView | null>(null);
  const mapboxMapRef = useRef<any>(null);
  const mapboxCameraRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
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

  const [region, setRegion] = useState({
    latitude: 61.63,
    longitude: 8.31,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const loadPeaks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPeaks();
      setPeaks(data);
    } catch (err) {
      console.error("Error fetching peaks in MapScreen", err);
      setError("Kunne ikke laste fjelltopper.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeaks();
  }, []);

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
            let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (loc?.coords && isMounted) {
              setUserLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
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

  useEffect(() => {
    setIsStyleLoaded(false);
  }, [mapboxStyleURL]);

  useEffect(() => {
    if (isStyleLoaded && is3DEnabled && mapboxMapRef.current) {
      // Small timeout to allow terrain DEM tiles to load/render
      const timer = setTimeout(async () => {
        try {
          if (mapboxMapRef.current) {
            const result = await mapboxMapRef.current.queryTerrainElevation([8.31, 61.63]);
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
    setSelectedPeak(peak);
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

  useEffect(() => {
    if (selectedPeak && isMapboxAvailable && mapType === "terrain" && mapboxCameraRef.current) {
      try {
        mapboxCameraRef.current.setCamera({
          centerCoordinate: [selectedPeak.longitude, selectedPeak.latitude],
          zoomLevel: 12,
          duration: 1000,
        });
      } catch (err) {
        console.warn("Failed to set Mapbox camera center to selected peak:", err);
      }
    }
  }, [selectedPeak, mapType]);

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

  const handleRegionChangeComplete = async (currentRegion: any, details: any) => {
    setRegion(currentRegion);

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

  if (loading) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          onLongPress={handleMapboxLongPress}
          onDidFinishLoadingStyle={handleDidFinishLoadingStyle}
        >
          {isStyleLoaded && (
            <>
              <Mapbox.UserLocation
                animated={true}
                androidRenderMode="gps"
                renderMode="normal"
                showsUserHeadingIndicator={true}
              >
                <View style={styles.userLocationPuckContainer}>
                  <View style={styles.userLocationPuckBase}>
                    <LinearGradient
                      colors={["#60A5FA", "#2563EB", "#1E40AF"]}
                      locations={[0, 0.5, 1]}
                      style={styles.userLocationPuckInner}
                    />
                  </View>
                </View>
              </Mapbox.UserLocation>
              <Mapbox.Atmosphere
                style={{
                  range: [0, 40],
                  horizonBlend: 0.01,
                  color: 'rgba(135, 206, 235, 0.12)', // Middle ground
                  highColor: 'rgba(30, 144, 255, 0.5)',
                  spaceColor: 'rgba(0, 0, 0, 1)',
                  starIntensity: 0.1,
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
          {mapType === "norgeskart" && (
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
              {/* Hide built-in Mapbox peak layers */}
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
              centerCoordinate: selectedPeak 
                ? [selectedPeak.longitude, selectedPeak.latitude] 
                : [8.31, 61.63],
              zoomLevel: 12,
              pitch: is3DEnabled ? 60 : 0,
            }}
          />
          {peaks.map((peak) => {
            const isChecked = checkedPeakIds.has(peak.id);
            return (
              <MapboxMarkerView
                key={peak.id}
                id={peak.id}
                coordinate={[peak.longitude, peak.latitude]}
              >
                <TouchableOpacity 
                  onPress={() => handlePeakSelect(peak)}
                  style={styles.customMarkerContainer}
                  activeOpacity={0.8}
                >
                  <View style={flattenStyle([
                    styles.customMarkerCircle,
                    !isChecked ? { backgroundColor: "#FFFFFF", borderColor: "#10B981" } : null
                  ])}>
                    <Mountain size={14} color={isChecked ? "#FFFFFF" : "#10B981"} />
                  </View>
                  <View style={styles.customMarkerPill}>
                    <Text style={styles.customMarkerLabel} numberOfLines={1}>
                      {peak.name}
                    </Text>
                    <Text style={styles.customMarkerSubLabel}>
                      {peak.heightMoh} moh
                    </Text>
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
          initialRegion={region}
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
          onRegionChangeComplete={handleRegionChangeComplete}
          userInterfaceStyle={colorScheme as any}
          {...({
            maxPitch: 90,
          } as any)}
        >
          {mapType === "norgeskart" && (
            <UrlTile
              key="norgeskart-tile"
              urlTemplate="https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"
              tileSize={256}
              maximumZ={19}
              zIndex={99}
              shouldReplaceMapContent={Platform.OS === "ios"}
            />
          )}
          {peaks.map((peak) => {
            const isChecked = checkedPeakIds.has(peak.id);
            return (
              <Marker
                key={peak.id}
                coordinate={{ latitude: peak.latitude, longitude: peak.longitude }}
                onPress={() => handlePeakSelect(peak)}
              >
                <View style={styles.customMarkerContainer}>
                  <View style={flattenStyle([
                    styles.customMarkerCircle,
                    !isChecked ? { backgroundColor: "#FFFFFF", borderColor: "#10B981" } : null
                  ])}>
                    <Mountain size={14} color={isChecked ? "#FFFFFF" : "#10B981"} />
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
            <View style={flattenStyle([
              styles.layerMenu,
              { backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)" }
            ])}>
              {(["satellite", "satellite2", "terrain", "norgeskart"] as const).map((type) => {
                const isActive = mapType === type;
                let label = "Standard";
                switch(type) {
                  case "satellite":
                    label = "Satellitt";
                    break;
                  case "satellite2":
                    label = "Satellitt 2";
                    break;
                  case "terrain":
                    label = "Terreng";
                    break;
                  case "norgeskart":
                    label = "Norgeskart";
                    break;
                }
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setMapType(type);
                      setShowLayerMenu(false);
                    }}
                    style={flattenStyle([
                      styles.layerOption,
                      isActive ? { backgroundColor: "#10B981" } : null,
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
            </View>
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
          ) : (
            <VStack style={styles.placeholderContent} className="items-center justify-center p-6 text-center">
            {activeTab === "topper" && (
              <>
                <Mountain size={48} color="#10B981" />
                <Heading className={`text-xl font-bold mt-4 ${themeClasses.text}`}>Toppliste</Heading>
                <Text className={`text-sm text-center mt-2 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
                  Utforsk alle fjelltoppene registrert i systemet. Søk, sorter og filtrer etter høyde eller fylke.
                </Text>
                <TouchableOpacity 
                  style={styles.placeholderBtn} 
                  onPress={() => setActiveTab("kart")}
                >
                  <Text style={styles.placeholderBtnText}>Tilbake til kartet</Text>
                </TouchableOpacity>
              </>
            )}
            {activeTab === "lederliste" && (
              <>
                <Trophy size={48} color="#10B981" />
                <Heading className={`text-xl font-bold mt-4 ${themeClasses.text}`}>Lederliste</Heading>
                <Text className={`text-sm text-center mt-2 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
                  Hvem har besteget flest topper i år? Konkurrer mot venner og andre fjellklatrere om førsteplassen.
                </Text>
                <TouchableOpacity 
                  style={styles.placeholderBtn} 
                  onPress={() => setActiveTab("kart")}
                >
                  <Text style={styles.placeholderBtnText}>Tilbake til kartet</Text>
                </TouchableOpacity>
              </>
            )}
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

      {selectedPeak && activeTab === "kart" && (
        <View style={flattenStyle([styles.bottomSheet, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }])}>
          <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
            {/* Stats and Button moved to top */}
            <HStack style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <View style={flattenStyle([
                styles.statCard, 
                { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" }
              ])}>
                <Text style={styles.statLabel}>Avstand</Text>
                <Text style={flattenStyle([
                  styles.statValue, 
                  { color: canCheckin ? "#10B981" : (isDark ? "#E5E7EB" : "#1F2937") }
                ])}>
                  {formattedDistance}
                </Text>
              </View>
              <View style={flattenStyle([
                styles.statCard, 
                { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" }
              ])}>
                <Text style={styles.statLabel}>Historikk</Text>
                <Text style={flattenStyle([styles.statValue, { color: isDark ? "#E5E7EB" : "#1F2937" }])} numberOfLines={1} adjustsFontSizeToFit>
                  {selectedPeakCheckins.length} {selectedPeakCheckins.length === 1 ? "innsjekk" : "innsjekkinger"}
                </Text>
              </View>
            </HStack>

            <TouchableOpacity 
              style={flattenStyle([
                styles.checkinBtn, 
                !canCheckin ? styles.checkinBtnDisabled : null
              ])} 
              activeOpacity={0.8}
              disabled={!canCheckin || checkinLoading}
              onPress={handleCheckinPress}
            >
              <HStack style={styles.checkinBtnContent}>
                <CheckCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.checkinBtnText}>
                  {checkinLoading 
                    ? "Sjekker inn..." 
                    : (canCheckin 
                      ? "Sjekk inn" 
                      : "For langt unna toppen"
                    )
                  }
                </Text>
              </HStack>
            </TouchableOpacity>

            {lastCheckinDateStr && (
              <Text className={`text-xs mt-2 ${themeClasses.textMuted}`} style={{ marginBottom: 12, textAlign: "right" }}>
                Sist besøkt: {lastCheckinDateStr}
              </Text>
            )}

            <HStack style={flattenStyle([styles.sheetHeader, { marginTop: 4 }])}>
              <VStack style={{ flex: 1 }}>
                <Heading className={`text-xl font-bold ${themeClasses.text}`}>{selectedPeak.name}</Heading>
                <Text className={`text-xs ${themeClasses.textMuted}`}>{selectedPeak.heightMoh} moh • {selectedPeak.municipality}, {selectedPeak.county}</Text>
              </VStack>
              <TouchableOpacity onPress={() => setSelectedPeak(null)} style={styles.closeBtn}>
                <X size={20} color={isDark ? "#FFFFFF" : "#000000"} />
              </TouchableOpacity>
            </HStack>

            <Image 
              source={{ uri: selectedPeak.imageUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" }} 
              style={flattenStyle([styles.sheetImage, { marginTop: 16 }])} 
            />
            <Text className={`text-sm mt-3 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
              {selectedPeak.description}
            </Text>

            {/* Recent check-ins list with edit/delete options */}
            {selectedPeakCheckins.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Heading size="xs" className="text-typography-600 mb-2 uppercase tracking-wider font-semibold">
                  Dine innsjekker på denne toppen
                </Heading>
                {selectedPeakCheckins.map((checkin) => {
                  const isRecent = (Date.now() - new Date(checkin.checked_in_at).getTime()) < 24 * 60 * 60 * 1000;
                  return (
                    <View 
                      key={checkin.id} 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        paddingVertical: 10, 
                        borderBottomWidth: 0.5, 
                        borderColor: isDark ? '#374151' : '#E5E7EB' 
                      }}
                    >
                      <VStack style={{ flex: 1, gap: 4 }}>
                        <Text size="sm" className="text-typography-900 font-medium">
                          {new Date(checkin.checked_in_at).toLocaleDateString("no-NO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </Text>
                        {checkin.image_url && (
                          <Image 
                            source={{ uri: checkin.image_url }} 
                            style={{ width: 80, height: 60, borderRadius: 8, marginTop: 4 }} 
                          />
                        )}
                      </VStack>
                      {isRecent && (
                        <HStack style={{ gap: 16 }}>
                          <TouchableOpacity onPress={() => handleEditImagePress(checkin.id)} style={{ padding: 4 }}>
                            <Pencil size={18} color="#10B981" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteCheckinPress(checkin.id)} style={{ padding: 4 }}>
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </HStack>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
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
  layerMenu: {
    position: "absolute",
    top: Platform.OS === "ios" ? 172 : 162,
    right: 64,
    zIndex: 40,
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
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
  userLocationPuckContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPuckBase: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  userLocationPuckInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});