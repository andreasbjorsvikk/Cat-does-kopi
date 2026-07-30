import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StyleSheet,
  Platform,
  LayoutChangeEvent
} from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Wind, ArrowDown, Cloud, Sun, CloudRain, CloudLightning, CloudSnow, CloudSun, CloudDrizzle } from 'lucide-react-native';
import Svg, { Path, Rect, G, Line, Circle, Text as SvgText } from 'react-native-svg';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

interface WeatherTabProps {
  latitude: number;
  longitude: number;
}

interface WeatherData {
  time: string;
  temp: number;
  precip: number;
  windSpeed: number;
  windDir: number;
  symbol: string;
}

const WEATHER_SYMBOLS: Record<string, any> = {
  clearsky: Sun,
  fair: Sun,
  partlycloudy: CloudSun,
  cloudy: Cloud,
  lightrain: CloudDrizzle,
  rain: CloudRain,
  heavyrain: CloudRain,
  lightrainshowers: CloudDrizzle,
  rainshowers: CloudRain,
  heavyrainshowers: CloudRain,
  lightsnow: CloudSnow,
  snow: CloudSnow,
  heavysnow: CloudSnow,
  lightsnowshowers: CloudSnow,
  snowshowers: CloudSnow,
  heavysnowshowers: CloudSnow,
  lightrainandthunder: CloudLightning,
  rainandthunder: CloudLightning,
  heavyrainandthunder: CloudLightning,
};

function WeatherIcon({ symbol, size, color }: { symbol: string, size: number, color: string }) {
  const baseSymbol = symbol.split('_')[0];
  const Icon = WEATHER_SYMBOLS[baseSymbol] || Cloud;
  
  // Custom coloring for symbols to match "other app" look
  let iconColor = color;
  if (baseSymbol === 'clearsky' || baseSymbol === 'fair') iconColor = '#FBBF24'; // Yellow
  if (baseSymbol.includes('rain') || baseSymbol.includes('drizzle')) iconColor = '#3B82F6'; // Blue
  
  return <Icon size={size} color={iconColor} />;
}

