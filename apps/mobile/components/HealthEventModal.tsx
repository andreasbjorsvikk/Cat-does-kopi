import React, { useState, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Platform, 
  ActivityIndicator, 
  Alert,
  Keyboard 
} from 'react-native';
import * as Haptics from "expo-haptics";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { X, Calendar as CalendarIcon, Ambulance, Cross, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { healthEventService } from '@/services/healthEventService';
import { HealthEvent, HealthEventType } from '@/types/workout';
import useColorScheme from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { flattenStyle } from '@/utils/flatten-style';

interface HealthEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onSuccess?: (event?: HealthEvent) => void;
  eventToEdit?: HealthEvent | null;
}

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Desember"
];

const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun", 
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des"
];

export const HealthEventModal = ({
  isOpen,
  onClose,
  initialDate,
  onSuccess,
  eventToEdit,
}: HealthEventModalProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [type, setType] = useState<HealthEventType>('sickness');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sub-modals state
  const [showCalendar, setShowCalendar] = useState<{ active: 'from' | 'to' } | null>(null);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setType(eventToEdit.type);
        setDateFrom(eventToEdit.dateFrom);
        setDateTo(eventToEdit.dateTo || eventToEdit.dateFrom);
        setNotes(eventToEdit.notes || '');
        
        const d = new Date(eventToEdit.dateFrom);
        setPickerMonth(d.getMonth());
        setPickerYear(d.getFullYear());
      } else {
        const today = new Date();
        const d = initialDate ? new Date(initialDate) : today;
        const formattedDate = d.toISOString().split('T')[0];
        setDateFrom(formattedDate);
        setDateTo(formattedDate);
        setNotes('');
        setType('sickness');
        setPickerMonth(d.getMonth());
        setPickerYear(d.getFullYear());
      }
    }
  }, [isOpen, initialDate, eventToEdit]);

  const formatDisplayDate = (str: string) => {
    if (!str) return "Velg dato";
    const parts = str.split("-");
    if (parts.length !== 3) return str;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return `${date.getDate()}. ${MONTH_LABELS_SHORT[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
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

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const eventData: Omit<HealthEvent, 'id' | 'createdAt' | 'userId'> = {
        type,
        dateFrom,
        dateTo,
        notes: notes.trim() || undefined,
      };

      if (eventToEdit) {
        const updatedEvent: HealthEvent = {
          ...eventData,
          id: eventToEdit.id,
          userId: user.id,
          createdAt: eventToEdit.createdAt
        };
        if (onSuccess) onSuccess(updatedEvent);
        onClose();
        await healthEventService.update(eventToEdit.id, eventData);
       if (onSuccess) onSuccess();
      } else {
        const newEvent = await healthEventService.add(user.id, eventData);
        if (onSuccess) onSuccess(newEvent);
        onClose();
       if (onSuccess) onSuccess();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error saving health event:', err);
      alert('Kunne ikke lagre helsehendelse.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;

    Alert.alert(
      "Slett helsehendelse",
      "Er du sikker på at du vil slette denne helsehendelsen?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            try {
              await healthEventService.delete(eventToEdit.id);
              if (onSuccess) onSuccess();
              onClose();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Error deleting health event:', err);
              Alert.alert('Feil', 'Kunne ikke slette helsehendelse.');
            }
          }
        }
      ]
    );
  };

  const themeClasses = {
    text: isDark ? "text-white" : "text-typography-950",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalBackdrop />
        <ModalContent style={flattenStyle([{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 24 }])}>
          <ModalHeader style={flattenStyle([{ borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 20 }])}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Heading style={{ color: isDark ? '#FFFFFF' : '#1F2937', fontSize: 20, fontWeight: 'bold' }}>
                {eventToEdit ? "Rediger helsehendelse" : "Ny helsehendelse"}
              </Heading>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={isDark ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>
          </ModalHeader>

          <ModalBody style={flattenStyle([{ paddingHorizontal: 20, paddingTop: 10 }])}>
            <VStack style={{ gap: 20 }}>
              {/* Type Select */}
              <VStack style={{ gap: 8 }}>
                <Text style={styles.label}>Type</Text>
                <HStack style={{ gap: 12 }}>
                  <TouchableOpacity 
                    style={[
                      styles.typeBtn, 
                      type === 'sickness' ? styles.typeBtnActive : (isDark ? styles.inputDark : styles.inputLight)
                    ]}
                    onPress={() => setType('sickness')}
                  >
                    <HStack space="xs" style={{ alignItems: 'center' }}>
                      <Ambulance size={18} color={type === 'sickness' ? '#FFF' : '#EF4444'} />
                      <Text style={[styles.typeBtnText, type === 'sickness' && { color: '#FFF' }]}>Sykdom</Text>
                    </HStack>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.typeBtn, 
                      type === 'injury' ? styles.typeBtnActive : (isDark ? styles.inputDark : styles.inputLight)
                    ]}
                    onPress={() => setType('injury')}
                  >
                    <HStack space="xs" style={{ alignItems: 'center' }}>
                      <Cross size={18} color={type === 'injury' ? '#FFF' : '#EF4444'} />
                      <Text style={[styles.typeBtnText, type === 'injury' && { color: '#FFF' }]}>Skade</Text>
                    </HStack>
                  </TouchableOpacity>
                </HStack>
              </VStack>

              {/* Date Selection */}
              <HStack style={{ gap: 12 }}>
                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.label}>Fra dato</Text>
                  <TouchableOpacity
                    style={flattenStyle([styles.customPicker, isDark ? styles.inputDark : styles.inputLight])}
                    onPress={() => setShowCalendar({ active: 'from' })}
                  >
                    <HStack style={{ alignItems: "center", gap: 10, paddingLeft: 12 }}>
                      <CalendarIcon size={18} color="#10B981" />
                      <Text style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#1F2937" }}>
                        {formatDisplayDate(dateFrom)}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                </VStack>

                <VStack style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.label}>Til dato</Text>
                  <TouchableOpacity
                    style={flattenStyle([styles.customPicker, isDark ? styles.inputDark : styles.inputLight])}
                    onPress={() => setShowCalendar({ active: 'to' })}
                  >
                    <HStack style={{ alignItems: "center", gap: 10, paddingLeft: 12 }}>
                      <CalendarIcon size={18} color="#10B981" />
                      <Text style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#1F2937" }}>
                        {formatDisplayDate(dateTo)}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                </VStack>
              </HStack>

              {/* Notes */}
              <VStack style={{ gap: 8 }}>
                <Text style={styles.label}>Notater</Text>
                <TextInput
                  style={[styles.inputField, styles.textArea, isDark ? styles.inputDark : styles.inputLight]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Hva skjedde?..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <VStack style={{ width: '100%', gap: 14 }}>
              <HStack style={{ gap: 12 }}>
                <TouchableOpacity 
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lagre</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.secondaryBtn, isDark ? styles.inputDark : styles.inputLight]}
                  onPress={onClose}
                >
                  <Text style={[styles.secondaryBtnText, isDark ? styles.textWhite : styles.textDark]}>Avbryt</Text>
                </TouchableOpacity>
              </HStack>
              {eventToEdit && (
                <TouchableOpacity 
                  style={flattenStyle([
                    styles.secondaryBtn, 
                    { 
                      backgroundColor: '#EF444420', 
                      borderWidth: 0, 
                      height: 54, 
                      borderRadius: 18,
                      flex: 0, // Disable flex to ensure it doesn't try to fill parent unexpectedly
                      width: '100%'
                    }
                  ])}
                  onPress={handleDelete}
                >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Slett helsehendelse</Text>
                </TouchableOpacity>
              )}
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Internal Calendar Modal */}
      <Modal isOpen={!!showCalendar} onClose={() => setShowCalendar(null)} useRNModal={false} size="md">
        <ModalBackdrop />
        <ModalContent style={flattenStyle([{ backgroundColor: isDark ? "#111827" : "#FFFFFF", borderRadius: 20 }])}>
          <ModalHeader>
            <Heading style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFF' : '#1F2937' }}>
              Velg dato ({showCalendar?.active === 'from' ? 'fra' : 'til'})
            </Heading>
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
                  {MONTH_NAMES[pickerMonth]} {pickerYear}
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
                {["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"].map((d) => (
                  <Text key={d} style={flattenStyle([{ fontSize: 12, fontWeight: "bold", width: 40, textAlign: "center" }, { color: isDark ? "#9CA3AF" : "#6B7280" }])}>
                    {d}
                  </Text>
                ))}
              </HStack>

              <View style={styles.calendarGrid}>
                {getDaysInMonthList(pickerYear, pickerMonth).map((day, idx) => {
                  if (day === null) return <View key={`empty-${idx}`} style={styles.calendarDay} />;
                  const dStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = (showCalendar?.active === 'from' ? dateFrom : dateTo) === dStr;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={flattenStyle([styles.calendarDay, isSelected && styles.calendarDaySelected])}
                      onPress={() => {
                        if (showCalendar?.active === 'from') {
                          setDateFrom(dStr);
                          // If dateTo was before dateFrom, update it
                          if (new Date(dateTo) < new Date(dStr)) {
                            setDateTo(dStr);
                          }
                        } else {
                          setDateTo(dStr);
                          // If dateFrom was after dateTo, update it
                          if (new Date(dateFrom) > new Date(dStr)) {
                            setDateFrom(dStr);
                          }
                        }
                        setShowCalendar(null);
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
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCalendar(null)}>
              <Text style={styles.modalCloseBtnText}>Lukk</Text>
            </TouchableOpacity>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  closeBtn: {
    padding: 4,
  },
  label: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  customPicker: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    borderColor: 'transparent',
  },
  inputField: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputLight: {
    backgroundColor: '#F3F4F6',
    color: '#1F2937',
  },
  inputDark: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  typeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: '#EF4444',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  textWhite: { color: '#FFF' },
  textDark: { color: '#1F2937' },
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
});