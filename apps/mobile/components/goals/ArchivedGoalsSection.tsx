import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Card } from '@/components/ui/card';
import { 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X as XIcon, 
  RotateCcw, 
  Trash2, 
  Repeat,
  Compass,
  Target
} from 'lucide-react-native';
import { ExtraGoal, WorkoutSession } from '@/types/workout';
import { calculateGoalHistory, computeProgress, getGoalPeriodBoundaries } from '@/utils/goalUtils';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';
import { ActivityIcon } from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';

interface ArchivedGoalsSectionProps {
  goals: ExtraGoal[];
  sessions: WorkoutSession[];
  onDelete: (id: string) => void;
  onRestore: (goal: ExtraGoal) => void;
}

const metricLabels: Record<string, string> = {
  sessions: 'økter',
  minutes: 'timer',
  duration: 'timer',
  distance: 'km',
  elevation: 'm',
};

const categoryLabels: Record<string, string> = {
  sessions: 'Antall økter',
  minutes: 'Total tid',
  duration: 'Total tid',
  distance: 'Distanse',
  elevation: 'Høydemeter',
};

export const ArchivedGoalsSection = ({ 
  goals, 
  sessions, 
  onDelete, 
  onRestore 
}: ArchivedGoalsSectionProps) => {
  const isDark = useColorScheme() === 'dark';
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 1. Repeating active goals (folders)
  const repeatingGoals = goals.filter(g => g.repeating && !g.archived);
  
  // 2. Archived non-repeating goals
  const archivedNonRepeating = goals.filter(g => !g.repeating && g.archived);

  const renderRepeatingGoalFolder = (goal: ExtraGoal) => {
    const history = calculateGoalHistory(goal, sessions);
    if (history.length === 0) return null;

    const achievedCount = history.filter(h => h.achieved).length;
    const isExpanded = expandedGoals.has(goal.id);
    const activityTypes = goal.activityType ? goal.activityType.split(",") : ["all"];

    return (
      <VStack key={goal.id} style={{ marginBottom: 12 }}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => toggleExpand(goal.id)}
          style={flattenStyle([
            styles.folderHeader,
            { 
              backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
              borderColor: isDark ? "#374151" : "#E5E7EB",
              borderWidth: 1
            }
          ])}
        >
          <HStack style={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <HStack space="md" style={{ alignItems: 'center', flex: 1 }}>
              <View style={styles.folderIconWrapper}>
                <FolderOpen size={20} color="#10B981" />
              </View>
              
              <VStack style={{ flex: 1 }}>
                <HStack space="xs" style={{ alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontWeight: 'bold', color: isDark ? "#FFFFFF" : "#111827", fontSize: 14 }}>
                    {goal.target} {metricLabels[goal.metric] || 'økter'}
                  </Text>
                  <Repeat size={12} color="#10B981" />
                </HStack>
                
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <HStack space="none" style={{ gap: 4 }}>
                    {activityTypes.map((type, idx) => {
                      const colors = getActivityColors(type as any, isDark);
                      return (
                        <View 
                          key={idx} 
                          style={{ 
                            width: 18, 
                            height: 18, 
                            borderRadius: 9, 
                            backgroundColor: colors.bg,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {type === 'all' ? (
                            <Compass size={12} color="#10B981" />
                          ) : (
                            <ActivityIcon type={type as any} size={12} color={colors.text} />
                          )}
                        </View>
                      );
                    })}
                  </HStack>
                  <Text style={{ fontSize: 11, color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: '600' }}>
                    · {categoryLabels[goal.metric] || 'Mål'} · {achievedCount}/{history.length} klart
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <View style={{ marginLeft: 8 }}>
              {isExpanded ? <ChevronDown size={18} color="#6B7280" /> : <ChevronRight size={18} color="#6B7280" />}
            </View>
          </HStack>
        </TouchableOpacity>

        {isExpanded && (
          <VStack style={{ marginTop: 4, gap: 4 }}>
            {history.map((h, idx) => (
              <View 
                key={idx}
                style={flattenStyle([
                  styles.historyRow,
                  { 
                    backgroundColor: h.achieved 
                      ? (isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)")
                      : (isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)"),
                    borderColor: h.achieved 
                      ? (isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)")
                      : (isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"),
                    borderWidth: 1
                  }
                ])}
              >
                <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <HStack space="sm" style={{ alignItems: 'center' }}>
                    <View style={flattenStyle([
                      styles.statusCircle,
                      { backgroundColor: h.achieved ? "#10B981" : "#EF4444" }
                    ])}>
                      {h.achieved ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <XIcon size={12} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? "#FFFFFF" : "#111827" }}>
                      {h.label}
                    </Text>
                  </HStack>
                  
                  <Text style={{ fontSize: 12, color: isDark ? "#9CA3AF" : "#6B7280" }}>
                    {h.progress} / {h.target} {metricLabels[goal.metric] || 'økter'}
                  </Text>
                </HStack>
              </View>
            ))}
          </VStack>
        )}
      </VStack>
    );
  };

  const renderArchivedGoal = (goal: ExtraGoal) => {
    const activityTypes = goal.activityType ? goal.activityType.split(",") : ["all"];
    
    const { start: startDate, end: endDate } = getGoalPeriodBoundaries(goal);

    const isExpired = endDate ? endDate < new Date() : false;
    
    // Calculate final status
    const periodSessions = sessions.filter(s => {
      if (!startDate || !endDate) return false;
      const d = new Date(s.date);
      const inDate = d >= startDate && d <= endDate;
      if (!inDate) return false;
      
      if (goal.activityType === 'all') return true;
      const types = goal.activityType.split(',').map(t => t.toLowerCase());
      return s.type && types.includes(s.type.toLowerCase());
    });
    
    const progress = computeProgress(periodSessions, goal.metric);
    const achieved = progress >= goal.target;

    const formatDate = (d: Date | null) => d ? d.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

    return (
      <Card 
        key={goal.id} 
        style={flattenStyle([
          styles.archivedCard,
          { 
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            borderColor: isDark ? "#374151" : "#E5E7EB",
            borderWidth: 1,
          }
        ])}
      >
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <HStack space="md" style={{ alignItems: 'center', flex: 1 }}>
            <View style={flattenStyle([
              styles.folderIconWrapper,
              { backgroundColor: achieved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
            ])}>
              <Target size={20} color={achieved ? "#10B981" : "#EF4444"} />
            </View>

            <VStack style={{ flex: 1 }}>
              <HStack space="xs" style={{ alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontWeight: 'bold', color: isDark ? "#FFFFFF" : "#111827", fontSize: 14 }}>
                  {goal.target} {metricLabels[goal.metric] || 'økter'} {categoryLabels[goal.metric] ? `(${categoryLabels[goal.metric].toLowerCase()})` : ''}
                </Text>
                <View style={flattenStyle([
                  styles.statusCircle,
                  { backgroundColor: achieved ? "#10B981" : "#EF4444", width: 14, height: 14 }
                ])}>
                  {achieved ? (
                    <Check size={10} color="#FFFFFF" strokeWidth={4} />
                  ) : (
                    <XIcon size={10} color="#FFFFFF" strokeWidth={4} />
                  )}
                </View>
              </HStack>
              
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <HStack space="none" style={{ gap: 4 }}>
                  {activityTypes.map((type, idx) => {
                    const colors = getActivityColors(type as any, isDark);
                    return (
                      <View 
                        key={idx} 
                        style={{ 
                          width: 18, 
                          height: 18, 
                          borderRadius: 9, 
                          backgroundColor: colors.bg,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {type === 'all' ? (
                          <Compass size={12} color="#10B981" />
                        ) : (
                          <ActivityIcon type={type as any} size={12} color={colors.text} />
                        )}
                      </View>
                    );
                  })}
                </HStack>
                <Text style={{ fontSize: 11, color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: '600' }}>
                  · {progress} / {goal.target} {metricLabels[goal.metric] || 'økter'}
                </Text>
              </HStack>
              <Text style={{ fontSize: 10, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 1 }}>
                {formatDate(startDate)} - {formatDate(endDate)}
              </Text>
            </VStack>
          </HStack>

          <HStack space="sm">
            {!isExpired && (
              <TouchableOpacity onPress={() => onRestore(goal)} style={flattenStyle([styles.actionBtn, { width: 'auto', paddingHorizontal: 10, gap: 4, flexDirection: 'row' }])}>
                <RotateCcw size={14} color="#10B981" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: "#10B981" }}>GJENOPPRETT</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onDelete(goal.id)} style={styles.actionBtn}>
              <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Card>
    );
  };

  return (
    <VStack style={{ marginTop: 8 }}>
      {repeatingGoals.map(renderRepeatingGoalFolder)}
      {archivedNonRepeating.map(renderArchivedGoal)}
      
      {repeatingGoals.length === 0 && archivedNonRepeating.length === 0 && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 13 }}>Ingen historikk å vise.</Text>
        </View>
      )}
    </VStack>
  );
};

const styles = StyleSheet.create({
  folderHeader: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 16,
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)' as any,
  }
});