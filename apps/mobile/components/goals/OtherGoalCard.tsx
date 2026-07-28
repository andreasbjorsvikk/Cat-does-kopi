import React, { memo } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Compass, Home, Pencil, Archive, Trash2 } from "lucide-react-native";
import { ExtraGoal, WorkoutSession } from '@/types/workout';
import { MountainIcon, BoltIcon, ClockIcon, RouteIcon } from './GoalProgressIcon';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';
import { ActivityIcon } from '@/components/ActivityIcon';
import { 
  getSessionsInPeriod, 
  computeProgress, 
  getDaysRemainingInPeriod, 
  getPeriodFractionElapsed 
} from '@/utils/goalUtils';

interface OtherGoalCardProps {
  goal: ExtraGoal;
  sessions: WorkoutSession[];
  onPress: () => void;
  onToggleHome: (goal: ExtraGoal) => void;
  onArchive?: (goal: ExtraGoal) => void;
  onDelete?: (goal: ExtraGoal) => void;
}

const metricLabels: Record<string, string> = {
  sessions: 'økter',
  minutes: 'timer',
  duration: 'timer',
  distance: 'km',
  elevation: 'm',
};

const formatVal = (val: number, metric: string) => {
  if (metric === "elevation" || metric === "sessions") {
    return val.toFixed(0);
  }
  // If it's a clean integer, skip decimal point
  return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
};

export const OtherGoalCard = memo(({
  goal,
  sessions,
  onPress,
  onToggleHome,
  onArchive,
  onDelete
}: OtherGoalCardProps) => {
  const isDark = useColorScheme() === "dark";

  // Calculate session data for the goal's period
  const periodSessions = getSessionsInPeriod(
    sessions, 
    goal.period, 
    goal.activityType, 
    goal.customStart, 
    goal.customEnd
  );

  const progressVal = computeProgress(periodSessions, goal.metric);
  const targetVal = goal.target || 1;
  const pct = Math.min(1, progressVal / targetVal);

  const fractionElapsed = getPeriodFractionElapsed(
    goal.period, 
    goal.customStart, 
    goal.customEnd
  );

  const isReached = progressVal >= targetVal;
  const isBehind = !isReached && (progressVal < targetVal * fractionElapsed);

  // Status computation matching Norwegian app standards
  let statusText = "I rute";
  let statusColor = "#3B82F6"; // blue-500
  if (isReached) {
    statusText = "✓ Nådd!";
    statusColor = "#10B981"; // emerald-500
  } else if (isBehind) {
    statusText = "Bak skjema";
    statusColor = "#F59E0B"; // amber-500
  }

  // Identify specific progress icon type
  const isElevation = goal.metric === 'elevation';
  const isSessions = goal.metric === 'sessions';
  const isDuration = goal.metric === 'duration' || goal.metric === 'minutes';
  const isDistance = goal.metric === 'distance';

  const remaining = Math.max(0, targetVal - progressVal);
  const remainingDays = getDaysRemainingInPeriod(goal.period, goal.customEnd);

  // Parse activity types for badge row
  const activityTypes = goal.activityType ? goal.activityType.split(",") : ["all"];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={flattenStyle([
        {
          width: '48%',
          backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? "#374151" : "#E5E7EB",
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 270,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          position: 'relative'
        }
      ])}
    >
      {/* Top right action buttons (Archive / Delete) */}
      {(onArchive || onDelete) && (
        <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6, zIndex: 10 }}>
          {onArchive && (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onArchive(goal);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Archive size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onDelete(goal);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Trash2 size={12} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Graphic & Metrics Info */}
      <View style={{ width: '100%', alignItems: 'center', marginTop: 4 }}>
        {/* Progress Graphic */}
        <View style={{ height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          {isElevation && <MountainIcon progress={pct} isDark={isDark} size={56} />}
          {isSessions && <BoltIcon progress={pct} isDark={isDark} size={56} />}
          {isDuration && <ClockIcon progress={pct} isDark={isDark} size={56} />}
          {isDistance && <RouteIcon progress={pct} isDark={isDark} size={56} />}
        </View>

        {/* Activity Mini Badge Icons Row */}
        <HStack style={{ justifyContent: 'center', gap: 4, height: 20 }}>
          {activityTypes.map((type) => {
            if (type === "all") {
              return (
                <View 
                  key="all" 
                  style={{ 
                    width: 18, 
                    height: 18, 
                    borderRadius: 9, 
                    backgroundColor: isDark ? "#1F2937" : "#E5E7EB", 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#D1D5DB"
                  }}
                >
                  <Compass size={10} color="#10B981" />
                </View>
              );
            }
            return (
              <View 
                key={type} 
                style={{ 
                  width: 18, 
                  height: 18, 
                  borderRadius: 9, 
                  backgroundColor: isDark ? "#111827" : "#F3F4F6", 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderWidth: 1, 
                  borderColor: isDark ? "#374151" : "#E5E7EB" 
                }}
              >
                <ActivityIcon type={type} size={14} color={isDark ? "#10B981" : "#047857"} />
              </View>
            );
          })}
        </HStack>

        {/* Progress Values text */}
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? "#FFFFFF" : "#111827", marginTop: 8, textAlign: 'center' }}>
          {formatVal(progressVal, goal.metric)} / {formatVal(targetVal, goal.metric)}{' '}
          <Text style={{ fontSize: 11, fontWeight: 'normal', color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {metricLabels[goal.metric] || 'økter'}
          </Text>
        </Text>

        {/* Remaining value text */}
        {!isReached && remaining > 0 && (
          <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 3, textAlign: 'center' }}>
            {formatVal(remaining, goal.metric)} {metricLabels[goal.metric] || 'økter'} igjen
          </Text>
        )}

        {/* Period Text */}
        <Text style={{ fontSize: 10, color: isDark ? '#888888' : '#888888', marginTop: 3, textAlign: 'center' }}>
          {goal.period === 'week' ? 'Denne uken' : goal.period === 'month' ? 'Denne måneden' : goal.period === 'year' ? 'Dette året' : 'Tilpasset'}
        </Text>

        {/* Days left text */}
        {!isReached && remainingDays > 0 && (
          <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 1, textAlign: 'center' }}>
            {remainingDays} dager igjen
          </Text>
        )}

        {/* Status Text Indicator */}
        <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 6, color: statusColor }}>
          {statusText}
        </Text>
      </View>

      {/* Bottom Actions Row */}
      <HStack style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
        {/* Home toggle icon */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation();
            onToggleHome(goal);
          }} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: 15, 
            backgroundColor: goal.showOnHome 
              ? (isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)") 
              : (isDark ? "#374151" : "#F3F4F6"), 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: goal.showOnHome ? 1 : 0,
            borderColor: goal.showOnHome ? "#10B981" : "transparent"
          }}
        >
          <Home size={12} color={goal.showOnHome ? "#10B981" : (isDark ? "#9CA3AF" : "#6B7280")} />
        </TouchableOpacity>

        {/* Edit Pencil icon */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={onPress} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: 15, 
            backgroundColor: isDark ? "#374151" : "#F3F4F6", 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Pencil size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
        </TouchableOpacity>
      </HStack>
    </TouchableOpacity>
  );
});

OtherGoalCard.displayName = "OtherGoalCard";