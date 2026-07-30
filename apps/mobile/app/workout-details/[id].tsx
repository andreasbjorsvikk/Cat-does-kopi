import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
  useDerivedValue
} from 'react-native-reanimated';
import { 
  GestureDetector, 
  Gesture, 
  GestureHandlerRootView, 
  ScrollView 
} from 'react-native-gesture-handler';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Circle, Rect, G, Line, TSpan } from 'react-native-svg';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Badge, BadgeText } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Pencil, 
  Trash2, 
  Clock, 
  MapPin, 
  Mountain, 
  Activity, 
  Heart, 
  Flame,
  Info
} from 'lucide-react-native';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { stravaService } from '@/services/stravaService';
import { WorkoutStreams } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { ActivityIcon } from '@/components/ActivityIcon';
import { decodePolyline } from '@/utils/polyline';
import { flattenStyle } from '@/utils/flatten-style';
import useColorScheme from '@/hooks/useColorScheme';
import { WorkoutModal } from '@/components/WorkoutModal';
import Constants from "expo-constants";

let Mapbox: any = null;
let MapboxMapView: any = null;
let MapboxCamera: any = null;

try {
  if (Platform.OS !== "web") {
    const RNMapbox = require("@rnmapbox/maps");
    Mapbox = RNMapbox.default;
    MapboxMapView = RNMapbox.MapView;
    MapboxCamera = RNMapbox.Camera;

    const token = Constants.expoConfig?.extra?.mapboxAccessToken;
    if (token) {
      Mapbox.setAccessToken(token);
    }
  }
} catch (err) {
  console.warn("Failed to load @rnmapbox/maps native modules:", err);
}

const isMapboxAvailable = !!MapboxMapView;

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINIMIZED_DRAWER_HEIGHT = Platform.OS === 'ios' ? 180 : 170;
const BASE_SNAP_TOP = SCREEN_HEIGHT * 0.55;
const CHART_SNAP_TOP = SCREEN_HEIGHT * 0.25;
const SNAP_BOTTOM = SCREEN_HEIGHT - MINIMIZED_DRAWER_HEIGHT;

// Mock stream data generator
const generateMockHRData = (count: number, avg: number) => {
  const data = [];
  let current = avg - 10;
  for (let i = 0; i < count; i++) {
    const change = Math.random() * 10 - 5;
    current = Math.max(80, Math.min(190, current + change));
    data.push({ time: i, value: Math.round(current) });
  }
  return data;
};

const generateMockAltitudeData = (count: number, totalElevation: number) => {
  const data = [];
  let current = 100;
  for (let i = 0; i < count; i++) {
    const change = Math.random() * (totalElevation / (count * 0.4)) - (totalElevation / (count * 0.8));
    current = Math.max(50, current + change);
    data.push({ distance: i, value: Math.round(current) });
  }
  return data;
};

