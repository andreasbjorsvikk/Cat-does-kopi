import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput,
  Platform,
  Dimensions,
  PanResponder,
  Alert,
  LayoutAnimation,
  UIManager
} from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { 
  Dumbbell, 
  Plus, 
  Check, 
  Clock, 
  Compass, 
  Flame, 
  Heart,
  ChevronDown,
  ChevronUp,
  Award,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Activity,
  TrendingUp,
  Waves,
  Bike,
  Footprints,
  Target,
  Sparkles,
  Trophy,
  Folder,
  Anchor,
  Gauge,
  Trash2,
  Sun,
  Moon,
  Triangle,
  Zap,
  Repeat,
  Home,
  Calendar,
  MoreVertical
} from "lucide-react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { workoutService } from "@/services/workoutService";
import { WorkoutSession, SessionType } from "@/types/workout";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { getActivityColors } from "@/utils/activityColors";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ProgressWheel from "@/components/ProgressWheel";
import { OtherGoalCard } from "@/components/goals/OtherGoalCard";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { goalService } from "@/services/goalService";
import { primaryGoalService, convertGoalValue, getActiveGoalForDate } from "@/services/primaryGoalService";
import { WorkoutModal } from "@/components/WorkoutModal";
import { ExtraGoal, PrimaryGoalPeriod, GoalMetric, GoalPeriod } from "@/types/workout";
import { computeMonthWheelData, computeYearWheelData } from "@/utils/goalWheelData";
import { getSessionsInPeriod, computeProgress, getPeriodFractionElapsed, metricLabels, getDaysRemainingInPeriod } from "@/utils/goalUtils";
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from "@/components/ui/select";
import {
  Menu,
  MenuItem,
  MenuItemLabel,
} from "@/components/ui/menu";

// Norwegian translations for date navigation
const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Desember"
];

const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun", 
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des"
];

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutTypeColors {
  darkSelectedBg: string;
  darkSelectedText: string;
  lightSelectedBg: string;
  lightSelectedText: string;
}

// Activity type definitions matching screenshots
interface WorkoutTypeConfig {
  id: SessionType;
  label: string;
  icon: any;
  defaultColor?: string;
  colors: WorkoutTypeColors;
}

