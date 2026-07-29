import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
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
import { getActivityColors } from '@/utils/activityColors';
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
  onAddWorkout: () => void;
  onAddHealthEvent: () => void;
}

const StatsBox = ({ 
  label, 
  value, 
  icon: Icon, 
  isDark 
}: { 
  label: string; 
  value: string; 
  icon: any; 
  isDark: boolean;
}) => (
  <VStack style={[styles.statItem, isDark ? styles.statItemDark : styles.statItemLight]}>
    <HStack space="xs" style={styles.statLabel}>
      <Icon size={14} color="#6B7280" />
      <Text style={styles.statLabelText}>{label}</Text>
    </HStack>
    <Text style={styles.statValue}>{value}</Text>
  </VStack>
);

export const WorkoutDetailDrawer: React.FC<WorkoutDetailDrawerProps> = ({
  isOpen,
  onClose,
  session,
  onEdit,
  onAddWorkout,
  onAddHealthEvent
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  const decodedRoute = session.summaryPolyline ? decodePolyline(session.summaryPolyline) : [];

  const initialRegion = decodedRoute.length > 0 
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
      };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={styles.sheetContent}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="xl">
            {/* Map View */}
            <View style={styles.mapContainer}>
              {Platform.OS !== 'web' ? (
                <MapView
                  style={styles.map}
                  initialRegion={initialRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  mapType="mutedStandard"
                >
                  {decodedRoute.length > 0 && (
                    <Polyline
                      coordinates={decodedRoute}
                      strokeColor="#F97316" // Orange like in Strava/Screenshot
                      strokeWidth={4}
                    />
                  )}
                </MapView>
              ) : (
                <View style={[styles.mapPlaceholder, isDark ? styles.placeholderDark : styles.placeholderLight]}>
                  <MapPin size={48} color={isDark ? "#4B5563" : "#D1D5DB"} />
                  <Text style={styles.placeholderText}>Kart er utilgjengelig på web</Text>
                </View>
              )}
            </View>

            <HStack space="md" style={styles.header}>
              <View style={styles.iconContainer}>
                <ActivityIcon type={session.type} size={28} color="#FFFFFF" />
              </View>
              <VStack style={{ flex: 1 }}>
                <Heading style={styles.title}>
                  {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                </Heading>
                <Text style={styles.dateLabel}>{displayDate}</Text>
              </VStack>
            </HStack>

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
                value={session.averageHeartrate ? `${session.averageHeartrate} / ${session.maxHeartrate || '--'}` : '-- / --'} 
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

            <TouchableOpacity style={[styles.moreBtn, isDark ? styles.btnDark : styles.btnLight]}>
              <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />
                <Text style={styles.moreText}>Mer detaljer</Text>
              </HStack>
            </TouchableOpacity>

            {session.notes && (
              <VStack space="xs">
                <Text style={styles.sectionTitle}>Notater</Text>
                <View style={[styles.notesBox, isDark ? styles.btnDark : styles.btnLight]}>
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
              style={[styles.editFooterBtn, isDark ? styles.btnDark : styles.btnLight]}
              onPress={() => onEdit(session)}
            >
              <HStack space="xs" style={styles.btnContent}>
                <Pencil size={18} color={isDark ? "#FFFFFF" : "#1F2937"} />
                <Text style={[styles.btnText, { color: isDark ? "#FFFFFF" : "#1F2937" }]}>Rediger</Text>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.deleteFooterBtn, isDark ? styles.btnDark : styles.btnLight]}
              onPress={() => {/* Handle delete */}}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </HStack>

          <HStack space="md" style={{ width: '100%' }}>
            <TouchableOpacity 
              style={[styles.footerBtn, styles.workoutBtn]}
              onPress={onAddWorkout}
            >
              <HStack space="xs" style={styles.btnContent}>
                <Plus size={18} color={isDark ? "#FFFFFF" : "#1F2937"} />
                <Text style={[styles.btnText, { color: isDark ? "#FFFFFF" : "#1F2937" }]}>Legg til økt</Text>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.footerBtn, styles.healthBtn]}
              onPress={onAddHealthEvent}
            >
              <HStack space="xs" style={styles.btnContent}>
                <Ambulance size={18} color="#FFF" />
                <Text style={styles.btnText}>Ny hendelse</Text>
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
  scroll: {
    width: '100%',
  },
  container: {
    padding: 16,
    paddingBottom: 20,
  },
  mapContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
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
    alignItems: 'center',
    marginBottom: 4,
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
    gap: 8,
  },
  statItem: {
    width: '31.8%',
    padding: 12,
    borderRadius: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  statItemLight: {
    backgroundColor: '#F9FAFB',
  },
  statItemDark: {
    backgroundColor: '#111827',
  },
  statLabel: {
    alignItems: 'center',
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
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
    marginTop: 8,
  },
  notesBox: {
    padding: 16,
    borderRadius: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
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
    backgroundColor: '#3B82F6',
  },
  btnContent: {
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});