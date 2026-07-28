import { useState, useEffect, useMemo } from 'react';
import { workoutService } from '@/services/workoutService';
import { goalService } from '@/services/goalService';
import { healthEventService } from '@/services/healthEventService';
import { WorkoutSession, ExtraGoal, HealthEvent } from '@/types/workout';
import { useAuth } from '@/hooks/useAuth';

export interface CalendarData {
  sessionsByDate: Map<string, WorkoutSession[]>;
  healthEventsByDate: Map<string, HealthEvent[]>;
  goalsByDate: Map<string, ExtraGoal[]>;
  loading: boolean;
  error: string | null;
  refresh: (item?: WorkoutSession | HealthEvent) => Promise<void>;
}

export function useCalendarData(): CalendarData {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [goals, setGoals] = useState<ExtraGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (item?: WorkoutSession | HealthEvent) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Optimistic update for workouts
    if (item && 'date' in item && item.id) {
      setSessions(prev => {
        const index = prev.findIndex(s => s.id === item.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = item;
          return next;
        }
        return [item, ...prev];
      });
     return;
    }

    // Optimistic update for health events
    if (item && 'dateFrom' in item && item.id) {
      setHealthEvents(prev => {
        const index = prev.findIndex(h => h.id === item.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = item;
          return next;
        }
        return [item, ...prev];
      });
     return;
    }

    try {
      if (!item) setLoading(true);
      const [sessionsData, goalsData, healthData] = await Promise.all([
        workoutService.getAll(user.id),
        goalService.getAll(user.id),
        healthEventService.getAll(user.id)
      ]);

      // Phase 2: excludeFromCount sessions ARE shown in the calendar
      setSessions(sessionsData);
      setHealthEvents(healthData);
      // Phase 2: Goals are NOT shown in the calendar
      setGoals([]);
      setError(null);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Kunne ikke laste kalenderdata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    sessions.forEach(s => {
      // Use YYYY-MM-DD as key
      const dateKey = s.date.split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)?.push(s);
    });
    return map;
  }, [sessions]);

  const healthEventsByDate = useMemo(() => {
    const map = new Map<string, HealthEvent[]>();
    healthEvents.forEach(h => {
      // Expand health events to each day in the interval [dateFrom, dateTo]
      const start = new Date(h.dateFrom);
      // If dateTo is null, it's ongoing, so we use today's date
      const end = h.dateTo ? new Date(h.dateTo) : new Date();
      
      // Loop through each day
      let current = new Date(start);
      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)?.push(h);
        
        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [healthEvents]);

  return {
    sessionsByDate,
    healthEventsByDate,
    goalsByDate: new Map<string, ExtraGoal[]>(),
    loading,
    error,
    refresh: loadData
  };
}