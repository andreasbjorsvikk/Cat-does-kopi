import React from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  Keyboard,
  InputAccessoryView,
  Alert,
} from "react-native";
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { 
  Hash, 
  Clock, 
  MapPin, 
  Mountain, 
  Calendar,
  X
} from "lucide-react-native";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { GoalMetric, GoalPeriod } from "@/types/workout";
import { getActivityColors } from "@/utils/activityColors";
import { SessionType } from "@/types/workout";

export interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoalId: string | null;
  metric: GoalMetric;
  setMetric: (metric: GoalMetric) => void;
  period: GoalPeriod | "custom";
  setPeriod: (period: GoalPeriod | "custom") => void;
  activityTypes: string[];
  onToggleActivityType: (typeId: string) => void;
  target: string;
  setTarget: (target: string) => void;
  customStart: string;
  customEnd: string;
  openCalendarPicker: (targetField: "extraStart" | "extraEnd", currentVal: string) => void;
  formatDisplayDate: (str: string) => string;
  onSave: () => Promise<void>;
  submitting: boolean;
  repeatGoal?: boolean;
  setRepeatGoal?: (val: boolean) => void;
}

const WORKOUT_TYPES = [
  { id: "styrke", label: "Styrke" },
  { id: "løping", label: "Løping" },
  { id: "fjelltur", label: "Fjelltur" },
  { id: "svømming", label: "Svømming" },
  { id: "sykling", label: "Sykling" },
  { id: "gå", label: "Gå" },
  { id: "tennis", label: "Tennis" },
  { id: "yoga", label: "Yoga" },
  { id: "fotball", label: "Fotball" },
  { id: "trappemaskin", label: "Trappemaskin" },
  { id: "roing", label: "Roing" },
  { id: "kajakk", label: "Kajakk" },
  { id: "tredemølle", label: "Tredemølle" },
  { id: "annet", label: "Annet" },
] as const;

