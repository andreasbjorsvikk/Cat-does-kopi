import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
  Keyboard,
  InputAccessoryView,
  Button,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from "@/components/ui/checkbox";
import { Menu, MenuItem, MenuItemLabel } from "@/components/ui/menu";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  Check,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { workoutService } from "@/services/workoutService";
import { WorkoutSession, SessionType } from "@/types/workout";
import { getActivityColors } from "@/utils/activityColors";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { useAuth } from "@/hooks/useAuth";
import { ActivityIcon } from "./ActivityIcon";
import { useLanguage } from "@/context/LanguageContext";

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onSuccess?: (session?: WorkoutSession) => void;
  sessionToEdit?: WorkoutSession | null;
}

interface DurationPickerProps {
  initialHours: number;
  initialMinutes: number;
  isDark: boolean;
  onConfirm: (hours: number, minutes: number) => void;
  onClose: () => void;
  themeClasses: any;
  t: (key: string) => string;
}

const DurationPicker = ({
  initialHours,
  initialMinutes,
  isDark,
  t,
  onConfirm,
  onClose,
  themeClasses,
}: DurationPickerProps) => {
  const [h, setH] = useState(initialHours);
  const [m, setM] = useState(initialMinutes);

  return (
    <ModalContent style={flattenStyle([{ backgroundColor: isDark ? "#111827" : "#FFFFFF", borderRadius: 20, width: 360, alignSelf: 'center' }])}>
      <ModalHeader style={{ justifyContent: 'center', paddingTop: 20 }}>
        <Heading style={{ fontSize: 24, fontWeight: '900', color: isDark ? "#FFFFFF" : "#1F2937", textAlign: 'center' }}>
          {t('workout.duration')}
        </Heading>
      </ModalHeader>
      <ModalBody>
        <HStack style={{ justifyContent: "center", alignItems: "center", paddingVertical: 10, gap: 0 }}>
          <View style={{ width: 120, height: 220 }}>
            <Picker
              selectedValue={h}
              onValueChange={(val) => {
                setH(val);
                Haptics.selectionAsync();
              }}
              style={{ height: 220, width: 120 }}
              itemStyle={{ color: isDark ? "#FFFFFF" : "#1F2937", fontSize: 22 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <Picker.Item key={i} label={`${i} ${t('workout.h')}`} value={i} />
              ))}
            </Picker>
          </View>
          
          <Text style={{ fontSize: 32, fontWeight: "bold", color: isDark ? "#FFFFFF" : "#1F2937", marginHorizontal: 5 }}>:</Text>

          <View style={{ width: 150, height: 220 }}>
            <Picker
              selectedValue={m}
              onValueChange={(val) => {
                setM(val);
                Haptics.selectionAsync();
              }}
              style={{ height: 220, width: 150 }}
              itemStyle={{ color: isDark ? "#FFFFFF" : "#1F2937", fontSize: 22 }}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <Picker.Item key={i} label={`${i} ${t('workout.min')}`} value={i} />
              ))}
            </Picker>
          </View>
        </HStack>
      </ModalBody>
      <ModalFooter>
        <TouchableOpacity 
          style={flattenStyle([styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: "#10B981", borderRadius: 16 }])}
          onPress={() => onConfirm(h, m)}
        >
          <Text style={[styles.primaryBtnText, { fontSize: 18, fontWeight: '800' }]}>{t('workout.confirm') || t('common.ok')}</Text>
        </TouchableOpacity>
      </ModalFooter>
    </ModalContent>
  );
};

