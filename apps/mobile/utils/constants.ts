import type { SessionType } from '@/types/workout';

/**
 * Central constants and mappings for the app.
 * These are display-only or helper constants that don't alter DB values.
 */

export const GOAL_METRICS = ['sessions', 'minutes', 'distance', 'elevation'] as const;
export type GoalMetric = typeof GOAL_METRICS[number];

export const PRIMARY_GOAL_PERIODS = ['week', 'month', 'year'] as const;
export type PrimaryGoalPeriodType = typeof PRIMARY_GOAL_PERIODS[number];

export const EXTRA_GOAL_PERIODS = ['week', 'month', 'year', 'custom'] as const;
export type ExtraGoalPeriodType = typeof EXTRA_GOAL_PERIODS[number];

export const GOAL_PERIODS = ['week', 'month', 'year', 'custom'] as const;
export type GoalPeriod = typeof GOAL_PERIODS[number];

export const PRIVACY_LEVELS = ['me', 'friends', 'selected'] as const;
export type PrivacyLevel = typeof PRIVACY_LEVELS[number];

export const HEALTH_EVENT_TYPES = ['sickness', 'injury'] as const;
export type HealthEventType = typeof HEALTH_EVENT_TYPES[number];

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type FriendshipStatus = typeof FRIENDSHIP_STATUSES[number];

export const NOTIFICATION_TYPES = ['friend_request', 'invite', 'other'] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const PEAK_SUGGESTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type PeakSuggestionStatus = typeof PEAK_SUGGESTION_STATUSES[number];

export const APP_ROLES = ['user', 'admin', 'moderator'] as const;
export type AppRole = typeof APP_ROLES[number];

/**
 * Activity Type for goals can be 'all' or a canonical Norwegian value.
 * In some cases it can be a comma-separated list of canonical values.
 */
export type GoalActivityType = SessionType | 'all' | string;