export function WeatherTab({ latitude, longitude }: WeatherTabProps) {
  const isDark = useColorScheme() === 'dark';
  const [data, setData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 48);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch(
          `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`,
          { headers: { 'User-Agent': 'Treningsappen/1.0' } }
        );
        const json = await response.json();
        const timeseries = json.properties.timeseries;

        const formattedData: WeatherData[] = timeseries.map((ts: any) => ({
          time: ts.time,
          temp: ts.data.instant.details.air_temperature,
          windSpeed: ts.data.instant.details.wind_speed,
          windDir: ts.data.instant.details.wind_from_direction,
          precip: ts.data.next_1_hours?.details?.precipitation_amount || 0,
          symbol: ts.data.next_1_hours?.summary?.symbol_code || 'cloudy',
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Failed to fetch weather from Yr:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [latitude, longitude]);

  const days = useMemo(() => {
    if (data.length === 0) return [];
    
    const dayGroups: Record<string, WeatherData[]> = {};
    data.forEach(item => {
      const dateStr = item.time.split('T')[0];
      if (!dayGroups[dateStr]) dayGroups[dateStr] = [];
      dayGroups[dateStr].push(item);
    });

    return Object.entries(dayGroups).slice(0, 10).map(([date, hours]) => {
      const d = new Date(date);
      const isToday = new Date().toDateString() === d.toDateString();
      const isTomorrow = new Date(Date.now() + 86400000).toDateString() === d.toDateString();
      
      let label = '';
      if (isToday) label = 'I dag';
      else if (isTomorrow) label = 'I morgen';
      else {
        const dayName = d.toLocaleDateString('no-NO', { weekday: 'short' });
        const dayDate = d.getDate();
        const monthName = d.toLocaleDateString('no-NO', { month: 'short' });
        label = `${dayName} ${dayDate}. ${monthName}`;
      }

      return { date, label, hours };
    });
  }, [data]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text className="text-typography-500">Værdata utilgjengelig</Text>
      </View>
    );
  }

  const currentDay = days[selectedDayIndex];
  
  // Create 8 fixed points for the graph (00, 03, 06, 09, 12, 15, 18, 21)
  const graphHours = [0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
    const timeStr = `${currentDay.date}T${String(hour).padStart(2, '0')}:00:00Z`;
    // Find closest data point
    const closest = currentDay.hours.find(h => h.time >= timeStr) || currentDay.hours[currentDay.hours.length - 1];
    return {
      ...closest,
      label: String(hour).padStart(2, '0')
    };
  });
  
  const maxTemp = Math.max(...graphHours.map(h => h.temp));
  const minTemp = Math.min(...graphHours.map(h => h.temp));
  const tempRange = Math.max(maxTemp - minTemp, 4); // Min range of 4 degrees
  const graphMinTemp = Math.floor(minTemp - 1);
  const graphMaxTemp = Math.ceil(maxTemp + 3); // More space at top for icons

  const maxPrecip = Math.max(...graphHours.map(h => h.precip), 2);

  const graphHeight = 220;
  const paddingLeft = 30;
  const paddingRight = 30;
  const paddingTop = 60; // Space for wind arrows
  const paddingBottom = 40; // Space for X axis
  
  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = graphHeight - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (index / (graphHours.length - 1)) * chartWidth;
  const getYTemp = (temp: number) => {
    const range = graphMaxTemp - graphMinTemp;
    return paddingTop + chartHeight - ((temp - graphMinTemp) / range) * chartHeight;
  };
  const getYPrecip = (precip: number) => {
    return paddingTop + chartHeight - (precip / maxPrecip) * chartHeight;
  };

  const linePath = graphHours.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYTemp(h.temp)}`).join(' ');

  return (
    <VStack style={{ gap: 16 }}>
      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={day.date}
            onPress={() => setSelectedDayIndex(index)}
            style={flattenStyle([
              styles.dayButton,
              selectedDayIndex === index 
                ? { backgroundColor: isDark ? '#FFFFFF' : '#111827' }
                : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
            ])}
          >
            <Text style={flattenStyle([
              styles.dayButtonText,
              selectedDayIndex === index 
                ? { color: isDark ? '#000000' : '#FFFFFF' } 
                : { color: isDark ? '#9CA3AF' : '#111827' }
            ])}>
              {day.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Weather Card */}
      <View 
        onLayout={onLayout}
        style={flattenStyle([
          styles.weatherCard, 
          { backgroundColor: isDark ? '#121212' : '#F8FAFC' }
        ])}
      >
        {/* Unit indicators */}
        <HStack className="justify-between items-center mb-2">
          <HStack space="xs" className="items-center">
            <Wind size={12} color={isDark ? '#9CA3AF' : '#64748B'} />
            <Text style={styles.unitText}>m/s</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <Text style={styles.unitText}>mm</Text>
          </HStack>
        </HStack>

        <View style={{ height: graphHeight }}>
          <Svg width={containerWidth} height={graphHeight}>
            {/* Grid lines based on temperature */}
            <G>
              {[graphMinTemp, (graphMinTemp + graphMaxTemp) / 2, graphMaxTemp].map((t, i) => (
                <G key={i}>
                  <Line 
                    x1={paddingLeft} 
                    y1={getYTemp(t)} 
                    x2={containerWidth - paddingRight} 
                    y2={getYTemp(t)} 
                    stroke={isDark ? '#333333' : '#E2E8F0'} 
                    strokeWidth="1"
                  />
                  <SvgText
                    x={paddingLeft - 8}
                    y={getYTemp(t) + 4}
                    fontSize="10"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="end"
                  >
                    {Math.round(t)}°
                  </SvgText>
                </G>
              ))}
            </G>

            {/* Right Y-Axis (Precipitation) labels */}
            <G>
               {[0, maxPrecip / 2, maxPrecip].map((p, i) => (
                 <SvgText
                    key={i}
                    x={containerWidth - paddingRight + 8}
                    y={getYPrecip(p) + 4}
                    fontSize="10"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="start"
                  >
                    {p === 0 ? '0' : p.toFixed(1).replace('.0', '')}
                 </SvgText>
               ))}
            </G>

            {/* Precipitation Bars */}
            <G>
              {graphHours.map((h, i) => {
                const barHeight = (h.precip / maxPrecip) * chartHeight;
                if (barHeight === 0) return null;
                return (
                  <Rect
                    key={i}
                    x={getX(i) - 6}
                    y={paddingTop + chartHeight - barHeight}
                    width="12"
                    height={barHeight}
                    fill="#3B82F6"
                    opacity={0.4}
                    rx="2"
                  />
                );
              })}
            </G>

            {/* Temperature Line */}
            <Path
              d={linePath}
              fill="none"
              stroke={isDark ? '#FFFFFF' : '#000000'}
              strokeWidth="2.5"
            />

            {/* Points and Labels */}
            {graphHours.map((h, i) => {
              const x = getX(i);
              const y = getYTemp(h.temp);
              return (
                <G key={i}>
                  {/* Point on the line */}
                  <Circle cx={x} cy={y} r="3.5" fill={isDark ? '#FFFFFF' : '#000000'} stroke={isDark ? '#121212' : '#F8FAFC'} strokeWidth="1" />
                  
                  {/* Wind Arrow & Speed at the very top */}
                  <G transform={`translate(${x}, 15)`}>
                    <G transform={`rotate(${h.windDir})`}>
                      <Path d="M0 -6 L-3 2 L3 2 Z" fill={isDark ? '#9CA3AF' : '#64748B'} />
                    </G>
                    <SvgText
                      x="0"
                      y="14"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isDark ? '#9CA3AF' : '#64748B'}
                      textAnchor="middle"
                    >
                      {Math.round(h.windSpeed)}
                    </SvgText>
                  </G>

                  {/* Temperature label below the icon */}
                  <SvgText
                    x={x}
                    y={y - 12}
                    fontSize="10"
                    fontWeight="bold"
                    fill={isDark ? '#FFFFFF' : '#000000'}
                    textAnchor="middle"
                  >
                    {Math.round(h.temp)}°
                  </SvgText>
                </G>
              );
            })}

            {/* X-Axis Labels (Time) */}
            <G transform={`translate(0, ${graphHeight - 15})`}>
              {graphHours.map((h, i) => (
                <SvgText
                  key={i}
                  x={getX(i)}
                  y="0"
                  fontSize="10"
                  fill={isDark ? '#9CA3AF' : '#64748B'}
                  textAnchor="middle"
                >
                  {h.label}
                </SvgText>
              ))}
            </G>
          </Svg>

          {/* Weather icons floating above the temperature points */}
          {graphHours.map((h, i) => {
             return (
               <View 
                 key={i} 
                 style={{ 
                   position: 'absolute', 
                   left: getX(i) - 10, 
                   top: getYTemp(h.temp) - 45,
                   width: 20,
                   height: 20,
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}
               >
                 <WeatherIcon symbol={h.symbol} size={18} color={isDark ? '#FFFFFF' : '#111827'} />
               </View>
             );
          })}
        </View>

        {/* Legend */}
        <HStack style={styles.chartFooter}>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendLine, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
            <Text style={styles.legendText}>Temperatur</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <View style={[styles.legendPill, { backgroundColor: '#3B82F6', opacity: 0.4 }]} />
            <Text style={styles.legendText}>Nedbør</Text>
          </HStack>
        </HStack>
      </View>
      
      <Text className="text-center text-xs text-typography-400 dark:text-typography-500 italic">
        Værdata hentet fra Yr.no
      </Text>
    </VStack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  weatherCard: {
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  unitText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendPill: {
    width: 16,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});