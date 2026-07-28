import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Actionsheet, 
  ActionsheetBackdrop, 
  ActionsheetContent, 
  ActionsheetDragIndicator, 
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText
} from '@/components/ui/actionsheet';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import { ActivityIcon } from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import useColorScheme from '@/hooks/useColorScheme';
import { Plus, Ambulance, Cross } from 'lucide-react-native';

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sessions: WorkoutSession[];
  healthEvents: HealthEvent[];
  onPressSession: (session: WorkoutSession) => void;
  onPressHealth: (event: HealthEvent) => void;
  onAddWorkout: () => void;
  onAddHealthEvent: () => void;
}

export const DayDrawer: React.FC<DayDrawerProps> = ({
  isOpen,
  onClose,
  date,
  sessions,
  healthEvents,
  onPressSession,
  onPressHealth,
  onAddWorkout,
  onAddHealthEvent
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const formattedDate = new Date(date).toLocaleDateString('no-NO', {
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
        
        <VStack space="md" style={styles.container}>
          <Heading style={styles.title}>{formattedDate}</Heading>
          
          <VStack space="sm">
            {/* Health Events First */}
            {healthEvents.map(event => (
              <TouchableOpacity 
                key={event.id}
                onPress={() => onPressHealth(event)}
                activeOpacity={0.7}
              >
                <View style={[styles.eventItem, isDark ? styles.eventItemDark : styles.eventItemLight]}>
                  <HStack space="md" style={{ alignItems: 'center' }}>
                    <ActivityIcon type={event.type} size={24} color="#EF4444" />
                    <VStack>
                      <Text style={styles.eventTitle}>
                        {event.type === 'sickness' ? 'Sykdom' : 'Skade'}
                      </Text>
                      {event.notes && (
                        <Text style={styles.eventNotes} numberOfLines={1}>{event.notes}</Text>
                      )}
                    </VStack>
                  </HStack>
                </View>
              </TouchableOpacity>
            ))}

            {/* Workout Sessions */}
            {sessions.map(session => {
              const colors = getActivityColors(session.type, isDark);
              return (
                <TouchableOpacity 
                  key={session.id}
                  onPress={() => onPressSession(session)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventItem, { backgroundColor: colors.bg }]}>
                    <HStack space="md" style={{ alignItems: 'center' }}>
                      <ActivityIcon type={session.type} size={24} color={colors.text} />
                      <VStack>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>
                          {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                        </Text>
                        <Text style={[styles.eventNotes, { color: colors.text }]}>
                          {session.durationMinutes} min {session.distance ? `• ${session.distance} km` : ''}
                        </Text>
                      </VStack>
                    </HStack>
                  </View>
                </TouchableOpacity>
              );
            })}

            {sessions.length === 0 && healthEvents.length === 0 && (
              <Text style={styles.emptyText}>Ingen aktiviteter denne dagen.</Text>
            )}
          </VStack>

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
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  eventItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  eventItemLight: {
    backgroundColor: '#F9FAFB',
  },
  eventItemDark: {
    backgroundColor: '#1F2937',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  eventNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginVertical: 20,
  },
  footer: {
    marginTop: 24,
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