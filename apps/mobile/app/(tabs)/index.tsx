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
import { computeMonthWheelData, computeYearWheelData } from "@/utils/goalWheelData";
import useColorScheme from "@/hooks/useColorScheme";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import ProgressWheel from "@/components/ProgressWheel";
import Last7Days from "@/components/Last7Days";
import GoalGraph from "@/components/GoalGraph";
import { WorkoutModal } from "@/components/WorkoutModal";
import { flattenStyle } from "@/utils/flatten-style";
import { OtherGoalCard } from "@/components/goals/OtherGoalCard";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Desember"
];

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, profile, loading: authLoading } = useAuth();
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
      params: { tab: 'mål' }
    });
  }, [router]);

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
      setError("Kunne ikke hente data. Sjekk tilkoblingen din.");
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
    computeMonthWheelData(periods, sessions, selectedMonth, selectedYear, now, "økter"),
  [periods, sessions, selectedMonth, selectedYear]);

  const yearData = useMemo(() => 
    computeYearWheelData(periods, sessions, currentYear, now, "økter"),
  [periods, sessions, currentYear]);

  const stats = useMemo(() => {
    const filtered = sessions.filter(s => {
      const d = new Date(s.date);
      if (statsPeriod === 'week') {
        const startOfWeek = getStartOfWeek(now);
        return d >= startOfWeek;
      } else {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
    });
    
    return {
      totalSessions: filtered.filter(s => !s.excludeFromCount).length,
      totalMinutes: filtered.reduce((acc, s) => acc + s.durationMinutes, 0),
      totalDistance: filtered.reduce((acc, s) => acc + (s.distance || 0), 0),
      totalElevation: filtered.reduce((acc, s) => acc + (s.elevationGain || 0), 0),
    };
  }, [sessions, statsPeriod, currentMonth, currentYear]);

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
    if (h === 0) return `${m} min`;
    return `${h} t ${m} min`;
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
                  <Text className="text-white font-bold">Prøv igjen</Text>
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
          <VStack style={{ marginTop: 16 }}>
            <Text style={flattenStyle([styles.welcomeLabel, { color: theme.textMuted }])}>VELKOMMEN TILBAKE</Text>
            <Heading style={flattenStyle([styles.welcomeName, { color: theme.text }])}>
              Hei, {profile?.username?.split(' ')[0] || 'Spreking'}
            </Heading>
          </VStack>
        </View>

        {/* Report Buttons - Only visible in admin mode */}
        {isAdmin && profile?.adminMode && (
          <HStack style={styles.reportButtons}>
            <TouchableOpacity style={flattenStyle([styles.reportBtn, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <Text style={flattenStyle([styles.reportBtnText, { color: theme.text }])}>Se ukesrapport</Text>
            </TouchableOpacity>
            <TouchableOpacity style={flattenStyle([styles.reportBtn, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <Text style={flattenStyle([styles.reportBtnText, { color: theme.text }])}>Se månedsrapport</Text>
            </TouchableOpacity>
          </HStack>
        )}

        {/* Training Goals Section */}
        <View style={styles.section}>
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>TRENINGSMÅL</Text>
          <Card style={flattenStyle([styles.goalsCard, { backgroundColor: theme.card, borderColor: theme.border }])}>
            <HStack style={styles.goalsRow}>
              <View style={{ flex: 1 }}>
                <ProgressWheel 
                  title={`${MONTH_NAMES[selectedMonth]}${selectedYear !== currentYear ? ' ' + selectedYear : ''}`}
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit="økter"
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
                  percent={yearData.percent}
                  current={yearData.current}
                  target={yearData.target}
                  unit="økter"
                  hasGoal={yearData.target > 0}
                  expectedFraction={yearData.expectedFraction}
                  paceDiff={yearData.diff}
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
            <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>ANDRE AKTIVE MÅL</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
              {homeExtraGoals.map((goal) => (
                <OtherGoalCard
                  key={goal.id}
                  goal={goal}
                  sessions={sessions}
                  onPress={() => router.push({
                    pathname: '/training',
                    params: { tab: 'mål' }
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
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>SISTE 7 DAGER</Text>
          <Last7Days sessions={sessions} isDark={isDark} />
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={flattenStyle([styles.sectionTitle, { color: theme.textMuted }])}>STATISTIKK</Text>
          <View style={styles.statsTabsContainer}>
            <HStack style={styles.statsTabs}>
              <TouchableOpacity 
                onPress={() => setStatsPeriod('week')}
                style={flattenStyle([styles.statsTabBtn, statsPeriod === 'week' && { borderBottomColor: theme.text }])}
              >
                <Text style={flattenStyle([styles.statsTab, { color: statsPeriod === 'week' ? theme.text : theme.textMuted }])}>
                  DENNE UKEN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setStatsPeriod('month')}
                style={flattenStyle([styles.statsTabBtn, statsPeriod === 'month' && { borderBottomColor: theme.text }])}
              >
                <Text style={flattenStyle([styles.statsTab, { color: statsPeriod === 'month' ? theme.text : theme.textMuted }])}>
                  DENNE MÅNEDEN
                </Text>
              </TouchableOpacity>
            </HStack>
          </View>

          <View style={styles.statsGrid}>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Activity size={14} color="#6366f1" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>ØKTER</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{stats.totalSessions}</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Clock size={14} color="#06b6d4" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>TID</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{formatTime(stats.totalMinutes)}</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MapPin size={14} color="#10b981" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>DISTANSE</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{stats.totalDistance.toFixed(1)} km</Text>
            </Card>
            <Card style={flattenStyle([styles.statItem, { backgroundColor: theme.card, borderColor: theme.border }])}>
              <HStack style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <TrendingUp size={14} color="#f59e0b" />
                <Text style={flattenStyle([styles.statLabel, { color: theme.textMuted, marginBottom: 0 }])}>HØYDEMETER</Text>
              </HStack>
              <Text style={flattenStyle([styles.statValue, { color: theme.text }])}>{Math.round(stats.totalElevation)} m</Text>
            </Card>
          </View>
        </View>

      </ScrollView>

      {/* Dark Mode Toggle (Match original floating moon/sun) */}
      <TouchableOpacity style={styles.themeToggle}>
        <View style={flattenStyle([styles.themeToggleBtn, { backgroundColor: theme.card, borderColor: theme.border }])}>
          {isDark ? <Sun size={20} color={theme.text} /> : <Moon size={20} color={theme.text} />}
        </View>
      </TouchableOpacity>

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