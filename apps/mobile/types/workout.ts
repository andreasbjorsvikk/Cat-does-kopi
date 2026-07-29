export type SessionType = 
  | 'styrke' 
  | 'løping' 
  | 'fjelltur' 
  | 'svømming' 
  | 'sykling' 
  | 'gå' 
  | 'tennis' 
  | 'yoga'
  | 'fotball'
  | 'trappemaskin'
  | 'roing'
  | 'kajakk'
  | 'tredemølle'
  | 'annet';

export interface WorkoutSession {
  id: string;
  type: SessionType;
  title?: string;
  date: string;
  durationMinutes: number;
  distance?: number;
  elevationGain?: number;
  notes?: string;
  userId?: string;
  averageHeartrate?: number;
  maxHeartrate?: number;
  calories?: number;
  summaryPolyline?: string;
  stravaActivityId?: number;
  sourcePrimary?: 'manual' | 'strava' | 'apple_health';
  appleHealthWorkoutId?: string;
  syncStatus?: string;
  importedAt?: string;
  sourceHistory?: Record<string, any>[];
  userModified?: boolean;
  excludeFromCount?: boolean;
}

export interface WorkoutStreams {
  heartrateData?: { time: number; value: number }[];
  altitudeData?: { distance: number; value: number }[];
  latlngData?: [number, number][];
}

export interface UserProfile {
  id: string;
  username?: string;
  avatarUrl?: string;
  sessionTypeColors?: Record<string, string>;
  privacyPeakCheckins: 'public' | 'friends' | 'private';
  privacyWorkouts: 'public' | 'friends' | 'private';
  privacyStats: 'public' | 'friends' | 'private';
  privacyGoals: 'public' | 'friends' | 'private';
  privacyChildProfile: 'public' | 'friends' | 'private';
  privacyChildCheckins: 'public' | 'friends' | 'private';
  adminMode?: boolean;
  createdAt: string;
}

export interface WeeklyStats {
  totalSessions: number;
  totalMinutes: number;
  totalDistance: number;
  totalElevation: number;
  sessionsByType: Record<SessionType, number>;
}

export type GoalMetric = 'sessions' | 'distance' | 'duration' | 'minutes' | 'elevation';
export type GoalPeriod = 'week' | 'month' | 'year' | 'custom';

export interface WorkoutGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  activityType: SessionType | 'all';
  target: number;
  createdAt: string;
}

export interface PrimaryGoalPeriod {
  id: string;
  userId: string;
  inputPeriod: GoalPeriod;
  inputTarget: number;
  validFrom: string;
  createdAt: string;
}

export interface PrimaryGoal {
  id: string;
  inputPeriod: GoalPeriod;
  inputTarget: number;
  startDate: string;
  createdAt: string;
}

export interface ExtraGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod | 'custom';
  activityType: string;
  target: number;
  customStart?: string;
  customEnd?: string;
  showOnHome?: boolean;
  repeating?: boolean;
  archived?: boolean;
  sort_order?: number;
  createdAt?: string;
}

export type HealthEventType = 'sickness' | 'injury';

export interface HealthEvent {
  id: string;
  userId: string;
  type: HealthEventType;
  dateFrom: string;
  dateTo: string;
  notes?: string;
  createdAt: string;
}