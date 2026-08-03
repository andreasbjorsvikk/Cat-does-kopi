import { WorkoutSession, ExtraGoal, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';

export function getSessionsInPeriod(
  sessions: WorkoutSession[],
  period: GoalPeriod | 'custom',
  activityType: string, // 'all' | single type | comma-separated
  customStart?: string,
  customEnd?: string
): WorkoutSession[] {
  const now = new Date();
  
  // Filter by activity type(s)
  let filtered: WorkoutSession[];
  if (activityType === 'all') {
    filtered = sessions;
  } else if (activityType.includes(',')) {
    const types = activityType.split(',');
    filtered = sessions.filter(s => s.type && types.includes(s.type.toLowerCase()));
  } else {
    const targetType = activityType.toLowerCase();
    filtered = sessions.filter(s => s.type && s.type.toLowerCase() === targetType);
  }

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  } else if (period === 'week') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    filtered = filtered.filter(s => new Date(s.date) >= monday);
  } else if (period === 'month') {
    filtered = filtered.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else {
    filtered = filtered.filter(s => new Date(s.date).getFullYear() === now.getFullYear());
  }

  // Only apply customStart boundary if period is 'custom'.
  // For standard periods (week, month, year), we want the whole period regardless of when the goal was created.
  if (period === 'custom' && customStart) {
    const startBoundary = new Date(customStart);
    startBoundary.setHours(0, 0, 0, 0);
    filtered = filtered.filter(s => new Date(s.date) >= startBoundary);
  }

  return filtered;
}

export function getGoalPeriodBoundaries(goal: ExtraGoal): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (goal.period === 'custom') {
    start = goal.customStart ? new Date(goal.customStart) : new Date(goal.createdAt || Date.now());
    end = goal.customEnd ? new Date(goal.customEnd) : new Date(start);
    // Ensure end is end of day
    end.setHours(23, 59, 59, 999);
  } else {
    // For standard periods, normalize start to the beginning of that period
    start = goal.customStart ? new Date(goal.customStart) : new Date(goal.createdAt || Date.now());
    
    if (goal.period === 'week') {
      const day = start.getDay();
      const mondayOffset = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (goal.period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (goal.period === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
    } else {
      end = goal.customEnd ? new Date(goal.customEnd) : new Date(start);
      end.setHours(23, 59, 59, 999);
    }
  }
  
  return { start, end };
}

export function computeProgress(sessions: WorkoutSession[], metric: GoalMetric): number {
  switch (metric) {
    case 'sessions': return sessions.filter(s => !s.excludeFromCount).length;
    case 'minutes': return sessions.reduce((s, w) => s + (w.durationMinutes || 0) / 60, 0);
    case 'distance': return sessions.reduce((s, w) => s + (w.distance || 0), 0);
    case 'elevation': return sessions.reduce((s, w) => s + (w.elevationGain || 0), 0);
  }
}

export const getMetricLabel = (metric: GoalMetric, t: (key: string) => string): string => {
  switch (metric) {
    case 'sessions': return t('metric.sessions');
    case 'minutes': return t('metric.minutes');
    case 'distance': return t('metric.distance');
    case 'elevation': return t('metric.elevation');
    default: return metric;
  }
};

export function getDaysRemainingInPeriod(period: GoalPeriod | 'custom', customEnd?: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === 'custom' && customEnd) {
    const end = new Date(customEnd);
    end.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (period === 'week') {
    const day = now.getDay();
    return day === 0 ? 0 : 7 - day;
  }

  if (period === 'month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }

  // year
  const lastDay = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPeriodFractionElapsed(period: GoalPeriod | 'custom', customStart?: string, customEnd?: string): number {
  const now = new Date();

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart).getTime();
    const end = new Date(customEnd).getTime();
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  }

  if (period === 'week') {
    const day = now.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    return (daysSinceMonday + now.getHours() / 24) / 7;
  }

  if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (now.getDate() - 1 + now.getHours() / 24) / daysInMonth;
  }

  // year
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return (now.getTime() - start) / (end - start);
}

export interface GoalHistoryPeriod {
  label: string;
  start: Date;
  end: Date;
  progress: number;
  target: number;
  achieved: boolean;
}

