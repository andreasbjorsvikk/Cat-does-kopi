import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Image, SafeAreaView, RefreshControl } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Plus, Moon, Sun, ChevronRight, ChevronLeft, Activity, Clock, MapPin, TrendingUp } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { workoutService } from "@/services/workoutService";
import { primaryGoalService } from "@/services/primaryGoalService";
import { goalService } from "@/services/goalService";
import { WorkoutSession, PrimaryGoalPeriod, WeeklyStats, ExtraGoal } from "@/types/workout";
import { computeMonthWheelData, computeYearWheelData, computeYearPrognosisData } from "@/utils/goalWheelData";
import useColorScheme from "@/hooks/useColorScheme";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { formatNumber } from "@/utils/locale";
import ProgressWheel from "@/components/ProgressWheel";
import Last7Days from "@/components/Last7Days";
import GoalGraph from "@/components/GoalGraph";
import { WorkoutModal } from "@/components/WorkoutModal";
import { flattenStyle } from "@/utils/flatten-style";
import { OtherGoalCard } from "@/components/goals/OtherGoalCard";

/**
 * Returns a Date object for the start of the week (Monday) at 00:00:00.000
 */
function getStartOfWeek(inputDate: Date) {
  const d = new Date(inputDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  return d;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, profile, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [periods, setPeriods] = useState<PrimaryGoalPeriod[]>([]);
  const [extraGoals, setExtraGoals] = useState<ExtraGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month'>('week');
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  const goToTrainingGoals = useCallback(() => {
    router.push({
      pathname: '/training',
      params: { tab: 'goals' }
    });
  }, [router, t]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const selectedMonth = currentMonth;
  const selectedYear = currentYear;

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    console.log("[HomeScreen] loadData start", { userId: user?.id, authLoading, userIsNull: user === null });
    try {
      console.log("[HomeScreen] fetching sessions...");
      const sessionData = await workoutService.getAll(user?.id);
      console.log("[HomeScreen] sessions fetched", sessionData.length);
      
      console.log("[HomeScreen] fetching goals...");
      const goalData = await primaryGoalService.getAll(user?.id);
      console.log("[HomeScreen] goals fetched", goalData.length);

      console.log("[HomeScreen] fetching extra goals...");
      const extraGoalData = await goalService.getAll(user?.id);

      setSessions(sessionData || []);
      setPeriods(goalData || []);
      setExtraGoals(extraGoalData || []);
      console.log("[HomeScreen] state updated");
    } catch (err) {
      console.error("[HomeScreen] Failed loading data", err);
      setError(t("syncStatus.failed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (user) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
        .then(({ data }) => {
          setIsAdmin(!!data);
        });
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      // If auth is not ready, we still want to try loading mock data after a timeout
      const timer = setTimeout(() => {
        if (loading) {
          console.log("[HomeScreen] Auth timeout - forcing loadData");
          loadData();
        }
      }, 3000);

      if (!authLoading) {
        loadData();
      }
      
      return () => clearTimeout(timer);
    }, [authLoading, loadData, loading])
  );

  const monthData = useMemo(() => 
    computeMonthWheelData(periods, sessions, selectedMonth, selectedYear, now, t("metric.sessions")),
  [periods, sessions, selectedMonth, selectedYear]);

  const yearData = useMemo(() => 
    computeYearWheelData(periods, sessions, currentYear, now, t("metric.sessions")),
  [periods, sessions, currentYear]);

  const yearPrognosisData = useMemo(() => 
    computeYearPrognosisData(sessions, currentYear, now),
  [sessions, currentYear]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentMonthNum = today.getMonth();
    const currentYearNum = today.getFullYear();
    const startOfCurrentWeek = getStartOfWeek(today);

    const filtered = sessions.filter(s => {
      // s.date is usually YYYY-MM-DD
      const d = new Date(s.date);
      // Ensure we compare midnight to midnight
      d.setHours(0, 0, 0, 0);

      if (statsPeriod === 'week') {
        return d >= startOfCurrentWeek && d <= today;
      } else {
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
      }
    });
    
    return {
      totalSessions: filtered.filter(s => !s.excludeFromCount).length,
      totalMinutes: filtered.reduce((acc, s) => acc + s.durationMinutes, 0),
      totalDistance: filtered.reduce((acc, s) => acc + (s.distance || 0), 0),
      totalElevation: filtered.reduce((acc, s) => acc + (s.elevationGain || 0), 0),
    };
  }, [sessions, statsPeriod]);

  // Extra goals filtered for home display
  const homeExtraGoals = useMemo(() => {
    return extraGoals.filter(g => g.showOnHome && !g.archived);
  }, [extraGoals]);

  const handleToggleExtraHome = useCallback(async (goal: ExtraGoal) => {
    const newVal = !goal.showOnHome;
    setExtraGoals(prev => prev.map(g => g.id === goal.id ? { ...g, showOnHome: newVal } : g));
    try {
      await goalService.update(goal.id, { showOnHome: newVal });
    } catch (err) {
      setExtraGoals(prev => prev.map(g => g.id === goal.id ? { ...g, showOnHome: !newVal } : g));
    }
  }, []);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} ${t("workout.min")}`;
    return `${h} ${t("workout.h")} ${m} ${t("workout.min")}`;
  };

  if (loading) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const theme = {
    bg: isDark ? "#09090B" : "#F4F4F5",
    card: isDark ? "#18181B" : "#FFFFFF",
    text: isDark ? "#FAFAFA" : "#09090B",
    textMuted: isDark ? "#A1A1AA" : "#71717A",
    border: isDark ? "#27272A" : "#E4E4E7",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS !== "web"}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#10B981" />
        }
      >
        {/* Hero Header */}
        <View style={styles.header}>
          {error && (
            <Card className="mb-4 p-4 border-red-500 bg-red-50">
              <VStack style={{ alignItems: 'center', gap: 8 }}>
                <Text className="text-red-600 font-bold text-center">{error}</Text>
                <TouchableOpacity 
                  onPress={() => loadData(true)}
                  style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Text className="text-white font-bold">{t("syncStatus.retry")}</Text>
                </TouchableOpacity>
              </VStack>
            </Card>
          )}
          <HStack style={styles.headerRow}>
            <HStack style={{ alignItems: 'center', gap: 12 }}>
              <Image 
                source={{ uri: profile?.avatarUrl || "https://github.com/shadcn.png" }} 
                style={styles.avatar} 
              />
              <Image 
                source={require('../../assets/images/mountains.png')} 
                style={styles.mountainIcon} 
              />
            </HStack>
            <View style={styles.chartWrapper}>
              <GoalGraph sessions={sessions} periods={periods} isDark={isDark} />
            </View>
            <TouchableOpacity 
              style={flattenStyle([styles.iconButton, { borderColor: theme.border }])}
              onPress={() => setIsWorkoutModalOpen(true)}
            >
              <Plus size={20} color={theme.text} />
            </TouchableOpacity>
          </HStack>
        </View>

        {/* Report Buttons - Only visible in admin mode */}
        {isAdmin && profile?.adminMode && (
          <HStack style={styles.reportButtons}>
            <TouchableOpacity style={flattenStyle([styles.reportBtn, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <Text style={flattenStyle([styles.reportBtnText, { color: theme.text }])}>{t("reportPrompt.viewReport")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={flattenStyle([styles.reportBtn, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <Text style={flattenStyle([styles.reportBtnText, { color: theme.text }])}>{t("reportPrompt.viewReport")}</Text>
            </TouchableOpacity>
          </HStack>
        )}

        {/* Training Goals Section */}
        <View style={styles.section}>
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>{t("home.trainingGoals").toUpperCase()}</Text>
          <Card style={flattenStyle([styles.goalsCard, { backgroundColor: theme.card, borderColor: theme.border }])}>
            <HStack style={styles.goalsRow}>
              <View style={{ flex: 1 }}>
                <ProgressWheel 
                  title={`${t("month." + selectedMonth)}${selectedYear !== currentYear ? ' ' + selectedYear : ''}`}
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit={t("metric.sessions")}
                  hasGoal={monthData.target > 0}
                  expectedFraction={monthData.expectedFraction}
                  paceDiff={monthData.diff}
                  isDark={isDark}
                  onPress={goToTrainingGoals}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ProgressWheel 
                  title={currentYear.toString()}
                  percent={yearPrognosisData.percent}
                  current={yearPrognosisData.current}
                  target={yearPrognosisData.prognosis}
                  unit={t("metric.sessions")}
                  hasGoal={true}
                  customColor={yearPrognosisData.color}
                  customPaceLabel={t("wheel.prognosisLabel", { n: yearPrognosisData.prognosis })}
                  showTodayIndicator={false}
                  isDark={isDark}
                  onPress={goToTrainingGoals}
                />
              </View>
            </HStack>
          </Card>
        </View>

        {/* Extra Goals Section - Only if any are marked for home */}
        {homeExtraGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>{t("goals.otherGoals").toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
              {homeExtraGoals.map((goal) => (
                <OtherGoalCard
                  key={goal.id}
                  goal={goal}
                  sessions={sessions}
                  onPress={() => router.push({
                    pathname: '/training',
                    params: { tab: 'goals' }
                  })}
                  onToggleHome={handleToggleExtraHome}
                  // No archive/delete on home screen for simplicity
                  onArchive={undefined}
                  onDelete={undefined}
                />
              ))}
            </View>
          </View>
        )}

        {/* Last 7 Days Section */}
        <View style={styles.section}>
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>{t("home.last7days").toUpperCase()}</Text>
          <Last7Days sessions={sessions} isDark={isDark} />
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>{t("home.statistics").toUpperCase()}</Text>
          <View style={styles.statsTabsContainer}>
            <HStack style={styles.statsTabs}>
              <TouchableOpacity 
                onPress={() => setStatsPeriod('week')}
                style={flattenStyle([styles.statsTabBtn, statsPeriod === 'week' && { borderBottomColor: theme.text }])}
              >
                <Text style={flattenStyle([styles.statsTab, { color: statsPeriod === 'week' ? theme.text : theme.textMuted }])}>
                  {t("home.thisWeek").toUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setStatsPeriod('month')}
                style={flattenStyle([styles.statsTabBtn, statsPeriod === 'month' && { borderBottomColor: theme.text }])}
              >
                <Text style={flattenStyle([styles.statsTab, { color: statsPeriod === 'month' ? theme.text : theme.textMuted }])}>
                  {t("home.thisMonth").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </HStack>
          </View>

          <View style={styles.statsGrid}>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Activity size={14} color="#6366f1" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>{t("stats.sessions").toUpperCase()}</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{stats.totalSessions}</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Clock size={14} color="#06b6d4" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>{t("stats.time").toUpperCase()}</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{formatTime(stats.totalMinutes)}</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MapPin size={14} color="#10b981" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>{t("stats.distance").toUpperCase()}</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{formatNumber(stats.totalDistance, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {t("metric.distance")}</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <TrendingUp size={14} color="#f59e0b" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>{t("stats.elevation").toUpperCase()}</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{Math.round(stats.totalElevation)} {t("metric.elevation")}</Text>
            </Card>
          </View>
        </View>

      </ScrollView>

      <WorkoutModal 
        isOpen={isWorkoutModalOpen} 
        onClose={() => setIsWorkoutModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bgLight: { backgroundColor: "#F4F4F5" },
  bgDark: { backgroundColor: "#09090B" },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  mountainIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  chartWrapper: {
    flex: 1,
    marginHorizontal: 16,
    height: 80,
    justifyContent: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  reportButtons: {
    gap: 12,
    marginBottom: 32,
  },
  reportBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  reportBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  goalsCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  goalsRow: {
    gap: 16,
  },
  statsTabsContainer: {
    marginBottom: 16,
  },
  statsTabs: {
    gap: 16,
  },
  statsTabBtn: {
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  statsTab: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  themeToggle: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  themeToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});