const Chart = ({ 
  data, 
  color, 
  label, 
  unit, 
  isDark, 
  maxValue, 
  minValue,
  avgValue,
  durationMinutes = 60,
  isDrawerMinimized
}: { 
  data: { x: number; value: number }[]; 
  color: string; 
  label: string; 
  unit: string;
  isDark: boolean;
  maxValue?: number;
  minValue?: number;
  avgValue?: number;
  durationMinutes?: number,
  isDrawerMinimized?: boolean;
}) => {
  const chartHeight = 200;
  const chartWidth = width - 32;
  const padding = 15;
  const bottomPadding = 30;
  const topPadding = 25; 
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const isEnabled = !isDrawerMinimized;

  const values = useMemo(() => data.map(d => d.value), [data]);
  const { min, max, range } = useMemo(() => {
    const rawMin = values.length > 0 ? Math.min(...values) : 0;
    const rawMax = values.length > 0 ? Math.max(...values) : 100;
    const rangeWidth = rawMax - rawMin || 1;
    const minVal = Math.max(0, rawMin - rangeWidth * 0.02);
    const maxVal = rawMax + rangeWidth * 0.02;
    const rangeVal = (maxVal - minVal) || 1;
    return { min: minVal, max: maxVal, range: rangeVal };
  }, [values]);

  const getX = (index: number) => (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
  const getY = (value: number) => (chartHeight - bottomPadding) - ((value - min) / range) * (chartHeight - bottomPadding - topPadding);

  const points = useMemo(() => data.map((d, i) => ({ x: getX(i), y: getY(d.value) })), [data, min, range]);
  
  const pathData = useMemo(() => points.reduce((acc, p, i) => 
    acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ""
  ), [points]);

  const areaData = useMemo(() => `${pathData} L ${getX(data.length - 1)} ${chartHeight - bottomPadding} L ${getX(0)} ${chartHeight - bottomPadding} Z`, [pathData, data.length]);

  const xLabels = useMemo(() => {
    let interval = 5;
    if (durationMinutes < 60) interval = 5;
    else if (durationMinutes < 120) interval = 15;
    else if (durationMinutes < 180) interval = 30;
    else interval = 60;

    const labels = [];
    for (let i = 0; i <= durationMinutes; i += interval) {
      labels.push(i);
    }
    return labels;
  }, [durationMinutes]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}t` : `${h}:${m.toString().padStart(2, '0')}`;
  };

  const handleInteraction = useCallback((x: number) => {
    if (!isEnabled || data.length < 2) return;
    const index = Math.round(((x - padding) / (chartWidth - padding * 2)) * (data.length - 1));
    
    if (index >= 0 && index < data.length) {
      setActiveIndex(index);
    }
  }, [isEnabled, data, padding, chartWidth]);

  const handleRelease = useCallback(() => {
    if (!isEnabled) return;
    setActiveIndex(null);
  }, [isEnabled]);

  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(isEnabled)
    .activeOffsetX([-15, 15])
    .failOffsetY([-5, 5])
    .onStart((evt) => {
      runOnJS(handleInteraction)(evt.x);
    })
    .onUpdate((evt) => {
      runOnJS(handleInteraction)(evt.x);
    })
    .onEnd(() => {
      runOnJS(handleRelease)();
    })
    .onFinalize(() => {
      runOnJS(handleRelease)();
    }), [isEnabled, handleInteraction, handleRelease]);

  return (
    <VStack space="sm" style={styles.chartWrapper}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <Text style={styles.chartTitle}>{label}</Text>
        <HStack space="md">
          {avgValue && <Text style={styles.chartMeta}>Snitt: {avgValue}{unit}</Text>}
          {maxValue && <Text style={styles.chartMeta}>Maks: {maxValue}{unit}</Text>}
        </HStack>
      </HStack>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={flattenStyle([styles.chartContainer, isDark ? styles.cardDark : styles.cardLight, { height: chartHeight }])}
        >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          <Path 
            d={`M ${padding} ${getY(min)} L ${chartWidth - padding} ${getY(min)}`} 
            stroke={isDark ? "#374151" : "#E5E7EB"} 
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <Path 
            d={`M ${padding} ${getY(max)} L ${chartWidth - padding} ${getY(max)}`} 
            stroke={isDark ? "#374151" : "#E5E7EB"} 
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          <Path d={areaData} fill={`url(#grad-${label})`} />
          <Path d={pathData} fill="none" stroke={color} strokeWidth="2" />
          
          {/* Active Indicator */}
          {activeIndex !== null && data[activeIndex] && (
            <>
              <Path 
                d={`M ${getX(activeIndex)} ${topPadding} L ${getX(activeIndex)} ${chartHeight - bottomPadding}`} 
                stroke={isDark ? "#9CA3AF" : "#6B7280"} 
                strokeWidth="1" 
              />
              <Circle 
                cx={getX(activeIndex)} 
                cy={getY(data[activeIndex].value)} 
                r="4" 
                fill={color} 
                stroke="#FFF" 
                strokeWidth="2" 
              />
              
              {/* Tooltip always at top of line */}
              <Rect
                x={Math.max(padding, Math.min(chartWidth - padding - 75, getX(activeIndex) - 37.5))}
                y={2}
                width="75"
                height="24"
                rx="8"
                fill={isDark ? "#1F2937" : "#FFFFFF"}
                stroke={color}
                strokeWidth="2"
              />
              <SvgText
                x={Math.max(padding + 37.5, Math.min(chartWidth - padding - 37.5, getX(activeIndex)))}
                y={19}
                fontSize="12"
                fontWeight="bold"
                fill={isDark ? "#FFFFFF" : "#111827"}
                textAnchor="middle"
              >
                <TSpan dx="-4">{data[activeIndex].value}</TSpan>
                <TSpan dx="8">{unit.trim()}</TSpan>
              </SvgText>
            </>
          )}

          {/* X Labels at the very bottom, moved up slightly and refined */}
          {xLabels.map((m, i) => {
            const x = (m / durationMinutes) * (chartWidth - padding * 2) + padding;
            if (x > chartWidth - 5) return null;
            return (
              <G key={i}>
                <Line 
                  x1={x} y1={chartHeight - bottomPadding} 
                  x2={x} y2={chartHeight - bottomPadding + 4} 
                  stroke={isDark ? "#374151" : "#E5E7EB"} 
                  strokeWidth="1" 
                />
                <SvgText 
                  x={x} 
                  y={chartHeight - 8} 
                  fontSize="10" 
                  fill={isDark ? "#9CA3AF" : "#6B7280"} 
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {formatTime(m)}
                </SvgText>
              </G>
            );
          })}

          {/* Min/Max indicators */}
          <SvgText x={padding + 5} y={getY(min) - 4} fontSize="9" fill="#9CA3AF" fontWeight="bold">{Math.round(min)}{unit}</SvgText>
          <SvgText x={padding + 5} y={getY(max) + 10} fontSize="9" fill="#9CA3AF" fontWeight="bold">{Math.round(max)}{unit}</SvgText>
        </Svg>
        </Animated.View>
      </GestureDetector>
    </VStack>
  );
};

export default function WorkoutDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<MapView | null>(null);
  const mapboxCameraRef = useRef<any>(null);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [showHRChart, setShowHRChart] = useState(false);
  const [showAltChart, setShowAltChart] = useState(false);

  const currentSnapTopValue = useDerivedValue(() => {
    return (showHRChart || showAltChart) ? CHART_SNAP_TOP : BASE_SNAP_TOP;
  });

  const translateY = useSharedValue(BASE_SNAP_TOP);
  const context = useSharedValue({ y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const snapToMinimizedJS = useCallback(() => {
    translateY.value = withSpring(SNAP_BOTTOM);
    setIsMinimized(true);
  }, [SNAP_BOTTOM]);

  const snapToMinimized = useCallback(() => {
    'worklet';
    translateY.value = withSpring(SNAP_BOTTOM);
    runOnJS(setIsMinimized)(true);
  }, [SNAP_BOTTOM]);

  const snapToExpanded = useCallback(() => {
    translateY.value = withSpring(currentSnapTopValue.value);
    setIsMinimized(false);
  }, [currentSnapTopValue]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(currentSnapTopValue.value, translateY.value);
    })
    .onEnd((event) => {
      if (event.velocityY < -500) {
        translateY.value = withSpring(currentSnapTopValue.value);
        runOnJS(setIsMinimized)(false);
      } else if (event.velocityY > 500) {
        translateY.value = withSpring(SNAP_BOTTOM);
        runOnJS(setIsMinimized)(true);
      } else if (translateY.value < (currentSnapTopValue.value + SNAP_BOTTOM) / 2) {
        translateY.value = withSpring(currentSnapTopValue.value);
        runOnJS(setIsMinimized)(false);
      } else {
        translateY.value = withSpring(SNAP_BOTTOM);
        runOnJS(setIsMinimized)(true);
      }
    });

  const rDrawerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const rMapStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const activityColors = useMemo(() => {
    if (!session) return null;
    return getActivityColors(session.type, isDark);
  }, [session, isDark]);

  const [streams, setStreams] = useState<WorkoutStreams | null>(null);
  const [loadingHR, setLoadingHR] = useState(false);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const scrollContentStyle = useMemo(() => ({ 
    paddingBottom: SCREEN_HEIGHT * 0.4
  }), [SCREEN_HEIGHT]);

  const fetchSession = async () => {
    if (!id) return;
    setLoading(true);
    const data = await workoutService.getById(id);
    setSession(data);

    setLoading(false);
  };

  const loadRealStreams = async (type: 'hr' | 'alt') => {
    if (!session || !session.stravaActivityId || streams) return;
    
    if (type === 'hr') setLoadingHR(true);
    else setLoadingAlt(true);
    
    try {
      const streamData = await stravaService.fetchStreams(session.id, session.stravaActivityId);
      setStreams(streamData);
    } catch (err) {
      console.warn("Failed to fetch real streams from Strava:", err);
    } finally {
      setLoadingHR(false);
      setLoadingAlt(false);
    }
  };

  useEffect(() => {
    if (!isMinimized && (showHRChart || showAltChart)) {
      translateY.value = withSpring(currentSnapTopValue.value);
    }
  }, [showHRChart, showAltChart, isMinimized, currentSnapTopValue]);

  useEffect(() => {
    fetchSession();
  }, [id]);

  const decodedRoute = useMemo(() => 
    session?.summaryPolyline ? decodePolyline(session.summaryPolyline) : []
  , [session?.summaryPolyline]);

  const routeBounds = useMemo(() => {
    if (decodedRoute.length === 0) return null;
    const lats = decodedRoute.map(c => c.latitude);
    const lngs = decodedRoute.map(c => c.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [decodedRoute]);

  const hrData = useMemo(() => {
    if (streams?.heartrateData && streams.heartrateData.length > 0) {
      return streams.heartrateData.map((d) => ({ x: d.time, value: d.value }));
    }
    return [];
  }, [streams?.heartrateData]);

  const altitudeData = useMemo(() => {
    if (streams?.altitudeData && streams.altitudeData.length > 0) {
      return streams.altitudeData.map((d) => ({ x: d.distance, value: d.value }));
    }
    return [];
  }, [streams?.altitudeData]);

  useEffect(() => {
    if (session && decodedRoute.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(decodedRoute, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }, 500);
    }

    if (session && decodedRoute.length > 0 && isMapboxAvailable && mapboxCameraRef.current && routeBounds) {
      const focusOnRoute = (duration: number = 2000) => {
        if (mapboxCameraRef.current && decodedRoute.length > 0) {
          // Calculate latitude span to adjust top padding for tilted view
          const latSpan = routeBounds.maxLat - routeBounds.minLat;
          
          const basePadding = 60;
          const topPadding = latSpan > 0.05 ? 140 : 100;

          mapboxCameraRef.current.setCamera({
            bounds: {
              ne: [routeBounds.maxLng, routeBounds.maxLat],
              sw: [routeBounds.minLng, routeBounds.minLat],
              paddingTop: topPadding,
              paddingRight: basePadding,
              paddingBottom: basePadding,
              paddingLeft: basePadding,
            },
            pitch: 60,
            animationDuration: duration,
          });
        }
      };

      const timer1 = setTimeout(() => focusOnRoute(1500), 800);
      const timer2 = setTimeout(() => focusOnRoute(1200), 3500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [session, decodedRoute, routeBounds]);

  const handleDelete = async () => {
    if (!session) return;
    Alert.alert(
      "Slett økt",
      "Er du sikker på at du vil slette denne økten?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Slett", 
          style: "destructive",
          onPress: async () => {
            try {
              await workoutService.delete(session.id);
              router.back();
            } catch (error) {
              console.error("Error deleting session:", error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <Text>Kunne ikke finne økten.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#10B981' }}>Gå tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(session.date).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const durationText = session.durationMinutes >= 60
    ? `${Math.floor(session.durationMinutes / 60)} t ${session.durationMinutes % 60} min`
    : `${session.durationMinutes} min`;

  const pace = session.distance && session.durationMinutes > 0
    ? `${Math.floor(session.durationMinutes / session.distance)}:${Math.round(((session.durationMinutes / session.distance) % 1) * 60).toString().padStart(2, '0')} /km`
    : '--:-- /km';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={flattenStyle([styles.mainContainer, isDark ? styles.bgDark : styles.bgLight])}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Floating Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={flattenStyle([
            styles.floatingBackBtn,
            isDark ? styles.floatingBtnDark : styles.floatingBtnLight
          ])}
        >
          <ChevronLeft size={24} color={isDark ? "#FFFFFF" : "#1F2937"} />
        </TouchableOpacity>

        {/* Map Section - Background */}
        {decodedRoute.length > 0 && (
          <Animated.View style={[styles.mapSection, rMapStyle]}>
            {isMapboxAvailable ? (
              <MapboxMapView
                style={styles.map}
                styleURL="mapbox://styles/mapbox/satellite-streets-v12"
                logoEnabled={false}
                attributionEnabled={false}
                onDidFinishLoadingStyle={() => setIsStyleLoaded(true)}
                onCameraChanged={() => {
                  // If styles are loaded and map has been fitted, we can minimize on any move
                  if (isStyleLoaded) {
                    runOnJS(snapToMinimizedJS)();
                  }
                }}
              >
                <MapboxCamera 
                  ref={mapboxCameraRef}
                  defaultSettings={{
                    centerCoordinate: routeBounds 
                      ? [(routeBounds.minLng + routeBounds.maxLng) / 2, (routeBounds.minLat + routeBounds.maxLat) / 2] 
                      : [10.7522, 59.9139],
                    zoomLevel: 14,
                    pitch: 65,
                  }}
                />
                
                {isStyleLoaded && (
                  <>
                    <Mapbox.Atmosphere
                      style={{
                        range: [0, 15],
                        horizonBlend: 0.05,
                        color: 'rgba(135, 206, 235, 0.7)',
                        highColor: '#245cdf',
                        spaceColor: '#0b1026',
                      }}
                    />
                    <Mapbox.RasterDemSource
                      id="mapbox-dem"
                      url="mapbox://mapbox.mapbox-terrain-dem-v1"
                      tileSize={512}
                    />
                    <Mapbox.Terrain
                      sourceID="mapbox-dem"
                      style={{ exaggeration: 1.0 }}
                    />
                  </>
                )}
                
                  <Mapbox.ShapeSource
                    id="routeSource"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: decodedRoute.map(c => [c.longitude, c.latitude]),
                      },
                      properties: {},
                    }}
                  >
                    <Mapbox.LineLayer
                      id="routeLayer"
                      style={{
                        lineColor: '#F97316',
                        lineWidth: 5,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </Mapbox.ShapeSource>
              </MapboxMapView>
            ) : Platform.OS !== 'web' ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                scrollEnabled={true}
                zoomEnabled={true}
                mapType="satellite"
                onPanDrag={() => {
                  runOnJS(snapToMinimizedJS)();
                }}
              >
                {decodedRoute.length > 0 && (
                  <Polyline
                    coordinates={decodedRoute}
                    strokeColor="#F97316"
                    strokeWidth={4}
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <MapPin size={48} color="#D1D5DB" />
                <Text>Kart utilgjengelig på web</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Draggable Drawer */}
        <Animated.View style={flattenStyle([
          styles.drawerContainer, 
          isDark ? styles.drawerDark : styles.drawerLight,
          rDrawerStyle
        ])}>
          <VStack style={{ flex: 1 }}>
            <GestureDetector gesture={panGesture}>
              <VStack>
                <View style={styles.drawerHandle} />
                
                {/* Session Info Header (Tappable to expand/minimize) */}
                <TouchableOpacity 
                  activeOpacity={0.9}
                  onPress={isMinimized ? snapToExpanded : snapToMinimized}
                  style={{ padding: 16, paddingBottom: 8 }}
                >
                  <HStack space="md" style={{ alignItems: 'center' }}>
                    <View style={flattenStyle([styles.typeIconContainer, activityColors ? { backgroundColor: activityColors.bg } : null])}>
                      <ActivityIcon type={session.type} size={28} color={activityColors?.text || "#FFFFFF"} />
                    </View>
                    <HStack style={{ flex: 1, alignItems: 'stretch', justifyContent: 'space-between' }}>
                      <VStack style={{ flex: 1 }}>
                        <Heading size="lg" numberOfLines={1}>
                          {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                        </Heading>
                        <Text style={styles.dateText}>{displayDate}</Text>
                      </VStack>
                      <VStack style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <Badge 
                          size="md" 
                          variant="solid" 
                          style={flattenStyle([{ 
                            backgroundColor: activityColors?.bg,
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 2
                          }])}
                        >
                          <BadgeText style={{ color: activityColors?.text, fontSize: 10, fontWeight: '700' }}>
                            {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                          </BadgeText>
                        </Badge>
                        <View style={{ flex: 1, minHeight: 8 }} />
                        <HStack space="md" style={{ alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => setIsEditModalOpen(true)}>
                            <Pencil size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleDelete}>
                            <Trash2 size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </HStack>
                      </VStack>
                    </HStack>
                  </HStack>
                </TouchableOpacity>
              </VStack>
            </GestureDetector>

          <ScrollView
            key="workout-details-scroll"
            scrollEnabled={!isMinimized}
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }}
            contentContainerStyle={scrollContentStyle}
            removeClippedSubviews={false}
          >
            <VStack space="xl" style={{ padding: 16, paddingTop: 0 }}>
              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
                  <HStack space="xs" style={styles.statHeader}>
                    <Clock size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Varighet</Text>
                  </HStack>
                  <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>{durationText}</Text>
                </View>
                <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
                  <HStack space="xs" style={styles.statHeader}>
                    <MapPin size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Distanse</Text>
                  </HStack>
                  <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>{session.distance || 0} km</Text>
                </View>
                <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
                  <HStack space="xs" style={styles.statHeader}>
                    <Mountain size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Høydemeter</Text>
                  </HStack>
                  <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>{session.elevationGain || 0} m</Text>
                </View>
                <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
                  <HStack space="xs" style={styles.statHeader}>
                    <Activity size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Tempo</Text>
                  </HStack>
                  <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>{pace}</Text>
                </View>
                <VStack 
                  style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}
                  space="xs"
                >
                  <HStack space="xs" style={styles.statHeader}>
                    <Heart size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Puls</Text>
                  </HStack>
                  {session.averageHeartrate ? (
                    <VStack space="none" style={{ alignItems: 'center' }}>
                      <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>
                        {session.averageHeartrate} / {session.maxHeartrate || "--"}
                      </Text>
                      <Text style={styles.statSubText}>snitt / maks</Text>
                    </VStack>
                  ) : (
                    <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>—</Text>
                  )}
                </VStack>
                <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
                  <HStack space="xs" style={styles.statHeader}>
                    <Flame size={12} color="#9CA3AF" />
                    <Text style={styles.statLabel}>Kalorier</Text>
                  </HStack>
                  <Text style={flattenStyle([styles.statValue, isDark ? styles.textWhite : null])}>
                    {session.calories ? `${session.calories} kcal` : "—"}
                  </Text>
                </View>
              </View>

              {/* Charts */}
              <VStack space="md">
                {session.averageHeartrate && (
                  showHRChart && hrData.length > 0 ? (
                    <Chart 
                      data={hrData} 
                      color="#EF4444" 
                      label="Puls" 
                      unit=" bpm" 
                      isDark={isDark}
                      avgValue={session.averageHeartrate}
                      maxValue={session.maxHeartrate}
                      durationMinutes={session.durationMinutes}
                      isDrawerMinimized={isMinimized}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={flattenStyle([styles.loadChartBtn, isDark ? styles.cardDark : styles.cardLight])}
                      onPress={() => {
                        setShowHRChart(true);
                        loadRealStreams('hr');
                        if (isMinimized) snapToExpanded();
                      }}
                    >
                      <HStack space="sm" style={{ alignItems: 'center' }}>
                        {loadingHR ? <ActivityIndicator size="small" color="#EF4444" /> : <Heart size={16} color="#EF4444" />}
                        <Text style={styles.loadChartText}>Vis pulsgraf</Text>
                      </HStack>
                    </TouchableOpacity>
                  )
                )}

                {session.elevationGain && session.elevationGain > 0 && (
                  showAltChart && altitudeData.length > 0 ? (
                    <Chart 
                      data={altitudeData} 
                      color="#10B981" 
                      label="Høydeprofil" 
                      unit="m" 
                      isDark={isDark}
                      avgValue={Math.round(altitudeData.reduce((acc, d) => acc + d.value, 0) / altitudeData.length)}
                      durationMinutes={session.durationMinutes}
                      isDrawerMinimized={isMinimized}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={flattenStyle([styles.loadChartBtn, isDark ? styles.cardDark : styles.cardLight])}
                      onPress={() => {
                        setShowAltChart(true);
                        loadRealStreams('alt');
                        if (isMinimized) snapToExpanded();
                      }}
                    >
                      <HStack space="sm" style={{ alignItems: 'center' }}>
                        {loadingAlt ? <ActivityIndicator size="small" color="#10B981" /> : <Mountain size={16} color="#10B981" />}
                        <Text style={styles.loadChartText}>Vis høydeprofil</Text>
                      </HStack>
                    </TouchableOpacity>
                  )
                )}

                {((showHRChart && hrData.length === 0) || (showAltChart && altitudeData.length === 0)) && !loadingHR && !loadingAlt && (
                  <View style={flattenStyle([styles.noDataBox, isDark ? styles.cardDark : styles.cardLight])}>
                    <Text style={styles.noDataText}>Ingen detaljerte data tilgjengelig for denne økten</Text>
                  </View>
                )}
              </VStack>

              {session.notes && (
                <VStack space="sm">
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Info size={16} color="#6B7280" />
                    <Text style={styles.chartTitle}>Notater</Text>
                  </HStack>
                  <View style={flattenStyle([styles.notesContainer, isDark ? styles.cardDark : styles.cardLight])}>
                    <Text style={styles.notesText}>{session.notes}</Text>
                  </View>
                </VStack>
              )}
            </VStack>
          </ScrollView>
          </VStack>
        </Animated.View>

        <WorkoutModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          sessionToEdit={session}
          onSuccess={() => {
            fetchSession();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: '#F9FAFB',
  },
  bgDark: {
    backgroundColor: '#030712',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingBtnLight: {
    backgroundColor: '#FFFFFF',
  },
  floatingBtnDark: {
    backgroundColor: '#1F2937',
  },
  backBtn: {
    marginTop: 16,
    padding: 10,
  },
  mapSection: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 0,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 20,
  },
  drawerLight: {
    backgroundColor: '#FFFFFF',
  },
  drawerDark: {
    backgroundColor: '#111827',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 56) / 3,
    padding: 10,
    borderRadius: 20,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  statHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statSubText: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: -2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  chartWrapper: {
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  chartMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chartContainer: {
    padding: 0,
    borderRadius: 24,
    overflow: 'visible',
  },
  notesContainer: {
    padding: 16,
    borderRadius: 20,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  noDataBox: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  loadChartBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadChartText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});