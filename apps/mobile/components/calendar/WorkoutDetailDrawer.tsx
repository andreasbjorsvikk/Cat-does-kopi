import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
import { Plus, Ambulance, MapPin, Clock, Zap, TrendingUp } from 'lucide-react-native';

interface WorkoutDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
  onEdit: (session: WorkoutSession) => void;
  onAddWorkout: () => void;
  onAddHealthEvent: () => void;
}

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

  if (!session) return null;

  const colors = getActivityColors(session.type, isDark);
  const formattedDate = new Date(session.date).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          <VStack space="xl">
            <HStack style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
                <ActivityIcon type={session.type} size={32} color={colors.text} />
              </View>
              <VStack style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.dateLabel}>{formattedDate}</Text>
                <Heading style={styles.title}>
                  {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                </Heading>
              </VStack>
              <TouchableOpacity 
                style={[styles.editBtn, isDark ? styles.btnDark : styles.btnLight]}
                onPress={() => onEdit(session)}
              >
                <Text style={styles.editBtnText}>Rediger</Text>
              </TouchableOpacity>
            </HStack>

            <View style={styles.statsGrid}>
              <VStack style={styles.statItem}>
                <HStack space="xs" style={styles.statLabel}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.statLabelText}>Varighet</Text>
                </HStack>
                <Text style={styles.statValue}>{session.durationMinutes} min</Text>
              </VStack>

              {session.distance !== undefined && (
                <VStack style={styles.statItem}>
                  <HStack space="xs" style={styles.statLabel}>
                    <TrendingUp size={14} color="#6B7280" />
                    <Text style={styles.statLabelText}>Distanse</Text>
                  </HStack>
                  <Text style={styles.statValue}>{session.distance} km</Text>
                </VStack>
              )}

              {session.elevationGain !== undefined && (
                <VStack style={styles.statItem}>
                  <HStack space="xs" style={styles.statLabel}>
                    <TrendingUp size={14} color="#6B7280" />
                    <Text style={styles.statLabelText}>Høydemeter</Text>
                  </HStack>
                  <Text style={styles.statValue}>{session.elevationGain} m</Text>
                </VStack>
              )}

              {session.averageHeartrate !== undefined && (
                <VStack style={styles.statItem}>
                  <HStack space="xs" style={styles.statLabel}>
                    <Zap size={14} color="#6B7280" />
                    <Text style={styles.statLabelText}>Snittpuls</Text>
                  </HStack>
                  <Text style={styles.statValue}>{session.averageHeartrate} bpm</Text>
                </VStack>
              )}
            </View>

            {session.notes && (
              <VStack space="xs">
                <Text style={styles.sectionTitle}>Notater</Text>
                <View style={[styles.notesBox, isDark ? styles.btnDark : styles.btnLight]}>
                  <Text style={styles.notesText}>{session.notes}</Text>
                </View>
              </VStack>
            )}

            {/* Footer Buttons */}
            <HStack space="md" style={styles.footer}>
              <TouchableOpacity 
                style={[styles.footerBtn, styles.workoutBtn]}
                onPress={onAddWorkout}
              >
                <HStack space="xs" style={styles.btnContent}>
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.btnText}>Legg til økt</Text>
                </HStack>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.footerBtn, styles.healthBtn]}
                onPress={onAddHealthEvent}
              >
                <HStack space="xs" style={styles.btnContent}>
                  <Ambulance size={18} color="#FFF" />
                  <Text style={styles.btnText}>Helse</Text>
                </HStack>
              </TouchableOpacity>
            </HStack>
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnLight: {
    backgroundColor: '#F3F4F6',
  },
  btnDark: {
    backgroundColor: '#1F2937',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 16,
  },
  statLabel: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabelText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
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
    marginTop: 12,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutBtn: {
    backgroundColor: '#10B981',
  },
  healthBtn: {
    backgroundColor: '#EF4444',
  },
  btnContent: {
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});