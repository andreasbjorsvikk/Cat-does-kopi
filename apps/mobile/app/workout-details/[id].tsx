import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Circle, Rect, G, Line } from 'react-native-svg';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
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

const { width } = Dimensions.get('window');

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
  onInteractionChange
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
  onInteractionChange?: (isInteracting: boolean) => void;
}) => {
  const chartHeight = 200;
  const chartWidth = width - 32;
  const padding = 15;
  const bottomPadding = 30;
  const topPadding = 30; // Reduced space for tooltip at top
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const interactionTimerRef = useRef<any>(null);
  
  const values = data.map(d => d.value);
  // Even tighter scaling to use full vertical area, but with a small buffer
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rangeWidth = rawMax - rawMin || 1;
  const min = Math.max(0, rawMin - rangeWidth * 0.02);
  const max = rawMax + rangeWidth * 0.02;
  const range = (max - min) || 1;

  const getX = (index: number) => (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
  const getY = (value: number) => (chartHeight - bottomPadding) - ((value - min) / range) * (chartHeight - bottomPadding - topPadding);

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  
  const pathData = points.reduce((acc, p, i) => 
    acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ""
  );

  const areaData = `${pathData} L ${getX(data.length - 1)} ${chartHeight - bottomPadding} L ${getX(0)} ${chartHeight - bottomPadding} Z`;

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

  const handleInteraction = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    const index = Math.round(((x - padding) / (chartWidth - padding * 2)) * (data.length - 1));
    
    if (index >= 0 && index < data.length) {
      if (activeIndex === null) {
        // If not already interacting, start a small timer to distinguish from vertical scroll
        if (!interactionTimerRef.current) {
          interactionTimerRef.current = setTimeout(() => {
            setActiveIndex(index);
            onInteractionChange?.(true);
          }, 150); // 150ms delay
        }
      } else {
        setActiveIndex(index);
      }
    }
  };

  const handleRelease = () => {
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }
    setActiveIndex(null);
    onInteractionChange?.(false);
  };

  return (
    <VStack space="sm" style={styles.chartWrapper}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <Text style={styles.chartTitle}>{label}</Text>
        <HStack space="md">
          {avgValue && <Text style={styles.chartMeta}>Snitt: {avgValue}{unit}</Text>}
          {maxValue && <Text style={styles.chartMeta}>Maks: {maxValue}{unit}</Text>}
        </HStack>
      </HStack>
      
      <View 
        style={flattenStyle([styles.chartContainer, isDark ? styles.cardDark : styles.cardLight, { height: chartHeight }])}
        onStartShouldSetResponder={() => {
          // Return true to claim touch and potentially lock parent scroll
          return true;
        }}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleInteraction}
        onResponderMove={handleInteraction}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
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
                x={Math.max(padding, Math.min(chartWidth - padding - 100, getX(activeIndex) - 50))}
                y={2}
                width="100"
                height="28"
                rx="8"
                fill={isDark ? "#1F2937" : "#FFFFFF"}
                stroke={color}
                strokeWidth="2"
              />
              <SvgText
                x={Math.max(padding + 50, Math.min(chartWidth - padding - 50, getX(activeIndex)))}
                y={21}
                fontSize="13"
                fontWeight="bold"
                fill={isDark ? "#FFFFFF" : "#111827"}
                textAnchor="middle"
              >
                {data[activeIndex].value}    {unit.trim()}
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
      </View>
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
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const fetchSession = async () => {
    if (!id) return;
    setLoading(true);
    const data = await workoutService.getById(id);
    setSession(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const decodedRoute = useMemo(() => 
    session?.summaryPolyline ? decodePolyline(session.summaryPolyline) : []
  , [session?.summaryPolyline]);

  const hrData = useMemo(() => 
    generateMockHRData(40, session?.averageHeartrate || 145).map((d, i) => ({ x: i, value: d.value }))
  , [session?.id, session?.averageHeartrate]);

  const altitudeData = useMemo(() => 
    generateMockAltitudeData(40, session?.elevationGain || 300).map((d, i) => ({ x: i, value: d.value }))
  , [session?.id, session?.elevationGain]);

  useEffect(() => {
    if (session && decodedRoute.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(decodedRoute, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }

    if (session && decodedRoute.length > 0 && isMapboxAvailable && mapboxCameraRef.current) {
      const lats = decodedRoute.map(c => c.latitude);
      const lngs = decodedRoute.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const focusOnRoute = () => {
        mapboxCameraRef.current?.setCamera({
          bounds: {
            ne: [maxLng, maxLat],
            sw: [minLng, minLat],
            paddingTop: 100,
            paddingRight: 100,
            paddingBottom: 100,
            paddingLeft: 100,
          },
          pitch: 45,
          animationDuration: 2500,
        });
      };

      const timer1 = setTimeout(focusOnRoute, 1000);
      const timer2 = setTimeout(focusOnRoute, 3000); // Second attempt to be sure
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [session, decodedRoute]);

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
    <View style={flattenStyle([styles.mainContainer, isDark ? styles.bgDark : styles.bgLight])}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={flattenStyle([styles.header, isDark ? styles.headerDark : styles.headerLight])}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={24} color={isDark ? "#FFFFFF" : "#1F2937"} />
          </TouchableOpacity>
          <Heading size="md" style={{ color: isDark ? "#FFFFFF" : "#1F2937" }}>Øktdetaljer</Heading>
          <HStack space="sm">
            <TouchableOpacity onPress={() => setIsEditModalOpen(true)} style={styles.iconBtn}>
              <Pencil size={20} color={isDark ? "#FFFFFF" : "#1F2937"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </View>

      <ScrollView 
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Map Section */}
        <View style={styles.mapSection}>
          {isMapboxAvailable ? (
            <MapboxMapView
              style={styles.map}
              styleURL="mapbox://styles/mapbox/satellite-streets-v12"
            >
              <MapboxCamera ref={mapboxCameraRef} />
              {decodedRoute.length > 0 && (
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
                      lineWidth: 4,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </Mapbox.ShapeSource>
              )}
            </MapboxMapView>
          ) : Platform.OS !== 'web' ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              scrollEnabled={true}
              zoomEnabled={true}
              mapType="satellite"
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
        </View>

        <VStack space="xl" style={{ padding: 16 }}>
          {/* Session Info */}
          <HStack space="md" style={{ alignItems: 'center' }}>
            <View style={styles.typeIconContainer}>
              <ActivityIcon type={session.type} size={28} color="#FFFFFF" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Heading size="xl">
                {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
              </Heading>
              <Text style={styles.dateText}>{displayDate}</Text>
            </VStack>
          </HStack>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Varighet</Text>
              <Text style={styles.statValue}>{durationText}</Text>
            </View>
            <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Distanse</Text>
              <Text style={styles.statValue}>{session.distance || 0} km</Text>
            </View>
            <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
              <Mountain size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Høydemeter</Text>
              <Text style={styles.statValue}>{session.elevationGain || 0} m</Text>
            </View>
            <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
              <Activity size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Tempo</Text>
              <Text style={styles.statValue}>{pace}</Text>
            </View>
            <VStack 
              style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}
              space="xs"
            >
              <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={14} color="#6B7280" />
                <Text style={styles.statLabel}>Puls</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, isDark ? { color: '#FFF' } : null])}>
                {session.averageHeartrate || "--"} / {session.maxHeartrate || "--"}
              </Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>snitt / maks</Text>
            </VStack>
            <View style={flattenStyle([styles.statCard, isDark ? styles.cardDark : styles.cardLight])}>
              <Flame size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Kalorier</Text>
              <Text style={styles.statValue}>{session.calories || 640} kcal</Text>
            </View>
          </View>

          {/* Charts */}
          <Chart 
            data={hrData} 
            color="#EF4444" 
            label="Puls" 
            unit=" bpm" 
            isDark={isDark}
            avgValue={session.averageHeartrate}
            maxValue={session.maxHeartrate}
            durationMinutes={session.durationMinutes}
            onInteractionChange={(interacting) => setScrollEnabled(!interacting)}
          />

          <Chart 
            data={altitudeData} 
            color="#10B981" 
            label="Høydeprofil" 
            unit="m" 
            isDark={isDark}
            avgValue={Math.round(altitudeData.reduce((acc, d) => acc + d.value, 0) / altitudeData.length)}
            durationMinutes={session.durationMinutes}
            onInteractionChange={(interacting) => setScrollEnabled(!interacting)}
          />

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

      <WorkoutModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        sessionToEdit={session}
        onSuccess={() => {
          fetchSession();
        }}
      />
    </View>
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
  header: {
    height: Platform.OS === 'ios' ? 100 : 80,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLight: {
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#111827',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    marginTop: 16,
    padding: 10,
  },
  mapSection: {
    width: '100%',
    height: 300,
    backgroundColor: '#E5E7EB',
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
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
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
    padding: 12,
    borderRadius: 20,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardDark: {
    backgroundColor: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
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
  }
});