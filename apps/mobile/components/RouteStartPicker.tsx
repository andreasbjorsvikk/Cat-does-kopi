import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { X, Check } from 'lucide-react-native';
import { useRoute } from '@/context/RouteContext';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

interface RouteStartPickerProps {
  onConfirm: (coord: { latitude: number; longitude: number }) => void;
  onCancel: () => void;
  title?: string;
  confirmLabel?: string;
  getCenter: () => { latitude: number; longitude: number };
}

export function RouteStartPicker({ onConfirm, onCancel, title, confirmLabel, getCenter }: RouteStartPickerProps) {
  const isDark = useColorScheme() === 'dark';

  const handleConfirm = async () => {
    const center = await getCenter();
    onConfirm(center);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Bar */}
      <View style={flattenStyle([
        styles.topBar,
        { backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
      ])}>
        <HStack className="justify-between items-center px-4 py-3">
          <Text className="font-bold" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
            {title || 'Velg startpunkt'}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color={isDark ? '#FFFFFF' : '#111827'} />
          </TouchableOpacity>
        </HStack>
      </View>

      {/* Crosshair */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={[styles.crosshairLine, styles.crosshairHorizontal, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
        <View style={[styles.crosshairLine, styles.crosshairVertical, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
        <View style={[styles.crosshairCenter, { borderColor: isDark ? '#FFFFFF' : '#000000' }]} />
      </View>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <HStack space="xs" className="items-center">
            <Check size={20} color="#FFFFFF" />
            <Text className="text-white font-bold">
              {confirmLabel || 'Bekreft punkt'}
            </Text>
          </HStack>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 115 : 105,
    left: '25%',
    right: '25%',
    width: '50%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  crosshairContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    opacity: 0.5,
  },
  crosshairHorizontal: {
    width: 40,
    height: 2,
  },
  crosshairVertical: {
    width: 2,
    height: 40,
  },
  crosshairCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  }
});