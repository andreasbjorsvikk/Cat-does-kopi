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
  UIManager
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
  Info
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

const isMapboxAvailable = (() => {
  if (Platform.OS === "web") return false;
  return !!UIManager.getViewManagerConfig?.("RNMBXMapView");
})();

let Mapbox: any = null;
let MapboxMapView: any = null;
let MapboxCamera: any = null;
let MapboxMarkerView: any = null;

if (isMapboxAvailable) {
  try {
    Mapbox = require("@rnmapbox/maps").default;
    MapboxMapView = require("@rnmapbox/maps").MapView;
    MapboxCamera = require("@rnmapbox/maps").Camera;
    MapboxMarkerView = require("@rnmapbox/maps").MarkerView;

    const token = Constants.expoConfig?.extra?.mapboxAccessToken;
    if (token) {
      Mapbox.setAccessToken(token);
    }
  } catch (err) {
    console.warn("Failed to load @rnmapbox/maps:", err);
  }
}

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

  const mapRef = useRef<MapView | null>(null);
  const mapboxCameraRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Top Tabs State
  const [activeTab, setActiveTab] = useState<"kart" | "topper" | "feed" | "lederliste" | "ar">("kart");
  
  // Map settings
  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain" | "norgeskart" | "satellite2">("satellite");
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

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
    latitude: 61.2,
    longitude: 8.5,
    latitudeDelta: 3.5,
    longitudeDelta: 3.5,
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

  const themeClasses = {
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100",
  };

  const handlePeakSelect = (peak: Peak) => {
    setSelectedPeak(peak);
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
    if (mapType === "terrain" && isMapboxAvailable) {
      try {
        mapboxCameraRef.current?.setCamera({
          pitch: next3D ? 45 : 0,
          duration: 600,
        });
      } catch (e) {
        console.warn("Could not animate Mapbox camera:", e);
      }
    } else {
      try {
        mapRef.current?.animateCamera({
          pitch: next3D ? 85 : 0,
        }, { duration: 600 });
      } catch (e) {
        console.warn("Could not animate map camera:", e);
      }
    }
  };

  const handleMapReady = () => {
    try {
      mapRef.current?.animateCamera({
        pitch: is3DEnabled ? 85 : 0,
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
        if (camera.pitch < 75 && currentRegion.latitudeDelta < 1.5) {
          await mapRef.current.animateCamera({
            pitch: 85, // Request maximum tilt; MapKit clamps it to the absolute max allowed
          }, { duration: 300 });
        }
      } catch (e) {
        console.warn("Error restoring camera pitch on region change:", e);
      } finally {
        isAdjustingCamera.current = false;
      }
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
      {isMapboxAvailable && (mapType === "terrain" || mapType === "satellite2") ? (
        <MapboxMapView
          style={styles.map}
          styleURL={mapType === "satellite2" ? "mapbox://styles/mapbox/satellite-v9" : "mapbox://styles/mapbox/outdoors-v12"}
          maxPitch={85}
          pitchEnabled={true}
          rotateEnabled={true}
          logoEnabled={false}
          attributionEnabled={false}
          onLongPress={handleMapboxLongPress}
          {...(mapType === "terrain" ? {
            terrain: {
              sourceID: "mapbox-dem",
              exaggeration: 1.5
            }
          } : {})}
        >
          {mapType === "terrain" && (
            <Mapbox.RasterDemSource
              id="mapbox-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
            />
          )}
          <MapboxCamera
            ref={mapboxCameraRef}
            defaultSettings={{
              centerCoordinate: selectedPeak 
                ? [selectedPeak.longitude, selectedPeak.latitude] 
                : [8.5, 61.2],
              zoomLevel: selectedPeak ? 12 : 6,
              pitch: is3DEnabled ? 45 : 0,
            }}
          />
          {peaks.map((peak) => (
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
                <View style={styles.customMarkerCircle}>
                  <Mountain size={14} color="#FFFFFF" />
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
          ))}
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
          showsBuildings={mapType === "standard"}
          showsCompass={true}
          showsScale={true}
          onLongPress={handleMapLongPress}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
          userInterfaceStyle={colorScheme as any}
          {...({
            maxPitch: 90,
          } as any)}
        >
          {mapType === "satellite2" && (
            <UrlTile
              key="mapbox-satellite-tile"
              urlTemplate="https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token={accessToken}"
              tileSize={256}
              maximumZ={19}
              zIndex={98}
              shouldReplaceMapContent={Platform.OS === "ios"}
            />
          )}
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
          {peaks.map((peak) => (
            <Marker
              key={peak.id}
              coordinate={{ latitude: peak.latitude, longitude: peak.longitude }}
              onPress={() => handlePeakSelect(peak)}
            >
              <View style={styles.customMarkerContainer}>
                <View style={styles.customMarkerCircle}>
                  <Mountain size={14} color="#FFFFFF" />
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
          ))}
        </MapView>
      )}

      {/* Mapbox Warning Banner when terrain is selected in non-supported builds */}
      {mapType === "terrain" && !isMapboxAvailable && (
        <View style={styles.mapboxWarningBanner}>
          <HStack style={{ alignItems: "center", gap: 8 }}>
            <Info size={16} color="#D97706" />
            <Text style={styles.mapboxWarningText}>
              3D Terreng krever en utviklingsbygg. Viser satellitt-fallback.
            </Text>
          </HStack>
        </View>
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
              onPress={() => setShow3DInfoModal(true)} 
              style={flattenStyle([
                styles.controlButton, 
                { backgroundColor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)" }
              ])}
            >
              <Info size={18} color={isDark ? "#FFFFFF" : "#111827"} />
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
          </View>

          {showLayerMenu && (
            <View style={flattenStyle([
              styles.layerMenu,
              { backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)" }
            ])}>
              {(["standard", "satellite", "satellite2", "terrain", "norgeskart"] as const).map((type) => {
                const isActive = mapType === type;
                let label = "Standard";
                switch(type) {
                  case "standard":
                    label = "Standard";
                    break;
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

      {/* Non-map Tabs Placeholder Screen overlays */}
      {activeTab !== "kart" && (
        <View style={flattenStyle([styles.placeholderContainer, { backgroundColor: isDark ? "#030712" : "#F9FAFB" }])}>
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
            {activeTab === "feed" && (
              <>
                <Rss size={48} color="#10B981" />
                <Heading className={`text-xl font-bold mt-4 ${themeClasses.text}`}>Aktivitetsfeed</Heading>
                <Text className={`text-sm text-center mt-2 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
                  Se de siste innsjekkingene og bildene fra fellesskapet. Del dine egne turer og få inspirasjon.
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
        </View>
      )}

      {selectedPeak && activeTab === "kart" && (
        <View style={flattenStyle([styles.bottomSheet, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }])}>
          <HStack style={styles.sheetHeader}>
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
            style={styles.sheetImage} 
          />
          <Text className={`text-sm mt-3 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
            {selectedPeak.description}
          </Text>
          <TouchableOpacity style={styles.checkinBtn} activeOpacity={0.8}>
            <HStack style={styles.checkinBtnContent}>
              <CheckCircle size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.checkinBtnText}>Registrer innsjekk her</Text>
            </HStack>
          </TouchableOpacity>
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
    top: Platform.OS === "ios" ? 110 : 100,
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
  sheetImage: { width: "100%", height: 160, borderRadius: 16 },
  checkinBtn: { backgroundColor: "#10B981", height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  checkinBtnContent: { alignItems: "center", justifyContent: "center" },
  checkinBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});