export const WorkoutModal = ({
  isOpen,
  onClose,
  initialDate,
  onSuccess,
  sessionToEdit,
}: WorkoutModalProps) => {
  const { t, locale } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const WORKOUT_TYPES: { id: SessionType; label: string }[] = useMemo(() => [
    { id: "styrke", label: t('activity.styrke') },
    { id: "løping", label: t('activity.løping') },
    { id: "fjelltur", label: t('activity.fjelltur') },
    { id: "svømming", label: t('activity.svømming') },
    { id: "sykling", label: t('activity.sykling') },
    { id: "gå", label: t('activity.gå') },
    { id: "tennis", label: t('activity.tennis') },
    { id: "yoga", label: t('activity.yoga') },
    { id: "fotball", label: t('activity.fotball') },
    { id: "trappemaskin", label: t('activity.trappemaskin') },
    { id: "roing", label: t('activity.roing') },
    { id: "kajakk", label: t('activity.kajakk') },
    { id: "tredemølle", label: t('activity.tredemølle') },
    { id: "annet", label: t('activity.annet') },
  ], [t]);

  const distAccID = "workout_modal_dist_done";
  const elevAccID = "workout_modal_elev_done";
  const notesAccID = "workout_modal_notes_done";

  // Form State
  const [type, setType] = useState<SessionType>("løping");
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [distance, setDistance] = useState("");
  const [elevation, setElevation] = useState("");
  const [notes, setNotes] = useState("");
  const [excludeFromCount, setExcludeFromCount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sub-modals state
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      if (sessionToEdit) {
        const d = new Date(sessionToEdit.date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        setDateStr(formattedDate);
        setPickerMonth(d.getMonth());
        setPickerYear(d.getFullYear());
        
        setType(sessionToEdit.type);
        setTitle(sessionToEdit.title || "");
        setHours(Math.floor(sessionToEdit.durationMinutes / 60));
        setMinutes(sessionToEdit.durationMinutes % 60);
        setDistance(sessionToEdit.distance ? String(sessionToEdit.distance) : "");
        setElevation(sessionToEdit.elevationGain ? String(sessionToEdit.elevationGain) : "");
        setNotes(sessionToEdit.notes || "");
        setExcludeFromCount(sessionToEdit.excludeFromCount || false);
      } else {
        const today = new Date();
        const d = initialDate ? new Date(initialDate) : today;
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        setDateStr(formattedDate);
        setPickerMonth(d.getMonth());
        setPickerYear(d.getFullYear());
        
        // Reset other fields
        setType("løping");
        setTitle("");
        setHours(0);
        setMinutes(30);
        setDistance("");
        setElevation("");
        setNotes("");
        setExcludeFromCount(false);
      }
    }
  }, [isOpen, initialDate, sessionToEdit]);

  const handleDelete = useCallback(async () => {
    if (!sessionToEdit) return;
    const sessionName = sessionToEdit.title || t("activity." + sessionToEdit.type.toLowerCase());
    
    Alert.alert(
      t("workoutDetail.delete"),
      t("workoutDetail.confirmDeleteDesc", { name: sessionName }),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              await workoutService.delete(sessionToEdit.id);
              if (onSuccess) onSuccess(); 
              onClose();
            } catch (err) {
              console.warn("Could not delete workout:", err);
            }
          }
        }
      ]
    );
  }, [sessionToEdit, t, onSuccess, onClose]);

  const formatDisplayDate = useCallback((str: string) => {
    if (!str) return t('workout.date');
    const parts = str.split("-");
    if (parts.length !== 3) return str;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return str;
    const date = new Date(year, month, day);
    const monthKey = `month.short.${date.getMonth()}`;
    return `${date.getDate()}. ${t(monthKey).toLowerCase()}. ${date.getFullYear()}`;
  }, [t]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const totalMinutes = hours * 60 + minutes;
      const sessionData: Omit<WorkoutSession, "id"> = {
        type,
        title: title.trim() || undefined,
        date: new Date(dateStr).toISOString(),
        durationMinutes: totalMinutes,
        distance: distance ? parseFloat(distance.replace(",", ".")) : undefined,
        elevationGain: elevation ? parseInt(elevation) : undefined,
        notes: notes.trim() || undefined,
        excludeFromCount,
      };

      if (sessionToEdit) {
        const updatedSession: WorkoutSession = {
          ...sessionData,
          id: sessionToEdit.id,
        };
        if (onSuccess) onSuccess(updatedSession);
        onClose();
        await workoutService.update(sessionToEdit.id, sessionData);
       if (onSuccess) onSuccess();
      } else {
        // Optimistic update support
        const tempId = 'temp-' + Date.now();
        const optimisticSession: WorkoutSession = {
          ...sessionData,
          id: tempId,
        };

        // Trigger success immediately for UI speed
        if (onSuccess) onSuccess(optimisticSession);
        onClose();

        await workoutService.add(sessionData, user?.id);
       if (onSuccess) onSuccess();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn("Could not save workout:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const themeClasses = {
    text: isDark ? "text-white" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    inputBg: isDark ? "bg-background-800" : "bg-background-50",
    inputBorder: isDark ? "border-outline-700" : "border-outline-200",
  };

  const getDaysInMonthList = (year: number, month: number) => {
    const days = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    const normalizedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = 0; i < normalizedFirstDay; i++) {
      days.push(null);
    }
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  };

  const typeColors = useMemo(() => getActivityColors(type, isDark), [type, isDark]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} useRNModal={false} size="lg">
        <ModalBackdrop />
        <ModalContent style={flattenStyle([{ backgroundColor: isDark ? "#111827" : "#FFFFFF", borderRadius: 24, paddingBottom: 10 }])}>
          <ModalHeader style={flattenStyle([{ borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 20 }])}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Heading style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontSize: 20, fontWeight: "bold" }}>
                {sessionToEdit ? t('workout.editSession') : t('workout.newSession')}
              </Heading>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={isDark ? "#FFFFFF" : "#1F2937"} />
            </TouchableOpacity>
          </ModalHeader>

          <ModalBody style={flattenStyle([{ paddingHorizontal: 20, paddingTop: 10 }])}>
            <VStack style={{ gap: 20 }}>
              {/* Activity Type Select */}
              <VStack style={{ gap: 8 }}>
                <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.type')}</Text>
                <Menu
                  placement="bottom"
                  offset={5}
                  trigger={(triggerProps) => (
                    <TouchableOpacity 
                      {...triggerProps}
                      style={flattenStyle([styles.customPicker, isDark ? styles.inputDark : styles.inputLight])}
                    >
                      <HStack style={{ alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={flattenStyle([styles.typeIconContainer, { backgroundColor: typeColors.bg }])}>
                          <ActivityIcon type={type} size={20} color={typeColors.text} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "500", color: isDark ? "#FFFFFF" : "#1F2937" }}>
                          {WORKOUT_TYPES.find(t => t.id === type)?.label}
                        </Text>
                      </HStack>
                      <ChevronDown size={18} color={isDark ? "#9CA3AF" : "#6B7280"} style={{ marginRight: 12 }} />
                    </TouchableOpacity>
                  )}
                >
                  {WORKOUT_TYPES.map((opt) => {
                    const optColors = getActivityColors(opt.id, isDark);
                    return (
                      <MenuItem 
                        key={opt.id} 
                        textValue={opt.label}
                        onPress={() => {
                          setType(opt.id);
                          Haptics.selectionAsync();
                        }}
                      >
                        <HStack style={{ alignItems: "center", gap: 12 }}>
                          <View style={flattenStyle([styles.typeIconContainer, { backgroundColor: optColors.bg, marginLeft: 0 }])}>
                            <ActivityIcon type={opt.id} size={20} color={optColors.text} />
                          </View>
                          <MenuItemLabel style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontSize: 15, fontWeight: "500" }}>
                            {opt.label}
                          </MenuItemLabel>
                        </HStack>
                      </MenuItem>
                    );
                  })}
                </Menu>
              </VStack>

              {/* Name Input */}
              <VStack style={{ gap: 8 }}>
                <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.name')}</Text>
                <TextInput
                  placeholder={t('workout.namePlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  style={flattenStyle([styles.inputField, isDark ? styles.inputDark : styles.inputLight])}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </VStack>

              {/* Date & Duration Row */}
              <HStack style={{ gap: 12 }}>
                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.date')}</Text>
                  <TouchableOpacity
                    style={flattenStyle([styles.customPicker, isDark ? styles.inputDark : styles.inputLight])}
                    onPress={() => setShowCalendar(true)}
                  >
                    <HStack style={{ alignItems: "center", gap: 10, paddingLeft: 12 }}>
                      <CalendarIcon size={18} color="#10B981" />
                      <Text style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#1F2937" }}>
                        {formatDisplayDate(dateStr)}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                </VStack>

                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.duration')}</Text>
                  <TouchableOpacity
                    style={flattenStyle([styles.customPicker, isDark ? styles.inputDark : styles.inputLight])}
                    onPress={() => setShowDuration(true)}
                  >
                    <HStack style={{ alignItems: "center", gap: 10, paddingLeft: 12 }}>
                      <Clock size={18} color="#10B981" />
                      <Text style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#1F2937" }}>
                        {hours > 0 ? `${hours} ${t('workout.h')} ` : ""}{minutes} {t('workout.min')}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                </VStack>
              </HStack>

              {/* Distance & Elevation Row with specific Keyboard Accessories */}
              <HStack style={{ gap: 12 }}>
                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.distanceKm')}</Text>
                  <TextInput
                    placeholder="0.0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    style={flattenStyle([styles.inputField, isDark ? styles.inputDark : styles.inputLight])}
                    value={distance}
                    onChangeText={setDistance}
                    inputAccessoryViewID={distAccID}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {Platform.OS === "ios" && (
                    <InputAccessoryView nativeID={distAccID}>
                      <View style={[styles.accessoryBar, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderTopColor: isDark ? "#374151" : "#E5E7EB" }]}>
                        <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                          <Text style={styles.accessoryText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                      </View>
                    </InputAccessoryView>
                  )}
                </VStack>
                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.elevation')} (m)</Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    style={flattenStyle([styles.inputField, isDark ? styles.inputDark : styles.inputLight])}
                    value={elevation}
                    onChangeText={setElevation}
                    inputAccessoryViewID={elevAccID}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {Platform.OS === "ios" && (
                    <InputAccessoryView nativeID={elevAccID}>
                      <View style={[styles.accessoryBar, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderTopColor: isDark ? "#374151" : "#E5E7EB" }]}>
                        <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                          <Text style={styles.accessoryText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                      </View>
                    </InputAccessoryView>
                  )}
                </VStack>
              </HStack>

              {/* Notes Area with specific Keyboard Accessory */}
              <VStack style={{ gap: 8 }}>
                <Text style={{ color: isDark ? "#FFFFFF" : "#1F2937", fontWeight: "bold", fontSize: 14 }}>{t('workout.notes')}</Text>
                <TextInput
                  placeholder={t('workout.notesPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  style={flattenStyle([styles.inputField, styles.textArea, isDark ? styles.inputDark : styles.inputLight])}
                  value={notes}
                  onChangeText={setNotes}
                  inputAccessoryViewID={notesAccID}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  blurOnSubmit={true}
                />
                {Platform.OS === "ios" && (
                  <InputAccessoryView nativeID={notesAccID}>
                    <View style={[styles.accessoryBar, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderTopColor: isDark ? "#374151" : "#E5E7EB" }]}>
                      <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                        <Text style={styles.accessoryText}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                  </InputAccessoryView>
                )}
              </VStack>

              {/* Checkbox */}
              <HStack style={{ alignItems: "center", gap: 8 }}>
                <Checkbox
                  size="md"
                  value="exclude"
                  isChecked={excludeFromCount}
                  onChange={(checked) => setExcludeFromCount(checked)}
                >
                  <CheckboxIndicator>
                    <CheckboxIcon as={Check} />
                  </CheckboxIndicator>
                  <CheckboxLabel className={isDark ? "text-typography-300" : "text-typography-600"}>
                    {t('workout.excludeFromCount')}
                  </CheckboxLabel>
                </Checkbox>
                <TouchableOpacity>
                  <HelpCircle size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              </HStack>
            </VStack>
          </ModalBody>

          <ModalFooter style={flattenStyle([{ borderTopWidth: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }])}>
            <VStack style={{ width: "100%", gap: 12 }}>
              <HStack style={{ gap: 10 }}>
                <TouchableOpacity
                  style={flattenStyle([styles.primaryBtn, { flex: 1, backgroundColor: "#10B981" }])}
                  onPress={handleSave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>{sessionToEdit ? t('common.save') : t('common.add')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={flattenStyle([styles.secondaryBtn, { flex: 1, backgroundColor: isDark ? "#1F2937" : "#F3F4F6" }])}
                  onPress={onClose}
                >
                  <Text style={flattenStyle([styles.secondaryBtnText, { color: isDark ? "#FFFFFF" : "#1F2937" }])}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </HStack>
              {sessionToEdit && (
                <TouchableOpacity
                  style={flattenStyle([styles.secondaryBtn, { backgroundColor: "#EF444420", borderWidth: 0, height: 44 }])}
                  onPress={handleDelete}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "bold" }}>{t('common.delete')} {t('training.session')}</Text>
                </TouchableOpacity>
              )}
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Internal Calendar Modal */}
      <Modal isOpen={showCalendar} onClose={() => setShowCalendar(false)} useRNModal={false} size="md">
        <ModalBackdrop />
        <ModalContent style={flattenStyle([{ backgroundColor: isDark ? "#111827" : "#FFFFFF", borderRadius: 20 }])}>
          <ModalHeader>
            <Heading className={`text-lg font-bold ${themeClasses.text}`}>{t('workout.date')}</Heading>
          </ModalHeader>
          <ModalBody>
            <VStack style={{ gap: 16 }}>
              <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => {
                    if (pickerMonth === 0) {
                      setPickerMonth(11);
                      setPickerYear(pickerYear - 1);
                    } else {
                      setPickerMonth(pickerMonth - 1);
                    }
                  }}
                  style={styles.arrowBtn}
                >
                  <ChevronLeft size={24} color={isDark ? "#FFFFFF" : "#1F2937"} />
                </TouchableOpacity>
                <Text style={flattenStyle([{ fontSize: 18, fontWeight: "bold" }, { color: isDark ? "#FFFFFF" : "#1F2937" }])}>
                  {t(`month.${pickerMonth}`)} {pickerYear}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (pickerMonth === 11) {
                      setPickerMonth(0);
                      setPickerYear(pickerYear + 1);
                    } else {
                      setPickerMonth(pickerMonth + 1);
                    }
                  }}
                  style={styles.arrowBtn}
                >
                  <ChevronRight size={24} color={isDark ? "#FFFFFF" : "#1F2937"} />
                </TouchableOpacity>
              </HStack>

              <HStack style={{ justifyContent: "space-around" }}>
                {[t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'), t('weekday.sun')].map((d) => (
                  <Text key={d} style={flattenStyle([{ fontSize: 12, fontWeight: "bold", width: 40, textAlign: "center" }, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                    {d}
                  </Text>
                ))}
              </HStack>

              <View style={styles.calendarGrid}>
                {getDaysInMonthList(pickerYear, pickerMonth).map((day, idx) => {
                  if (day === null) return <View key={`empty-${idx}`} style={styles.calendarDay} />;
                  const dStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = dateStr === dStr;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={flattenStyle([styles.calendarDay, isSelected && styles.calendarDaySelected])}
                      onPress={() => {
                        setDateStr(dStr);
                        setShowCalendar(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }}
                    >
                      <Text style={flattenStyle([styles.calendarDayText, isSelected && styles.calendarDayTextSelected, { color: isSelected ? "#FFFFFF" : (isDark ? "#FAFAFA" : "#1F2937") }])}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCalendar(false)}>
              <Text style={styles.modalCloseBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Internal Duration Picker Modal */}
      <Modal isOpen={showDuration} onClose={() => setShowDuration(false)} useRNModal={false} size="sm">
        <ModalBackdrop />
        <DurationPicker
          initialHours={hours}
          initialMinutes={minutes}
          isDark={isDark}
          t={t}
          themeClasses={themeClasses}
          onConfirm={(h, m) => {
            setHours(h);
            setMinutes(m);
            setShowDuration(false);
          }}
          onClose={() => setShowDuration(false)}
        />
      </Modal>

    </>
  );
};
const styles = StyleSheet.create({
  accessoryBar: {
    height: 44,
    width: Dimensions.get("window").width,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  accessoryText: {
    color: "#10B981",
    fontWeight: "bold",
    fontSize: 17,
  },
  closeBtn: {
    padding: 4,
  },
  customPicker: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputLight: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  inputDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    color: "#FFFFFF",
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  arrowBtn: {
    padding: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: "#10B981",
  },
  calendarDayText: {
    fontSize: 15,
  },
  calendarDayTextSelected: {
    fontWeight: "bold",
  },
  modalCloseBtn: {
    backgroundColor: "#4B5563",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  durationInput: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
  },
});

export default WorkoutModal;