export const AddGoalModal = ({
  isOpen,
  onClose,
  editingGoalId,
  metric,
  setMetric,
  period,
  setPeriod,
  activityTypes,
  onToggleActivityType,
  target,
  setTarget,
  customStart,
  customEnd,
  openCalendarPicker,
  formatDisplayDate,
  onSave,
  submitting,
  repeatGoal = false,
  setRepeatGoal,
}: AddGoalModalProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const inputAccessoryViewID = "targetInputDone";

  // Colors based on theme
  const bgMain = isDark ? "#111827" : "#FFFFFF";
  const bgCard = isDark ? "#1F2937" : "#F3F4F6";
  const bgActive = "#10B981"; // Emerald green
  const bgInactive = isDark ? "#1F2937" : "#E5E7EB";
  
  const textPrimary = isDark ? "#FAFAFA" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const textActive = "#FFFFFF";
  const borderCol = isDark ? "#374151" : "#E5E7EB";

  // Metric Options Config
  const METRIC_OPTIONS = [
    { id: "sessions" as GoalMetric, label: "Økter", icon: Hash },
    { id: "minutes" as GoalMetric, label: "Tid", icon: Clock },
    { id: "distance" as GoalMetric, label: "Distanse", icon: MapPin },
    { id: "elevation" as GoalMetric, label: "Høydemeter", icon: Mountain },
  ];

  // Period Options Config
  const PERIOD_OPTIONS = [
    { id: "week" as GoalPeriod | "custom", label: "Uke" },
    { id: "month" as GoalPeriod | "custom", label: "Måned" },
    { id: "year" as GoalPeriod | "custom", label: "År" },
    { id: "custom" as GoalPeriod | "custom", label: "Velg" },
  ];

  // Map metric to visual unit
  const METRIC_UNITS: Record<string, string> = {
    sessions: "Økter",
    minutes: "timer",
    duration: "timer",
    distance: "km",
    elevation: "m",
  };

  const currentUnit = METRIC_UNITS[metric] || "Økter";

  return (
    <Modal isOpen={isOpen} onClose={onClose} useRNModal={false} size="lg">
      <ModalBackdrop />
      <ModalContent style={flattenStyle([styles.modalContent, { backgroundColor: bgMain, borderColor: borderCol }])}>
        <ModalHeader style={styles.header}>
          <Heading className="text-2xl font-bold" style={{ color: textPrimary, textAlign: 'center', width: '100%' }}>
            {editingGoalId ? "Endre mål" : "Nytt mål"}
          </Heading>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={textMuted} />
          </TouchableOpacity>
        </ModalHeader>

        <ModalBody style={{ paddingVertical: 10 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 20 }}>
            {/* 1. GOAL TYPE SELECTION */}
            <VStack style={{ gap: 6 }}>
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Måletype
              </Text>
              <HStack style={{ gap: 8, justifyContent: "space-between" }}>
                {METRIC_OPTIONS.map((opt) => {
                  const isActive = metric === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.8}
                      onPress={() => setMetric(opt.id)}
                      style={flattenStyle([
                        styles.metricButton,
                        {
                          backgroundColor: isActive ? bgActive : bgInactive,
                          flex: 1,
                        },
                      ])}
                    >
                      <View style={{ height: 20, justifyContent: 'center', alignItems: 'center' }}>
                        <opt.icon size={18} color={isActive ? textActive : textMuted} />
                      </View>
                      <Text
                        style={flattenStyle([
                          styles.metricButtonText,
                          { color: isActive ? textActive : textPrimary },
                        ])}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </VStack>

            {/* 2. GOAL VALUE INPUT (CENTERED & NARROW) - MOVED UP */}
            <VStack style={{ gap: 6, alignItems: "center", marginTop: 8 }}>
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Målantall (Tallverdi)
              </Text>
              <View style={flattenStyle([styles.targetInputContainer, { backgroundColor: bgCard, borderColor: borderCol }])}>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={textMuted}
                  keyboardType="numeric"
                  style={flattenStyle([styles.targetInput, { color: textPrimary }])}
                  value={target}
                  onChangeText={setTarget}
                  selectTextOnFocus
                  inputAccessoryViewID={inputAccessoryViewID}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
                <Text style={flattenStyle([styles.targetUnitLabel, { color: textMuted }])}>
                  {currentUnit}
                </Text>
              </View>
            </VStack>

            {/* Keyboard Accessory for iOS */}
            {Platform.OS === "ios" && (
              <InputAccessoryView nativeID={inputAccessoryViewID}>
                <View style={flattenStyle([styles.accessoryBar, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderTopColor: borderCol }])}>
                  <TouchableOpacity onPress={Keyboard.dismiss} style={styles.accessoryBtn}>
                    <Text style={styles.accessoryBtnText}>Ferdig</Text>
                  </TouchableOpacity>
                </View>
              </InputAccessoryView>
            )}

            {/* 3. PERIOD SELECTION */}
            <VStack style={{ gap: 6 }}>
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Tidsperiode
              </Text>
              <HStack style={{ gap: 8, justifyContent: "space-between" }}>
                {PERIOD_OPTIONS.map((opt) => {
                  const isActive = period === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.8}
                      onPress={() => setPeriod(opt.id)}
                      style={flattenStyle([
                        styles.periodButton,
                        {
                          backgroundColor: isActive ? bgActive : bgInactive,
                          flex: 1,
                        },
                      ])}
                    >
                      <Text
                        style={flattenStyle([
                          styles.periodButtonText,
                          { color: isActive ? textActive : textPrimary },
                        ])}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </VStack>

            {/* 4. CUSTOM DATES */}
            {period === "custom" ? (
              <VStack style={flattenStyle([styles.customDatesBox, { backgroundColor: bgCard, borderColor: borderCol }])}>
                <HStack style={{ gap: 12 }}>
                  <VStack style={{ flex: 1, gap: 4 }}>
                    <Text className="text-xs font-semibold" style={{ color: textMuted }}>
                      Fra
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={flattenStyle([styles.dateField, { backgroundColor: bgMain, borderColor: borderCol }])}
                      onPress={() => openCalendarPicker("extraStart", customStart)}
                    >
                      <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: customStart ? textPrimary : textMuted, fontSize: 13 }}>
                          {customStart ? formatDisplayDate(customStart) : "Velg dato"}
                        </Text>
                        <Calendar size={14} color="#10B981" />
                      </HStack>
                    </TouchableOpacity>
                  </VStack>

                  <VStack style={{ flex: 1, gap: 4 }}>
                    <Text className="text-xs font-semibold" style={{ color: textMuted }}>
                      Til
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={flattenStyle([styles.dateField, { backgroundColor: bgMain, borderColor: borderCol }])}
                      onPress={() => openCalendarPicker("extraEnd", customEnd)}
                    >
                      <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: customEnd ? textPrimary : textMuted, fontSize: 13 }}>
                          {customEnd ? formatDisplayDate(customEnd) : "Velg dato"}
                        </Text>
                        <Calendar size={14} color="#10B981" />
                      </HStack>
                    </TouchableOpacity>
                  </VStack>
                </HStack>
              </VStack>
            ) : null}

            {/* 4b. REPEAT GOAL TOGGLE (Only if not custom) */}
            {period !== "custom" && setRepeatGoal && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setRepeatGoal(!repeatGoal)}
                style={{ alignSelf: 'flex-start' }}
              >
                <HStack space="sm" style={{ alignItems: 'center' }}>
                  <View 
                    style={flattenStyle([
                      styles.checkbox, 
                      { 
                        backgroundColor: repeatGoal ? bgActive : bgInactive,
                        borderColor: repeatGoal ? bgActive : borderCol 
                      }
                    ])}
                  >
                    {repeatGoal && <View style={styles.checkboxCheck} />}
                  </View>
                  <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '600' }}>
                    Gjenta mål
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      const p = period === 'week' ? 'uke' : period === 'month' ? 'måned' : 'år';
                      Alert.alert("Gjenta mål", `Målet vil bli gjentatt hver ${p}`);
                    }}
                    style={{ padding: 4 }}
                  >
                    <View style={flattenStyle([styles.infoCircle, { borderColor: textMuted }])}>
                      <Text style={{ color: textMuted, fontSize: 10, fontWeight: 'bold' }}>i</Text>
                    </View>
                  </TouchableOpacity>
                </HStack>
              </TouchableOpacity>
            )}

            {/* 5. ACTIVITY TYPE SELECTION (GRID OF CHIPS) */}
            <VStack style={{ gap: 6 }}>
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Aktivitetstype
              </Text>
              <View style={styles.chipsContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={flattenStyle([
                    styles.chipButton,
                    {
                      backgroundColor: activityTypes.includes("all") ? bgActive : bgInactive,
                    },
                  ])}
                  onPress={() => onToggleActivityType("all")}
                >
                  <Text
                    style={flattenStyle([
                      styles.chipText,
                      { color: activityTypes.includes("all") ? textActive : textPrimary },
                    ])}
                  >
                    All trening
                  </Text>
                </TouchableOpacity>

                {WORKOUT_TYPES.map((type) => {
                  const isSelected = activityTypes.includes(type.id);
                  const typeColors = getActivityColors(type.id as SessionType, isDark);
                  
                  return (
                    <TouchableOpacity
                      key={type.id}
                      activeOpacity={0.8}
                      style={flattenStyle([
                        styles.chipButton,
                        {
                          backgroundColor: isSelected ? typeColors.bg : bgInactive,
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: typeColors.text,
                        },
                      ])}
                      onPress={() => onToggleActivityType(type.id)}
                    >
                      <Text
                        style={flattenStyle([
                          styles.chipText,
                          { color: isSelected ? typeColors.text : textPrimary },
                        ])}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </VStack>
          </ScrollView>
        </ModalBody>

        <ModalFooter style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={flattenStyle([styles.actionBtn, { backgroundColor: isDark ? "#374151" : "#4B5563", marginRight: 8 }])}
            onPress={onClose}
          >
            <Text style={styles.actionBtnText}>Avbryt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={flattenStyle([styles.actionBtn, { backgroundColor: "#10B981" }])}
            onPress={onSave}
            disabled={submitting}
          >
            <Text style={styles.actionBtnText}>
              {submitting ? "Lagrer..." : editingGoalId ? "Lagre" : "Opprett"}
            </Text>
          </TouchableOpacity>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    maxWidth: 440,
    alignSelf: "center",
  },
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0,
    paddingBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  metricButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  metricButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  periodButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customDatesBox: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  dateField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  singleDateField: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: "center",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  targetInputContainer: {
    width: 140,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  targetInput: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    padding: 0,
    width: "100%",
  },
  targetUnitLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  footer: {
    borderTopWidth: 0,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  actionBtn: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  accessoryBar: {
    height: 44,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  accessoryBtn: {
    height: "100%",
    justifyContent: "center",
  },
  accessoryBtnText: {
    color: "#10B981",
    fontWeight: "600",
    fontSize: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheck: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});