const WORKOUT_TYPES: WorkoutTypeConfig[] = [
  { id: "styrke", label: "Styrke", icon: Dumbbell, colors: { darkSelectedBg: "#374151", darkSelectedText: "#FFFFFF", lightSelectedBg: "#E5E7EB", lightSelectedText: "#374151" } },
  { id: "løping", label: "Løping", icon: Flame, colors: { darkSelectedBg: "#3B82F6", darkSelectedText: "#FFFFFF", lightSelectedBg: "#DBEAFE", lightSelectedText: "#1D4ED8" } },
  { id: "fjelltur", label: "Fjelltur", icon: Compass, colors: { darkSelectedBg: "#10B981", darkSelectedText: "#FFFFFF", lightSelectedBg: "#D1FAE5", lightSelectedText: "#065F46" } },
  { id: "svømming", label: "Svømming", icon: Waves, colors: { darkSelectedBg: "#0EA5E9", darkSelectedText: "#FFFFFF", lightSelectedBg: "#E0F2FE", lightSelectedText: "#0369A1" } },
  { id: "sykling", label: "Sykling", icon: Bike, colors: { darkSelectedBg: "#EF4444", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FEE2E2", lightSelectedText: "#B91C1C" } },
  { id: "gå", label: "Gå", icon: Footprints, colors: { darkSelectedBg: "#B45309", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FEF3C7", lightSelectedText: "#78350F" } },
  { id: "tennis", label: "Tennis", icon: Target, colors: { darkSelectedBg: "#F59E0B", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FEF3C7", lightSelectedText: "#B45309" } },
  { id: "yoga", label: "Yoga", icon: Sparkles, colors: { darkSelectedBg: "#EC4899", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FCE7F3", lightSelectedText: "#BE185D" } },
  { id: "fotball", label: "Fotball", icon: Trophy, colors: { darkSelectedBg: "#0D9488", darkSelectedText: "#FFFFFF", lightSelectedBg: "#CCFBF1", lightSelectedText: "#0F766E" } },
  { id: "trappemaskin", label: "Trappemaskin", icon: TrendingUp, colors: { darkSelectedBg: "#F97316", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FFEDD5", lightSelectedText: "#C2410C" } },
  { id: "roing", label: "Roing", icon: Anchor, colors: { darkSelectedBg: "#EAB308", darkSelectedText: "#FFFFFF", lightSelectedBg: "#FEF9C3", lightSelectedText: "#A16207" } },
  { id: "kajakk", label: "Kajakk", icon: Waves, colors: { darkSelectedBg: "#6366F1", darkSelectedText: "#FFFFFF", lightSelectedBg: "#E0E7FF", lightSelectedText: "#4338CA" } },
  { id: "tredemølle", label: "Tredemølle", icon: Activity, colors: { darkSelectedBg: "#4F46E5", darkSelectedText: "#FFFFFF", lightSelectedBg: "#EDE9FE", lightSelectedText: "#6D28D9" } },
  { id: "annet", label: "Annet", icon: Heart, colors: { darkSelectedBg: "#4B5563", darkSelectedText: "#FFFFFF", lightSelectedBg: "#F3F4F6", lightSelectedText: "#4B5563" } },
];

// Best Personal Records/Benchmarks
interface Benchmark {
  distance: number;
  label: string;
}

const RUNNING_BENCHMARKS: Benchmark[] = [
  { distance: 5.0, label: "5 km rekord" },
  { distance: 10.0, label: "10 km rekord" },
  { distance: 21.1, label: "Halvmaraton rekord" },
];

const CYCLING_BENCHMARKS: Benchmark[] = [
  { distance: 10.0, label: "10 km tempo" },
  { distance: 20.0, label: "20 km tempo" },
  { distance: 50.0, label: "50 km distanse" },
];

const PRIMARY_PERIODS_OPTIONS = ["week", "month", "year"] as const;
const EXTRA_METRICS_OPTIONS = [
  { id: "sessions", label: "Økter" },
  { id: "minutes", label: "Tid (timer)" },
  { id: "distance", label: "Distanse (km)" },
  { id: "elevation", label: "Høydemeter" }
] as const;
const EXTRA_PERIODS_OPTIONS = [
  { id: "week", label: "Uke" },
  { id: "month", label: "Måned" },
  { id: "year", label: "År" },
  { id: "custom", label: "Tilpasset" }
] as const;

// Helper to simulate and find best personal record
function estimateBestTime(sessions: WorkoutSession[], targetDistance: number) {
  const eligible = sessions.filter(s => s.distance && s.distance >= targetDistance);
  if (eligible.length === 0) return null;

  // Find the minimum pace session
  let bestSession = eligible[0];
  let bestPace = bestSession.durationMinutes / bestSession.distance!;

  eligible.forEach(s => {
    const pace = s.durationMinutes / s.distance!;
    if (pace < bestPace) {
      bestPace = pace;
      bestSession = s;
    }
  });

  const estimatedMinutes = targetDistance * bestPace;
  const h = Math.floor(estimatedMinutes / 60);
  const m = Math.floor(estimatedMinutes % 60);
  const s = Math.round((estimatedMinutes * 60) % 60);

  const timeStr = h > 0 
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;

  return {
    time: timeStr,
    date: bestSession.date,
    sessionTitle: bestSession.title || bestSession.type,
  };
}

export default function TrainingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const params = useLocalSearchParams();

  // Sessions and loading
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<"statistikk" | "mål" | "historikk" | "rekorder">("statistikk");
  const [period, setPeriod] = useState<"month" | "year" | "total">("year");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);

  // History tab state
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [historyFilter, setHistoryFilter] = useState<SessionType | "alle">("alle");
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const historyYearOptions = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (sessions && sessions.length > 0) {
      sessions.forEach(s => years.add(new Date(s.date).getFullYear()));
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [sessions]);

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Mål tab custom state
  const [primaryPeriods, setPrimaryPeriods] = useState<PrimaryGoalPeriod[]>([]);
  const [extraGoals, setExtraGoals] = useState<ExtraGoal[]>([]);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth());
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [primaryOpen, setPrimaryOpen] = useState(true);
  const [extraOpen, setExtraOpen] = useState(true);
  const [tidligereOpen, setTidligereOpen] = useState(false);
  const [activeGoalSubTab, setActiveGoalSubTab] = useState<"generelt" | "andre">("generelt");

  // Modals state
  const [showPrimaryModal, setShowPrimaryModal] = useState(false);
  const [primaryInputTarget, setPrimaryInputTarget] = useState("");
  const [primaryInputPeriod, setPrimaryInputPeriod] = useState<GoalPeriod>("week");
  const [primaryStartDate, setPrimaryStartDate] = useState("");
  const [editingPrimaryPeriodId, setEditingPrimaryPeriodId] = useState<string | null>(null);

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraMetric, setExtraMetric] = useState<GoalMetric>("sessions");
  const [extraPeriod, setExtraPeriod] = useState<GoalPeriod | "custom">("month");
  const [extraActivityType, setExtraActivityType] = useState<string>("all");
  const [extraTarget, setExtraTarget] = useState("");
  const [extraCustomStart, setExtraCustomStart] = useState("");
  const [extraCustomEnd, setExtraCustomEnd] = useState("");
  const [editingExtraGoalId, setEditingExtraGoalId] = useState<string | null>(null);

  // Calendar Picker State
  const [calendarPicker, setCalendarPicker] = useState<{
    targetField: "primaryStart" | "extraStart" | "extraEnd";
    currentVal: string;
  } | null>(null);
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());

  // Extra goals active multi-select badges
  const [extraActivityTypes, setExtraActivityTypes] = useState<string[]>(["all"]);

  // Days in month list builder
  const getDaysInMonthList = useCallback((year: number, month: number) => {
    const days = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Monday=1 ... Sunday=7 layout
    const normalizedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = 0; i < normalizedFirstDay; i++) {
      days.push(null);
    }
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, []);

  // Format YYYY-MM-DD to "1. apr. 2026"
  const formatDisplayDate = useCallback((str: string) => {
    if (!str) return "Velg dato";
    const parts = str.split("-");
    if (parts.length !== 3) return str;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return `${date.getDate()}. ${MONTH_LABELS_SHORT[date.getMonth()].toLowerCase()}. ${date.getFullYear()}`;
  }, []);

  // Open Calendar Picker helper
  const openCalendarPicker = useCallback((targetField: "primaryStart" | "extraStart" | "extraEnd", currentVal: string) => {
    let d = new Date();
    if (currentVal) {
      const parts = currentVal.split("-");
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    setPickerMonth(d.getMonth());
    setPickerYear(d.getFullYear());
    setCalendarPicker({ targetField, currentVal });
  }, []);

  // Workout multi-select type filters state (Default is select all)
  const [selectedTypes, setSelectedTypes] = useState<SessionType[]>(WORKOUT_TYPES.map(t => t.id));

  // Chart UI state
  const [chartMetric, setChartMetric] = useState<"minutes" | "sessions" | "distance" | "elevation" | "steps">("minutes");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  // Ref for main ScrollView to reset scroll position on tab change
  const scrollRef = useRef<ScrollView>(null);

  // Helper to animate state transitions
  const withAnimation = useCallback((fn: () => void) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    fn();
  }, []);

  // Reset scroll position when sub-tab changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeSubTab]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  // Form states for log workout
  const [submitting, setSubmitting] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workoutService.getAll(user?.id);
      setSessions(data);
      const [periodsData, goalsData] = await Promise.all([
        primaryGoalService.getAll(user?.id),
        goalService.getAll(user?.id),
      ]);
      setPrimaryPeriods(periodsData);
      setExtraGoals(goalsData);
    } catch (err) {
      console.error("Error loading data in TrainingScreen:", err);
      setError("Kunne ikke hente treningsdata eller mål.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();

      if (params.tab === 'mål') {
        setActiveSubTab('mål');
      }
    }, [loadAllData])
  );

  // Theme styles classes helper
  const themeClasses = {
    bg: isDark ? "bg-background-0" : "bg-background-0",
    text: isDark ? "text-typography-950" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-50 border-outline-100" : "bg-background-0 border-outline-100",
    inputBg: isDark ? "bg-background-100 border-outline-200" : "bg-background-0 border-outline-200",
  };

  const dynamicCardStyle = {
    backgroundColor: isDark ? "#111827" : "#FFFFFF",
    borderColor: isDark ? "#1F2937" : "#E5E7EB",
    borderWidth: 1,
  };

  // Get specific activity colors dynamically
  const getActivityColorSet = useCallback((type: SessionType) => {
    return getActivityColors(type, isDark);
  }, [isDark]);

  // Format duration utility
  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs} t ${mins} min`;
    }
    return `${mins} min`;
  };

  // Handle Delete workout session
  const handleDeleteWorkout = async (id: string) => {
    Alert.alert(
      "Slett økt",
      "Er du sikker på at du vil slette denne økten?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Slett", 
          style: "destructive",
          onPress: async () => {
            try {
              await workoutService.delete(id);
              setSessions(prev => prev.filter(s => s.id !== id));
            } catch (err) {
              console.warn("Could not delete workout:", err);
            }
          }
        }
      ]
    );
  };

  // Handle Save/Update Primary Goal Period
  const handleSavePrimaryGoal = async () => {
    const userId = user?.id || "guest-user";
    const targetNum = parseFloat(primaryInputTarget);
    if (isNaN(targetNum) || targetNum <= 0) {
      alert("Vennligst oppgi et gyldig måltall");
      return;
    }
    if (!primaryStartDate) {
      alert("Vennligst oppgi en startdato");
      return;
    }
    try {
      setSubmitting(true);
      if (editingPrimaryPeriodId) {
        await primaryGoalService.update(editingPrimaryPeriodId, {
          inputPeriod: primaryInputPeriod,
          inputTarget: targetNum,
          validFrom: primaryStartDate
        });
      } else {
        await primaryGoalService.add(userId, {
          inputPeriod: primaryInputPeriod,
          inputTarget: targetNum,
          validFrom: primaryStartDate
        });
      }
      await loadAllData();
      setShowPrimaryModal(false);
    } catch (err) {
      console.warn("Could not save primary goal:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Primary Goal Period
  const handleDeletePrimaryGoal = async (id: string) => {
    Alert.alert(
      "Slett mål",
      "Er du sikker på at du vil slette dette målet?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Slett", 
          style: "destructive",
          onPress: async () => {
            try {
              await primaryGoalService.delete(id);
              await loadAllData();
            } catch (err) {
              console.warn("Could not delete primary goal period:", err);
            }
          }
        }
      ]
    );
  };

  // Handle Save/Update Extra Goal
  const handleSaveExtraGoal = async () => {
    const userId = user?.id || "guest-user";
    const targetNum = parseFloat(extraTarget);
    if (isNaN(targetNum) || targetNum <= 0) {
      alert("Vennligst oppgi et gyldig måltall");
      return;
    }
    if (!extraCustomStart) {
      alert("Vennligst oppgi startdato (Gjeldende fra)");
      return;
    }
    if (extraPeriod === 'custom' && !extraCustomEnd) {
      alert("Vennligst oppgi sluttdato for tilpasset periode");
      return;
    }
    try {
      setSubmitting(true);
      const activityTypeStr = extraActivityTypes.join(",");
      const data = {
        metric: extraMetric,
        period: extraPeriod,
        activityType: activityTypeStr,
        target: targetNum,
        customStart: extraCustomStart,
        customEnd: extraPeriod === 'custom' ? extraCustomEnd : undefined,
        showOnHome: true,
        repeating: extraPeriod !== 'custom',
        archived: false
      };

      if (editingExtraGoalId) {
        await goalService.update(editingExtraGoalId, data);
      } else {
        await goalService.add(userId, data);
      }
      await loadAllData();
      setShowExtraModal(false);
    } catch (err) {
      console.warn("Could not save extra goal:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleExtraActivityType = (typeId: string) => {
    if (typeId === "all") {
      setExtraActivityTypes(["all"]);
    } else {
      setExtraActivityTypes(prev => {
        if (prev.includes("all")) {
          return [typeId];
        }
        if (prev.includes(typeId)) {
          const updated = prev.filter(t => t !== typeId);
          return updated.length === 0 ? ["all"] : updated;
        }
        return [...prev, typeId];
      });
    }
  };

  // Handle Delete Extra Goal
  const handleDeleteExtraGoal = async (id: string) => {
    Alert.alert(
      "Slett mål",
      "Er du sikker på at du vil slette dette målet?",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Slett", 
          style: "destructive",
          onPress: async () => {
            try {
              await goalService.delete(id);
              await loadAllData();
            } catch (err) {
              console.warn("Could not delete extra goal:", err);
            }
          }
        }
      ]
    );
  };

  // Handle Archive Extra Goal
  const handleArchiveExtraGoal = async (id: string) => {
    try {
      await goalService.update(id, { archived: true });
      await loadAllData();
    } catch (err) {
      console.warn("Could not archive extra goal:", err);
    }
  };

  // Handle Unarchive Extra Goal
  const handleUnarchiveExtraGoal = async (id: string) => {
    try {
      await goalService.update(id, { archived: false });
      await loadAllData();
    } catch (err) {
      console.warn("Could not unarchive extra goal:", err);
    }
  };

  // Handle Toggle Show On Home Status
  const handleToggleShowOnHome = useCallback(async (goal: ExtraGoal) => {
    const originalValue = goal.showOnHome;
    const newValue = !originalValue;

    // Optimistic local state update
    setExtraGoals(prev => prev.map(g => g.id === goal.id ? { ...g, showOnHome: newValue } : g));

    try {
      await goalService.update(goal.id, { showOnHome: newValue });
    } catch (err) {
      // Revert on error
      setExtraGoals(prev => prev.map(g => g.id === goal.id ? { ...g, showOnHome: originalValue } : g));
      console.warn("Could not toggle show on home status:", err);
    }
  }, []);

  // Month navigation handlers for goals subtab
  const handlePrevGoalMonth = useCallback(() => {
    setTargetMonth(prev => {
      if (prev === 0) {
        setTargetYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextGoalMonth = useCallback(() => {
    setTargetMonth(prev => {
      if (prev === 11) {
        setTargetYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  // Goals horizontal swipe month navigation — refined sensitivity
  const goalsPanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 0.15;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Sensitivity check for horizontal swipe
        return Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 0.15;
      },
      onPanResponderGrant: () => {
        setPageScrollEnabled(false);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        if (dx > 20) {
          handlePrevGoalMonth();
        } else if (dx < -20) {
          handleNextGoalMonth();
        }
        setPageScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setPageScrollEnabled(true);
      },
    });
  }, [handlePrevGoalMonth, handleNextGoalMonth]);

  // Toggle multi-select activity type filters
  const handleToggleTypeFilter = (type: SessionType | "alle") => {
    withAnimation(() => {
      if (type === "alle") {
        if (selectedTypes.length === WORKOUT_TYPES.length) {
          setSelectedTypes([WORKOUT_TYPES[0].id]);
        } else {
          setSelectedTypes(WORKOUT_TYPES.map(t => t.id));
        }
      } else {
        setSelectedTypes(prev => {
          if (prev.includes(type)) {
            if (prev.length === 1) return prev;
            return prev.filter(t => t !== type);
          } else {
            return [...prev, type];
          }
        });
      }
    });
  };

  const isAllTypesSelected = selectedTypes.length === WORKOUT_TYPES.length;

  const filteredHistorySessions = useMemo(() => {
    return sessions.filter(s => {
      const date = new Date(s.date);
      const matchesYear = date.getFullYear() === historyYear;
      const matchesFilter = historyFilter === "alle" || s.type === historyFilter;
      return matchesYear && matchesFilter;
    });
  }, [sessions, historyYear, historyFilter]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, WorkoutSession[]> = {};
    filteredHistorySessions.forEach(s => {
      const date = new Date(s.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(s);
    });
    return Object.keys(groups)
      .sort((a, b) => {
        const [yearA, monthA] = a.split("-").map(Number);
        const [yearB, monthB] = b.split("-").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      })
      .map(key => ({
        key,
        year: parseInt(key.split("-")[0]),
        month: parseInt(key.split("-")[1]),
        sessions: groups[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
  }, [filteredHistorySessions]);

  const activePeriodSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!selectedTypes.includes(s.type)) return false;
      const dateObj = new Date(s.date);
      if (period === "month") {
        return dateObj.getMonth() === selectedMonth && dateObj.getFullYear() === selectedYear;
      } else if (period === "year") {
        return dateObj.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [sessions, selectedTypes, period, selectedMonth, selectedYear]);

  const computedStats = useMemo(() => {
    const totalSessions = activePeriodSessions.filter(s => !s.excludeFromCount).length;
    const totalMinutes = activePeriodSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalDistance = activePeriodSessions.reduce((sum, s) => sum + (s.distance || 0), 0);
    const totalElevation = activePeriodSessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0);
    return {
      sessions: totalSessions,
      durationStr: formatMinutes(totalMinutes),
      distanceStr: `${totalDistance.toFixed(1)} km`,
      elevationStr: `${Math.round(totalElevation)} m`,
    };
  }, [activePeriodSessions]);

  const getMetricValueForBucket = useCallback((bucketSessions: WorkoutSession[], type: SessionType, metric: typeof chartMetric) => {
    const typeSessions = bucketSessions.filter(s => s.type === type);
    switch (metric) {
      case "sessions":
        return typeSessions.filter(s => !s.excludeFromCount).length;
      case "distance":
        return Math.round(typeSessions.reduce((sum, s) => sum + (s.distance || 0), 0) * 10) / 10;
      case "elevation":
        return Math.round(typeSessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0));
      case "minutes":
        return typeSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      case "steps":
        const distanceSum = typeSessions.reduce((sum, s) => sum + (s.distance || 0), 0);
        return Math.round(distanceSum * 1312 + typeSessions.length * 2500);
      default:
        return 0;
    }
  }, []);

  const chartData = useMemo(() => {
    if (period === "month") {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStrPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const daySessions = sessions.filter(s => s.date.startsWith(dateStrPrefix));
        const showLabel = day === 1 || (day - 1) % 5 === 0;
        const entry: Record<string, string | number> = { label: showLabel ? day.toString() : "" };
        let _total = 0;
        selectedTypes.forEach(type => {
          const val = getMetricValueForBucket(daySessions, type, chartMetric);
          entry[type] = val;
          _total += val;
        });
        entry._total = _total;
        return entry;
      });
    } else if (period === "year") {
      return Array.from({ length: 12 }, (_, m) => {
        const monthPrefix = `${selectedYear}-${String(m + 1).padStart(2, "0")}`;
        const monthSessions = sessions.filter(s => s.date.startsWith(monthPrefix));
        const entry: Record<string, string | number> = { label: MONTH_LABELS_SHORT[m] };
        let _total = 0;
        selectedTypes.forEach(type => {
          const val = getMetricValueForBucket(monthSessions, type, chartMetric);
          entry[type] = val;
          _total += val;
        });
        entry._total = _total;
        return entry;
      });
    } else {
      // Total years list computed dynamically from sessions or defaulting to last 5 years
      const yearsList = (() => {
        if (sessions.length === 0) {
          const currentYear = new Date().getFullYear();
          return Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
        }
        const years = sessions.map(s => new Date(s.date).getFullYear());
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const list: number[] = [];
        for (let y = minYear; y <= maxYear; y++) {
          list.push(y);
        }
        if (list.length < 5) {
          while (list.length < 5) {
            list.unshift(list[0] - 1);
          }
        }
        return list;
      })();

      return yearsList.map(y => {
        const yearSessions = sessions.filter(s => y === new Date(s.date).getFullYear());
        const entry: Record<string, string | number> = { label: y.toString() };
        let _total = 0;
        selectedTypes.forEach(type => {
          const val = getMetricValueForBucket(yearSessions, type, chartMetric);
          entry[type] = val;
          _total += val;
        });
        entry._total = _total;
        return entry;
      });
    }
  }, [sessions, selectedTypes, period, selectedMonth, selectedYear, chartMetric, getMetricValueForBucket]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => Number(d._total || 0)), 0);
    return max === 0 ? 10 : max;
  }, [chartData]);

  const yAxisGridLines = useMemo(() => {
    const step = maxChartValue / 4;
    return [maxChartValue, step * 3, step * 2, step, 0];
  }, [maxChartValue]);

  const formatYValue = (val: number) => {
    if (chartMetric === "minutes") {
      return `${(val / 60).toFixed(1)} t`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return val.toFixed(0);
  };

  const handlePrevDate = useCallback(() => withAnimation(() => {
    if (period === "month") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else if (period === "year") {
      setSelectedYear(prev => prev - 1);
    }
  }), [period, selectedMonth, withAnimation]);

  const handleNextDate = useCallback(() => withAnimation(() => {
    if (period === "month") {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    } else if (period === "year") {
      setSelectedYear(prev => prev + 1);
    }
  }), [period, selectedMonth, withAnimation]);

  // Responsive bar width and spacing calculator
  const { barWidth, barGap, isScrollEnabled, lineChartWidth } = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const cardMargin = 16;
    const cardPadding = 16;
    const yAxisWidth = 40;
    const rightPadding = 10;
    const usable = screenWidth - (cardMargin * 2) - (cardPadding * 2) - yAxisWidth - rightPadding;

    const N = chartData.length;
    if (period === "month") {
      const gap = 2;
      const totalGapWidth = gap * (N - 1);
      const width = (usable - totalGapWidth) / N;
      return { barWidth: Math.max(3, width), barGap: gap, isScrollEnabled: false, lineChartWidth: usable };
    } else if (period === "year") {
      const gap = 6;
      const totalGapWidth = gap * (N - 1);
      const width = (usable - totalGapWidth) / N;
      return { barWidth: Math.max(10, width), barGap: gap, isScrollEnabled: false, lineChartWidth: usable };
    } else {
      // "total" view (years)
      if (N <= 8) {
        const gap = 12;
        const totalGapWidth = gap * (N - 1);
        const width = (usable - totalGapWidth) / N;
        return { barWidth: Math.max(15, width), barGap: gap, isScrollEnabled: false, lineChartWidth: usable };
      } else {
        const fixedWidth = 24;
        const fixedGap = 12;
        return { barWidth: fixedWidth, barGap: fixedGap, isScrollEnabled: true, lineChartWidth: N * (fixedWidth + fixedGap) };
      }
    }
  }, [chartData, period]);

  // Horizontal swipe gestures on the chart to change dates
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (isScrollEnabled) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isScrollEnabled) return false;
        const { dx, dy } = gestureState;
        // Dominant horizontal swipe check with meeting threshold
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        // Lock page vertical scrolling once swipe is recognized
        setPageScrollEnabled(false);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        if (dx > 30) {
          handlePrevDate();
        } else if (dx < -30) {
          handleNextDate();
        }
        setPageScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setPageScrollEnabled(true);
      },
    });
  }, [handlePrevDate, handleNextDate, isScrollEnabled]);

  const runningRecords = useMemo(() => {
    const runSessions = sessions.filter(s => s.type === "løping");
    return RUNNING_BENCHMARKS.map(b => {
      const record = estimateBestTime(runSessions, b.distance);
      return { label: b.label, record };
    });
  }, [sessions]);

  const cyclingRecords = useMemo(() => {
    const cycleSessions = sessions.filter(s => s.type === "sykling");
    return CYCLING_BENCHMARKS.map(b => {
      const record = estimateBestTime(cycleSessions, b.distance);
      return { label: b.label, record };
    });
  }, [sessions]);

  const getWorkoutIconComponent = (type: SessionType) => {
    const match = WORKOUT_TYPES.find(t => t.id === type);
    return match ? match.icon : Heart;
  };

  if (loading) {
    return (
      <View style={flattenStyle([styles.centered, isDark ? styles.bgDark : styles.bgLight])}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])}>
      
      {/* Page Header Area */}
      <View style={flattenStyle([styles.pageHeader, { borderBottomColor: isDark ? "#1F2937" : "#E5E7EB" }])}>
        <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
          <HStack style={{ alignItems: "center", gap: 10 }}>
            <View style={styles.headerIconWrapper}>
              <Dumbbell size={20} color="#10B981" />
            </View>
            <VStack>
              <Heading className={`text-2xl font-bold ${themeClasses.text}`}>Trening</Heading>
            </VStack>
          </HStack>
          
          {/* Expandable Mini Log Button in Header */}
          <TouchableOpacity 
            style={styles.headerLogBtn}
            onPress={() => {
              setActiveSubTab("historikk");
              setIsWorkoutModalOpen(true);
            }}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold", marginLeft: 4 }}>Logg</Text>
          </TouchableOpacity>
        </HStack>
      </View>

      {/* Main Sub-Tabs Navigation (Statistikk, Mål, Historikk, Rekorder) */}
      <View style={flattenStyle([styles.subTabsContainer, { backgroundColor: isDark ? "#111827" : "#F3F4F6" }])}>
        {(["statistikk", "mål", "historikk", "rekorder"] as const).map((tab) => {
          const isActive = activeSubTab === tab;
          const label = tab === "statistikk" ? "Statistikk" 
                      : tab === "mål" ? "Mål" 
                      : tab === "historikk" ? "Historikk" 
                      : "Rekorder";
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveSubTab(tab)}
              style={flattenStyle([
                styles.subTabButton,
                isActive ? styles.subTabButtonActive : null,
                isActive ? { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" } : null
              ])}
              activeOpacity={0.8}
            >
              <Text 
                style={flattenStyle([
                  styles.subTabText,
                  isActive ? { color: "#10B981", fontWeight: "bold" } : { color: isDark ? "#9CA3AF" : "#6B7280" }
                ])}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable Page Body Content */}
      <ScrollView 
        ref={scrollRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={pageScrollEnabled}
      >
        {error && (
          <Card className="m-4 p-4 border-red-500 bg-red-50">
            <VStack style={{ alignItems: 'center', gap: 8 }}>
              <Text className="text-red-600 font-bold text-center">{error}</Text>
              <TouchableOpacity 
                onPress={() => loadAllData()}
                style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text className="text-white font-bold">Prøv igjen</Text>
              </TouchableOpacity>
            </VStack>
          </Card>
        )}

        {/* TAB 1: STATISTIKK */}
        {activeSubTab === "statistikk" && (
          <View style={styles.tabContent} {...panResponder.panHandlers}>
            
            {/* Period selector tabs with animation */}
            <View style={flattenStyle([styles.periodTabsWrapper, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB", marginBottom: 8 }])}>
              {(["month", "year", "total"] as const).map((p) => {
                const isActive = period === p;
                const label = p === "month" ? "Måned" : p === "year" ? "År" : "Total";
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => withAnimation(() => setPeriod(p))}
                    style={flattenStyle([
                      styles.periodTabButton,
                      isActive ? { backgroundColor: isDark ? "#111827" : "#FFFFFF" } : null
                    ])}
                  >
                    <Text 
                      style={flattenStyle([
                        styles.periodTabText,
                        isActive ? { color: isDark ? "#FFFFFF" : "#111827", fontWeight: "bold" } : { color: isDark ? "#9CA3AF" : "#6B7280" }
                      ])}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date navigation bar (chevron indicators) */}
            <HStack style={flattenStyle([styles.dateSelectorContainer, { marginBottom: 4, paddingTop: 8 }])}>
              {period !== "total" ? (
                <>
                  <TouchableOpacity onPress={handlePrevDate} style={styles.dateSelectorArrow}>
                    <ChevronLeft size={18} color={isDark ? "#FFFFFF" : "#111827"} />
                  </TouchableOpacity>
                  <Text style={flattenStyle([styles.dateSelectorLabel, { color: isDark ? "#FFFFFF" : "#111827", fontSize: 26, lineHeight: 34 }])}>
                    {period === "month" ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : selectedYear.toString()}
                  </Text>
                  <TouchableOpacity onPress={handleNextDate} style={styles.dateSelectorArrow}>
                    <ChevronRight size={18} color={isDark ? "#FFFFFF" : "#111827"} />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={flattenStyle([styles.dateSelectorLabel, { color: isDark ? "#FFFFFF" : "#111827", fontSize: 26, lineHeight: 34 }])}>
                  Total livstidsfremgang
                </Text>
              )}
            </HStack>

            {/* Metric Tiles Single Row */}
            <View style={flattenStyle([styles.gridContainer, { flexWrap: 'nowrap', marginBottom: 4 }])}>
              
              {/* ØKTER */}
              <View style={flattenStyle([styles.metricCard, dynamicCardStyle, { width: (Dimensions.get("window").width - 48) / 4 }])}>
                <VStack style={{ alignItems: "center" }}>
                  <Activity size={18} color="#10B981" style={{ marginBottom: 4 }} />
                  <Text style={styles.metricCardLabel}>ØKTER</Text>
                  <Text style={flattenStyle([styles.metricCardValue, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                    {computedStats.sessions}
                  </Text>
                </VStack>
              </View>

              {/* TOTAL TID */}
              <View style={flattenStyle([styles.metricCard, dynamicCardStyle, { width: (Dimensions.get("window").width - 48) / 4 }])}>
                <VStack style={{ alignItems: "center" }}>
                  <Clock size={18} color="#A855F7" style={{ marginBottom: 4 }} />
                  <Text style={styles.metricCardLabel}>TOTAL TID</Text>
                  <Text style={flattenStyle([styles.metricCardValue, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                    {computedStats.durationStr}
                  </Text>
                </VStack>
              </View>

              {/* DISTANSE */}
              <View style={flattenStyle([styles.metricCard, dynamicCardStyle, { width: (Dimensions.get("window").width - 48) / 4 }])}>
                <VStack style={{ alignItems: "center" }}>
                  <MapPin size={18} color="#3B82F6" style={{ marginBottom: 4 }} />
                  <Text style={styles.metricCardLabel}>DISTANSE</Text>
                  <Text style={flattenStyle([styles.metricCardValue, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                    {computedStats.distanceStr}
                  </Text>
                </VStack>
              </View>

              {/* HØYDEMETER */}
              <View style={flattenStyle([styles.metricCard, dynamicCardStyle, { width: (Dimensions.get("window").width - 48) / 4 }])}>
                <VStack style={{ alignItems: "center" }}>
                  <TrendingUp size={18} color="#F59E0B" style={{ marginBottom: 4 }} />
                  <Text style={styles.metricCardLabel}>HØYDEMETER</Text>
                  <Text style={flattenStyle([styles.metricCardValue, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                    {computedStats.elevationStr}
                  </Text>
                </VStack>
              </View>
            </View>

            {/* Workout type multi-select horizontal scroll filter list */}
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                <HStack style={{ gap: 8 }}>
                  {/* ALLE Button */}
                  <TouchableOpacity
                    onPress={() => handleToggleTypeFilter("alle")}
                    style={flattenStyle([
                      styles.filterBadge,
                      isAllTypesSelected
                        ? { backgroundColor: isDark ? "#FFFFFF" : "#111827" }
                        : { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }
                    ])}
                  >
                    <Text 
                      style={flattenStyle([
                        styles.filterBadgeText,
                        { color: isAllTypesSelected ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#9CA3AF" : "#4B5563") }
                      ])}
                    >
                      Alle
                    </Text>
                  </TouchableOpacity>

                  {/* Individual Workout Type Toggles */}
                  {WORKOUT_TYPES.map((t) => {
                    const isSelected = selectedTypes.includes(t.id);
                    const Icon = t.icon;
                    const badgeBg = isSelected
                      ? (isDark ? t.colors.darkSelectedBg : t.colors.lightSelectedBg)
                      : (isDark ? "#1F2937" : "#E5E7EB");
                    const badgeTextColor = isSelected
                      ? (isDark ? t.colors.darkSelectedText : t.colors.lightSelectedText)
                      : (isDark ? "#9CA3AF" : "#4B5563");
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => handleToggleTypeFilter(t.id)}
                        style={flattenStyle([
                          styles.filterBadge,
                          { backgroundColor: badgeBg }
                        ])}
                      >
                        <HStack style={{ alignItems: "center", gap: 4 }}>
                          <Icon size={12} color={badgeTextColor} />
                          <Text 
                            style={flattenStyle([
                              styles.filterBadgeText,
                              { color: badgeTextColor }
                            ])}
                          >
                            {t.label}
                          </Text>
                        </HStack>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              </ScrollView>
            </View>

            {/* Chart Metric Selectors (Økter, Distanse, Høydemeter, Total tid, Skritt) */}
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, flexGrow: 1, justifyContent: 'center' }}
              >
                <HStack style={{ gap: 16 }}>
                  {([
                    { id: "minutes", label: "Total tid" },
                    { id: "sessions", label: "Økter" },
                    { id: "distance", label: "Distanse" },
                    { id: "elevation", label: "Høydemeter" },
                    { id: "steps", label: "Skritt" }
                  ] as const).map((m) => {
                    const isActive = chartMetric === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => withAnimation(() => setChartMetric(m.id))}
                        style={styles.metricTextBtn}
                      >
                        <Text 
                          style={flattenStyle([
                            styles.metricTextLabel,
                            isActive 
                              ? { color: "#10B981", fontWeight: "bold" }
                              : { color: isDark ? "#9CA3AF" : "#6B7280" }
                          ])}
                        >
                          {m.label}
                        </Text>
                        {isActive && <View style={styles.metricTextUnderline} />}
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              </ScrollView>
            </View>

            {/* Interactive Graphic: Stacked Bars or Smooth Line */}
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => setTooltipIndex(null)}
              style={flattenStyle([styles.chartCard, dynamicCardStyle, { marginHorizontal: 16, marginTop: 4, padding: 16, paddingTop: 32 }])}
            >
              <View style={flattenStyle([styles.chartContainer, { height: 260 }])}>
                
                {/* Absolute Y Axis and Grid Lines */}
                <View style={StyleSheet.absoluteFill}>
                  {yAxisGridLines.map((val, idx) => {
                    const topPosition = idx * 55; // Squeeze 5 grid lines evenly into 220px height
                    return (
                      <View 
                        key={idx} 
                        style={flattenStyle([
                          styles.chartGridLineRow, 
                          { top: topPosition }
                        ])}
                      >
                        <Text style={styles.chartYAxisText}>
                          {formatYValue(val)}
                        </Text>
                        <View style={flattenStyle([
                          styles.chartGridLineHorizontal,
                          { borderBottomColor: isDark ? "#1F2937" : "#E5E7EB" }
                        ])} />
                      </View>
                    );
                  })}
                </View>

                {/* Interactive Graphic: Stacked Bars or Smooth Line */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={isScrollEnabled}
                  scrollEnabled={isScrollEnabled}
                  contentContainerStyle={{ paddingLeft: 40, paddingRight: 10, height: 255, overflow: 'visible' }}
                  bounces={false}
                  overScrollMode="never"
                >
                  {/* Background press area to dismiss tooltip */}
                  <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => setTooltipIndex(null)} 
                    style={[StyleSheet.absoluteFill, { zIndex: 0 }]} 
                  />

                  {chartType === "bar" ? (
                    
                    /* STACKED BAR CHART MODE */
                    <VStack style={{ height: 255, zIndex: 1 }}>
                      {/* Graph Bars Area (aligned cleanly above y=0 baseline at exactly 150px height) */}
                      <HStack style={{ alignItems: "flex-end", height: 220, gap: barGap }}>
                        {chartData.map((bucket, bIdx) => {
                          return (
                            <TouchableOpacity 
                              key={bIdx} 
                              activeOpacity={0.8}
                              onPress={() => setTooltipIndex(tooltipIndex === bIdx ? null : bIdx)}
                              style={flattenStyle([
                                styles.chartBarColumn,
                                { 
                                  width: barWidth, 
                                  height: `${Math.min(100, (Number(bucket._total || 0) / maxChartValue) * 100)}%`,
                                }
                              ])}
                            >
                              {WORKOUT_TYPES.map((type) => {
                                const val = Number(bucket[type.id] || 0);
                                if (val === 0) return null;
                                const segmentHeightPercent = (val / Number(bucket._total)) * 100;
                                const barColor = isDark ? type.colors.darkSelectedBg : type.colors.lightSelectedBg;
                                return (
                                  <View 
                                    key={type.id} 
                                    style={{ 
                                      width: "100%", 
                                      height: `${segmentHeightPercent}%`, 
                                      backgroundColor: barColor 
                                    }} 
                                  />
                                );
                              })}
                            </TouchableOpacity>
                          );
                        })}

                        {/* Tooltip Overlay */}
                        {tooltipIndex !== null && chartData[tooltipIndex] && (
                          <TouchableOpacity 
                            activeOpacity={1}
                            onPress={() => setTooltipIndex(null)}
                            style={flattenStyle([
                              {
                                position: 'absolute',
                                bottom: 60,
                                left: Math.max(0, Math.min(lineChartWidth - 120, tooltipIndex * (barWidth + barGap) + (barWidth / 2) - 60)),
                                width: 120,
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderRadius: 8,
                                padding: 6,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                zIndex: 100,
                              }
                            ])}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDark ? '#10B981' : '#059669', marginBottom: -2, lineHeight: 14 }}>
                              {period === 'month' ? `${tooltipIndex + 1}. ${MONTH_NAMES[selectedMonth]}` : (period === 'year' ? MONTH_NAMES[tooltipIndex] : chartData[tooltipIndex].label)}
                            </Text>
                            <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827', marginBottom: 0, lineHeight: 16 }}>
                              Total: {chartMetric === 'minutes' ? formatMinutes(Number(chartData[tooltipIndex]._total)) : (chartMetric === 'distance' ? `${Number(chartData[tooltipIndex]._total).toFixed(1)} km` : chartData[tooltipIndex]._total)}
                            </Text>
                            <View style={{ gap: 0 }}>
                              {WORKOUT_TYPES.map(type => {
                                const val = Number(chartData[tooltipIndex][type.id] || 0);
                                if (val === 0) return null;
                                return (
                                  <HStack key={type.id} style={{ alignItems: 'center', justifyContent: 'space-between', height: 14 }}>
                                    <HStack style={{ alignItems: 'center', gap: 4 }}>
                                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? type.colors.darkSelectedBg : type.colors.lightSelectedBg }} />
                                      <Text style={{ fontSize: 9.5, color: isDark ? '#9CA3AF' : '#6B7280', lineHeight: 12 }}>
                                        {type.label}
                                      </Text>
                                    </HStack>
                                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FFFFFF' : '#111827', lineHeight: 12 }}>
                                      {chartMetric === 'minutes' ? formatMinutes(val) : (chartMetric === 'distance' ? `${val.toFixed(1)} km` : val)}
                                    </Text>
                                  </HStack>
                                );
                              })}
                            </View>
                          </TouchableOpacity>
                        )}
                      </HStack>

                      {/* X Axis Labels Area (placed strictly under the baseline in the 35px bottom area) */}
                      <HStack style={{ height: 25, alignItems: "center", gap: barGap }}>
                        {chartData.map((bucket, bIdx) => {
                          return (
                            <View key={bIdx} style={{ width: barWidth, alignItems: "center", justifyContent: "center" }}>
                              <Text style={styles.chartXAxisText}>{bucket.label}</Text>
                            </View>
                          );
                        })}
                      </HStack>
                    </VStack>
                  ) : (
                    
                    /* SMOOTH SVG GRADIENT LINE CHART MODE */
                    <View style={{ height: 255, width: lineChartWidth }}>
                      <Svg height={220} width="100%">
                        <Defs>
                          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                          </LinearGradient>
                        </Defs>
                        {(() => {
                          const chartHeight = 220;
                          const columnWidth = lineChartWidth / chartData.length;
                          
                          // Compute coordinate pairs
                          const coords = chartData.map((d, i) => {
                            const x = i * columnWidth + columnWidth / 2;
                            const val = Number(d._total || 0);
                            const y = chartHeight - (val / maxChartValue) * chartHeight;
                            return { x, y };
                          });

                          if (coords.length === 0) return null;

                          // Create d attribute for stroke path
                          const strokeD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                          
                          // Create d attribute for gradient area below path
                          const areaD = `${strokeD} L ${coords[coords.length - 1].x} ${chartHeight} L ${coords[0].x} ${chartHeight} Z`;

                          return (
                            <>
                              {/* Filled Gradient Area */}
                              <Path d={areaD} fill="url(#chartGradient)" />
                              
                              {/* Bold Main Stroke Line */}
                              <Path d={strokeD} fill="none" stroke="#10B981" strokeWidth={3} />
                              
                              {/* Interactive Dot Points */}
                              {coords.map((c, idx) => (
                                <Circle 
                                  key={idx} 
                                  cx={c.x} 
                                  cy={c.y} 
                                  r={4} 
                                  fill="#10B981" 
                                  stroke="#FFFFFF" 
                                  strokeWidth={1.5} 
                                />
                              ))}
                            </>
                          );
                        })()}
                      </Svg>
                      
                      {/* X Axis Labels under SVG */}
                      <HStack style={{ width: "100%", height: 25, alignItems: "center" }}>
                        {chartData.map((bucket, idx) => {
                          const columnWidth = lineChartWidth / chartData.length;
                          return (
                            <View 
                              key={idx} 
                              style={{ 
                                width: columnWidth, 
                                alignItems: "center", 
                                justifyContent: "center" 
                              }}
                            >
                              <Text style={styles.chartXAxisText}>{bucket.label}</Text>
                            </View>
                          );
                        })}
                      </HStack>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>

            {/* Floating Style Bar / Line Chart Toggles at Bottom of Stats */}
            <HStack style={styles.chartTypeToggleContainer}>
              
              {/* STOLPE (Bar) */}
              <TouchableOpacity
                onPress={() => withAnimation(() => setChartType("bar"))}
                style={flattenStyle([
                  styles.chartTypeToggleBtn,
                  chartType === "bar" 
                    ? { backgroundColor: "#10B981" } 
                    : { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }
                ])}
              >
                <HStack style={{ alignItems: "center", gap: 6 }}>
                  <Activity size={14} color={chartType === "bar" ? "#FFFFFF" : (isDark ? "#9CA3AF" : "#4B5563")} />
                  <Text 
                    style={flattenStyle([
                      styles.chartTypeToggleLabel,
                      { color: chartType === "bar" ? "#FFFFFF" : (isDark ? "#FFFFFF" : "#1F2937") }
                    ])}
                  >
                    Stolpe
                  </Text>
                </HStack>
              </TouchableOpacity>

              {/* LINJE (Line) */}
              <TouchableOpacity
                onPress={() => withAnimation(() => setChartType("line"))}
                style={flattenStyle([
                  styles.chartTypeToggleBtn,
                  chartType === "line" 
                    ? { backgroundColor: "#10B981" } 
                    : { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }
                ])}
              >
                <HStack style={{ alignItems: "center", gap: 6 }}>
                  <TrendingUp size={14} color={chartType === "line" ? "#FFFFFF" : (isDark ? "#9CA3AF" : "#4B5563")} />
                  <Text 
                    style={flattenStyle([
                      styles.chartTypeToggleLabel,
                      { color: chartType === "line" ? "#FFFFFF" : (isDark ? "#FFFFFF" : "#1F2937") }
                    ])}
                  >
                    Linje
                  </Text>
                </HStack>
              </TouchableOpacity>
            </HStack>

          </View>
        )}


        {/* TAB 2: MÅL */}
        {activeSubTab === "mål" && (
          <View style={styles.tabContent} {...goalsPanResponder.panHandlers}>
            {/* Sub-tabs for Mål: Generelt treningsmål | Andre mål */}
            <View style={flattenStyle([styles.subSubTabsContainer, { backgroundColor: isDark ? "#111827" : "#F3F4F6" }])}>
              {(["generelt", "andre"] as const).map((tab) => {
                const isActive = activeGoalSubTab === tab;
                const label = tab === "generelt" ? "Generelt treningsmål" : "Andre mål";
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveGoalSubTab(tab)}
                    style={flattenStyle([
                      styles.subSubTabButton,
                      isActive ? styles.subSubTabButtonActive : null,
                      isActive ? { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" } : null
                    ])}
                    activeOpacity={0.8}
                  >
                    <Text 
                      style={flattenStyle([
                        styles.subSubTabText,
                        isActive ? { color: "#10B981", fontWeight: "bold" } : { color: isDark ? "#9CA3AF" : "#6B7280" }
                      ])}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(() => {
              const viewedMonthEnd = new Date(targetYear, targetMonth + 1, 0);
              const viewedGoal = getActiveGoalForDate(primaryPeriods, viewedMonthEnd);
              const now = new Date();
              const monthData = computeMonthWheelData(primaryPeriods, sessions, targetMonth, targetYear, now, "økter");
              const yearData = computeYearWheelData(primaryPeriods, sessions, targetYear, now, "økter");
              return (
                <View style={{ flex: 1 }}>
                  {activeGoalSubTab === "generelt" ? (
                    <View style={{ flex: 1 }}>
                    <Card 
                      className="p-5 mx-4 mb-3" 
                      style={flattenStyle([
                        styles.cardBorderRadius, 
                        { backgroundColor: isDark ? "#111827" : "#FFFFFF", borderColor: isDark ? "#1F2937" : "#E5E7EB", borderWidth: 1 },
                        { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }
                      ])}
                    >
                      {/* Center Month Selector inside Card */}
                      <VStack style={{ alignItems: 'center', marginBottom: 16 }}>
                        <HStack style={{ alignItems: 'center', justifyContent: 'center', width: '100%', gap: 40 }}>
                          <TouchableOpacity onPress={handlePrevGoalMonth} style={{ padding: 10 }}>
                            <ChevronLeft size={20} color={isDark ? "#9CA3AF" : "#4B5563"} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? "#FFFFFF" : "#111827", minWidth: 160, textAlign: 'center', lineHeight: 32 }}>
                            {MONTH_NAMES[targetMonth]}
                          </Text>
                          <TouchableOpacity onPress={handleNextGoalMonth} style={{ padding: 10 }}>
                            <ChevronRight size={20} color={isDark ? "#9CA3AF" : "#4B5563"} />
                          </TouchableOpacity>
                        </HStack>
                        <HStack style={{ alignItems: 'center', justifyContent: 'center', width: '100%', gap: 30, marginTop: 0 }}>
                          <TouchableOpacity onPress={() => setTargetYear(y => y - 1)} style={{ padding: 6 }}>
                            <ChevronLeft size={14} color={isDark ? "#6B7280" : "#9CA3AF"} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? "#9CA3AF" : "#6B7280", minWidth: 80, textAlign: 'center', lineHeight: 24 }}>
                            {targetYear}
                          </Text>
                          <TouchableOpacity onPress={() => setTargetYear(y => y + 1)} style={{ padding: 6 }}>
                            <ChevronRight size={14} color={isDark ? "#6B7280" : "#9CA3AF"} />
                          </TouchableOpacity>
                        </HStack>
                      </VStack>

                      {/* Overlapping progress wheels side-by-side */}
                      <HStack style={{ justifyContent: 'space-around', alignItems: 'center', marginBottom: 8 }}>
                        <ProgressWheel title={MONTH_NAMES[targetMonth]} percent={monthData.percent} current={monthData.current} target={monthData.target} unit="økter" hasGoal={monthData.target > 0} expectedFraction={monthData.expectedFraction} paceDiff={monthData.diff} isDark={isDark} />
                        <ProgressWheel title={targetYear.toString()} percent={yearData.percent} current={yearData.current} target={yearData.target} unit="økter" hasGoal={yearData.target > 0} expectedFraction={yearData.expectedFraction} paceDiff={yearData.diff} isDark={isDark} />
                      </HStack>

                      {viewedGoal ? (
                        <VStack style={{ alignItems: 'center', marginTop: 0, gap: 4 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)", alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
                            <Target size={18} color="#10B981" />
                          </View>
                          <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? "#FFFFFF" : "#111827", textAlign: 'center' }}>
                            {viewedGoal.inputTarget} økter per {viewedGoal.inputPeriod === 'week' ? 'uke' : viewedGoal.inputPeriod === 'month' ? 'måned' : 'år'}
                          </Text>
                          
                          <Text style={{ fontSize: 16, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 2 }}>
                            <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                              {convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'week')}
                            </Text> /uke  ·  <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                              {convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'month')}
                            </Text> /mnd  ·  <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                              {convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'year')}
                            </Text> /år
                          </Text>

                          <Text style={{ fontSize: 15, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 2 }}>
                            {formatDisplayDate(viewedGoal.validFrom)} → pågående
                          </Text>

                          <HStack style={{ gap: 40, marginTop: 16 }}>
                            <TouchableOpacity 
                              onPress={() => {
                                setEditingPrimaryPeriodId(viewedGoal.id);
                                setPrimaryInputTarget(viewedGoal.inputTarget.toString());
                                setPrimaryInputPeriod(viewedGoal.inputPeriod);
                                setPrimaryStartDate(viewedGoal.validFrom);
                                setShowPrimaryModal(true);
                              }}
                            >
                              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>Endre</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeletePrimaryGoal(viewedGoal.id)}>
                              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>Slett</Text>
                            </TouchableOpacity>
                          </HStack>
                        </VStack>
                      ) : (
                        <VStack style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
                          <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13, textAlign: 'center' }}>Du har ikke satt noe generelt treningsmål for denne perioden.</Text>
                          <TouchableOpacity style={flattenStyle([styles.submitBtn, { backgroundColor: '#10B981', paddingHorizontal: 16, height: 36, marginTop: 4 }])} onPress={() => { setEditingPrimaryPeriodId(null); setPrimaryInputTarget("3"); setPrimaryInputPeriod("week"); setPrimaryStartDate(new Date().toISOString().slice(0, 10)); setShowPrimaryModal(true); }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>Sett treningsmål</Text>
                          </TouchableOpacity>
                        </VStack>
                      )}
                    </Card>

                      {/* 2. Collapsible Header: TIDLIGERE MÅL > */}
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 8, gap: 6 }}
                        onPress={() => setTidligereOpen(!tidligereOpen)}
                        activeOpacity={0.8}
                      >
                        <Heading style={{ fontSize: 13, fontWeight: '700', color: isDark ? "#9CA3AF" : "#6B7280", letterSpacing: 0.5 }}>
                          TIDLIGERE MÅL
                        </Heading>
                        {tidligereOpen ? <ChevronDown size={14} color={isDark ? "#9CA3AF" : "#6B7280"} /> : <ChevronRight size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />}
                      </TouchableOpacity>

                      {tidligereOpen && (
                        <VStack style={{ gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
                          {primaryPeriods.length > 1 ? (
                            primaryPeriods
                              .filter(p => p.id !== viewedGoal?.id)
                              .reverse()
                              .map(p => (
                                <Card 
                                  key={p.id} 
                                  className={`p-3 border ${themeClasses.cardBg}`} 
                                  style={styles.cardBorderRadius}
                                >
                                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <VStack>
                                      <Text style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827', fontSize: 13 }}>
                                        {p.inputTarget} økter per {p.inputPeriod === 'week' ? 'uke' : p.inputPeriod === 'month' ? 'måned' : 'år'}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                        Gjeldende fra: {formatDisplayDate(p.validFrom)}
                                      </Text>
                                    </VStack>
                                    <HStack style={{ gap: 12 }}>
                                      <TouchableOpacity 
                                        onPress={() => {
                                          setEditingPrimaryPeriodId(p.id);
                                          setPrimaryInputTarget(p.inputTarget.toString());
                                          setPrimaryInputPeriod(p.inputPeriod);
                                          setPrimaryStartDate(p.validFrom);
                                          setShowPrimaryModal(true);
                                        }}
                                      >
                                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>Endre</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => handleDeletePrimaryGoal(p.id)}>
                                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Slett</Text>
                                      </TouchableOpacity>
                                    </HStack>
                                  </HStack>
                                </Card>
                              ))
                          ) : (
                            <Card className={`p-4 border border-dashed ${themeClasses.cardBg}`} style={flattenStyle([styles.cardBorderRadius, { alignItems: 'center' }])}>
                              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, textAlign: 'center' }}>Ingen tidligere mål funnet.</Text>
                            </Card>
                          )}
                        </VStack>
                      )}
                    </View>
                  ) : (
                    <View style={{ flex: 1, paddingHorizontal: 16, marginTop: 12 }}>
                      <View style={{ marginBottom: 20 }}>
                        {/* + Legg til annet mål Button */}
                        <TouchableOpacity 
                          style={flattenStyle([
                            styles.addOtherGoalBtn, 
                            {
                              backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                              borderColor: isDark ? "#374151" : "#E5E7EB",
                              borderWidth: 1,
                              borderRadius: 16,
                              paddingVertical: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 16,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1
                            }
                          ])} 
                          onPress={() => {
                            setEditingExtraGoalId(null);
                            setExtraMetric("sessions");
                            setExtraPeriod("month");
                            setExtraActivityTypes(["all"]);
                            setExtraTarget("10");
                            setExtraCustomStart(new Date().toISOString().slice(0, 10));
                            setExtraCustomEnd("");
                            setShowExtraModal(true);
                          }}
                        >
                          <HStack style={{ alignItems: 'center', gap: 8 }}>
                            <Plus size={16} color="#10B981" />
                            <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: 'bold', fontSize: 13 }}>
                              Legg til annet mål
                            </Text>
                          </HStack>
                        </TouchableOpacity>

                        {extraGoals.filter(g => !g.archived).length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 12 }}>
                            {extraGoals.filter(g => !g.archived).map(goal => (
                              <OtherGoalCard
                                key={goal.id}
                                goal={goal}
                                sessions={sessions}
                                onPress={() => {
                                  setEditingExtraGoalId(goal.id);
                                  setExtraMetric(goal.metric);
                                  setExtraPeriod(goal.period);
                                  setExtraActivityTypes(goal.activityType ? goal.activityType.split(",") : ["all"]);
                                  setExtraTarget(goal.target.toString());
                                  setExtraCustomStart(goal.customStart || new Date().toISOString().slice(0, 10));
                                  setExtraCustomEnd(goal.customEnd || "");
                                  setShowExtraModal(true);
                                }}
                                onToggleHome={handleToggleShowOnHome}
                                onArchive={(g) => handleArchiveExtraGoal(g.id)}
                                onDelete={(g) => handleDeleteExtraGoal(g.id)}
                              />
                            ))}
                          </View>
                        ) : (
                          <Card className={`p-4 border border-dashed ${themeClasses.cardBg}`} style={flattenStyle([styles.cardBorderRadius, { alignItems: 'center' }])}>
                            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13, textAlign: 'center' }}>Ingen andre aktive mål.</Text>
                          </Card>
                        )}

                        {/* Archived Extra Goals Toggle */}
                        {extraGoals.some(g => g.archived) && (
                          <VStack style={{ marginTop: 24 }}>
                            <TouchableOpacity 
                              onPress={() => setArchivedOpen(!archivedOpen)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
                            >
                              <Heading style={{ fontSize: 13, fontWeight: '700', color: isDark ? "#9CA3AF" : "#6B7280", letterSpacing: 0.5 }}>
                                ARKIVERTE MÅL
                              </Heading>
                              {archivedOpen ? <ChevronDown size={14} color={isDark ? "#9CA3AF" : "#6B7280"} /> : <ChevronRight size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />}
                            </TouchableOpacity>
                            
                            {archivedOpen && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
                                {extraGoals.filter(g => g.archived).map((goal) => (
                                  <OtherGoalCard
                                    key={goal.id}
                                    goal={goal}
                                    sessions={sessions}
                                    onPress={() => {
                                      setEditingExtraGoalId(goal.id);
                                      setExtraMetric(goal.metric);
                                      setExtraPeriod(goal.period);
                                      setExtraActivityTypes(goal.activityType ? goal.activityType.split(",") : ["all"]);
                                      setExtraTarget(goal.target.toString());
                                      setExtraCustomStart(goal.customStart || new Date().toISOString().slice(0, 10));
                                      setExtraCustomEnd(goal.customEnd || "");
                                      setShowExtraModal(true);
                                    }}
                                    onToggleHome={handleToggleShowOnHome}
                                    onArchive={(g) => handleUnarchiveExtraGoal(g.id)}
                                    onDelete={(g) => handleDeleteExtraGoal(g.id)}
                                  />
                                ))}
                              </View>
                            )}
                          </VStack>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

          </View>
        )}


        {/* TAB 3: HISTORIKK */}
        {activeSubTab === "historikk" && (
          <View style={styles.tabContent}>

            {/* History Header: Year Selector & Menu */}
            <HStack style={{ justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 10 }}>
              <Select
                selectedValue={historyYear.toString()}
                onValueChange={(val) => setHistoryYear(parseInt(val))}
              >
                <SelectTrigger size="sm" variant="outline" style={flattenStyle([styles.yearSelectTrigger, { borderRadius: 10, minWidth: 100, height: 36, borderColor: isDark ? '#374151' : '#E5E7EB' }])}>
                  <SelectInput placeholder="År" value={historyYear.toString()} style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#FFFFFF' : '#374151' }} />
                  <SelectIcon style={{ marginRight: 8 }}>
                    <ChevronDown size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </SelectIcon>
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    {historyYearOptions.map(y => (
                      <SelectItem key={y} label={y.toString()} value={y.toString()} />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>

              <Menu
                trigger={(triggerProps) => (
                  <TouchableOpacity {...triggerProps} style={flattenStyle([styles.iconBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }])}>
                    <MoreVertical size={20} color={isDark ? '#FFFFFF' : '#374151'} />
                  </TouchableOpacity>
                )}
              >
                <MenuItem key="log-workout" onPress={() => setIsWorkoutModalOpen(true)}>
                  <Plus size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <MenuItemLabel size="sm">Loggfør ny treningsøkt</MenuItemLabel>
                </MenuItem>
              </Menu>
            </HStack>

            {/* Horizontal Activity Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.historyFilterContainer}
              style={{ flexGrow: 0 }}
            >
              <TouchableOpacity
                onPress={() => setHistoryFilter("alle")}
                style={flattenStyle([
                  styles.historyFilterBadge,
                  { backgroundColor: historyFilter === "alle" ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#1F2937' : '#F3F4F6') }
                ])}
              >
                <Text style={flattenStyle([
                  styles.historyFilterBadgeText,
                  { color: historyFilter === "alle" ? (isDark ? '#111827' : '#FFFFFF') : (isDark ? '#9CA3AF' : '#6B7280') }
                ])}>
                  Alle
                </Text>
              </TouchableOpacity>

              {WORKOUT_TYPES.map((type) => {
                const isSelected = historyFilter === type.id;
                const typeColors = getActivityColors(type.id, isDark);
                const Icon = type.icon;

                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setHistoryFilter(type.id)}
                    style={flattenStyle([
                      styles.historyFilterBadge,
                      isSelected 
                        ? { backgroundColor: typeColors.bg } 
                        : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
                    ])}
                  >
                    <Icon size={14} color={isSelected ? typeColors.text : (isDark ? '#9CA3AF' : '#6B7280')} />
                    <Text style={flattenStyle([
                      styles.historyFilterBadgeText,
                      { color: isSelected ? typeColors.text : (isDark ? '#9CA3AF' : '#6B7280') }
                    ])}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* List of workout history grouped by month */}
            <ScrollView showsVerticalScrollIndicator={false}>
            {groupedSessions.length > 0 ? (
              groupedSessions.map((group) => {
                const isCollapsed = collapsedMonths.has(group.key);
                return (
                  <VStack key={group.key} style={{ marginBottom: 16 }}>
                    <TouchableOpacity 
                      onPress={() => toggleMonth(group.key)}
                      activeOpacity={0.7}
                    >
                      <HStack style={styles.monthSectionHeader}>
                        <HStack style={{ alignItems: 'center' }}>
                          <View style={{ transform: [{ rotate: isCollapsed ? '-90deg' : '0deg' }] }}>
                            <ChevronDown size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                          </View>
                          <Text style={flattenStyle([styles.monthHeaderText, { color: isDark ? '#FFFFFF' : '#111827', marginLeft: 8 }])}>
                            {MONTH_NAMES[group.month]}
                          </Text>
                          <View style={flattenStyle([styles.sessionCountBadge, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }])}>
                            <Text style={flattenStyle([styles.sessionCountText, { color: isDark ? '#9CA3AF' : '#6B7280' }])}>
                              {group.sessions.length} økter
                            </Text>
                          </View>
                        </HStack>
                      </HStack>
                    </TouchableOpacity>

                    {!isCollapsed && (
                      <VStack style={{ gap: 10, paddingHorizontal: 16, marginTop: 4 }}>
                        {group.sessions.map((session) => {
                          const IconComponent = getWorkoutIconComponent(session.type);
                          const typeColorsSet = getActivityColorSet(session.type);
                          
                          const sessionDate = new Date(session.date);
                          const today = new Date();
                          const yesterday = new Date();
                          yesterday.setDate(today.getDate() - 1);
                          
                          let dateLabel = "";
                          if (sessionDate.toDateString() === today.toDateString()) {
                            dateLabel = "I dag";
                          } else if (sessionDate.toDateString() === yesterday.toDateString()) {
                            dateLabel = "I går";
                          } else {
                            dateLabel = `${sessionDate.getDate()}. ${MONTH_LABELS_SHORT[sessionDate.getMonth()].toLowerCase()}`;
                          }

                          return (
                            <Card key={session.id} className={`p-4 border ${themeClasses.cardBg}`} style={styles.sessionCard}>
                              <HStack style={styles.sessionRow}>
                                <View style={flattenStyle([styles.iconContainer, { backgroundColor: typeColorsSet.bg, borderRadius: 10, width: 40, height: 40 }])}>
                                  <IconComponent size={20} color={typeColorsSet.text} />
                                </View>
                                
                                <VStack style={{ flex: 1 }}>
                                  <Text style={flattenStyle([styles.sessionTitleText, { color: isDark ? "#FFFFFF" : "#111827", fontSize: 14 }])}>
                                    {session.title || session.type.charAt(0).toUpperCase() + session.type.slice(1)}
                                  </Text>
                                  
                                  <Text style={flattenStyle([styles.sessionDateText, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                                    {dateLabel}
                                  </Text>

                                  <HStack style={{ alignItems: "center", marginTop: 8, gap: 12 }}>
                                    <HStack style={{ alignItems: "center", gap: 4 }}>
                                      <Clock size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                      <Text style={flattenStyle([styles.sessionMetaText, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                                        {formatMinutes(session.durationMinutes)}
                                      </Text>
                                    </HStack>
                                    
                                    {session.distance && (
                                      <HStack style={{ alignItems: "center", gap: 4 }}>
                                        <MapPin size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                        <Text style={flattenStyle([styles.sessionMetaText, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                                          {session.distance} km
                                        </Text>
                                      </HStack>
                                    )}

                                    {session.elevationGain && (
                                      <HStack style={{ alignItems: "center", gap: 4 }}>
                                        <Triangle size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                        <Text style={flattenStyle([styles.sessionMetaText, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                                          {session.elevationGain} m
                                        </Text>
                                      </HStack>
                                    )}
                                  </HStack>
                                </VStack>

                                <TouchableOpacity 
                                  onPress={() => handleDeleteWorkout(session.id)}
                                  style={styles.deleteBtn}
                                >
                                  <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                              </HStack>
                            </Card>
                          );
                        })}
                      </VStack>
                    )}
                  </VStack>
                );
              })
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
                  Ingen treningsøkter funnet for dette valget.
                </Text>
              </View>
            )}
          </ScrollView>
          </View>
        )}

        {/* TAB 4: REKORDER */}
        {activeSubTab === "rekorder" && (
          <View style={styles.tabContent}>
            
            {/* Running Records Section */}
            <Heading className={`text-base font-bold mx-4 mb-3 ${themeClasses.text}`}>
              Løperekorder (Estimert)
            </Heading>
            
            <View style={styles.recordsListWrapper}>
              {runningRecords.map((r, index) => {
                return (
                  <Card 
                    key={index} 
                    className={`p-4 mx-4 mb-2 border ${themeClasses.cardBg}`} 
                    style={styles.recordCard}
                  >
                    <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                      <HStack style={{ alignItems: "center", gap: 10 }}>
                        <View style={flattenStyle([styles.trophyIconBg, r.record ? { backgroundColor: "rgba(251, 191, 36, 0.15)" } : { backgroundColor: "rgba(128,128,128,0.1)" }])}>
                          <Trophy size={18} color={r.record ? "#F59E0B" : "#9CA3AF"} />
                        </View>
                        <VStack>
                          <Text style={flattenStyle([styles.recordBenchmarkLabel, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                            {r.label}
                          </Text>
                          {r.record && (
                            <Text style={styles.recordDetailsDate}>
                              Satt {new Date(r.record.date).toLocaleDateString("no-NO", { day: "numeric", month: "short" })}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      
                      <VStack style={{ alignItems: "flex-end" }}>
                        <Text style={flattenStyle([styles.recordValueText, r.record ? { color: "#10B981" } : { color: isDark ? "#4B5563" : "#9CA3AF" }])}>
                          {r.record ? r.record.time : "– : –"}
                        </Text>
                        {r.record?.sessionTitle && (
                          <Text style={styles.recordSessionTitle} numberOfLines={1}>
                            {r.record.sessionTitle}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Card>
                );
              })}
            </View>

            {/* Cycling Records Section */}
            <Heading className={`text-base font-bold mx-4 mt-6 mb-3 ${themeClasses.text}`}>
              Sykkelrekorder (Estimert)
            </Heading>

            <View style={styles.recordsListWrapper}>
              {cyclingRecords.map((r, index) => {
                return (
                  <Card 
                    key={index} 
                    className={`p-4 mx-4 mb-2 border ${themeClasses.cardBg}`} 
                    style={styles.recordCard}
                  >
                    <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                      <HStack style={{ alignItems: "center", gap: 10 }}>
                        <View style={flattenStyle([styles.trophyIconBg, r.record ? { backgroundColor: "rgba(251, 191, 36, 0.15)" } : { backgroundColor: "rgba(128,128,128,0.1)" }])}>
                          <Trophy size={18} color={r.record ? "#F59E0B" : "#9CA3AF"} />
                        </View>
                        <VStack>
                          <Text style={flattenStyle([styles.recordBenchmarkLabel, { color: isDark ? "#FFFFFF" : "#111827" }])}>
                            {r.label}
                          </Text>
                          {r.record && (
                            <Text style={styles.recordDetailsDate}>
                              Satt {new Date(r.record.date).toLocaleDateString("no-NO", { day: "numeric", month: "short" })}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      
                      <VStack style={{ alignItems: "flex-end" }}>
                        <Text style={flattenStyle([styles.recordValueText, r.record ? { color: "#10B981" } : { color: isDark ? "#4B5563" : "#9CA3AF" }])}>
                          {r.record ? r.record.time : "– : –"}
                        </Text>
                        {r.record?.sessionTitle && (
                          <Text style={styles.recordSessionTitle} numberOfLines={1}>
                            {r.record.sessionTitle}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Card>
                );
              })}
            </View>

          </View>
        )}

      </ScrollView>

      <WorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        onSuccess={() => loadAllData()}
      />

      {/* Primary Goal Modal */}
      <Modal isOpen={showPrimaryModal} onClose={() => setShowPrimaryModal(false)} useRNModal={false} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading className={`text-lg font-semibold ${themeClasses.text}`}>
              {editingPrimaryPeriodId ? "Endre treningsmål" : "Nytt treningsmål"}
            </Heading>
          </ModalHeader>
          <ModalBody className="mt-3 mb-4">
            <VStack style={{ gap: 12 }}>
              <VStack style={{ gap: 4 }}>
                <Text className={`font-semibold text-xs ${themeClasses.text}`}>Målantall økter</Text>
                <TextInput
                  placeholder="F.eks. 3"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  style={flattenStyle([styles.inputField, isDark ? styles.inputDark : styles.inputLight])}
                  value={primaryInputTarget}
                  onChangeText={setPrimaryInputTarget}
                />
              </VStack>
              <VStack style={{ gap: 4 }}>
                <Text className={`font-semibold text-xs ${themeClasses.text}`}>Tidsperiode</Text>
                <HStack style={{ gap: 6 }}>
                  {PRIMARY_PERIODS_OPTIONS.map((periodType) => (
                    <TouchableOpacity
                      key={periodType}
                      style={flattenStyle([
                        styles.typeBadge,
                        primaryInputPeriod === periodType
                          ? { backgroundColor: "#10B981" }
                          : { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" },
                        { flex: 1, alignItems: 'center' }
                      ])}
                      onPress={() => setPrimaryInputPeriod(periodType)}
                    >
                      <Text style={flattenStyle([styles.typeBadgeText, primaryInputPeriod === periodType && { color: "#FFFFFF" }])}>
                        {periodType === 'week' ? 'Uke' : periodType === 'month' ? 'Måned' : 'År'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>
              <VStack style={{ gap: 4 }}>
                <Text className={`font-semibold text-xs ${themeClasses.text}`}>Gjeldende fra</Text>
                <TouchableOpacity 
                  style={flattenStyle([styles.inputField, isDark ? styles.inputDark : styles.inputLight, { justifyContent: 'center' }])}
                  onPress={() => openCalendarPicker("primaryStart", primaryStartDate)}
                >
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: primaryStartDate ? (isDark ? "#FAFAFA" : "#1F2937") : "#9CA3AF", fontSize: 13 }}>
                      {primaryStartDate ? formatDisplayDate(primaryStartDate) : "Velg dato"}
                    </Text>
                    <Calendar size={16} color="#10B981" />
                  </HStack>
                </TouchableOpacity>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <TouchableOpacity 
              style={flattenStyle([styles.submitBtn, { backgroundColor: '#4B5563', paddingHorizontal: 16, height: 38, marginRight: 8, marginTop: 0 }])}
              onPress={() => setShowPrimaryModal(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={flattenStyle([styles.submitBtn, { backgroundColor: '#10B981', paddingHorizontal: 16, height: 38, marginTop: 0 }])}
              onPress={handleSavePrimaryGoal}
              disabled={submitting}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Lagre</Text>
            </TouchableOpacity>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Redesigned Extra Goal Modal */}
      <AddGoalModal
        isOpen={showExtraModal}
        onClose={() => setShowExtraModal(false)}
        editingGoalId={editingExtraGoalId}
        metric={extraMetric}
        setMetric={setExtraMetric}
        period={extraPeriod}
        setPeriod={setExtraPeriod}
        activityTypes={extraActivityTypes}
        onToggleActivityType={handleToggleExtraActivityType}
        target={extraTarget}
        setTarget={setExtraTarget}
        customStart={extraCustomStart}
        customEnd={extraCustomEnd}
        openCalendarPicker={openCalendarPicker}
        formatDisplayDate={formatDisplayDate}
        onSave={handleSaveExtraGoal}
        submitting={submitting}
      />

      {/* Calendar Picker Modal */}
      <Modal isOpen={calendarPicker !== null} onClose={() => setCalendarPicker(null)} useRNModal={false} size="md">
        <ModalBackdrop />
        <ModalContent style={{ backgroundColor: isDark ? "#111827" : "#FFFFFF" }}>
          <ModalHeader>
            <Heading className={`text-lg font-semibold ${themeClasses.text}`}>
              Velg dato
            </Heading>
          </ModalHeader>
          <ModalBody>
            <VStack style={{ gap: 12 }}>
              {/* Header with Prev/Next month */}
              <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity 
                  onPress={() => {
                    setPickerMonth(prev => {
                      if (prev === 0) {
                        setPickerYear(y => y - 1);
                        return 11;
                      }
                      return prev - 1;
                    });
                  }}
                  style={{ padding: 8 }}
                >
                  <ChevronLeft size={20} color={isDark ? "#FAFAFA" : "#1F2937"} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? "#FAFAFA" : "#1F2937" }}>
                  {MONTH_NAMES[pickerMonth]} {pickerYear}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setPickerMonth(prev => {
                      if (prev === 11) {
                        setPickerYear(y => y + 1);
                        return 0;
                      }
                      return prev + 1;
                    });
                  }}
                  style={{ padding: 8 }}
                >
                  <ChevronRight size={20} color={isDark ? "#FAFAFA" : "#1F2937"} />
                </TouchableOpacity>
              </HStack>

              {/* Day headers */}
              <HStack style={{ justifyContent: 'space-around', marginBottom: 4 }}>
                {["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"].map(day => (
                  <Text key={day} style={{ fontSize: 12, fontWeight: 'bold', width: 36, textAlign: 'center', color: isDark ? "#A1A1AA" : "#71717A" }}>
                    {day}
                  </Text>
                ))}
              </HStack>

              {/* Calendar Days Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 8 }}>
                {getDaysInMonthList(pickerYear, pickerMonth).map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 36 }} />;
                  }
                  
                  const monthStr = String(pickerMonth + 1).padStart(2, "0");
                  const dayStr = String(day).padStart(2, "0");
                  const dateStr = `${pickerYear}-${monthStr}-${dayStr}`;
                  
                  // Check if selected
                  const isSelected = calendarPicker?.currentVal === dateStr;

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={flattenStyle([
                        {
                          width: '14.28%',
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 18,
                        },
                        isSelected && { backgroundColor: "#10B981" }
                      ])}
                      onPress={() => {
                        if (calendarPicker?.targetField === "primaryStart") {
                          setPrimaryStartDate(dateStr);
                        } else if (calendarPicker?.targetField === "extraStart") {
                          setExtraCustomStart(dateStr);
                        } else if (calendarPicker?.targetField === "extraEnd") {
                          setExtraCustomEnd(dateStr);
                        }
                        setCalendarPicker(null);
                      }}
                    >
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: isSelected ? 'bold' : 'normal',
                        color: isSelected ? '#FFFFFF' : (isDark ? "#FAFAFA" : "#1F2937")
                      }}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <TouchableOpacity 
              style={flattenStyle([styles.submitBtn, { backgroundColor: '#4B5563', paddingHorizontal: 16, height: 38, marginTop: 0 }])}
              onPress={() => setCalendarPicker(null)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Lukk</Text>
            </TouchableOpacity>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#F9FAFB",
  },
  bgDark: {
    backgroundColor: "#030712",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  subTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 3,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  subTabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
    marginTop: 8,
  },
  periodTabsWrapper: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  periodTabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateSelectorContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  dateSelectorArrow: {
    padding: 6,
  },
  dateSelectorLabel: {
    fontSize: 15,
    fontWeight: "bold",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  metricCard: {
    width: (Dimensions.get("window").width - 40) / 2,
    margin: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  metricCardLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 0,
  },
  metricCardValue: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  filterBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricTextBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  metricTextLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricTextUnderline: {
    height: 2,
    width: "100%",
    backgroundColor: "#10B981",
    marginTop: 2,
    borderRadius: 1,
  },
  chartCard: {
    borderRadius: 16,
  },
  chartContainer: {
    height: 240,
    position: "relative",
  },
  chartGridLineRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  chartYAxisText: {
    fontSize: 8,
    color: "#9CA3AF",
    width: 40,
    textAlign: "right",
    paddingRight: 6,
  },
  chartGridLineHorizontal: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chartBarColumn: {
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "rgba(128,128,128,0.05)",
  },
  chartXAxisText: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
  chartTypeToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
    gap: 8,
  },
  chartTypeToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  chartTypeToggleLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardBorderRadius: {
    borderRadius: 12,
  },
  goalCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  goalCardSubLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  goalPercentText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
  goalProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  goalProgressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  toggleFormBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleFormContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toggleFormText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  formCard: {
    borderRadius: 16,
  },
  typeSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  inputField: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  inputLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  inputDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    color: "#F9FAFB",
  },
  textArea: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#10B981",
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  sessionCard: {
    borderRadius: 12,
  },
  sessionRow: {
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sessionTitleText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  sessionDateText: {
    fontSize: 10,
    marginTop: 1,
  },
  sessionMetaText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sessionNotesText: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  recordsListWrapper: {
    marginBottom: 12,
  },
  recordCard: {
    borderRadius: 12,
  },
  trophyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBenchmarkLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
  recordDetailsDate: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 1,
  },
  recordValueText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  recordSessionTitle: {
    fontSize: 9,
    color: "#9CA3AF",
    maxWidth: 120,
    textAlign: "right",
    marginTop: 1,
  },
  editBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  deleteBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  goalCardDetailRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addOtherGoalBtn: {
    borderRadius: 16,
  },
  folderRow: {
    borderRadius: 12,
  },
  historyFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  historyFilterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyFilterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  sessionCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  yearSelectTrigger: {
    paddingLeft: 12,
    paddingRight: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSubTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    padding: 4,
  },
  subSubTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  subSubTabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subSubTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
});