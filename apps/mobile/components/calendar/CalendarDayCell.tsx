import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { ActivityIcon } from '@/components/ActivityIcon';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

const { width } = Dimensions.get('window');
const CELL_MARGIN = 1;
const HORIZONTAL_PADDING = 16;
export const CALENDAR_CELL_SIZE = (width - HORIZONTAL_PADDING * 2) / 7;
export const CALENDAR_ROW_HEIGHT = CALENDAR_CELL_SIZE * 1.1 + CELL_MARGIN * 2;

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  sessions: WorkoutSession[];
  healthEvents: HealthEvent[];
  onPress: (date: string) => void;
  onPressHealth?: (date: string) => void;
}

export const CalendarDayCell = React.memo<CalendarDayCellProps>(({
  date,
  isCurrentMonth,
  sessions,
  healthEvents,
  onPress,
  onPressHealth
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isToday = date.toDateString() === new Date().toDateString();
  const dateKey = date.toISOString().split('T')[0];

  const maxSessions = useMemo(() => sessions.slice(0, 3), [sessions]);
  const hasHealthEvent = healthEvents.length > 0;
  const primaryHealthEvent = healthEvents[0];

  const background = useMemo(() => {
    if (!isCurrentMonth || maxSessions.length === 0) return null;

    if (maxSessions.length === 1) {
      const s = maxSessions[0];
      const colors = getActivityColors(s.type, isDark);
      return (
        <View style={flattenStyle([styles.fullCell, { backgroundColor: colors.bg, opacity: s.excludeFromCount ? 0.6 : 1 }])}>
          <View style={{ marginTop: 8 }}>
            <ActivityIcon type={s.type} size={28} color={colors.text} />
          </View>
        </View>
      );
    }

    if (maxSessions.length === 2) {
      const colors1 = getActivityColors(maxSessions[0].type, isDark);
      const colors2 = getActivityColors(maxSessions[1].type, isDark);
      return (
        <View style={styles.splitVertical}>
          <View style={flattenStyle([styles.half, { backgroundColor: colors1.bg, opacity: maxSessions[0].excludeFromCount ? 0.6 : 1 }])}>
            <View style={{ marginTop: 8 }}>
              <ActivityIcon type={maxSessions[0].type} size={20} color={colors1.text} />
            </View>
          </View>
          <View style={flattenStyle([styles.half, { backgroundColor: colors2.bg, opacity: maxSessions[1].excludeFromCount ? 0.6 : 1 }])}>
            <View style={{ marginTop: 8 }}>
              <ActivityIcon type={maxSessions[1].type} size={20} color={colors2.text} />
            </View>
          </View>
        </View>
      );
    }

    const colors1 = getActivityColors(maxSessions[0].type, isDark);
    const colors2 = getActivityColors(maxSessions[1].type, isDark);
    const colors3 = getActivityColors(maxSessions[2].type, isDark);
    return (
      <View style={styles.triGrid}>
        <View style={flattenStyle([styles.triTop, { backgroundColor: colors1.bg, opacity: maxSessions[0].excludeFromCount ? 0.6 : 1 }])}>
          <View style={styles.topRightIcon}>
            <ActivityIcon type={maxSessions[0].type} size={16} color={colors1.text} />
          </View>
        </View>
        <View style={styles.triBottom}>
          <View style={flattenStyle([styles.triBottomHalf, { backgroundColor: colors2.bg, opacity: maxSessions[1].excludeFromCount ? 0.6 : 1 }])}>
            <ActivityIcon type={maxSessions[1].type} size={14} color={colors2.text} />
          </View>
          <View style={flattenStyle([styles.triBottomHalf, { backgroundColor: colors3.bg, opacity: maxSessions[2].excludeFromCount ? 0.6 : 1 }])}>
            <ActivityIcon type={maxSessions[2].type} size={14} color={colors3.text} />
          </View>
        </View>
      </View>
    );
  }, [maxSessions, isCurrentMonth, isDark]);

  return (
    <TouchableOpacity
      style={flattenStyle([
        styles.cell,
        !isCurrentMonth && styles.notCurrentMonth,
        isDark ? styles.cellDark : styles.cellLight,
        isToday && styles.todayOutline
      ])}
      onPress={() => onPress(dateKey)}
      activeOpacity={0.7}
    >
      <View style={styles.contentWrapper}>
        {background}
      </View>
      
      <View style={styles.dateContainer}>
        <Text style={flattenStyle([
          styles.dateText,
          !isCurrentMonth && styles.mutedText,
          isDark && isCurrentMonth && !isToday && { color: '#FFFFFF' },
          isToday && { color: '#10B981', fontWeight: '900' }
        ])}>
          {date.getDate()}
        </Text>
      </View>
      {hasHealthEvent && isCurrentMonth && (
        <TouchableOpacity 
          style={styles.healthContainer}
          onPress={(e) => {
            e.stopPropagation();
            onPressHealth?.(dateKey);
          }}
        >
          <ActivityIcon 
            type={primaryHealthEvent.type} 
            size={14} 
            color="#EF4444" 
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cell: {
    width: CALENDAR_CELL_SIZE - 2, // Account for margin
    height: CALENDAR_CELL_SIZE * 1.1, 
    margin: 1,
    borderRadius: 8,
    borderWidth: 0, // No border as per user request (rutene ses pga bakgrunn)
    overflow: 'hidden',
  },
  cellLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cellDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderWidth: 0, // No white outline in dark mode
  },
  notCurrentMonth: {
    opacity: 0.3,
  },
  healthContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  dateContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  todayOutline: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  todayText: {
    color: '#FFFFFF',
  },
  mutedText: {
    color: '#9CA3AF',
  },
  contentWrapper: {
    flex: 1,
  },
  fullCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitVertical: {
    flex: 1,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triGrid: {
    flex: 1,
  },
  triTop: {
    flex: 1,
  },
  topRightIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  triBottom: {
    flex: 1,
    flexDirection: 'row',
  },
  triBottomHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});