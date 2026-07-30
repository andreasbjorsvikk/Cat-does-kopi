import React, { useId } from 'react';
import Svg, { Path, Defs, ClipPath, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  progress: number; // 0 to 1
  isDark?: boolean;
  size?: number;
  color?: string;
}

/**
 * MountainIcon (for Elevation goals)
 * Silhouetted double-mountain shape that fills up green from bottom to top.
 */
export const MountainIcon = ({ progress, isDark = false, size = 60, color = "#10B981" }: IconProps) => {
  const clipId = useId();
  const bgFill = isDark ? "#374151" : "#E5E7EB";
  const bgStroke = isDark ? "#4B5563" : "#D1D5DB";
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const yVal = 100 - clampedProgress * 100;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y={yVal} width="100" height="100" />
        </ClipPath>
      </Defs>
      {/* Background (Unfilled) Mountain */}
      <Path
        d="M 10 85 L 45 20 L 60 45 L 75 30 L 95 85 Z"
        fill={bgFill}
        stroke={bgStroke}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Foreground (Filled) Mountain */}
      <Path
        d="M 10 85 L 45 20 L 60 45 L 75 30 L 95 85 Z"
        fill={color}
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />
    </Svg>
  );
};

/**
 * BoltIcon (for Sessions goals)
 * High-contrast lightning bolt shape that fills up green from bottom to top.
 */
export const BoltIcon = ({ progress, isDark = false, size = 60, color = "#10B981" }: IconProps) => {
  const clipId = useId();
  const bgFill = isDark ? "#374151" : "#E5E7EB";
  const bgStroke = isDark ? "#4B5563" : "#D1D5DB";
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const yVal = 100 - clampedProgress * 100;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y={yVal} width="100" height="100" />
        </ClipPath>
      </Defs>
      {/* Background (Unfilled) Bolt */}
      <Path
        d="M 55 10 L 25 55 L 50 55 L 45 90 L 75 45 L 50 45 Z"
        fill={bgFill}
        stroke={bgStroke}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Foreground (Filled) Bolt */}
      <Path
        d="M 55 10 L 25 55 L 50 55 L 45 90 L 75 45 L 50 45 Z"
        fill={color}
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />
    </Svg>
  );
};

/**
 * ClockIcon (for Duration/Time goals)
 * Round clock face that fills up as a sector/pie chart from 12 o'clock clockwise.
 */
export const ClockIcon = ({ progress, isDark = false, size = 60, color = "#10B981" }: IconProps) => {
  const bgFill = isDark ? "#374151" : "#E5E7EB";
  const bgStroke = isDark ? "#4B5563" : "#D1D5DB";
  const clampedProgress = Math.min(1, Math.max(0, progress));

  // Get SVG path for the progress sector
  const getClockSectorPath = (p: number) => {
    if (p <= 0) return "";
    if (p >= 0.999) {
      // Full circle sector
      return "M 50 50 L 50 10 A 40 40 0 1 1 49.9 10 Z";
    }
    const radius = 40;
    const cx = 50;
    const cy = 50;
    // Angle starting from top (-90 degrees)
    const angle = -Math.PI / 2 + 2 * Math.PI * p;
    const endX = cx + radius * Math.cos(angle);
    const endY = cy + radius * Math.sin(angle);
    const largeArcFlag = p > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  const sectorPath = getClockSectorPath(clampedProgress);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Outer Circle Background */}
      <Circle
        cx="50"
        cy="50"
        r="40"
        fill={bgFill}
        stroke={bgStroke}
        strokeWidth="4"
      />
      
      {/* Progress Sector Fill */}
      {clampedProgress > 0 && (
        <Path
          d={sectorPath}
          fill={color}
          stroke={color}
          strokeWidth="1"
        />
      )}

      {/* Clock Face Details (Tick marks at 12, 3, 6, 9) */}
      <Line x1="50" y1="10" x2="50" y2="16" stroke={isDark ? "#9CA3AF" : "#6B7280"} strokeWidth="3" strokeLinecap="round" />
      <Line x1="90" y1="50" x2="84" y2="50" stroke={isDark ? "#9CA3AF" : "#6B7280"} strokeWidth="3" strokeLinecap="round" />
      <Line x1="50" y1="90" x2="50" y2="84" stroke={isDark ? "#9CA3AF" : "#6B7280"} strokeWidth="3" strokeLinecap="round" />
      <Line x1="10" y1="50" x2="16" y2="50" stroke={isDark ? "#9CA3AF" : "#6B7280"} strokeWidth="3" strokeLinecap="round" />

      {/* Clock Hands */}
      <Line
        x1="50"
        y1="50"
        x2="50"
        y2="25"
        stroke={isDark ? "#FFFFFF" : "#111827"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Line
        x1="50"
        y1="50"
        x2="70"
        y2="50"
        stroke={isDark ? "#FFFFFF" : "#111827"}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Center Dot */}
      <Circle
        cx="50"
        cy="50"
        r="5"
        fill={isDark ? "#FFFFFF" : "#111827"}
      />
    </Svg>
  );
};

/**
 * RouteIcon (for Distance goals)
 * S-curve trail route from bottom-left to top-center/right that fills up green as progress increases.
 */
export const RouteIcon = ({ progress, isDark = false, size = 60, color = "#10B981" }: IconProps) => {
  const bgStroke = isDark ? "#4B5563" : "#D1D5DB";
  const bgFill = isDark ? "#374151" : "#E5E7EB";
  const clampedProgress = Math.min(1, Math.max(0, progress));
  
  // Winding route path
  const routePath = "M 25 80 C 20 55, 80 75, 75 50 C 70 25, 35 35, 45 15";
  const totalLength = 160;
  const dashOffset = totalLength * (1 - clampedProgress);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Background (Unfilled) Route */}
      <Path
        d={routePath}
        fill="none"
        stroke={bgStroke}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Background Start Dot */}
      <Circle cx="25" cy="80" r="6" fill={bgFill} stroke={bgStroke} strokeWidth="2" />
      {/* Background End Pin */}
      <Path
        d="M 45 23 C 41 19, 37 15, 37 11 A 8 8 0 1 1 53 11 C 53 15, 49 19, 45 23 Z"
        fill={bgFill}
        stroke={bgStroke}
        strokeWidth="2"
      />
      <Circle cx="45" cy="11" r="3" fill={isDark ? "#1F2937" : "#FFFFFF"} />

      {/* Foreground (Filled) Route */}
      <Path
        d={routePath}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${totalLength}`}
        strokeDashoffset={dashOffset}
      />

      {/* Foreground Start Dot */}
      {clampedProgress > 0 && (
        <Circle cx="25" cy="80" r="6" fill={color} stroke={color} strokeWidth="1" />
      )}

      {/* Foreground End Pin */}
      {clampedProgress >= 0.95 && (
        <>
          <Path
            d="M 45 23 C 41 19, 37 15, 37 11 A 8 8 0 1 1 53 11 C 53 15, 49 19, 45 23 Z"
            fill={color}
            stroke="#059669"
            strokeWidth="1.5"
          />
          <Circle cx="45" cy="11" r="3" fill={isDark ? "#1F2937" : "#FFFFFF"} />
        </>
      )}
    </Svg>
  );
};

/**
 * SimpleMountainIcon (for Metric Selection in Modal)
 * Outline only version that matches Lucide icons.
 */
export const SimpleMountainIcon = ({ color, size = 18 }: { color: string, size?: number }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M 10 85 L 45 20 L 60 45 L 75 30 L 95 85 Z"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </Svg>
  );
};