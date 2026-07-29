import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Platform,
  ViewToken
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Calendar as CalendarIcon, Plus, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useCalendarData } from '@/hooks/calendar/useCalendarData';
import { useInfiniteMonths } from '@/hooks/calendar/useInfiniteMonths';
import { MonthGrid, getMonthGridHeight } from './MonthGrid';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';
import { WorkoutModal } from '@/components/WorkoutModal';
import { DayDrawer } from './DayDrawer';
import { WorkoutDetailDrawer } from './WorkoutDetailDrawer';
import { HealthEventModal } from '@/components/HealthEventModal';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { Alert } from 'react-native';

const { width, height } = Dimensions.get('window');
const DAYS_NO = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

export const CalendarView: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { 
    sessionsByDate, 
    healthEventsByDate, 
    loading, 
    refresh 
  } = useCalendarData();
  const { 
    months, 
    loadMoreFuture, 
    loadMorePast, 
    getInitialIndex,
   reset,
    todayMonthId,
    startOffset
  } = useInfiniteMonths();

  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [wasDetailDrawerOpen, setWasDetailDrawerOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedHealthEvent, setSelectedHealthEvent] = useState<HealthEvent | null>(null);

  const [todayButtonDirection, setTodayButtonDirection] = useState<'up' | 'down' | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const [isInitialScrollDone, setIsInitialScrollDone] = useState(false);
  const shouldScrollToTodayRef = useRef(false);
  const isLoadingPastRef = useRef(false);
  const currentScrollOffsetRef = useRef(0);
  const previousMonthsLengthRef = useRef(months.length);
  const lastLoadPastTimeRef = useRef(0);
  const monthsRef = useRef(months);
  const todayMonthIdRef = useRef(todayMonthId);

  // Update refs to avoid stale closures
  monthsRef.current = months;
  todayMonthIdRef.current = todayMonthId;

  // Pre-calculate layouts for FlatList to handle dynamic heights (4, 5, or 6 weeks)
  const monthLayouts = useMemo(() => {
    const paddingTop = 16;
    let currentOffset = paddingTop;
    return months.map(m => {
      const h = getMonthGridHeight(m.weeks);
      const layout = { length: h, offset: currentOffset };
      currentOffset += h;
      return layout;
    });
  }, [months]);

  const getMonthOffset = useCallback((index: number) => {
    if (index < 0 || index >= monthLayouts.length) return 0;
    return monthLayouts[index].offset;
  }, [monthLayouts]);


  // Handles:
  // 1. Scrolling to today when initialised or focused (with reset)
  // 2. Adjusting the FlatList's offset instantly when past months are prepended,
  //    so there's absolutely NO visual jump, on iOS, Android, and Web!
  // Handle prepending for Web (Preview) where maintainVisibleContentPosition isn't supported
  React.useLayoutEffect(() => {
    if (shouldScrollToTodayRef.current && months.length > 0) {
      const index = months.findIndex(m => m.id === todayMonthId);
      if (index !== -1) {
        try {
          flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
        } catch (e) {
          const offset = getMonthOffset(index);
          flatListRef.current?.scrollToOffset({ offset, animated: false });
        }
        shouldScrollToTodayRef.current = false;
      }
    }

    if (Platform.OS === 'web' && isLoadingPastRef.current && months.length > previousMonthsLengthRef.current) {
      const addedCount = months.length - previousMonthsLengthRef.current;
      
      // Sum up the heights of the added months
      let adjustment = 0;
      for (let i = 0; i < addedCount; i++) {
        adjustment += getMonthGridHeight(months[i].weeks);
      }
      
      flatListRef.current?.scrollToOffset({
        offset: currentScrollOffsetRef.current + adjustment,
        animated: false
      });
    }

    previousMonthsLengthRef.current = months.length;

    // Instead of setting isLoadingPastRef.current = false immediately,
    // we use a safe cooldown timeout, or let onScroll release it when offset stabilizes.
    if (isLoadingPastRef.current) {
      const timer = setTimeout(() => {
        isLoadingPastRef.current = false;
      }, 1000); // Cooldown of 1 second
      return () => clearTimeout(timer);
    }
  }, [months, todayMonthId]);

  const handlePressDay = useCallback((date: string) => {
    const sessions = sessionsByDate.get(date) || [];
    const healthEvents = healthEventsByDate.get(date) || [];

    setSelectedDate(date);

    if (sessions.length === 1 && healthEvents.length === 0) {
      setSelectedSession(sessions[0]);
      setIsDetailDrawerOpen(true);
    } else {
      setIsDayDrawerOpen(true);
    }
  }, [sessionsByDate, healthEventsByDate]);

  const handlePressHealth = useCallback((date: string) => {
    setSelectedDate(date);
    setIsDayDrawerOpen(true);
  }, []);

  const handleEditWorkout = (session: WorkoutSession, fromDetailDrawer = false) => {
    setSelectedSession(session);
    if (fromDetailDrawer) {
      setWasDetailDrawerOpen(true);
    }
    setIsWorkoutModalOpen(true);
  };

  const handleEditHealth = (event: HealthEvent, fromDetailDrawer = false) => {
    setSelectedHealthEvent(event);
    if (fromDetailDrawer) {
      setWasDetailDrawerOpen(true);
    }
    setIsHealthModalOpen(true);
  };

  const handleAddWorkout = (date: string, fromDetailDrawer = false) => {
    setSelectedDate(date);
    setSelectedSession(null);
    if (fromDetailDrawer) {
      setWasDetailDrawerOpen(true);
    }
    setIsWorkoutModalOpen(true);
  };

  const handleAddHealth = (date: string, fromDetailDrawer = false) => {
    setSelectedDate(date);
    setSelectedHealthEvent(null);
    if (fromDetailDrawer) {
      setWasDetailDrawerOpen(true);
    }
    setIsHealthModalOpen(true);
  };

  const handleDeleteWorkout = async (session: WorkoutSession) => {
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
              setIsDetailDrawerOpen(false);
              refresh();
            } catch (error) {
              console.error("Error deleting session:", error);
              Alert.alert("Feil", "Kunne ikke slette økten.");
            }
          }
        }
      ]
    );
  };

  const scrollToToday = useCallback(async () => {
    const index = months.findIndex(m => m.id === todayMonthId);
    if (index !== -1) {
      const targetOffset = getMonthOffset(index);
      const currentOffset = currentScrollOffsetRef.current;
      const monthHeight = getMonthGridHeight(months[index].weeks);
      const distance = Math.abs(targetOffset - currentOffset);

      // If we're very far away, do a two-step scroll to avoid FlatList virtualization issues
      if (distance > monthHeight * 4) {
        // 1. Jump instantly to a nearby position (2 months away)
        const jumpOffset = targetOffset + (targetOffset > currentOffset ? -monthHeight * 2 : monthHeight * 2);
        flatListRef.current?.scrollToOffset({ offset: jumpOffset, animated: false });
        
        // 2. Wait a tiny bit for the list to breathe, then animate the rest
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
        }, 50);
        return;
      }

      try {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
      } catch (error) {
        flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      }
    }
  }, [months, todayMonthId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;

    const currentMonths = monthsRef.current;
    const currentTodayMonthId = todayMonthIdRef.current;

    const todayIndex = currentMonths.findIndex(m => m.id === currentTodayMonthId);
    if (todayIndex === -1) return;

    const firstVisibleIndex = viewableItems[0].index ?? 0;
    const lastVisibleIndex = viewableItems[viewableItems.length - 1].index ?? 0;

    const isTodayVisible = viewableItems.some(item => item.item.id === currentTodayMonthId);

    if (isTodayVisible) {
      setTodayButtonDirection(null);
    } else if (todayIndex < firstVisibleIndex) {
      setTodayButtonDirection('up');
    } else {
      setTodayButtonDirection('down');
    }
  }).current;

  const renderMonth = useCallback(({ item }: { item: any }) => {
    return (
      <MonthGrid
        year={item.year}
        month={item.month}
        weeks={item.weeks}
        label={item.label}
        sessionsByDate={sessionsByDate}
        healthEventsByDate={healthEventsByDate}
        onPressDay={handlePressDay}
        onPressHealth={handlePressHealth}
      />
    );
  }, [sessionsByDate, healthEventsByDate, handlePressDay, handlePressHealth]);

  const onScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    currentScrollOffsetRef.current = offsetY;

    // If we were loading past and the scroll offset has shifted to the safe zone,
    // we can release the lock earlier than the 1000ms timeout.
    if (isLoadingPastRef.current && offsetY >= 1000) {
      isLoadingPastRef.current = false;
    }

    // Trigger load past when close to top. Use a slightly higher threshold (500) for more lead time.
    if (
      offsetY < 500 && 
      isInitialScrollDone && 
      !isLoadingPastRef.current && 
      !shouldScrollToTodayRef.current &&
      (Date.now() - lastLoadPastTimeRef.current > 2000)
    ) {
      // Near top - load past
      isLoadingPastRef.current = true;
      lastLoadPastTimeRef.current = Date.now();
      loadMorePast();
    }
  };

  if (loading && months.length === 0) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])}>
      {/* Header */}
      <View style={flattenStyle([styles.header, isDark ? styles.headerDark : styles.headerLight])}>
        <HStack space="md" style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <CalendarIcon size={24} color="#10B981" />
          </View>
          <VStack>
            <Heading style={flattenStyle([styles.title, isDark ? styles.textDark : styles.textLight])}>
              Kalender
            </Heading>
            <Text style={styles.subtitle}>Treningsaktivitet</Text>
          </VStack>
        </HStack>

        {/* Weekday Labels */}
        <HStack style={styles.weekdays}>
          {DAYS_NO.map(day => (
            <View key={day} style={styles.weekdayCol}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </HStack>
      </View>

      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonth}
        keyExtractor={item => item.id}
        onEndReached={loadMoreFuture}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialScrollIndex={getInitialIndex()}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        onLayout={() => {
          setIsInitialScrollDone(true);
          // If we need to scroll to today on initial layout
          if (shouldScrollToTodayRef.current) {
            const index = months.findIndex(m => m.id === todayMonthId);
            if (index !== -1) {
              try {
                flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
              } catch (e) {
                const offset = getMonthOffset(index);
                flatListRef.current?.scrollToOffset({ offset, animated: false });
              }
              shouldScrollToTodayRef.current = false;
            }
          }
        }}
        getItemLayout={(_, index) => {
          const layout = monthLayouts[index];
          if (!layout) {
            return { length: 400, offset: 400 * index + 16, index };
          }
          return { ...layout, index };
        }}
        onScrollToIndexFailed={(info) => {
          const offset = getMonthOffset(info.index);
          try {
            flatListRef.current?.scrollToOffset({ offset, animated: false });
          } catch (e) {
            console.warn("Failed to scroll to offset on ScrollToIndexFailed:", e);
          }
        }}
        // Prepend handling (Experimental for RN)
        maintainVisibleContentPosition={Platform.OS !== 'web' ? {
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 0,
        } : undefined}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setIsWorkoutModalOpen(true)}
      >
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Today Button */}
      {todayButtonDirection && (
        <TouchableOpacity 
          style={flattenStyle([styles.todayButton, isDark ? styles.glassDark : styles.glassLight])}
          onPress={scrollToToday}
        >
          <HStack space="xs" style={flattenStyle(styles.todayContent)}>
            {todayButtonDirection === 'up' ? (
              <ChevronUp size={18} color="#10B981" />
            ) : (
              <ChevronDown size={18} color="#10B981" />
            )}
            <Text style={styles.todayText}>I dag</Text>
          </HStack>
        </TouchableOpacity>
      )}

      <DayDrawer
        isOpen={isDayDrawerOpen}
        onClose={() => setIsDayDrawerOpen(false)}
        date={selectedDate}
        sessions={sessionsByDate.get(selectedDate) || []}
        healthEvents={healthEventsByDate.get(selectedDate) || []}
        onPressSession={(s) => {
          setIsDayDrawerOpen(false);
          setSelectedSession(s);
          setIsDetailDrawerOpen(true);
        }}
        onPressHealth={(e) => {
          setIsDayDrawerOpen(false);
          handleEditHealth(e);
        }}
        onAddWorkout={() => {
          setIsDayDrawerOpen(false);
          handleAddWorkout(selectedDate);
        }}
        onAddHealthEvent={() => {
          setIsDayDrawerOpen(false);
          handleAddHealth(selectedDate);
        }}
      />

      <WorkoutDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        session={selectedSession}
        onEdit={(s) => handleEditWorkout(s, true)}
        onDelete={handleDeleteWorkout}
        onAddWorkout={() => handleAddWorkout(selectedDate, true)}
        onAddHealthEvent={() => handleAddHealth(selectedDate, true)}
      />

      <HealthEventModal
        isOpen={isHealthModalOpen}
        onClose={() => {
          setIsHealthModalOpen(false);
          setSelectedHealthEvent(null);
          if (wasDetailDrawerOpen) {
            setIsDetailDrawerOpen(true);
            setWasDetailDrawerOpen(false);
          }
        }}
        initialDate={selectedDate}
        onSuccess={() => {
          refresh();
          if (wasDetailDrawerOpen) {
            setIsDetailDrawerOpen(true);
            setWasDetailDrawerOpen(false);
          }
        }}
        eventToEdit={selectedHealthEvent}
      />

      <WorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => {
          setIsWorkoutModalOpen(false);
          if (wasDetailDrawerOpen) {
            setIsDetailDrawerOpen(true);
            setWasDetailDrawerOpen(false);
          } else {
            setSelectedSession(null);
          }
        }}
        initialDate={selectedDate}
        onSuccess={() => {
          refresh();
          if (wasDetailDrawerOpen) {
            // Try to update the selected session with the new data
            // (refresh is async, but this is a quick fix to keep the drawer open)
            setIsDetailDrawerOpen(true);
            setWasDetailDrawerOpen(false);
          } else {
            setSelectedSession(null);
          }
        }}
        sessionToEdit={selectedSession}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: '#FFFFFF',
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerDark: {
    backgroundColor: '#030712',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  textLight: {
    color: '#111827',
  },
  textDark: {
    color: '#F9FAFB',
  },
  weekdays: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  todayButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  glassLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  glassDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  todayContent: {
    alignItems: 'center',
  },
  todayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
});