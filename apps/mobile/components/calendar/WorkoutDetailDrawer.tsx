import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { 
  Actionsheet, 
  ActionsheetBackdrop, 
  ActionsheetContent, 
  ActionsheetDragIndicator, 
  ActionsheetDragIndicatorWrapper 
} from '@/components/ui/actionsheet';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { WorkoutSession } from '@/types/workout';
import { ActivityIcon } from '@/components/ActivityIcon';
import { getActivityColors, ActivityColorSet } from '@/utils/activityColors';
import useColorScheme from '@/hooks/useColorScheme';
import { 
  Plus, 
  Ambulance, 
  MapPin, 
  Clock, 
  Zap, 
  TrendingUp, 
  Mountain, 
  Activity, 
  Heart, 
  Flame, 
  Trash2,
  ChevronDown,
  Pencil
} from 'lucide-react-native';
import { decodePolyline } from '@/utils/polyline';
import { flattenStyle } from '@/utils/flatten-style';

interface WorkoutDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
  onEdit: (session: WorkoutSession) => void;
  onDelete?: (session: WorkoutSession) => void;
  onAddWorkout: () => void;
  onAddHealthEvent: () => void;
  onNavigateToDetails?: () => void;
}

const StatsBox = ({
  label,
  value,
  subtitle,
  icon: Icon,
  isDark,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: any;
  isDark: boolean;
}) => (
  <View
    style={flattenStyle([styles.statItem, isDark ? styles.statItemDark : styles.statItemLight])}
  >
    <HStack space="xs" style={styles.statHeader}>
      <Icon size={12} color="#9CA3AF" />
      <Text style={flattenStyle([styles.statLabelText, isDark ? styles.textMutedDark : styles.textMutedLight])}>
        {label}
      </Text>
    </HStack>
    <VStack space="none" style={{ alignItems: 'center' }}>
      <Text style={flattenStyle([styles.statValue, isDark ? styles.statValueDark : styles.statValueLight])}>
        {value}
      </Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </VStack>
  </View>
);

const { height: screenHeight } = Dimensions.get('window');

