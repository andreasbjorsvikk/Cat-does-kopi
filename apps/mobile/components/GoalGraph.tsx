import React, { useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { PrimaryGoalPeriod, WorkoutSession } from '@/types/workout';
import { getMonthTarget } from '@/services/primaryGoalService';

interface GoalGraphProps {
  sessions: WorkoutSession[];
  periods: PrimaryGoalPeriod[];
  compact?: boolean;
  isDark: boolean;
}

const GoalGraph = memo(function GoalGraph({ sessions, periods, compact, isDark }: GoalGraphProps) {
  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sorted = [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    const earliest = sorted.length > 0 ? new Date(sorted[0].validFrom) : null;

    const months: { month: number; year: number; label: string; count: number; target: number }[] = [];
    if (!earliest) return months;

    const startMonth = earliest.getMonth();
    const startYear = earliest.getFullYear();
    const totalMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
    const monthsToShow = Math.max(2, Math.min(totalMonths, 7)); // Show last 7 months for mobile

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m < 0) { m += 12; y--; }
      const count = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length;
      const target = getMonthTarget(periods, y, m);
      const label = monthNames[m];
      months.push({ month: m, year: y, label, count, target });
    }
    return months;
  }, [sessions, periods]);

  const maxVal = Math.max(...data.map(d => Math.max(d.count, d.target)), 1);
  const width = 180;
  const height = compact ? 30 : 70;
  const padX = 10;
  const padTop = 10;
  const padBottom = 15;
  const graphH = height - padTop - padBottom;
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const getY = (val: number) => padTop + graphH - (val / maxVal) * graphH;
  const getX = (i: number) => padX + i * step;

  const buildPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const sessionPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.count) }));
  const targetPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.target) }));

  const sessionPath = buildPath(sessionPoints);
  const targetPath = buildPath(targetPoints);

  const getDotColor = (d: { count: number; target: number }) => {
    if (d.target === 0) return '#9CA3AF';
    const diff = d.count - Math.round(d.target);
    if (diff >= 0) return '#10B981'; // Green
    if (diff >= -2) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
        <Defs>
          <LinearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Target Line */}
        <Path
          d={targetPath}
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.4"
        />

        {/* Session Area */}
        {sessionPoints.length > 1 && (
          <Path
            d={`${sessionPath} L ${getX(data.length - 1)} ${height - padBottom} L ${getX(0)} ${height - padBottom} Z`}
            fill="url(#graphGrad)"
          />
        )}

        {/* Session Line */}
        <Path
          d={sessionPath}
          fill="none"
          stroke="#10B981"
          strokeWidth="1.2"
          opacity="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {data.map((d, i) => (
          <Circle
            key={i}
            cx={getX(i)}
            cy={getY(d.count)}
            r="4"
            fill={getDotColor(d)}
            stroke={isDark ? '#1F2937' : '#FFFFFF'}
            strokeWidth="1.2"
          />
        ))}

        {/* Labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={getX(i)}
            y={height - 2}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#9CA3AF"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
});

export default GoalGraph;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});