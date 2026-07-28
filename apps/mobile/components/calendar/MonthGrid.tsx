import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { flattenStyle } from '@/utils/flatten-style';
import { CalendarDayCell, CALENDAR_ROW_HEIGHT } from './CalendarDayCell';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import useColorScheme from '@/hooks/useColorScheme';

export const MONTH_HEADER_HEIGHT = 64; // Heading height + margin
export const getMonthGridHeight = (weeks: number) => MONTH_HEADER_HEIGHT + (weeks * CALENDAR_ROW_HEIGHT) + 20; // 20 for bottom padding

interface MonthGridProps {
  year: number;
  month: number;
  weeks: number;
  label: string;
  sessionsByDate: Map<string, WorkoutSession[]>;
  healthEventsByDate: Map<string, HealthEvent[]>;
  onPressDay: (date: string) => void;
  onPressHealth?: (date: string) => void;
}

export const MonthGrid = React.memo<MonthGridProps>(({
  year,
  month,
  weeks,
  label,
  sessionsByDate,
  healthEventsByDate,
  onPressDay,
  onPressHealth
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const days = useMemo(() => {
    const list = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust to Monday start (0=Sun -> index 6, 1=Mon -> index 0)
    let firstDayIdx = firstDay.getDay() - 1;
    if (firstDayIdx === -1) firstDayIdx = 6;
    
    // Padding from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      list.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      list.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Padding from next month
    const remaining = (7 - (list.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      list.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return list;
  }, [year, month]);

  const containerHeight = useMemo(() => getMonthGridHeight(weeks), [weeks]);

  return (
    <View style={flattenStyle([styles.container, { height: containerHeight }])}>
      <Heading 
        style={flattenStyle([
          styles.monthTitle,
          isDark ? styles.textDark : styles.textLight
        ])}
      >
        {label}
      </Heading>
      <View style={styles.grid}>
        {days.map((day, idx) => {
          const dateKey = day.date.toISOString().split('T')[0];
          return (
            <CalendarDayCell
              key={`${dateKey}-${idx}`}
              date={day.date}
              isCurrentMonth={day.isCurrentMonth}
              sessions={sessionsByDate.get(dateKey) || []}
              healthEvents={healthEventsByDate.get(dateKey) || []}
              onPress={onPressDay}
              onPressHealth={onPressHealth}
            />
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 20,
    textTransform: 'capitalize',
    marginLeft: 4,
    letterSpacing: -0.5,
  },
  textLight: {
    color: '#111827',
  },
  textDark: {
    color: '#F9FAFB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  }
});