import { SessionType } from '@/types/workout';

/**
 * Central activity mapping module for display-only localization.
 * Exposes the 14 canonical Norwegian workout enum values unchanged
 * for all backend/service use and localized display labels for UI.
 */

export const CANONICAL_ACTIVITIES: SessionType[] = [
  'styrke',
  'løping',
  'fjelltur',
  'svømming',
  'sykling',
  'gå',
  'tennis',
  'yoga',
  'fotball',
  'trappemaskin',
  'roing',
  'kajakk',
  'tredemølle',
  'annet'
];

/**
 * Maps internal canonical keys to translation keys
 */
export const activityTypeTranslationMap: Record<SessionType, string> = {
  styrke: 'activity.styrke',
  løping: 'activity.løping',
  fjelltur: 'activity.fjelltur',
  svømming: 'activity.svømming',
  sykling: 'activity.sykling',
  gå: 'activity.gå',
  tennis: 'activity.tennis',
  yoga: 'activity.yoga',
  fotball: 'activity.fotball',
  trappemaskin: 'activity.trappemaskin',
  roing: 'activity.roing',
  kajakk: 'activity.kajakk',
  tredemølle: 'activity.tredemølle',
  annet: 'activity.annet',
};

/**
 * Maps Strava activity types to internal canonical keys
 */
export const stravaTypeToInternal: Record<string, SessionType> = {
  Run: 'løping',
  TrailRun: 'løping',
  VirtualRun: 'løping',
  Ride: 'sykling',
  MountainBikeRide: 'sykling',
  GravelRide: 'sykling',
  VirtualRide: 'sykling',
  EBikeRide: 'sykling',
  Hike: 'fjelltur',
  Walk: 'gå',
  Swim: 'svømming',
  WeightTraining: 'styrke',
  Workout: 'styrke',
  Yoga: 'yoga',
  Soccer: 'fotball',
  Tennis: 'tennis',
  Rowing: 'roing',
  Kayaking: 'kajakk',
  StairStepper: 'trappemaskin',
  AlpineSki: 'annet',
  BackcountrySki: 'fjelltur',
  NordicSki: 'annet',
  Snowboard: 'annet',
  Canoe: 'kajakk',
  IceSkate: 'annet',
};

/**
 * Maps Apple Health activity types to internal canonical keys
 */
export const appleHealthToInternal: Record<string, SessionType> = {
  HKWorkoutActivityTypeRunning: 'løping',
  HKWorkoutActivityTypeTrailRunning: 'løping',
  HKWorkoutActivityTypeCycling: 'sykling',
  HKWorkoutActivityTypeHiking: 'fjelltur',
  HKWorkoutActivityTypeSwimming: 'svømming',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'styrke',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'styrke',
  HKWorkoutActivityTypeYoga: 'yoga',
  HKWorkoutActivityTypeSoccer: 'fotball',
  HKWorkoutActivityTypeTennis: 'tennis',
  HKWorkoutActivityTypeRowing: 'roing',
  HKWorkoutActivityTypePaddleSports: 'kajakk',
  HKWorkoutActivityTypeStairClimbing: 'trappemaskin',
  HKWorkoutActivityTypeWalking: 'gå',
  HKWorkoutActivityTypeCrossCountrySkiing: 'annet',
  HKWorkoutActivityTypeDownhillSkiing: 'annet',
  HKWorkoutActivityTypeSnowboarding: 'annet',
  HKWorkoutActivityTypeCanoeing: 'kajakk',
  HKWorkoutActivityTypeSkatingSports: 'annet',
};

/**
 * Normalizes any source type to a canonical internal SessionType
 */
export function normalizeActivityType(
  type: string,
  source: 'strava' | 'apple_health' | 'internal' = 'internal'
): SessionType {
  if (source === 'strava') return stravaTypeToInternal[type] || 'annet';
  if (source === 'apple_health') return appleHealthToInternal[type] || 'annet';
  return CANONICAL_ACTIVITIES.includes(type as SessionType) ? (type as SessionType) : 'annet';
}

/**
 * Get display label for an activity type
 */
export function getActivityLabel(type: SessionType, t: (key: string) => string): string {
  const translationKey = activityTypeTranslationMap[type] || 'activity.annet';
  return t(translationKey);
}