export const WorkoutDetailDrawer: React.FC<WorkoutDetailDrawerProps> = ({
  isOpen,
  onClose,
  session,
  onEdit,
  onDelete,
  onAddWorkout,
  onAddHealthEvent,
  onNavigateToDetails
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = React.useRef<MapView | null>(null);
  const router = useRouter();
  
  const activityColors = React.useMemo(() => {
    if (!session) return null;
    return getActivityColors(session.type, isDark);
  }, [session, isDark]);

  const decodedRoute = React.useMemo(() => 
    session?.summaryPolyline ? decodePolyline(session.summaryPolyline) : []
  , [session?.summaryPolyline]);

  const initialRegion = React.useMemo(() => 
    decodedRoute.length > 0 
      ? {
          latitude: decodedRoute[0].latitude,
          longitude: decodedRoute[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: 59.9139,
          longitude: 10.7522,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }
  , [decodedRoute]);

  React.useEffect(() => {
    if (isOpen && session && decodedRoute.length > 0 && mapRef.current) {
      // Use a small timeout to ensure map is ready
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(decodedRoute, {
          edgePadding: { top: 140, right: 140, bottom: 140, left: 140 },
          animated: true,
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, session, decodedRoute]);

  if (!session || !isOpen) return null;

  const formattedDate = new Date(session.date).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // Capitalize first letter of weekday
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const pace = session.distance && session.durationMinutes > 0
    ? `${Math.floor(session.durationMinutes / session.distance)}:${Math.round(((session.durationMinutes / session.distance) % 1) * 60).toString().padStart(2, '0')} /km`
    : '--:-- /km';

  const durationText = session.durationMinutes >= 60
    ? `${Math.floor(session.durationMinutes / 60)} t ${session.durationMinutes % 60} min`
    : `${session.durationMinutes} min`;
  return (
    <Actionsheet 
      isOpen={isOpen} 
      onClose={onClose}
    >
      <ActionsheetBackdrop />
      <ActionsheetContent style={flattenStyle([styles.sheetContent, isDark ? styles.sheetContentDark : null, { paddingHorizontal: 0 }])}>
        <ActionsheetDragIndicatorWrapper style={styles.dragWrapper}>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        {decodedRoute.length > 0 && (
          <View style={styles.mapContainer}>
            {Platform.OS !== 'web' ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialCamera={{
                  center: initialRegion,
                  pitch: 60,
                  heading: 0,
                  altitude: 1000,
                  zoom: 14,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={true}
                mapType="satellite"
              >
                <Polyline
                  coordinates={decodedRoute}
                  strokeColor="#F97316"
                  strokeWidth={4}
                />
              </MapView>
            ) : (
              <View style={flattenStyle([styles.mapPlaceholder, isDark ? styles.placeholderDark : styles.placeholderLight])}>
                <MapPin size={48} color={isDark ? "#4B5563" : "#D1D5DB"} />
                <Text style={styles.placeholderText}>Kart er utilgjengelig på web</Text>
              </View>
            )}
          </View>
        )}

        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="xl">
            <View style={flattenStyle([styles.header, { alignItems: 'center' }])}>
              <HStack space="md" style={{ flex: 1, alignItems: 'center' }}>
                <View style={flattenStyle([styles.iconContainer, activityColors ? { backgroundColor: activityColors.badge } : null])}>
                  <ActivityIcon type={session.type} size={28} color={activityColors?.text || "#FFFFFF"} />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Heading style={styles.title}>
                    {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                  </Heading>
                  <Text style={styles.dateLabel}>{displayDate}</Text>
                </VStack>
              </HStack>
              
              <HStack space="xs" style={styles.headerActions}>
                <TouchableOpacity 
                  style={flattenStyle([styles.squareActionBtn, isDark ? styles.btnDark : styles.btnLight])}
                  onPress={() => onEdit(session)}
                >
                  <Pencil size={18} color={isDark ? "#FFFFFF" : "#1F2937"} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={flattenStyle([styles.squareActionBtn, isDark ? styles.btnDark : styles.btnLight])}
                  onPress={() => onDelete?.(session)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </HStack>
            </View>

            <View style={styles.statsGrid}>
              <StatsBox 
                label="Varighet" 
                value={durationText} 
                icon={Clock} 
                isDark={isDark} 
              />
              <StatsBox 
                label="Distanse" 
                value={`${session.distance || 0} km`} 
                icon={MapPin} 
                isDark={isDark} 
              />
              <StatsBox 
                label="Høydemeter" 
                value={`${session.elevationGain || 0} m`} 
                icon={Mountain} 
                isDark={isDark} 
              />
              <StatsBox 
                label="Tempo" 
                value={pace} 
                icon={Activity} 
                isDark={isDark} 
              />
              <StatsBox 
                label="Puls" 
                value={
                  session.averageHeartrate
                    ? `${session.averageHeartrate} / ${session.maxHeartrate || "--"}`
                    : "-- / --"
                }
                subtitle={session.averageHeartrate ? "snitt / maks" : undefined}
                icon={Heart} 
                isDark={isDark} 
              />
              <StatsBox 
                label="Kalorier" 
                value={`${session.calories || 640} kcal`} 
                icon={Flame} 
                isDark={isDark} 
              />
            </View>

            <TouchableOpacity 
              style={flattenStyle([styles.moreBtn, isDark ? styles.btnDark : styles.btnLight])}
              onPress={() => {
                if (onNavigateToDetails) {
                  onNavigateToDetails();
                } else {
                  onClose();
                }
                router.push({
                  pathname: "/workout-details/[id]",
                  params: { id: session.id }
                } as any);
              }}
            >
              <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.moreText}>Mer detaljer</Text>
              </HStack>
            </TouchableOpacity>

            {session.notes && (
              <VStack space="xs">
                <Text style={styles.sectionTitle}>Notater</Text>
                <View style={flattenStyle([styles.notesBox, isDark ? styles.btnDark : styles.btnLight])}>
                  <Text style={styles.notesText}>{session.notes}</Text>
                </View>
              </VStack>
            )}

          </VStack>
        </ScrollView>

        {/* Fixed Footer Buttons */}
        <VStack space="md" style={styles.footer}>
          <HStack space="md" style={{ width: '100%' }}>
            <TouchableOpacity 
              style={flattenStyle([styles.footerBtn, styles.workoutBtn])}
              onPress={onAddWorkout}
            >
              <HStack space="xs" style={styles.btnContent}>
                <Plus size={18} color={isDark ? "#FFFFFF" : "#1F2937"} />
                <Text style={flattenStyle([styles.btnText, { color: isDark ? "#FFFFFF" : "#1F2937" }])}>Legg til økt</Text>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity 
              style={flattenStyle([styles.footerBtn, styles.healthBtn])}
              onPress={onAddHealthEvent}
            >
              <HStack space="xs" style={styles.btnContent}>
                <Ambulance size={18} color="#EF4444" />
                <Text style={flattenStyle([styles.btnText, { color: '#EF4444' }])}>Ny helsehendelse</Text>
              </HStack>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  sheetContentDark: {
    backgroundColor: '#030712',
  },
  scroll: {
    width: '100%',
  },
  container: {
    padding: 16,
    paddingBottom: 20,
  },
  mapContainer: {
    width: '100%',
    height: 260,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderLight: {
    backgroundColor: '#F3F4F6',
  },
  placeholderDark: {
    backgroundColor: '#1F2937',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerActions: {
    alignItems: 'center',
  },
  squareActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  btnLight: {
    backgroundColor: '#F3F4F6',
  },
  btnDark: {
    backgroundColor: '#1F2937',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  statItem: {
    width: '32%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  statItemLight: {
    backgroundColor: '#F9FAFB',
  },
  statItemDark: {
    backgroundColor: '#111827',
  },
  statLabelText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  statHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textMutedLight: {
    color: '#6B7280',
  },
  textMutedDark: {
    color: '#D1D5DB', // Even lighter gray for better visibility
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statValueDark: {
    color: '#FFFFFF', // Ensure white
  },
  statValueLight: {
    color: '#1F2937',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  moreBtn: {
    width: '100%',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  graphInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  graphContainer: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'flex-end',
  },
  mockGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 2,
  },
  expandedSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  notesBox: {
    padding: 16,
    borderRadius: 16,
  },
  notesText: {
    fontSize: 14,
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  editFooterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFooterBtn: {
    width: 60,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthBtn: {
    backgroundColor: '#FEE2E2',
  },
  btnContent: {
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  dragWrapper: {
    paddingTop: 10,
    paddingBottom: 45, // Even more vertical space for dragging (~4.5cm total area)
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
});