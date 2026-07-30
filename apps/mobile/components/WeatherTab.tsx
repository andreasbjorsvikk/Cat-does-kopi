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
import { Wind, Cloud, Sun, CloudRain, CloudLightning, CloudSnow, CloudSun, CloudDrizzle } from 'lucide-react-native';
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
  const IconComponent = WEATHER_SYMBOLS[baseSymbol] || Cloud;
  
  // Special handling for multi-color icons
  const isSun = baseSymbol === 'clearsky' || baseSymbol === 'fair';
  const isPartlyCloudy = baseSymbol === 'partlycloudy';
  const isRain = baseSymbol.includes('rain') || baseSymbol.includes('drizzle');
  const isThunder = baseSymbol.includes('thunder');

  if (isPartlyCloudy) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Sun size={size * 0.7} color="#FBBF24" style={{ position: 'absolute', top: 0, right: 0 }} />
        <Cloud size={size * 0.8} color="#9CA3AF" style={{ position: 'absolute', bottom: 0, left: 0 }} />
      </View>
    );
  }

  if (isSun) return <Sun size={size} color="#FBBF24" />;
  
  if (isRain || isThunder) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Cloud size={size * 0.9} color="#9CA3AF" />
        <View style={{ position: 'absolute', bottom: -2 }}>
           <IconComponent size={size * 0.6} color="#3B82F6" />
        </View>
      </View>
    );
  }

  return <IconComponent size={size} color="#9CA3AF" />;
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
          precip: ts.data.next_1_hours?.details?.precipitation_amount ?? 
                  (ts.data.next_6_hours?.details?.precipitation_amount ? ts.data.next_6_hours.details.precipitation_amount / 6 : 0),
          symbol: ts.data.next_1_hours?.summary?.symbol_code ?? 
                  ts.data.next_6_hours?.summary?.symbol_code ?? 'cloudy',
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
  
  const graphPoints = [0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
    const timeStr = `${currentDay.date}T${String(hour).padStart(2, '0')}:00:00`;
    const closest = currentDay.hours.find(h => h.time.startsWith(timeStr)) || 
                    currentDay.hours.find(h => h.time >= timeStr) || 
                    currentDay.hours[currentDay.hours.length - 1];
    return {
      ...closest,
      label: String(hour).padStart(2, '0')
    };
  });

  const hourlyData = currentDay.hours;
  
  const allTemps = hourlyData.map(h => h.temp);
  const maxTemp = Math.max(...allTemps);
  const minTemp = Math.min(...allTemps);
  const graphMinTemp = Math.floor(minTemp - 1);
  const graphMaxTemp = Math.ceil(maxTemp + 3);

  const maxPrecip = Math.max(...hourlyData.map(h => h.precip), 2);

  const graphHeight = 240;
  const paddingLeft = 45; 
  const paddingRight = 40; 
  const paddingTop = 60; 
  const paddingBottom = 35; 
  
  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = graphHeight - paddingTop - paddingBottom;

  const getXFromPointIndex = (index: number) => {
    const hour = index * 3;
    return paddingLeft + (hour / 21) * chartWidth; 
  };

  const getYTemp = (temp: number) => {
    const range = graphMaxTemp - graphMinTemp;
    return paddingTop + chartHeight - ((temp - graphMinTemp) / range) * chartHeight;
  };

  const getYPrecip = (precip: number) => {
    return paddingTop + chartHeight - (Math.min(precip, maxPrecip) / maxPrecip) * chartHeight;
  };

  const linePath = graphPoints.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getXFromPointIndex(i)} ${getYTemp(h.temp)}`).join(' ');

  return (
    <VStack style={{ gap: 0 }}>
      {/* Day Selector - Narrower and less spacing */}
      <View style={{ marginTop: 2, marginBottom: 2 }}>
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
      </View>

      {/* Weather Card */}
      <View 
        onLayout={onLayout}
        style={flattenStyle([
          styles.weatherCard, 
          { backgroundColor: isDark ? '#111827' : '#F8FAFC', paddingHorizontal: 12, marginTop: 4 }
        ])}
      >
        {/* Unit indicators */}
        <HStack className="justify-between items-center mb-0">
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
            {/* Grid lines (Temperature) */}
            <G>
              {[graphMinTemp, (graphMinTemp + graphMaxTemp) / 2, graphMaxTemp].map((t, i) => {
                const y = getYTemp(t);
                return (
                  <G key={i}>
                    <Line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={containerWidth - paddingRight + 5} 
                      y2={y} 
                      stroke={isDark ? '#1F2937' : '#E2E8F0'} 
                      strokeWidth="1"
                    />
                    <SvgText
                      x={paddingLeft - 15}
                      y={y + 4}
                      fontSize="11"
                      fontWeight="500"
                      fill={isDark ? '#9CA3AF' : '#64748B'}
                      textAnchor="end"
                    >
                      {Math.round(t)}°
                    </SvgText>
                  </G>
                );
              })}
            </G>

            {/* Grid lines (Precipitation Labels on right) */}
            <G>
               {[0, maxPrecip / 2, maxPrecip].map((p, i) => (
                 <SvgText
                    key={i}
                    x={containerWidth - paddingRight + 12}
                    y={getYPrecip(p) + 4}
                    fontSize="10"
                    fontWeight="500"
                    fill={isDark ? '#9CA3AF' : '#64748B'}
                    textAnchor="start"
                  >
                    {p === 0 ? '0' : p.toFixed(1).replace('.0', '')}
                 </SvgText>
               ))}
            </G>

            {/* Precipitation Bars - Hourly */}
            <G>
              {hourlyData.map((h, i) => {
                const barHeight = chartHeight - (getYPrecip(h.precip) - paddingTop);
                if (barHeight <= 1) return null;
                const x = paddingLeft + (i / (hourlyData.length - 1)) * chartWidth;
                return (
                  <Rect
                    key={i}
                    x={x - 4}
                    y={paddingTop + chartHeight - barHeight}
                    width="8"
                    height={barHeight}
                    fill="#3B82F6"
                    opacity={0.4}
                    rx="1.5"
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
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points and Labels */}
            {graphPoints.map((h, i) => {
              const x = getXFromPointIndex(i);
              const y = getYTemp(h.temp);
              return (
                <G key={i}>
                  {/* Point */}
                  <Circle cx={x} cy={y} r="3.5" fill={isDark ? '#FFFFFF' : '#000000'} stroke={isDark ? '#111827' : '#F8FAFC'} strokeWidth="1.5" />
                  
                  {/* Wind Arrow & Speed */}
                  <G transform={`translate(${x}, 15)`}>
                    <G transform={`rotate(${h.windDir})`}>
                      <Path d="M0 -6 L3 4 L0 2 L-3 4 Z" fill={isDark ? '#9CA3AF' : '#64748B'} />
                    </G>
                    <SvgText
                      x="0"
                      y="18"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isDark ? '#9CA3AF' : '#64748B'}
                      textAnchor="middle"
                    >
                      {Math.round(h.windSpeed)}
                    </SvgText>
                  </G>

                  {/* Temperature label */}
                  <SvgText
                    x={x}
                    y={y - 12}
                    fontSize="11"
                    fontWeight="bold"
                    fill={isDark ? '#FFFFFF' : '#000000'}
                    textAnchor="middle"
                  >
                    {Math.round(h.temp)}°
                  </SvgText>
                </G>
              );
            })}

            {/* X-Axis Labels */}
            <G transform={`translate(0, ${graphHeight - 10})`}>
              {graphPoints.map((h, i) => (
                <SvgText
                  key={i}
                  x={getXFromPointIndex(i)}
                  y="0"
                  fontSize="10"
                  fontWeight="500"
                  fill={isDark ? '#9CA3AF' : '#64748B'}
                  textAnchor="middle"
                >
                  {h.label}
                </SvgText>
              ))}
            </G>
          </Svg>

          {/* Icons positioned over points */}
          {graphPoints.map((h, i) => {
             const x = getXFromPointIndex(i);
             const y = getYTemp(h.temp);
             return (
               <View 
                 key={i} 
                 style={{ 
                   position: 'absolute', 
                   left: x - 10, 
                   top: y - 48,
                   width: 20,
                   height: 20,
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}
               >
                 <WeatherIcon symbol={h.symbol} size={20} color={isDark ? '#FFFFFF' : '#111827'} />
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
      
      <Text className="text-center text-xs text-typography-400 dark:text-typography-500 italic mt-1">
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
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  weatherCard: {
    padding: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  unitText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendLine: {
    width: 16,
    height: 2.5,
    borderRadius: 1.25,
  },
  legendPill: {
    width: 14,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
  },
});