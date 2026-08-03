import React, { useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { WorkoutSession, SessionType } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { Text } from '@/components/ui/text';
import { flattenStyle } from '@/utils/flatten-style';
import { ActivityIcon } from '@/components/ActivityIcon';
import { useLanguage } from '@/context/LanguageContext';

interface Last7DaysProps {
  sessions: WorkoutSession[];
  isDark: boolean;
}

const Last7Days = memo(function Last7Days({ sessions, isDark }: Last7DaysProps) {
  const { t } = useLanguage();

  const WEEKDAY_LABELS = useMemo(() => [
    t('weekday.mon'),
    t('weekday.tue'),
    t('weekday.wed'),
    t('weekday.thu'),
    t('weekday.fri'),
    t('weekday.sat'),
    t('weekday.sun'),
  ], [t]);

  const days = useMemo(() => {
    const result: { date: string; label: string; sessions: WorkoutSession[] }[] = [];
    const now = new Date();
    // To match Monday as start if needed, but let's just go back 6 days from today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.getDay(); // 0=sun
      const label = WEEKDAY_LABELS[dow === 0 ? 6 : dow - 1].toUpperCase();
      const daySessions = sessions.filter(s => s.date.slice(0, 10) === dateStr);
      result.push({ date: dateStr, label, sessions: daySessions });
    }
    return result;
  }, [sessions]);

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  return (
    <View style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])}>
      <View style={styles.grid}>
        {days.map((day) => {
          const count = day.sessions.length;
          const today = isToday(day.date);
          return (
            <View key={day.date} style={styles.dayCol}>
              <Text style={flattenStyle([styles.label, today ? styles.textPrimary : styles.textMuted])}>
                {day.label}
              </Text>
              <View style={styles.bubbleContainer}>
                {count === 0 && (
                  <View style={flattenStyle([styles.emptyBubble, isDark ? styles.emptyDark : styles.emptyLight, today && styles.todayRing])} />
                )}
                {count === 1 && (() => {
                  const colors = getActivityColors(day.sessions[0].type, isDark);
                  return (
                    <View
                      style={flattenStyle([
                        styles.bubble,
                        { backgroundColor: colors.bg },
                        today && styles.todayRing
                      ])}
                    >
                      <ActivityIcon type={day.sessions[0].type} color={colors.text} size={24} />
                    </View>
                  );
                })()}
                {count >= 2 && (() => {
                  const c0 = getActivityColors(day.sessions[0].type, isDark);
                  const c1 = getActivityColors(day.sessions[1].type, isDark);
                  return (
                    <View style={styles.doubleBubbleWrapper}>
                      <View
                        style={flattenStyle([
                          styles.smallBubble,
                          styles.backBubble,
                          { backgroundColor: c0.bg }
                        ])}
                      >
                        <ActivityIcon type={day.sessions[0].type} color={c0.text} size={16} />
                      </View>
                      <View
                        style={flattenStyle([
                          styles.smallBubble,
                          styles.frontBubble,
                          { backgroundColor: c1.bg },
                          today && styles.todayRing
                        ])}
                      >
                        <ActivityIcon type={day.sessions[1].type} color={c1.text} size={16} />
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default Last7Days;

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 12,
    marginTop: 12,
  },
  bgLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  bgDark: {
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textPrimary: {
    color: '#10B981',
  },
  textMuted: {
    color: '#9CA3AF',
  },
  bubbleContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emptyLight: {
    backgroundColor: '#F3F4F6',
  },
  emptyDark: {
    backgroundColor: '#374151',
    opacity: 0.25,
  },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  doubleBubbleWrapper: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  smallBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
  },
  backBubble: {
    left: -2,
    top: 0,
    zIndex: 1,
  },
  frontBubble: {
    right: -2,
    bottom: 0,
    zIndex: 2,
  },
});