export function calculateGoalHistory(
  goal: ExtraGoal,
  sessions: WorkoutSession[],
  t?: (key: string, params?: any) => string
): GoalHistoryPeriod[] {
  if (!goal.createdAt) return [];
  
  const history: GoalHistoryPeriod[] = [];
  const startDate = new Date(goal.createdAt);
  const now = new Date();
  
  // Normalize startDate and now based on period
  if (goal.period === 'week') {
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    startDate.setHours(0, 0, 0, 0);
  } else if (goal.period === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  } else if (goal.period === 'year') {
    startDate.setMonth(0, 1);
    startDate.setHours(0, 0, 0, 0);
  } else {
    return []; // Custom goals don't have repeating history in this logic
  }

  let currentStart = new Date(startDate);
  
  while (true) {
    let currentEnd = new Date(currentStart);
    let label = "";
    
    if (goal.period === 'week') {
      currentEnd.setDate(currentStart.getDate() + 6);
      currentEnd.setHours(23, 59, 59, 999);
      
      // ISO Week number
      const d = new Date(currentStart);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      label = t ? t('goalForm.week') + ` ${weekNum}` : `Uke ${weekNum}`;
    } else if (goal.period === 'month') {
      currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);
      currentEnd.setHours(23, 59, 59, 999);
      label = t ? `${t(`month.${currentStart.getMonth()}`)} ${currentStart.getFullYear()}` : `${currentStart.toLocaleString('no-NO', { month: 'long' })} ${currentStart.getFullYear()}`;
    } else if (goal.period === 'year') {
      currentEnd = new Date(currentStart.getFullYear(), 11, 31);
      currentEnd.setHours(23, 59, 59, 999);
      label = `${currentStart.getFullYear()}`;
    }

    // If current period started after "now", we stop (we only want finished/past periods)
    // Wait, the user said "fram til inneværende periode (eksklusiv)"
    if (currentStart.getTime() >= now.getTime()) break;
    
    // Check if this period is actually the current one
    if (now >= currentStart && now <= currentEnd) break;

    // Calculate progress for this specific slice
    const periodSessions = sessions.filter(s => {
      const d = new Date(s.date);
      const inDate = d >= currentStart && d <= currentEnd;
      if (!inDate) return false;
      
      if (goal.activityType === 'all') return true;
      if (goal.activityType.includes(',')) {
        const types = goal.activityType.split(',').map(t => t.toLowerCase());
        return s.type && types.includes(s.type.toLowerCase());
      }
      return s.type && s.type.toLowerCase() === goal.activityType.toLowerCase();
    });

    const progress = computeProgress(periodSessions, goal.metric);
    const achieved = progress >= goal.target;

    history.push({
      label,
      start: new Date(currentStart),
      end: new Date(currentEnd),
      progress,
      target: goal.target,
      achieved
    });

    // Advance to next period
    if (goal.period === 'week') {
      currentStart.setDate(currentStart.getDate() + 7);
    } else if (goal.period === 'month') {
      currentStart.setMonth(currentStart.getMonth() + 1);
    } else if (goal.period === 'year') {
      currentStart.setFullYear(currentStart.getFullYear() + 1);
    }
  }

  return history.reverse(); // Newest first
}

export function getDaysBehind(
  period: GoalPeriod | 'custom', 
  progressVal: number, 
  targetVal: number, 
  customStart?: string, 
  customEnd?: string
): number {
  const fractionElapsed = getPeriodFractionElapsed(period, customStart, customEnd);
  const targetToday = targetVal * fractionElapsed;
  
  if (progressVal >= targetToday) return 0;
  
  // Calculate total days in period
  let totalDays = 1;
  const now = new Date();
  if (period === 'week') {
    totalDays = 7;
  } else if (period === 'month') {
    totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  } else if (period === 'year') {
    totalDays = 365;
  } else if (customStart && customEnd) {
    const start = new Date(customStart).getTime();
    const end = new Date(customEnd).getTime();
    totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
  }
  
  const dailyRate = targetVal / totalDays;
  if (dailyRate <= 0) return 0;
  
  const deficit = targetToday - progressVal;
  return deficit / dailyRate;
}