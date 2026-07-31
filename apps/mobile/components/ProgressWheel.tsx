import React, { useEffect, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { flattenStyle } from '@/utils/flatten-style';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  title: string;
  hasGoal: boolean;
  expectedFraction?: number;
  paceDiff?: number;
  customColor?: string;
  customPaceLabel?: string;
  showTodayIndicator?: boolean;
  isDark: boolean;
  onPress?: () => void;
  size?: 'normal' | 'small';
}

const ProgressWheel = memo(function ProgressWheel({
  percent, current, target, unit, title, hasGoal,
  expectedFraction, paceDiff, customColor, customPaceLabel,
  showTodayIndicator = true, isDark, onPress, size = 'normal'
}: ProgressWheelProps) {
  const isSmall = size === 'small';
  const RADIUS = isSmall ? 40 : 62;
  const STROKE = isSmall ? 8 : 12;
  const SIZE = (RADIUS + STROKE) * 2 + (isSmall ? 10 : 20);
  const CENTER = SIZE / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const animatedPercent = useSharedValue(0);
  const clampedPercent = Math.max(0, percent);

  useEffect(() => {
    animatedPercent.value = withTiming(clampedPercent, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedPercent]);

  const animatedProps = useAnimatedProps(() => {
    const p = Math.min(animatedPercent.value, 100);
    const fillFraction = p / 100;
    const offset = p >= 100 ? 0 : CIRCUMFERENCE * (1 - fillFraction);
    return {
      strokeDashoffset: offset,
    };
  });

  const isReached = clampedPercent >= 100;
  
  const getPaceColor = (diff: number): string => {
    if (diff >= 1) return '#10B981'; // Green
    if (diff >= -0.5) return '#10B981'; // Green
    if (diff >= -2) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const mainColor = customColor || (isReached ? '#10B981' : getPaceColor(paceDiff ?? 0));
  const paceLabelText = customPaceLabel || (paceDiff != null ? (
    paceDiff >= 0.5 ? `${Math.round(paceDiff)} økter foran skjema` : 
    paceDiff <= -0.5 ? `${Math.round(Math.abs(paceDiff))} økter bak skjema` : 
    'I rute'
  ) : 'I rute');

  return (
    <TouchableOpacity 
      style={flattenStyle([styles.container, isSmall && { padding: 4 }])} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Text style={flattenStyle([
        styles.title, 
        isDark ? { color: '#FAFAFA' } : { color: '#1F2937' },
        isSmall && { fontSize: 16, paddingTop: 0, marginBottom: 2 }
      ])} numberOfLines={1}>{title}</Text>
      
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={isDark ? '#374151' : '#E5E7EB'}
            strokeWidth={STROKE}
            opacity={0.2}
          />

          {/* LIGHT GLOW LAYER - Subtle halo matching the main color without expensive CPU-bound SVG filters */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={mainColor}
            strokeWidth={STROKE + 4}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            opacity={0.15}
          />

          {/* THE MAIN PROGRESS RING */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={mainColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />

          {/* TODAY INDICATOR (Arrow) */}
          {hasGoal && showTodayIndicator && expectedFraction != null && expectedFraction > 0 && (
            <Polygon
              points="-2.5,-8 2.5,-8 0,0"
              fill={isDark ? '#FFFFFF' : '#000000'}
              transform={`translate(${CENTER}, ${CENTER}) rotate(${expectedFraction * 360}) translate(0, ${-(RADIUS + STROKE/2) + 4})`}
              opacity={0.75}
            />
          )}
        </Svg>

        {/* Centered Text Overlay */}
        <View style={styles.textOverlay}>
          {hasGoal ? (
            <VStack style={{ alignItems: 'center' }}>
              <Text style={flattenStyle([{ 
                fontSize: isSmall ? 16 : 22, 
                fontWeight: '600', 
                color: isDark ? '#FFFFFF' : '#000000',
                textAlign: 'center'
              }])}>
                {current} / {target}
              </Text>
              <Text style={{ 
                fontSize: isSmall ? 9 : 11, 
                color: isDark ? '#9CA3AF' : '#6B7280',
                textAlign: 'center'
              }}>
                {unit}
              </Text>
            </VStack>
          ) : (
            <Text style={{ 
              fontSize: isSmall ? 11 : 13, 
              color: isDark ? '#9CA3AF' : '#6B7280',
              textAlign: 'center'
            }}>
              Sett mål
            </Text>
          )}
        </View>
      </View>

      {hasGoal && !isSmall && (
        <Text style={flattenStyle([styles.paceLabel, { color: mainColor, fontSize: 13 }])}>
          {paceLabelText}
        </Text>
      )}
    </TouchableOpacity>
  );
});

export default ProgressWheel;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    paddingTop: 8,
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
  },
  paceLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});